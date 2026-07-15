import { useEffect, useRef, useState } from "react";
import { getDifficultyColorScheme } from "@/lib/difficultyColor";
import type { RaidType } from "@/types/raid";

interface CreatePartyDropdownProps {
  raidType: RaidType;
  onSelectDifficulty: (difficultyIndex: number) => void;
}

// 레이드 하나당 "파티 만들기" 버튼을 하나만 두고, 클릭하면 그 레이드의 난이도 목록이
// 드롭다운으로 펼쳐진다. 난이도 하나를 고르면 그 난이도로 파티가 생성되고 드롭다운은 닫힌다.
// 드롭다운 바깥을 클릭해도 닫힌다.
export function CreatePartyDropdown({
  raidType,
  onSelectDifficulty,
}: CreatePartyDropdownProps) {
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

  function handleSelect(difficultyIndex: number) {
    onSelectDifficulty(difficultyIndex);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        + 파티 만들기
      </button>

      {isOpen && (
        <div className="absolute left-0 z-10 mt-1 flex min-w-32 flex-col gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {raidType.difficulties.map((difficultyName, difficultyIndex) => {
            const color = getDifficultyColorScheme(difficultyIndex);
            return (
              <button
                key={difficultyIndex}
                type="button"
                onClick={() => handleSelect(difficultyIndex)}
                className={`rounded-md px-2 py-1 text-left text-xs font-medium hover:opacity-90 ${color.solid}`}
              >
                {difficultyName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
