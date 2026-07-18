import type { GuildRole } from "@/types/guild";

// Postgres의 guild_role enum과 동일한 순서(guest < member < officer < master)를
// 화면에서도 그대로 써서 "이 버튼/폼을 보여줄지"를 판단한다.
// 실제 권한 차단(진짜 보안)은 Supabase RLS가 DB 단에서 강제하므로,
// 여기서는 어디까지나 "UI를 보여줄지 말지"만 결정한다.
const GUILD_ROLE_RANK: Record<GuildRole, number> = {
  guest: 0,
  member: 1,
  officer: 2,
  master: 3,
};

export const GUILD_ROLES: GuildRole[] = [
  "guest",
  "member",
  "officer",
  "master",
];

export const GUILD_ROLE_LABEL: Record<GuildRole, string> = {
  guest: "게스트",
  member: "파티원",
  officer: "운영진",
  master: "공대장",
};

// 현재 역할(role)이 minRole "이상"의 권한인지 검사한다.
export function hasGuildRoleAtLeast(
  role: GuildRole | null | undefined,
  minRole: GuildRole,
): boolean {
  if (!role) {
    return false;
  }

  return GUILD_ROLE_RANK[role] >= GUILD_ROLE_RANK[minRole];
}

// 멤버 목록 정렬: 로그인한 본인이 항상 맨 위, 그 다음은 권한이 높은 순
// (master > officer > member > guest)으로 정렬한다.
export function sortGuildMembersByRoleAndSelf<
  T extends { user_id: string; role: GuildRole },
>(members: T[], currentUserId: string | null | undefined): T[] {
  return [...members].sort((a, b) => {
    const aIsMe = a.user_id === currentUserId;
    const bIsMe = b.user_id === currentUserId;

    if (aIsMe !== bIsMe) {
      return aIsMe ? -1 : 1;
    }

    return GUILD_ROLE_RANK[b.role] - GUILD_ROLE_RANK[a.role];
  });
}
