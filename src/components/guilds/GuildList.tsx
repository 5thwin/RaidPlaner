import { Link } from "react-router";
import type { MyGuildMembership } from "@/types/guild";
import { GUILD_ROLE_LABEL } from "@/lib/guildRole";

interface GuildListProps {
  guilds: MyGuildMembership[];
}

// 로그인한 유저가 속한 공대들을 리스트로 보여준다.
// 한 유저가 여러 공대에 속할 수 있으므로 목록 형태로 표시하며,
// 각 항목을 누르면 그 공대의 상세(멤버 관리) 화면으로 이동한다.
export function GuildList({ guilds }: GuildListProps) {
  if (guilds.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        아직 소속된 공대가 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex w-full max-w-xl flex-col gap-2">
      {guilds.map((guild) => (
        <li key={guild.guild_id}>
          <Link
            to={`/guilds/${guild.guild_id}`}
            className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {guild.guild_name}
            </span>
            <span className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {GUILD_ROLE_LABEL[guild.role]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
