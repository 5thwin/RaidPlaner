import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { compareRaidTypeDisplayOrder } from "@/lib/raidSort";
import { readSessionCache, writeSessionCache } from "@/lib/sessionCache";
import type { VisibleRaidType } from "@/types/raid";

function getRaidTypesCacheKey(guildId: string): string {
  return `raid-planner:raidTypes:${guildId}`;
}

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

// 현재 공대에서 노출(is_visible = true) 설정된 레이드 목록을 불러오는 훅.
// 노출 설정은 레이드 마스터 데이터(raid_types)가 아니라 공대별 오버레이 테이블
// (guild_raid_visibility)에 저장되므로, 항상 이 둘을 조인해서 조회한다.
// officer 이상이 노출 설정을 바꾸면 폴링 없이 즉시 반영되도록 Realtime을 구독한다.
export function useVisibleRaidTypes(guildId: string | undefined) {
  // 새로고침 직후에도 곧바로 로딩 스피너를 보여주는 대신, 이 공대에서 직전에
  // 캐시해둔 레이드 목록을 먼저 그대로 보여주고 백그라운드에서 조용히 재조회한다.
  const [raidTypes, setRaidTypes] = useState<VisibleRaidType[]>(
    () =>
      (guildId &&
        readSessionCache<VisibleRaidType[]>(getRaidTypesCacheKey(guildId))) ||
      [],
  );
  const [isLoading, setIsLoading] = useState(
    () =>
      !guildId ||
      readSessionCache<VisibleRaidType[]>(getRaidTypesCacheKey(guildId)) ===
        null,
  );
  const [error, setError] = useState<string | null>(null);

  // 최초 1회(또는 캐시로 이미 뭔가 보여준 상태)가 지나면, officer의 노출 설정
  // 변경 등으로 오는 Realtime 재조회가 화면을 스피너로 덮지 않게 한다
  // (useGuildParties와 동일한 패턴).
  const hasLoadedOnceRef = useRef(
    Boolean(
      guildId &&
        readSessionCache<VisibleRaidType[]>(getRaidTypesCacheKey(guildId)) !==
          null,
    ),
  );

  const reload = useCallback(async () => {
    if (!guildId) {
      setRaidTypes([]);
      setIsLoading(false);
      return;
    }

    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("guild_raid_visibility")
      .select(
        "id, is_visible, raid_types(id, name, difficulties, min_item_levels, max_players, display_order, created_at)",
      )
      .eq("guild_id", guildId)
      .eq("is_visible", true)
      .returns<GuildRaidVisibilityRow[]>();

    if (fetchError) {
      setError(`레이드 목록을 불러오지 못했습니다: ${fetchError.message}`);
      setRaidTypes([]);
    } else {
      const mapped = (data ?? [])
        .filter((row) => row.raid_types !== null)
        .map((row) => ({
          ...row.raid_types!,
          guild_raid_visibility_id: row.id,
        }))
        .sort(compareRaidTypeDisplayOrder);
      setRaidTypes(mapped);
      writeSessionCache(getRaidTypesCacheKey(guildId), mapped);
    }

    hasLoadedOnceRef.current = true;
    setIsLoading(false);
  }, [guildId]);

  // 처음 마운트될 때는 캐시 유무로 정해진 hasLoadedOnceRef 초기값을 그대로 두고,
  // guildId가 실제로 바뀌는(공대 전환) 이후부터만 "새 공대라 아직 못 봤다"로
  // 되돌려서 로딩 화면을 다시 보여준다 (useGuildParties와 동일한 패턴).
  const isFirstEffectRunRef = useRef(true);

  useEffect(() => {
    if (isFirstEffectRunRef.current) {
      isFirstEffectRunRef.current = false;
    } else {
      hasLoadedOnceRef.current = false;
    }
    reload();
  }, [reload]);

  useEffect(() => {
    if (!guildId) {
      return;
    }

    const channel = supabase
      .channel(`guild-raid-visibility-${guildId}`)
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

  return { raidTypes, isLoading, error, reload };
}
