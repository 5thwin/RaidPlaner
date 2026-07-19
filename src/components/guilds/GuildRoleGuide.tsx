import { useState } from "react";
import { GuildRoleIcon } from "@/components/guilds/GuildRoleIcon";
import type { GuildRole } from "@/types/guild";

const ROLE_GUIDE: { role: GuildRole; label: string; description: string }[] = [
  {
    role: "master",
    label: "공대장",
    description:
      "공대 이름 변경, 멤버 권한 변경, 공대장 위임, 공대 삭제 등 공대 전체를 관리합니다.",
  },
  {
    role: "officer",
    label: "운영진",
    description:
      "초대 코드 관리, 레이드 노출 설정을 할 수 있고, 아무 멤버의 캐릭터나 파티 슬롯에 배정/해제할 수 있습니다.",
  },
  {
    role: "member",
    label: "파티원",
    description: "본인 캐릭터를 파티 슬롯에 배정/해제할 수 있습니다.",
  },
  {
    role: "guest",
    label: "게스트",
    description:
      "초대 코드로 갓 참여한 상태입니다. 파티 현황판/멤버 목록은 볼 수 있지만 파티 배정은 할 수 없어요 — 운영진 이상이 파티원으로 승격해야 배정할 수 있습니다.",
  },
];

// 공대 상세 페이지의 멤버 목록에서 역할 아이콘(왕관/방패/사람 등)이 죽 나열되는데,
// "이게 뭐지?"를 바로 확인할 수 있는 자리가 없었다(2026-07-19 사용자 피드백).
// 호버 툴팁은 모바일에서 아예 안 먹히므로(활성/비활성 버튼 건과 동일한 이유),
// 탭으로 펼치는 정적인 안내로 만들었다 — 기본은 접힌 상태라 화면을 덜 차지한다.
export function GuildRoleGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex w-full max-w-xl flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between text-left text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        권한 안내
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {isOpen ? "접기 ▲" : "펼치기 ▼"}
        </span>
      </button>

      {isOpen && (
        <ul className="flex flex-col gap-2.5 border-t border-gray-100 pt-2.5 dark:border-gray-700">
          {ROLE_GUIDE.map(({ role, label, description }) => (
            <li key={role} className="flex items-start gap-2">
              <GuildRoleIcon
                role={role}
                className="mt-0.5 h-4 w-4 flex-none text-gray-400 dark:text-gray-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
