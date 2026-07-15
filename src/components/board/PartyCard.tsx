import { hasGuildRoleAtLeast } from "@/lib/guildRole";
import { getDifficultyColorScheme } from "@/lib/difficultyColor";
import { PartySlotCell } from "@/components/board/PartySlotCell";
import type { PartyWithSlots } from "@/types/party";
import type { GuildRole } from "@/types/guild";

interface PartyCardProps {
  label: string;
  party: PartyWithSlots;
  maxPlayers: number;
  myRole: GuildRole | null;
  userId: string | undefined;
  onToggleCleared: () => void;
  onDeleteParty: () => void;
  onOpenAssignModal: (slotId: string) => void;
  onRemoveCharacter: (slotId: string) => void;
}

// 파티 카드 하나. 슬롯 그리드 + 클리어 토글 버튼(+officer 이상은 삭제 버튼)을 보여준다.
// 슬롯 클릭 가능 여부는 4단계 권한 규칙을 그대로 반영한다:
// - guest: 애초에 아무 슬롯도 못 건드린다.
// - member: 본인 소유 캐릭터가 든 슬롯만 빼거나, 빈 슬롯에 넣을 수 있다.
// - officer 이상: 아무 슬롯이나 넣고 뺄 수 있다.
// - is_cleared === true인 동안은 역할과 무관하게 전부 잠긴다.
// 실제 차단은 DB 트리거/RLS가 하므로, 여기서는 UI 노출/비활성화만 담당한다.
export function PartyCard({
  label,
  party,
  maxPlayers,
  myRole,
  userId,
  onToggleCleared,
  onDeleteParty,
  onOpenAssignModal,
  onRemoveCharacter,
}: PartyCardProps) {
  const color = getDifficultyColorScheme(party.difficulty_index);
  const canToggleCleared = hasGuildRoleAtLeast(myRole, "member");
  const canDeleteParty = hasGuildRoleAtLeast(myRole, "officer");
  const isOfficerOrAbove = hasGuildRoleAtLeast(myRole, "officer");
  const canEditSlotsAtAll = !party.is_cleared && myRole !== null && myRole !== "guest";

  function canInteractWithSlot(slot: PartyWithSlots["slots"][number]): boolean {
    if (!canEditSlotsAtAll) {
      return false;
    }

    if (!slot.character) {
      // 빈 슬롯: member/officer 이상이면 열 수 있다(후보 목록 범위는 모달이 역할별로 처리).
      return true;
    }

    return isOfficerOrAbove || slot.character.owner_id === userId;
  }

  function handleDelete() {
    if (window.confirm("이 파티를 삭제할까요? 슬롯 정보도 함께 삭제됩니다.")) {
      onDeleteParty();
    }
  }

  const sortedSlots = [...party.slots].sort(
    (a, b) => a.slot_index - b.slot_index,
  );
  // 파티 카드가 이제 고정 2열 그리드가 아니라 가로로 흐르는 레이아웃(PartyGrid)
  // 안에서 min-w-80 기준으로 유연하게 폭을 갖기 때문에, 8인 레이드도 좁은 화면이
  // 아닌 이상 대체로 8칸을 한 줄에 펼칠 만큼 폭이 나온다.
  const gridColsClass =
    maxPlayers === 8 ? "grid-cols-4 sm:grid-cols-8" : "grid-cols-2 sm:grid-cols-4";

  return (
    <div
      className={`flex w-full flex-col gap-1.5 rounded-lg border p-2.5 ${
        party.is_cleared
          ? "border-gray-100 bg-gray-100 opacity-70 dark:border-gray-800 dark:bg-gray-900/60"
          : color.card
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {label}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${color.solid}`}
          >
            {party.difficulty_name}
          </span>
          {party.is_cleared && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              클리어 완료
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canToggleCleared && (
            <button
              type="button"
              onClick={onToggleCleared}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                party.is_cleared
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              {party.is_cleared ? "클리어 취소" : "클리어"}
            </button>
          )}
          {canDeleteParty && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      <div className={`grid gap-1 ${gridColsClass}`}>
        {sortedSlots.map((slot) => (
          <PartySlotCell
            key={slot.id}
            slot={slot}
            canInteract={canInteractWithSlot(slot)}
            onEmptyClick={() => onOpenAssignModal(slot.id)}
            onFilledClick={() => onRemoveCharacter(slot.id)}
          />
        ))}
      </div>
    </div>
  );
}
