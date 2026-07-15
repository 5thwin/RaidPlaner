import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Character } from "@/types/character";

// 특정 원정대(roster) 소속 캐릭터 목록을 불러오고,
// 캐릭터별 활성/비활성(is_active) 토글을 처리하는 훅.
export function useCharacters(rosterId: string | undefined) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!rosterId) {
      setCharacters([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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

    setIsLoading(false);
  }, [rosterId]);

  useEffect(() => {
    reload();
  }, [reload]);

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
