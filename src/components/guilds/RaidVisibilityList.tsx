import type { RaidVisibilityEntry } from "@/types/raid";

interface RaidVisibilityListProps {
  entries: RaidVisibilityEntry[];
  onToggleVisibility: (entry: RaidVisibilityEntry) => void;
}

// 공대 레이드 노출 설정 목록. officer 이상만 이 컴포넌트를 렌더링하므로
// (표시 여부는 GuildDetailPage가 결정) 여기서는 별도 권한 분기 없이 토글 버튼을 항상 보여준다.
// 꺼진 레이드는 메인 화면(GuildBoardPage)의 레이드-파티 현황판에서 사라진다.
export function RaidVisibilityList({
  entries,
  onToggleVisibility,
}: RaidVisibilityListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        등록된 레이드가 없습니다.
      </p>
    );
  }

  return (
    <ul className="flex w-full max-w-xl flex-col gap-2">
      {entries.map((entry) => (
        <li
          key={entry.guild_raid_visibility_id}
          className={`flex items-center justify-between rounded-md border px-4 py-3 ${
            entry.is_visible
              ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              : "border-gray-100 bg-gray-50 opacity-50 dark:border-gray-800 dark:bg-gray-900"
          }`}
        >
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {entry.name}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {entry.difficulties.join(" · ")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onToggleVisibility(entry)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              entry.is_visible
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {entry.is_visible ? "숨기기" : "보이기"}
          </button>
        </li>
      ))}
    </ul>
  );
}
