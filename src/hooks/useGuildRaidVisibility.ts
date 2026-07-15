import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { compareRaidTypeDisplayOrder } from "@/lib/raidSort";
import type { RaidVisibilityEntry } from "@/types/raid";

// guild_raid_visibility + raid_types 조인 결과 한 행.
// guild_raid_visibility.raid_type_id가 raid_types.id를 참조하는 단일 관계라서
// raid_types는 배열이 아니라 객체로 온다.
interface GuildRaidVisibilityRow {
  id: string;
  is_visible: boolean;
  raid_types: {
    id: string;
    name: string;
    difficulties: string[];
    min_item_levels: (number | null)[] | null;
    max_players: number;
    display_order: number | null;
    created_at: string;
  } | null;
}

// 공대 관리 화면(officer 이상)에서 "이 공대에 어떤 레이드를 보여줄지"를 켜고 끄는 훅.
// useVisibleRaidTypes와 달리 is_visible=false인 레이드도 함께 불러와야
// 다시 켤 수 있으므로, is_visible 필터 없이 전체 조합을 조회한다.
// 노출 여부 변경(officer 이상만 성공)은 guild_raid_visibility_update RLS 정책이 DB 단에서 강제한다.
export function useGuildRaidVisibility(guildId: string | undefined) {
  const [entries, setEntries] = useState<RaidVisibilityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!guildId) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("guild_raid_visibility")
      .select(
        "id, is_visible, raid_types(id, name, difficulties, min_item_levels, max_players, display_order, created_at)",
      )
      .eq("guild_id", guildId)
      .returns<GuildRaidVisibilityRow[]>();

    if (fetchError) {
      setError(`레이드 노출 설정을 불러오지 못했습니다: ${fetchError.message}`);
      setEntries([]);
    } else {
      setEntries(
        (data ?? [])
          .filter((row) => row.raid_types !== null)
          .map((row) => ({
            ...row.raid_types!,
            guild_raid_visibility_id: row.id,
            is_visible: row.is_visible,
          }))
          .sort(compareRaidTypeDisplayOrder),
      );
    }

    setIsLoading(false);
  }, [guildId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!guildId) {
      return;
    }

    // 다른 officer가 동시에 노출 설정을 바꾸는 경우에도 이 화면이 최신 상태를 보여주도록 구독한다.
    const channel = supabase
      .channel(`guild-raid-visibility-settings-${guildId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guild_raid_visibility",
          filter: `guild_id=eq.${guildId}`,
        },
        () => {
          reload();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [guildId, reload]);

  // 특정 레이드의 노출 여부를 반대로 뒤집는다.
  // guild_raid_visibility row는 트리거가 이미 만들어뒀으므로 insert가 아니라 update만 한다.
  async function toggleVisibility(entry: RaidVisibilityEntry) {
    const { error: updateError } = await supabase
      .from("guild_raid_visibility")
      .update({ is_visible: !entry.is_visible })
      .eq("id", entry.guild_raid_visibility_id);

    if (updateError) {
      throw new Error(`노출 설정을 바꾸지 못했습니다: ${updateError.message}`);
    }

    await reload();
  }

  return { entries, isLoading, error, reload, toggleVisibility };
}
