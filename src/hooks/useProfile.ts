import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/types/profile";

// 로그인한 유저 본인의 프로필(profiles 테이블 한 줄)을 불러오고,
// 표시 이름(display_name)을 수정하는 훅.
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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

    return data;
  }

  return {
    profile,
    isLoading,
    error,
    reload,
    updateDisplayName,
  };
}
