import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { hasGuildRoleAtLeast } from "@/lib/guildRole";
import type { GuildRole } from "@/types/guild";

interface GuildMenuDropdownProps {
  guildId: string;
  role: GuildRole;
}

// "캘린더"/"파티원"/"공대 관리"처럼 공대 스코프 이동 링크가 계속 늘어나도 헤더
// 폭이 넓어지지 않도록, 이 링크들을 메뉴 버튼 하나 아래 드롭다운으로 묶는다.
// CreatePartyDropdown과 같은 패턴(버튼 클릭 → absolute 패널 토글, 바깥 클릭 시
// 닫힘)을 그대로 재사용한다.
export function GuildMenuDropdown({ guildId, role }: GuildMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () =>
      document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        메뉴 ▾
      </button>

      {isOpen && (
        <div className="absolute left-0 z-10 mt-1 flex min-w-36 flex-col gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <Link
            to={`/guilds/${guildId}/calendar`}
            onClick={() => setIsOpen(false)}
            className="rounded-md px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            캘린더
          </Link>
          <Link
            to={`/guilds/${guildId}/members`}
            onClick={() => setIsOpen(false)}
            className="rounded-md px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            파티원
          </Link>
          {hasGuildRoleAtLeast(role, "officer") && (
            <Link
              to={`/guilds/${guildId}`}
              onClick={() => setIsOpen(false)}
              className="rounded-md px-3 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              공대 관리
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
