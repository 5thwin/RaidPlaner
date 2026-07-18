import type { GuildMemberWithProfile } from "@/types/guild";
import { sortGuildMembersByRoleAndSelf } from "@/lib/guildRole";
import { GuildRoleIcon } from "@/components/guilds/GuildRoleIcon";

interface GuildMemberSelectorProps {
  members: GuildMemberWithProfile[];
  selectedUserId: string | null;
  currentUserId: string | null;
  onSelect: (userId: string) => void;
}

// "파티원" 화면 왼쪽 패널. 공대원 한 명을 클릭해서 고르면 오른쪽 패널에 그
// 사람의 활성 캐릭터 목록이 나온다(마스터-디테일 레이아웃). 좁은 화면에서는
// 위쪽에 가로 스크롤 리스트로, 넓은 화면에서는 세로 목록으로 보여준다.
// 목록은 본인이 최상단, 그 다음은 역할이 높은 순으로 정렬하고, 역할별 아이콘을 함께 보여준다.
export function GuildMemberSelector({
  members,
  selectedUserId,
  currentUserId,
  onSelect,
}: GuildMemberSelectorProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        공대원이 없습니다.
      </p>
    );
  }

  const sortedMembers = sortGuildMembersByRoleAndSelf(members, currentUserId);

  return (
    <ul className="flex gap-2 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
      {sortedMembers.map((member) => {
        const name =
          member.representative_character_name ??
          member.display_name ??
          "(이름 없음)";
        const isSelected = member.user_id === selectedUserId;

        return (
          <li key={member.id} className="flex-none">
            <button
              type="button"
              onClick={() => onSelect(member.user_id)}
              className={`flex w-full items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium sm:whitespace-normal ${
                isSelected
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <GuildRoleIcon role={member.role} className="h-3.5 w-3.5 flex-none" />
              <span className="truncate">{name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
