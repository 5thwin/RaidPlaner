import { useMemo } from "react";
import { getMonthGrid, toDateKey } from "@/lib/calendarGrid";
import type { GuildEventWithRsvps } from "@/types/guildEvent";

interface CalendarMonthGridProps {
  year: number;
  month: number; // 0~11, Date의 월 인덱스와 동일
  eventsByDateKey: Map<string, GuildEventWithRsvps[]>;
  // member 이상만 빈 칸을 클릭해 일정을 등록할 수 있다.
  canCreateEvent: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDateClick: (date: Date) => void;
  onEventClick: (event: GuildEventWithRsvps) => void;
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
// 날짜 칸 하나에 칩으로 바로 보여줄 최대 일정 개수. 넘치면 "+N개"로 축약한다.
const MAX_VISIBLE_EVENTS_PER_DAY = 2;

function formatChipTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// 공대 캘린더의 월간 달력 그리드.
// 날짜 칸의 빈 영역을 클릭하면 그 날짜로 새 일정을 등록하려는 것(onDateClick),
// 칩(일정)을 클릭하면 상세를 보려는 것(onEventClick)이라 서로 다른 콜백으로 분리했다.
export function CalendarMonthGrid({
  year,
  month,
  eventsByDateKey,
  canCreateEvent,
  onPrevMonth,
  onNextMonth,
  onDateClick,
  onEventClick,
}: CalendarMonthGridProps) {
  const days = useMemo(() => getMonthGrid(year, month), [year, month]);

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="이전 달"
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          ◀
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {year}년 {month + 1}월
        </h2>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="다음 달"
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-700">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-gray-50 py-1 text-center text-xs font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-400"
          >
            {label}
          </div>
        ))}

        {days.map((day) => {
          const dateKey = toDateKey(day.date);
          const dayEvents = eventsByDateKey.get(dateKey) ?? [];
          const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS_PER_DAY);
          const overflowCount = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={dateKey}
              onClick={canCreateEvent ? () => onDateClick(day.date) : undefined}
              className={`flex min-h-16 flex-col gap-0.5 p-1 sm:min-h-24 sm:p-2 ${
                day.isCurrentMonth
                  ? "bg-white dark:bg-gray-800"
                  : "bg-gray-50 dark:bg-gray-900"
              } ${canCreateEvent ? "cursor-pointer" : ""} ${
                day.isToday
                  ? "border-2 border-blue-600 dark:border-blue-400"
                  : ""
              }`}
            >
              <span
                className={`text-xs sm:text-sm ${
                  !day.isCurrentMonth
                    ? "text-gray-400 dark:text-gray-500"
                    : day.isToday
                      ? "font-bold text-blue-600 dark:text-blue-400"
                      : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {day.date.getDate()}
              </span>

              <div className="flex flex-col gap-0.5">
                {visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onEventClick(event);
                    }}
                    className="truncate rounded bg-gray-100 px-1 py-0.5 text-left text-[10px] text-gray-700 hover:bg-gray-200 sm:text-xs dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    <span className="text-gray-500 dark:text-gray-400">
                      {formatChipTime(event.starts_at)}
                    </span>{" "}
                    {event.title}
                  </button>
                ))}
                {overflowCount > 0 && (
                  <span className="text-[10px] text-gray-400 sm:text-xs dark:text-gray-500">
                    +{overflowCount}개
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
