import type { GuildMemberWithProfile, GuildRole } from "@/types/guild";
import {
  GUILD_ROLES,
  GUILD_ROLE_LABEL,
  hasGuildRoleAtLeast,
} from "@/lib/guildRole";

interface MemberListProps {
  members: GuildMemberWithProfile[];
  myRole: GuildRole | null;
  onChangeRole: (memberId: string, role: GuildRole) => void;
}

// 공대원 목록. master만 각 멤버의 역할을 드롭다운으로 바꿀 수 있고,
// 그 외 역할(officer 이하)은 현재 역할을 뱃지로만 보여준다.
// (실제 차단은 Supabase RLS가 하지만, 여기서는 화면에 컨트롤 자체를 숨긴다.)
export function MemberList({
  members,
  myRole,
  onChangeRole,
}: MemberListProps) {
  const canChangeRole = hasGuildRoleAtLeast(myRole, "master");

  if (members.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        공대원이 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex w-full max-w-xl flex-col gap-2">
      {members.map((member) => {
        const name =
          member.representative_character_name ??
          member.display_name ??
          "(이름 없음)";
        const showSubName =
          member.representative_character_name && member.display_name;

        return (
          <li
            key={member.id}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {name}
              </span>
              {showSubName && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {member.display_name}
                </span>
              )}
            </div>

            {canChangeRole ? (
              <select
                value={member.role}
                onChange={(event) =>
                  onChangeRole(member.id, event.target.value as GuildRole)
                }
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                {GUILD_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {GUILD_ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {GUILD_ROLE_LABEL[member.role]}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
