import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { hasGuildRoleAtLeast } from "@/lib/guildRole";
import type { AssignableCharacter } from "@/types/party";
import type { GuildRole } from "@/types/guild";

interface CharacterRow {
  id: string;
  owner_id: string;
  roster_id: string;
  server_name: string;
  character_name: string;
  character_level: number;
  character_class_name: string;
  item_avg_level: number;
  character_image_url: string | null;
  combat_power: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles: { display_name: string | null } | null;
}

// 파티 빈 슬롯에 넣을 수 있는 후보 캐릭터 목록을 불러오는 훅.
// - member: 본인 소유의 활성(is_active) 캐릭터만.
// - officer 이상: 같은 공대에 속한 모든 유저의 활성 캐릭터.
// (guest는 이 훅을 호출하는 UI 자체가 노출되지 않는다. 실제 조회 가능 범위는
//  characters 테이블의 RLS가 최종적으로 강제하므로, 여기서는 역할에 맞는
//  쿼리를 보내는 역할만 한다.)
export function useAssignableCharacters(
  guildId: string | undefined,
  myRole: GuildRole | null,
  userId: string | undefined,
) {
  const [candidates, setCandidates] = useState<AssignableCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!guildId || !userId || !myRole) {
      setCandidates([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    let query = supabase
      .from("characters")
      .select(
        "id, owner_id, roster_id, server_name, character_name, character_level, character_class_name, item_avg_level, character_image_url, combat_power, is_active, created_at, updated_at, profiles(display_name)",
      )
      .eq("is_active", true);

    if (hasGuildRoleAtLeast(myRole, "officer")) {
      const { data: memberRows, error: memberError } = await supabase
        .from("guild_members")
        .select("user_id")
        .eq("guild_id", guildId);

      if (memberError) {
        setError(`공대원 목록을 불러오지 못했습니다: ${memberError.message}`);
        setCandidates([]);
        setIsLoading(false);
        return;
      }

      const memberIds = (memberRows ?? []).map((row) => row.user_id);
      query = query.in("owner_id", memberIds);
    } else {
      // member는 본인 캐릭터만 후보로 볼 수 있다.
      query = query.eq("owner_id", userId);
    }

    const { data, error: fetchError } = await query
      .order("item_avg_level", { ascending: false })
      .returns<CharacterRow[]>();

    if (fetchError) {
      setError(`후보 캐릭터를 불러오지 못했습니다: ${fetchError.message}`);
      setCandidates([]);
    } else {
      setCandidates(
        (data ?? []).map(({ profiles, ...character }) => ({
          ...character,
          owner_display_name: profiles?.display_name ?? null,
        })),
      );
    }

    setIsLoading(false);
  }, [guildId, myRole, userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { candidates, isLoading, error, reload };
}
