import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// 초대 코드로 공대에 셀프 참여(guest)하는 훅.
// 실제 코드 검증 + insert는 join_guild_by_invite_code() RPC(security definer)가
// DB 안에서 전부 처리하므로, 여기서는 RPC를 호출하고 결과(참여한 guild_id)만 돌려준다.
export function useJoinGuildByCode() {
  const [isJoining, setIsJoining] = useState(false);

  async function joinGuild(inviteCode: string): Promise<string> {
    setIsJoining(true);

    try {
      const { data, error } = await supabase.rpc(
        "join_guild_by_invite_code",
        { p_invite_code: inviteCode },
      );

      if (error) {
        // RPC 안에서 raise exception으로 던진 한국어 메시지가 그대로 error.message로 온다.
        throw new Error(error.message);
      }

      return data as string;
    } finally {
      setIsJoining(false);
    }
  }

  return { joinGuild, isJoining };
}
