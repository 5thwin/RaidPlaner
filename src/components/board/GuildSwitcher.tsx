import type { MyGuildMembership } from "@/types/guild";

interface GuildSwitcherProps {
  guilds: MyGuildMembership[];
  selectedGuildId: string;
  onSelect: (guildId: string) => void;
}

// 여러 공대에 소속된 유저를 위한 공대 스위처.
// 소속 공대가 하나뿐이면 고를 필요가 없으므로 아무것도 렌더링하지 않는다.
export function GuildSwitcher({
  guilds,
  selectedGuildId,
  onSelect,
}: GuildSwitcherProps) {
  if (guilds.length <= 1) {
    return null;
  }

  return (
    <select
      value={selectedGuildId}
      onChange={(event) => onSelect(event.target.value)}
      className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
    >
      {guilds.map((guild) => (
        <option key={guild.guild_id} value={guild.guild_id}>
          {guild.guild_name}
        </option>
      ))}
    </select>
  );
}
