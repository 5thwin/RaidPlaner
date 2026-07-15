import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

// 새 공대를 만드는 훅.
// guilds에 insert만 하면, DB 트리거(handle_new_guild)가 자동으로
// 생성자를 guild_members에 master 권한으로 등록해준다 (클라이언트가 따로 처리할 필요 없음).
export function useCreateGuild() {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);

  async function createGuild(name: string): Promise<string> {
    if (!user) {
      throw new Error("로그인이 필요합니다.");
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from("guilds")
        .insert({ name, created_by: user.id })
        .select("id")
        .single();

      if (error) {
        throw new Error(`공대 생성에 실패했습니다: ${error.message}`);
      }

      return data.id as string;
    } finally {
      setIsCreating(false);
    }
  }

  return { createGuild, isCreating };
}
