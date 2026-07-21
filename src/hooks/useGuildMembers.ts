import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Guild, GuildMemberWithProfile, GuildRole } from "@/types/guild";

// guild_members 조회 시 profiles(이름/아바타)를 함께 가져오기 위한 조인 결과 타입.
// guild_members.user_id가 profiles.id를 참조하는 단일 관계라서 profiles는 객체로 온다.
// 대표 캐릭터명은 profiles가 아니라 rosters 테이블 소속이라 별도로 조회한다(아래 reload 참고).
interface GuildMemberRow {
  id: string;
  guild_id: string;
  user_id: string;
  role: GuildRole;
  joined_at: string;
  profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

// 대표 캐릭터명 조회용 rosters 행. 소유자가 원정대를 여러 개 가질 수 있으므로,
// created_at 오름차순으로 가장 먼저 연결한 원정대의 이름을 대표로 보여준다.
interface RosterOwnerRow {
  owner_id: string;
  representative_character_name: string;
}

// 특정 공대의 정보 + 멤버 목록을 불러오고, 역할 변경/초대 코드 재발급을 처리하는 훅.
// (유저 초대는 초대 코드(/guilds/join)로만 하고, 이 훅에서는 다루지 않는다.)
// 권한(officer 이상 / master)은 Supabase RLS/RPC가 실제로 강제하므로,
// 이 훅은 요청만 보내고 실패하면 에러 메시지를 그대로 던진다.
export function useGuildMembers(guildId: string | undefined) {
  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<GuildMemberWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!guildId) {
      setGuild(null);
      setMembers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [guildResult, memberResult] = await Promise.all([
      supabase.from("guilds").select("*").eq("id", guildId).single(),
      supabase
        .from("guild_members")
        .select(
          "id, guild_id, user_id, role, joined_at, profiles(display_name, avatar_url)",
        )
        .eq("guild_id", guildId)
        .order("joined_at", { ascending: true })
        .returns<GuildMemberRow[]>(),
    ]);

    if (guildResult.error) {
      setError(`공대 정보를 불러오지 못했습니다: ${guildResult.error.message}`);
    } else {
      setGuild(guildResult.data);
    }

    if (memberResult.error) {
      setError(`공대원 목록을 불러오지 못했습니다: ${memberResult.error.message}`);
    } else {
      const memberRows = memberResult.data ?? [];
      const memberUserIds = memberRows.map((row) => row.user_id);

      // 공대원들의 대표 캐릭터명(원정대가 여러 개면 가장 먼저 연결한 원정대)을 별도로 조회한다.
      const { data: rosterRows, error: rosterError } =
        memberUserIds.length > 0
          ? await supabase
              .from("rosters")
              .select("owner_id, representative_character_name")
              .in("owner_id", memberUserIds)
              .order("created_at", { ascending: true })
              .returns<RosterOwnerRow[]>()
          : { data: [] as RosterOwnerRow[], error: null };

      if (rosterError) {
        setError(`공대원 목록을 불러오지 못했습니다: ${rosterError.message}`);
      }

      const representativeNameByUserId = new Map<string, string>();
      for (const row of rosterRows ?? []) {
        if (!representativeNameByUserId.has(row.owner_id)) {
          representativeNameByUserId.set(
            row.owner_id,
            row.representative_character_name,
          );
        }
      }

      setMembers(
        memberRows.map((row) => ({
          id: row.id,
          guild_id: row.guild_id,
          user_id: row.user_id,
          role: row.role,
          joined_at: row.joined_at,
          display_name: row.profiles?.display_name ?? null,
          representative_character_name:
            representativeNameByUserId.get(row.user_id) ?? null,
          avatar_url: row.profiles?.avatar_url ?? null,
        })),
      );
    }

    setIsLoading(false);
  }, [guildId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // 멤버의 역할을 바꾼다. (master만 성공하도록 guild_members_update RLS 정책이 막고 있다.
  // 그 정책은 role이 master인 행은 건드릴 수 없고, 새 role 값으로 master를 지정할 수도
  // 없게 막아뒀다 — 공대장 강등/승격은 오직 delegateMaster()를 통해서만 가능하다.)
  async function updateMemberRole(memberId: string, role: GuildRole) {
    const { error: updateError } = await supabase
      .from("guild_members")
      .update({ role })
      .eq("id", memberId);

    if (updateError) {
      throw new Error(`역할 변경에 실패했습니다: ${updateError.message}`);
    }

    await reload();
  }

  // 공대 이름을 바꾼다. (master만 성공하도록 guilds_update RLS 정책이 막고 있다.)
  async function updateGuildName(name: string) {
    if (!guildId) {
      return;
    }

    const { error: updateError } = await supabase
      .from("guilds")
      .update({ name })
      .eq("id", guildId);

    if (updateError) {
      throw new Error(`공대 이름 변경에 실패했습니다: ${updateError.message}`);
    }

    await reload();
  }

  // 이 공대에 연동할 디스코드 서버 ID를 설정한다. (master만 성공하도록
  // guilds_update RLS 정책이 막고 있다.) 빈 문자열을 넘기면 연동을 해제한다
  // (discord_guild_id는 unique라, 다른 공대가 이미 그 서버를 쓰고 있으면
  // DB 유니크 제약 위반 에러가 그대로 올라온다).
  async function updateDiscordGuildId(discordGuildId: string) {
    if (!guildId) {
      return;
    }

    const { error: updateError } = await supabase
      .from("guilds")
      .update({ discord_guild_id: discordGuildId.trim() || null })
      .eq("id", guildId);

    if (updateError) {
      throw new Error(`디스코드 연동에 실패했습니다: ${updateError.message}`);
    }

    await reload();
  }

  // 공대장을 다른 유저에게 위임한다: 기존 master는 officer로, 대상 유저는 master로
  // 원자적으로 바뀐다(delegate_guild_master RPC, security definer 함수 안에서
  // 트랜잭션으로 처리되므로 master가 0명/2명이 되는 중간 상태가 생기지 않는다).
  async function delegateMaster(newMasterUserId: string) {
    if (!guildId) {
      return;
    }

    const { error: rpcError } = await supabase.rpc("delegate_guild_master", {
      p_guild_id: guildId,
      p_new_master_user_id: newMasterUserId,
    });

    if (rpcError) {
      throw new Error(`공대장 위임에 실패했습니다: ${rpcError.message}`);
    }

    await reload();
  }

  // 초대 코드를 재발급한다. (officer 이상만 성공하도록 RPC 내부에서 권한을 검사한다.)
  // 기존 코드로 이미 공유한 사람들은 더 이상 그 코드로 참여할 수 없게 되므로 파괴적인 동작이다.
  async function regenerateInviteCode() {
    if (!guildId) {
      return;
    }

    const { error: rpcError } = await supabase.rpc(
      "regenerate_guild_invite_code",
      { p_guild_id: guildId },
    );

    if (rpcError) {
      throw new Error(`코드 재발급에 실패했습니다: ${rpcError.message}`);
    }

    await reload();
  }

  // 공대에서 탈퇴한다: 내 guild_members row(memberId)를 스스로 삭제한다.
  // guild_members_delete RLS 정책이 "user_id = auth.uid()인 행은 누구나 삭제 가능"을
  // 허용하므로 role(guest~officer) 상관없이 성공한다. master는 UI에서 이 버튼을 아예
  // 보여주지 않는다 — master가 탈퇴하면 그 공대에 master가 없어져 관리가 불가능해지므로,
  // master는 공대 삭제(deleteGuild)만 할 수 있게 한다.
  // 탈퇴하면 이 공대 자체가 더 이상 보이지 않아야 하므로 reload()는 부르지 않는다 —
  // 호출한 쪽에서 다른 화면으로 이동시켜야 한다.
  async function leaveGuild(memberId: string) {
    const { error: leaveError } = await supabase
      .from("guild_members")
      .delete()
      .eq("id", memberId);

    if (leaveError) {
      throw new Error(`공대 탈퇴에 실패했습니다: ${leaveError.message}`);
    }
  }

  // 공대 자체를 삭제한다. (master만 성공하도록 guilds_delete RLS 정책이 막고 있다.)
  // guild_members/guild_raid_visibility/parties(+party_slots)/guild_events(+guild_event_rsvps)가
  // 전부 guild_id에 on delete cascade가 걸려있어, 이 한 번의 delete로 관련 데이터가 모두 함께 지워진다.
  // 공대 자체가 사라지므로 reload()는 부르지 않는다 — 호출한 쪽에서 다른 화면으로 이동시켜야 한다.
  async function deleteGuild() {
    if (!guildId) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("guilds")
      .delete()
      .eq("id", guildId);

    if (deleteError) {
      throw new Error(`공대 삭제에 실패했습니다: ${deleteError.message}`);
    }
  }

  return {
    guild,
    members,
    isLoading,
    error,
    reload,
    updateMemberRole,
    updateGuildName,
    updateDiscordGuildId,
    delegateMaster,
    regenerateInviteCode,
    leaveGuild,
    deleteGuild,
  };
}
