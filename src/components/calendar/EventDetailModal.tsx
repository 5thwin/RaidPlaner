import { GuildEventCard } from "@/components/calendar/GuildEventCard";
import type { GuildEventRsvpStatus, GuildEventWithRsvps } from "@/types/guildEvent";

interface EventDetailModalProps {
  event: GuildEventWithRsvps;
  canDelete: boolean;
  onSetRsvp: (status: GuildEventRsvpStatus) => void;
  onDelete: () => void;
  onClose: () => void;
}

// 달력의 일정 칩을 클릭했을 때 뜨는 상세 모달. 실제 내용(참석/불참, 삭제)은
// 기존 GuildEventCard를 그대로 재사용하고, 여기서는 오버레이 + 닫기 버튼만 감싼다.
export function EventDetailModal({
  event,
  canDelete,
  onSetRsvp,
  onDelete,
  onClose,
}: EventDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-md flex-col gap-3">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            닫기
          </button>
        </div>

        <GuildEventCard
          event={event}
          canDelete={canDelete}
          onSetRsvp={onSetRsvp}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
