import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useMyGuilds } from "@/hooks/useMyGuilds";
import { useGuildEvents } from "@/hooks/useGuildEvents";
import { usePageHeaderExtra } from "@/hooks/usePageHeaderExtra";
import { PageSpinner } from "@/components/layout/PageSpinner";
import { CalendarMonthGrid } from "@/components/calendar/CalendarMonthGrid";
import { CreateEventModal } from "@/components/calendar/CreateEventModal";
import { EventDetailModal } from "@/components/calendar/EventDetailModal";
import { toDateKey } from "@/lib/calendarGrid";
import { hasGuildRoleAtLeast } from "@/lib/guildRole";
import type { GuildEventRsvpStatus, GuildEventWithRsvps } from "@/types/guildEvent";

// 매 렌더마다 새 JSX 객체를 만들지 않도록 컴포넌트 바깥에서 한 번만 만든다.
// usePageHeaderExtra는 넘겨받은 노드를 참조 동등성으로 비교하므로, 인라인으로 매번
// 새로 만들면 무한 리렌더 루프("Maximum update depth exceeded")로 이어진다.
const backToBoardLink = (
  <Link to="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
    파티 현황판으로
  </Link>
);

// 공대 캘린더 화면(/guilds/:guildId/calendar).
// parties(파티)와는 독립적인, 공대 전체의 모임 일정을 월간 달력 형태로 관리한다.
// - 달력의 날짜 칸을 클릭하면 그 날짜로 일정을 등록한다(member 이상만 가능).
// - 일정 칩을 클릭하면 상세 모달이 뜨고, 참석/불참 표시는 guest를 포함한 공대원
//   누구나 할 수 있으며 삭제는 만든 본인이거나 officer 이상만 가능하다.
// 실시간 반영은 useGuildEvents 내부의 Supabase Realtime 구독이 담당한다.
export function GuildCalendarPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { guilds, isLoading: isGuildsLoading } = useMyGuilds();
  const {
    events,
    isLoading: isEventsLoading,
    error,
    createEvent,
    deleteEvent,
    setMyRsvp,
  } = useGuildEvents(guildId);

  // 지금 보고 있는 달. 매달 1일로 고정해두고 년/월 이동 시 이 값만 갱신한다.
  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDateForCreate, setSelectedDateForCreate] = useState<Date | null>(
    null,
  );
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  usePageHeaderExtra(backToBoardLink);

  const eventsByDateKey = useMemo(() => {
    const map = new Map<string, GuildEventWithRsvps[]>();

    for (const event of events) {
      const key = toDateKey(new Date(event.starts_at));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }

    return map;
  }, [events]);

  if (isAuthLoading || isGuildsLoading) {
    return <PageSpinner label="불러오는 중..." />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const guild = guilds.find((membership) => membership.guild_id === guildId);

  if (!guild) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        이 공대의 정보를 찾을 수 없습니다.
      </p>
    );
  }

  const canCreateEvent = hasGuildRoleAtLeast(guild.role, "member");
  // detailEventId만 들고 있고 실제 일정 객체는 매 렌더 events에서 다시 찾는다.
  // 이렇게 해야 모달이 열려있는 동안 다른 사람의 RSVP/삭제가 실시간으로
  // 반영되고, 누군가 삭제해버린 경우 자연스럽게 모달이 닫힌다.
  const detailEvent = detailEventId
    ? (events.find((event) => event.id === detailEventId) ?? null)
    : null;

  async function runAction(action: () => Promise<void>) {
    setActionError(null);

    try {
      await action();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "요청 처리에 실패했습니다.",
      );
    }
  }

  function handlePrevMonth() {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function handleDateClick(date: Date) {
    if (!canCreateEvent) {
      return;
    }
    setActionError(null);
    setSelectedDateForCreate(date);
  }

  async function handleCreateEventSubmit(
    title: string,
    description: string | null,
    startsAtISOString: string,
  ) {
    await createEvent(title, description, startsAtISOString);
    setSelectedDateForCreate(null);
  }

  function handleSetRsvp(eventId: string, status: GuildEventRsvpStatus) {
    runAction(() => setMyRsvp(eventId, status));
  }

  async function handleDeleteEvent(eventId: string) {
    setActionError(null);

    try {
      await deleteEvent(eventId);
      setDetailEventId(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "일정 삭제에 실패했습니다.",
      );
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {guild.guild_name} 캘린더
      </h1>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}

      {isEventsLoading ? (
        <PageSpinner label="일정 불러오는 중..." />
      ) : (
        <CalendarMonthGrid
          year={viewDate.getFullYear()}
          month={viewDate.getMonth()}
          eventsByDateKey={eventsByDateKey}
          canCreateEvent={canCreateEvent}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onDateClick={handleDateClick}
          onEventClick={(event) => setDetailEventId(event.id)}
        />
      )}

      {selectedDateForCreate && (
        <CreateEventModal
          selectedDate={selectedDateForCreate}
          onSubmit={handleCreateEventSubmit}
          onClose={() => setSelectedDateForCreate(null)}
        />
      )}

      {detailEvent && (
        <EventDetailModal
          event={detailEvent}
          canDelete={
            detailEvent.created_by === user.id ||
            hasGuildRoleAtLeast(guild.role, "officer")
          }
          onSetRsvp={(status) => handleSetRsvp(detailEvent.id, status)}
          onDelete={() => handleDeleteEvent(detailEvent.id)}
          onClose={() => setDetailEventId(null)}
        />
      )}
    </div>
  );
}
