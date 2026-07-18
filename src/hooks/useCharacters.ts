import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Character } from "@/types/character";

// 특정 원정대(roster) 소속 캐릭터 목록을 불러오고,
// 캐릭터별 활성/비활성(is_active) 토글을 처리하는 훅.
export function useCharacters(rosterId: string | undefined) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 최초 1회 로딩에만 로딩 화면을 보여준다(useGuildCharacters와 동일한 패턴).
  // 안 그러면 Realtime 이벤트로 재조회할 때마다 목록이 깜빡인다.
  const hasLoadedOnceRef = useRef(false);

  const reload = useCallback(async () => {
    if (!rosterId) {
      setCharacters([]);
      setIsLoading(false);
      return;
    }

    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("characters")
      .select("*")
      .eq("roster_id", rosterId)
      .order("combat_power", { ascending: false, nullsFirst: false });

    if (fetchError) {
      setError(`원정대 목록을 불러오지 못했습니다: ${fetchError.message}`);
    } else {
      setCharacters(data ?? []);
    }

    hasLoadedOnceRef.current = true;
    setIsLoading(false);
  }, [rosterId]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    reload();
  }, [reload]);

  // 새 원정대를 추가한 직후(roster 생성 -> 캐릭터 upsert)처럼, 이 훅이 캐릭터가
  // 아직 저장되기 전에 먼저 마운트/조회되는 경우를 대비해 characters 테이블을
  // 구독한다. 캐릭터가 추가/수정/삭제되면 다시 불러와서, 새로고침 없이도 바로
  // 반영되게 한다. roster_id 컬럼이 있어 서버 단에서 이 원정대 것만 필터링된다.
  useEffect(() => {
    if (!rosterId) {
      return;
    }

    const channel = supabase
      .channel(`roster-characters-${rosterId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "characters",
          filter: `roster_id=eq.${rosterId}`,
        },
        () => {
          reload();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rosterId, reload]);

  // 캐릭터 하나의 is_active를 반전시킨다. 실패하면 화면 상태를 원래대로 되돌린다.
  async function toggleActive(character: Character) {
    const nextIsActive = !character.is_active;

    setCharacters((prev) =>
      prev.map((c) =>
        c.id === character.id ? { ...c, is_active: nextIsActive } : c,
      ),
    );

    const { error: updateError } = await supabase
      .from("characters")
      .update({ is_active: nextIsActive })
      .eq("id", character.id);

    if (updateError) {
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === character.id
            ? { ...c, is_active: character.is_active }
            : c,
        ),
      );
      setError(`활성 상태 변경에 실패했습니다: ${updateError.message}`);
    }
  }

  return { characters, isLoading, error, reload, toggleActive };
}
