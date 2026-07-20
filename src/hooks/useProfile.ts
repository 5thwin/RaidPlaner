import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { readSessionCache, writeSessionCache } from "@/lib/sessionCache";
import type { Profile } from "@/types/profile";

const PROFILE_CACHE_KEY = "raid-planner:profile";

// 로그인한 유저 본인의 프로필(profiles 테이블 한 줄)을 불러오고,
// 표시 이름(display_name)을 수정하는 훅.
// useMyGuilds와 동일한 이유로 sessionStorage 캐시를 쓴다: 캐시가 없으면 새로고침/
// 최초 로딩 직후 profile이 아직 null이라, 헤더(AuthStatus)가 구글 로그인 당시
// 이름으로 아주 잠깐 표시됐다가 표시 이름으로 바뀌는 깜빡임이 있었다(2026-07-19
// 사용자 확인). 직전 세션에서 캐시해둔 프로필을 먼저 보여주고 백그라운드에서
// 조용히 재조회하면 이 깜빡임이 없어진다.
export function useProfile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(() =>
    readSessionCache<Profile>(PROFILE_CACHE_KEY),
  );
  const [isLoading, setIsLoading] = useState(
    () => readSessionCache<Profile>(PROFILE_CACHE_KEY) === null,
  );
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      writeSessionCache(PROFILE_CACHE_KEY, null);
      return;
    }

    setError(null);

    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      setError(`프로필을 불러오지 못했습니다: ${fetchError.message}`);
    } else {
      setProfile(data);
      writeSessionCache(PROFILE_CACHE_KEY, data);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  // 표시 이름을 바꾼다. profiles_update RLS 정책이 본인(id = auth.uid()) 행만
  // 수정할 수 있도록 이미 막아주므로, 여기서는 별도 권한 체크 없이 update만 한다.
  async function updateDisplayName(displayName: string): Promise<Profile> {
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`표시 이름 변경에 실패했습니다: ${updateError.message}`);
    }

    setProfile(data);
    writeSessionCache(PROFILE_CACHE_KEY, data);

    return data;
  }

  // 계정을 완전히 삭제한다. delete_own_account() RPC(security definer)가
  // auth.users에서 본인 행을 지우면, profiles 이하 모든 데이터(characters,
  // rosters, guild_members 등)가 FK cascade로 함께 지워진다. 공대장으로 있는
  // 공대가 남아있으면 RPC가 에러를 던지므로 그대로 위로 전달한다.
  // 삭제 성공 직후엔 이 세션의 access token이 더 이상 유효한 계정을 가리키지
  // 않으므로, 곧바로 로그아웃까지 처리해서 화면이 깨지지 않게 한다.
  async function deleteAccount(): Promise<void> {
    const { error: rpcError } = await supabase.rpc("delete_own_account");

    if (rpcError) {
      throw new Error(`계정 삭제에 실패했습니다: ${rpcError.message}`);
    }

    writeSessionCache(PROFILE_CACHE_KEY, null);
    await signOut();
  }

  return {
    profile,
    isLoading,
    error,
    reload,
    updateDisplayName,
    deleteAccount,
  };
}
