import type { GuildMemberWithProfile, GuildRole } from "@/types/guild";
import {
  GUILD_ROLES,
  GUILD_ROLE_LABEL,
  hasGuildRoleAtLeast,
  sortGuildMembersByRoleAndSelf,
} from "@/lib/guildRole";
import { GuildRoleIcon } from "@/components/guilds/GuildRoleIcon";

interface MemberListProps {
  members: GuildMemberWithProfile[];
  myRole: GuildRole | null;
  currentUserId: string | null;
  onChangeRole: (memberId: string, role: GuildRole) => void;
  onRequestDelegateMaster: (member: GuildMemberWithProfile) => void;
}

// 공대원 목록. master만 각 멤버의 역할을 드롭다운으로 바꿀 수 있고,
// 그 외 역할(officer 이하)은 현재 역할을 뱃지로만 보여준다.
// (실제 차단은 Supabase RLS가 하지만, 여기서는 화면에 컨트롤 자체를 숨긴다.)
// - master 행은 일반 역할 변경 드롭다운으로 건드릴 수 없다(뱃지만 노출) — 공대장은
//   오직 "공대장 위임" 절차로만 바뀐다.
// - 목록은 본인이 최상단, 그 다음은 역할이 높은 순으로 정렬한다.
export function MemberList({
  members,
  myRole,
  currentUserId,
  onChangeRole,
  onRequestDelegateMaster,
}: MemberListProps) {
  const canChangeRole = hasGuildRoleAtLeast(myRole, "master");
  const sortedMembers = sortGuildMembersByRoleAndSelf(members, currentUserId);

  if (members.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        공대원이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex w-full max-w-xl flex-col gap-2">
      {sortedMembers.map((member) => {
        const name =
          member.representative_character_name ??
          member.display_name ??
          "(이름 없음)";
        const showSubName =
          member.representative_character_name && member.display_name;
        const isMasterRow = member.role === "master";
        const canDelegateToThisMember = canChangeRole && !isMasterRow;

        return (
          <li
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {name}
                {member.user_id === currentUserId && (
                  <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">
                    (나)
                  </span>
                )}
              </span>
              {showSubName && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {member.display_name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canDelegateToThisMember && (
                <button
                  type="button"
                  onClick={() => onRequestDelegateMaster(member)}
                  className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  공대장 위임
                </button>
              )}

              {canChangeRole && !isMasterRow ? (
                <select
                  value={member.role}
                  onChange={(event) =>
                    onChangeRole(member.id, event.target.value as GuildRole)
                  }
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  {GUILD_ROLES.filter((role) => role !== "master").map(
                    (role) => (
                      <option key={role} value={role}>
                        {GUILD_ROLE_LABEL[role]}
                      </option>
                    ),
                  )}
                </select>
              ) : (
                <span className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  <GuildRoleIcon role={member.role} className="h-3.5 w-3.5" />
                  {GUILD_ROLE_LABEL[member.role]}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
