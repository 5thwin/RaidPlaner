import type { GuildEventRsvpStatus, GuildEventWithRsvps } from "@/types/guildEvent";

interface GuildEventCardProps {
  event: GuildEventWithRsvps;
  canDelete: boolean;
  onSetRsvp: (status: GuildEventRsvpStatus) => void;
  onDelete: () => void;
}

function formatEventDateTime(startsAt: string): string {
  return new Date(startsAt).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    weekday: "short",
  });
}

// 공대 일정 카드 하나. 참석/불참 버튼은 선택된 상태를 강조하는 토글 스타일이고
// (PartyCard의 클리어 토글 버튼 패턴 참고), 삭제 버튼은 만든 본인이거나 officer
// 이상인 경우에만(canDelete) 부모가 렌더링을 결정한다.
export function GuildEventCard({
  event,
  canDelete,
  onSetRsvp,
  onDelete,
}: GuildEventCardProps) {
  function handleDelete() {
    if (window.confirm("이 일정을 삭제할까요?")) {
      onDelete();
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {event.title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatEventDateTime(event.starts_at)}
          </p>
        </div>

        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800"
          >
            삭제
          </button>
        )}
      </div>

      {event.description && (
        <p className="text-sm text-gray-700 dark:text-gray-200">
          {event.description}
        </p>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {event.created_by_display_name ?? "알 수 없음"}님이 등록
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSetRsvp("going")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            event.myStatus === "going"
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          참석 {event.goingCount}
        </button>
        <button
          type="button"
          onClick={() => onSetRsvp("not_going")}
          className={`rounded-md px-3 py-1.5 text-xs font-medium ${
            event.myStatus === "not_going"
              ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          불참 {event.notGoingCount}
        </button>
      </div>
    </div>
  );
}
