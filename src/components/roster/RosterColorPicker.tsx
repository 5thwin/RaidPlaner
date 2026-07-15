import { useEffect, useRef, useState } from "react";
import {
  getRosterColorPalette,
  getRosterColorScheme,
} from "@/lib/rosterColor";

interface RosterColorPickerProps {
  color: string;
  onSelect: (colorKey: string) => void;
}

// 원정대 색상 스와치 17개를 헤더에 항상 늘어놓으면 자리를 너무 많이 차지해서,
// CreatePartyDropdown과 같은 패턴(버튼 하나 + 클릭 시 펼쳐지는 팝오버, 바깥 클릭 시 닫힘)으로
// 접어둔다. 버튼 자체엔 지금 선택된 색만 작은 점으로 보여준다.
export function RosterColorPicker({ color, onSelect }: RosterColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentScheme = getRosterColorScheme(color);

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

  function handleSelect(colorKey: string) {
    onSelect(colorKey);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        title="원정대 색상 선택"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <span className={`h-3 w-3 rounded-full ${currentScheme.swatch}`} />
        색상
      </button>

      {isOpen && (
        <div className="absolute left-0 z-10 mt-1 grid w-40 grid-cols-6 gap-1.5 rounded-md border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {getRosterColorPalette().map((scheme) => (
            <button
              key={scheme.key}
              type="button"
              title={scheme.label}
              onClick={() => handleSelect(scheme.key)}
              className={`h-5 w-5 rounded-full ${scheme.swatch} ${
                color === scheme.key
                  ? "ring-2 ring-offset-2 ring-gray-900 ring-offset-white dark:ring-gray-100 dark:ring-offset-gray-800"
                  : "opacity-60 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
