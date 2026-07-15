import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { readSessionCache, writeSessionCache } from "@/lib/sessionCache";
import type { GuildRole, MyGuildMembership } from "@/types/guild";

// guild_members 조회 시 guilds(공대 이름)를 함께 가져오기 위한 조인 결과 타입.
// guild_members.guild_id가 guilds.id를 참조하는 단일 관계라서 guilds는 배열이 아니라 객체로 온다.
interface GuildMemberRow {
  guild_id: string;
  role: GuildRole;
  joined_at: string;
  guilds: { name: string } | null;
}

const GUILDS_CACHE_KEY = "raid-planner:myGuilds";

// 로그인한 유저가 소속된 모든 공대(와 그 공대에서의 역할)를 불러오는 훅.
// 한 유저는 여러 공대에 속할 수 있으므로 배열로 반환한다.
export function useMyGuilds() {
  const { user, isLoading: isAuthLoading } = useAuth();
  // 새로고침 직후에도 곧바로 로딩 스피너를 보여주는 대신, 직전 세션에서 캐시해둔
  // 목록을 먼저 그대로 보여주고 백그라운드에서 조용히 재조회한다(아래 reload).
  const [guilds, setGuilds] = useState<MyGuildMembership[]>(
    () => readSessionCache<MyGuildMembership[]>(GUILDS_CACHE_KEY) ?? [],
  );
  const [isLoading, setIsLoading] = useState(
    () => readSessionCache<MyGuildMembership[]>(GUILDS_CACHE_KEY) === null,
  );
  const [error, setError] = useState<string | null>(null);
  // 캐시로 이미 뭔가 보여주고 있으면, 뒤이은 재조회가 화면을 스피너로 덮지 않도록 한다.
  const hasLoadedOnceRef = useRef(
    readSessionCache<MyGuildMembership[]>(GUILDS_CACHE_KEY) !== null,
  );

  const reload = useCallback(async () => {
    // 새로고침 직후에는 Supabase가 세션을 복원하는 동안 user가 잠깐 null이다.
    // 이걸 "로그인 안 됨/공대 없음"으로 확정해서 isLoading을 false로 내려버리면,
    // 그 직후 실제 user가 채워지는 순간 이 훅의 재조회 effect가 아직 돌기 전
    // 렌더에서 "로딩 끝났는데 공대 0개"로 잘못 보여서, 그 값을 보고 판단하는
    // 화면(App.tsx의 "/onboarding" 리다이렉트 등)이 오작동한다. 인증 상태가
    // 아직 확인 중이면 여기서도 계속 로딩 중으로 남겨둔다.
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setGuilds([]);
      setIsLoading(false);
      hasLoadedOnceRef.current = true;
      // 실제로 로그아웃 상태로 확인됐으니, 다음 새로고침에서 이전 유저의 공대
      // 목록이 잠깐 잘못 보이지 않도록 캐시도 함께 지운다.
      writeSessionCache(GUILDS_CACHE_KEY, []);
      return;
    }

    // 캐시로 이미 뭔가 보여주고 있었다면 재조회 중에도 화면을 비우지 않는다.
    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("guild_members")
      .select("guild_id, role, joined_at, guilds(name)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true })
      .returns<GuildMemberRow[]>();

    if (fetchError) {
      setError(`소속 공대 목록을 불러오지 못했습니다: ${fetchError.message}`);
    } else {
      const mapped = (data ?? []).map((row) => ({
        guild_id: row.guild_id,
        guild_name: row.guilds?.name ?? "(알 수 없는 공대)",
        role: row.role,
        joined_at: row.joined_at,
      }));
      setGuilds(mapped);
      writeSessionCache(GUILDS_CACHE_KEY, mapped);
    }

    hasLoadedOnceRef.current = true;
    setIsLoading(false);
  }, [user, isAuthLoading]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { guilds, isLoading, error, reload };
}
