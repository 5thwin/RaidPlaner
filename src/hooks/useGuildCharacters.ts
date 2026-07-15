import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { GuildCharacter } from "@/types/character";

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
  rosters: { color: string } | null;
}

// "파티원" 페이지(/guilds/:guildId/members)에서 쓰는, 공대원 전체의 활성 캐릭터
// 목록을 불러오는 훅. guest를 포함한 모든 공대원이 다른 공대원의 활성 캐릭터를
// 조회할 수 있어야 하므로(도메인 규칙), characters_select_by_guild_member RLS
// 정책이 실제 조회 가능 범위를 최종적으로 강제한다 — 이 훅은 역할과 무관하게
// 항상 "같은 공대 전체"를 대상으로 쿼리만 보낸다.
//
// 다른 공대원이 캐릭터를 활성화/비활성화하거나 전투력을 갱신하거나 원정대 색을
// 바꾸는 것, 그리고 새 공대원이 들어오거나 나가는 것까지 실시간으로 반영되어야
// 하므로 characters와 guild_members 두 테이블을 함께 구독한다
// (useGuildParties.ts의 이중 구독 패턴 참고).
export function useGuildCharacters(guildId: string | undefined) {
  const [characters, setCharacters] = useState<GuildCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // characters Realtime 이벤트가 "지금 이 공대 소속 유저"의 것인지 확인하기 위한 ref.
  // 구독 콜백은 클로저라서 state를 최신 값으로 못 볼 수 있어 ref로 최신 멤버 id 목록을 들고 있는다.
  const memberIdsRef = useRef<string[]>([]);

  // 다른 공대원의 캐릭터 활성화/전투력 갱신 등으로 Realtime 이벤트가 올 때마다
  // reload()가 불린다. 매번 isLoading을 true로 만들면 목록이 통째로 사라졌다가
  // 다시 나타나는 깜빡임이 생기므로, 최초 1회 로딩에만 로딩 화면을 보여준다.
  const hasLoadedOnceRef = useRef(false);

  const reload = useCallback(async () => {
    if (!guildId) {
      setCharacters([]);
      memberIdsRef.current = [];
      setIsLoading(false);
      return;
    }

    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const finishLoading = () => {
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
    };

    const { data: memberRows, error: memberError } = await supabase
      .from("guild_members")
      .select("user_id")
      .eq("guild_id", guildId);

    if (memberError) {
      setError(`공대원 목록을 불러오지 못했습니다: ${memberError.message}`);
      setCharacters([]);
      memberIdsRef.current = [];
      finishLoading();
      return;
    }

    const memberIds = (memberRows ?? []).map((row) => row.user_id);
    memberIdsRef.current = memberIds;

    if (memberIds.length === 0) {
      setCharacters([]);
      finishLoading();
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("characters")
      .select(
        "id, owner_id, roster_id, server_name, character_name, character_level, character_class_name, item_avg_level, character_image_url, combat_power, is_active, created_at, updated_at, profiles(display_name), rosters(color)",
      )
      .eq("is_active", true)
      .in("owner_id", memberIds)
      .order("character_name", { ascending: true })
      .returns<CharacterRow[]>();

    if (fetchError) {
      setError(`캐릭터 목록을 불러오지 못했습니다: ${fetchError.message}`);
      setCharacters([]);
      finishLoading();
      return;
    }

    const sorted = (data ?? [])
      .map(({ profiles, rosters, ...character }) => ({
        ...character,
        owner_display_name: profiles?.display_name ?? null,
        roster_color: rosters?.color ?? null,
      }))
      // 누구 캐릭터인지 알아보기 쉽도록 소유자 이름으로 먼저 묶고, 그 안에서 캐릭터명순으로 정렬한다.
      .sort((a, b) => {
        const ownerCompare = (a.owner_display_name ?? "").localeCompare(
          b.owner_display_name ?? "",
        );
        if (ownerCompare !== 0) {
          return ownerCompare;
        }
        return a.character_name.localeCompare(b.character_name);
      });

    setCharacters(sorted);
    finishLoading();
  }, [guildId]);

  useEffect(() => {
    // 공대를 전환한 경우, 이전 공대의 데이터가 잠깐 그대로 보이지 않도록
    // 최초 로딩 취급으로 되돌려서 로딩 화면을 다시 보여준다.
    hasLoadedOnceRef.current = false;
    reload();
  }, [reload]);

  useEffect(() => {
    if (!guildId) {
      return;
    }

    // guild_members는 guild_id 컬럼이 있어서 서버 단에서 우리 공대 것만 필터링해 구독할 수 있다.
    // 공대원이 새로 들어오거나 나가면 그만큼 조회 대상 캐릭터 범위가 바뀌므로 다시 불러온다.
    const membersChannel = supabase
      .channel(`guild-characters-members-${guildId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guild_members",
          filter: `guild_id=eq.${guildId}`,
        },
        () => {
          reload();
        },
      )
      .subscribe();

    // characters는 guild_id 컬럼이 없어서 서버 단 필터링이 불가능하다. 테이블 전체를
    // 구독하되, 이벤트가 "지금 이 공대 소속 유저"의 캐릭터일 때만 다시 불러오도록
    // 클라이언트에서 한 번 더 걸러낸다.
    const charactersChannel = supabase
      .channel(`guild-characters-${guildId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "characters" },
        (payload) => {
          const changedOwnerId =
            (payload.new as { owner_id?: string } | null)?.owner_id ??
            (payload.old as { owner_id?: string } | null)?.owner_id;

          if (changedOwnerId && memberIdsRef.current.includes(changedOwnerId)) {
            reload();
          }
        },
      )
      .subscribe();

    // rosters(원정대 색상 등)도 guild_id 컬럼이 없다. 마찬가지로 owner_id가
    // 지금 이 공대 소속 유저일 때만 다시 불러온다 (예: 원정대 색 변경).
    const rostersChannel = supabase
      .channel(`guild-characters-rosters-${guildId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rosters" },
        (payload) => {
          const changedOwnerId =
            (payload.new as { owner_id?: string } | null)?.owner_id ??
            (payload.old as { owner_id?: string } | null)?.owner_id;

          if (changedOwnerId && memberIdsRef.current.includes(changedOwnerId)) {
            reload();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(membersChannel);
      supabase.removeChannel(charactersChannel);
      supabase.removeChannel(rostersChannel);
    };
  }, [guildId, reload]);

  return { characters, isLoading, error, reload };
}
