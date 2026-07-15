import { getRosterColorScheme } from "@/lib/rosterColor";
import type { PartySlot } from "@/types/party";

interface PartySlotCellProps {
  slot: PartySlot;
  // 이 슬롯을 클릭해서 배정/해제를 시도할 수 있는지 여부.
  // (역할/소유권/클리어 잠금을 이미 반영한 최종 판단값이며, 실제 차단은
  //  DB 트리거/RLS가 하므로 여기서는 UI 노출만 담당한다.)
  canInteract: boolean;
  onEmptyClick: () => void;
  onFilledClick: () => void;
}

// 파티 슬롯 하나. 비어있으면 "빈 자리"를 눌러 후보 캐릭터를 배정할 수 있고,
// 채워져 있으면 눌러서 슬롯을 비울 수 있다(권한이 있을 때만).
export function PartySlotCell({
  slot,
  canInteract,
  onEmptyClick,
  onFilledClick,
}: PartySlotCellProps) {
  if (!slot.character) {
    return (
      <button
        type="button"
        disabled={!canInteract}
        onClick={onEmptyClick}
        className="flex h-14 flex-col items-center justify-center rounded-md border border-dashed border-gray-200 text-xs text-gray-400 enabled:hover:border-blue-600 enabled:hover:text-blue-600 disabled:cursor-not-allowed dark:border-gray-700 dark:text-gray-500 dark:enabled:hover:border-blue-400 dark:enabled:hover:text-blue-400"
      >
        + 빈 자리
      </button>
    );
  }

  // 슬롯에 채워진 캐릭터가 어느 원정대 소속인지 좌측 컬러 바로 구분해서 보여준다.
  const rosterColorScheme = getRosterColorScheme(
    slot.character.roster_color ?? "",
  );

  return (
    <button
      type="button"
      disabled={!canInteract}
      onClick={onFilledClick}
      title={canInteract ? "클릭하면 슬롯에서 뺍니다" : undefined}
      className={`flex h-14 flex-col items-center justify-center gap-px rounded-md border border-l-4 border-gray-200 bg-white px-1 text-center enabled:hover:border-red-600 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:enabled:hover:border-red-400 ${rosterColorScheme.bar}`}
    >
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {slot.character.character_name}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {slot.character.character_class_name} ·{" "}
        {slot.character.combat_power !== null
          ? slot.character.combat_power.toLocaleString()
          : "미확인"}
      </span>
      {slot.character.owner_display_name && (
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {slot.character.owner_display_name}
        </span>
      )}
    </button>
  );
}
