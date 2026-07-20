import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { getRosterColorPalette } from "@/lib/rosterColor";
import type { Roster } from "@/types/roster";

// 로그인한 유저 본인이 보유한 원정대(rosters) 목록을 불러오고,
// 새 원정대(다른 로스트아크 계정)를 추가하는 훅.
export function useRosters() {
  const { user } = useAuth();
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setRosters([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("rosters")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(`원정대 목록을 불러오지 못했습니다: ${fetchError.message}`);
    } else {
      setRosters(data ?? []);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // 새 원정대(대표 캐릭터명)를 rosters에 등록하고, 방금 만든 roster를 반환한다.
  // 주의: 여기서는 일부러 rosters state에 바로 반영하지 않는다 — 호출하는 쪽(RosterPage)이
  // 이 roster.id로 캐릭터를 먼저 다 저장한 뒤 reload()를 불러야, 화면에 새 원정대
  // 섹션이 나타나는 시점엔 이미 캐릭터가 저장되어 있어서 빈 목록으로 잠깐 보이는
  // 문제(캐릭터 저장 전에 섹션이 먼저 마운트되어 조회하는 race condition)가 없다.
  async function createRoster(
    representativeCharacterName: string,
  ): Promise<Roster> {
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }

    // 새 원정대는 팔레트 중 하나를 무작위로 배정한다 — 매번 기본값(blue)으로
    // 시작하면 원정대가 여러 개일 때 색이 자꾸 겹쳐서, 유저가 매번 직접
    // 색을 바꿔줘야 했다(2026-07-20 사용자 요청).
    const palette = getRosterColorPalette();
    const randomColor = palette[Math.floor(Math.random() * palette.length)].key;

    const { data, error: insertError } = await supabase
      .from("rosters")
      .insert({
        owner_id: user.id,
        representative_character_name: representativeCharacterName,
        color: randomColor,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`원정대 추가에 실패했습니다: ${insertError.message}`);
    }

    return data;
  }

  // 원정대 구분 색상을 바꾼다. 팔레트 키(예: "blue")만 저장한다.
  async function updateRosterColor(
    rosterId: string,
    color: string,
  ): Promise<Roster> {
    const { data, error: updateError } = await supabase
      .from("rosters")
      .update({ color })
      .eq("id", rosterId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`원정대 색상 변경에 실패했습니다: ${updateError.message}`);
    }

    setRosters((prev) =>
      prev.map((roster) => (roster.id === rosterId ? data : roster)),
    );

    return data;
  }

  // 원정대 이름(대표 캐릭터명)을 바꾼다. 이 값은 화면 제목이면서 동시에 "전체 업데이트"가
  // 로스트아크 API를 조회할 때 쓰는 실제 캐릭터명이기도 하므로, 호출하는 쪽에서
  // 실제 캐릭터명과 일치하도록 안내해야 한다.
  async function updateRosterName(
    rosterId: string,
    representativeCharacterName: string,
  ): Promise<Roster> {
    const { data, error: updateError } = await supabase
      .from("rosters")
      .update({ representative_character_name: representativeCharacterName })
      .eq("id", rosterId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`원정대 이름 변경에 실패했습니다: ${updateError.message}`);
    }

    setRosters((prev) =>
      prev.map((roster) => (roster.id === rosterId ? data : roster)),
    );

    return data;
  }

  // 원정대 자체를 삭제한다. (본인 것만 성공하도록 rosters_delete RLS 정책이 막고 있다.)
  // characters.roster_id가 on delete cascade라 이 원정대 소속 캐릭터도 함께 삭제되고,
  // 그 캐릭터가 들어가 있던 party_slots는 on delete set null이라 빈 슬롯으로 남는다.
  async function deleteRoster(rosterId: string): Promise<void> {
    const { error: deleteError } = await supabase
      .from("rosters")
      .delete()
      .eq("id", rosterId);

    if (deleteError) {
      throw new Error(`원정대 삭제에 실패했습니다: ${deleteError.message}`);
    }

    setRosters((prev) => prev.filter((roster) => roster.id !== rosterId));
  }

  return {
    rosters,
    isLoading,
    error,
    reload,
    createRoster,
    updateRosterColor,
    updateRosterName,
    deleteRoster,
  };
}
