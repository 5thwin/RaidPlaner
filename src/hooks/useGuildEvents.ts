import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import type {
  GuildEvent,
  GuildEventRsvp,
  GuildEventRsvpStatus,
  GuildEventWithRsvps,
} from "@/types/guildEvent";

interface GuildEventRow extends GuildEvent {
  profiles: { display_name: string | null } | null;
}

// 특정 공대의 일정(guild_events) 목록을 다가오는 순(starts_at 오름차순)으로 불러오고,
// 일정마다 참석/불참 집계 + 내 RSVP 상태를 함께 계산해서 돌려주는 훅.
// 파티(parties)와 마찬가지로 guild_events/guild_event_rsvps 둘 다 Realtime 구독해서
// 다른 공대원의 일정 등록/RSVP가 즉시 반영되게 한다.
export function useGuildEvents(guildId: string | undefined) {
  const { user } = useAuth();
  const [events, setEvents] = useState<GuildEventWithRsvps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // guild_event_rsvps Realtime 이벤트가 "지금 화면에 보이는 일정"의 것인지 확인하기
  // 위한 ref. 구독 콜백은 클로저라서 state를 최신 값으로 못 볼 수 있어
  // ref로 최신 일정 id 목록을 들고 있는다.
  const eventIdsRef = useRef<string[]>([]);
  const hasLoadedOnceRef = useRef(false);

  const reload = useCallback(async () => {
    if (!guildId) {
      setEvents([]);
      eventIdsRef.current = [];
      setIsLoading(false);
      return;
    }

    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const finishLoading = () => {
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
    };

    const { data: eventRows, error: eventError } = await supabase
      .from("guild_events")
      .select("*, profiles(display_name)")
      .eq("guild_id", guildId)
      .order("starts_at", { ascending: true })
      .returns<GuildEventRow[]>();

    if (eventError) {
      setError(`일정 목록을 불러오지 못했습니다: ${eventError.message}`);
      setEvents([]);
      eventIdsRef.current = [];
      finishLoading();
      return;
    }

    const rows = eventRows ?? [];
    const eventIds = rows.map((row) => row.id);
    eventIdsRef.current = eventIds;

    if (eventIds.length === 0) {
      setEvents([]);
      finishLoading();
      return;
    }

    const { data: rsvpRows, error: rsvpError } = await supabase
      .from("guild_event_rsvps")
      .select("*")
      .in("event_id", eventIds)
      .returns<GuildEventRsvp[]>();

    if (rsvpError) {
      setError(`참석 여부를 불러오지 못했습니다: ${rsvpError.message}`);
      finishLoading();
      return;
    }

    const rsvpsByEvent = new Map<string, GuildEventRsvp[]>();
    for (const rsvp of rsvpRows ?? []) {
      const list = rsvpsByEvent.get(rsvp.event_id) ?? [];
      list.push(rsvp);
      rsvpsByEvent.set(rsvp.event_id, list);
    }

    setEvents(
      rows.map((row) => {
        const rsvps = rsvpsByEvent.get(row.id) ?? [];
        const myRsvp = user
          ? rsvps.find((rsvp) => rsvp.user_id === user.id)
          : undefined;

        return {
          id: row.id,
          guild_id: row.guild_id,
          title: row.title,
          description: row.description,
          starts_at: row.starts_at,
          created_by: row.created_by,
          created_at: row.created_at,
          updated_at: row.updated_at,
          created_by_display_name: row.profiles?.display_name ?? null,
          goingCount: rsvps.filter((rsvp) => rsvp.status === "going").length,
          notGoingCount: rsvps.filter((rsvp) => rsvp.status === "not_going")
            .length,
          myStatus: myRsvp?.status ?? null,
        };
      }),
    );

    finishLoading();
  }, [guildId, user]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    reload();
  }, [reload]);

  useEffect(() => {
    if (!guildId) {
      return;
    }

    // guild_events는 guild_id 컬럼이 있어서 서버 단에서 우리 공대 것만 필터링해 구독할 수 있다.
    const eventsChannel = supabase
      .channel(`guild-events-${guildId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "guild_events",
          filter: `guild_id=eq.${guildId}`,
        },
        () => {
          reload();
        },
      )
      .subscribe();

    // guild_event_rsvps는 guild_id 컬럼이 없어서(event_id를 거쳐야만 소속 공대를 알 수 있음)
    // 서버 단 필터링이 불가능하다. 테이블 전체를 구독하되, 이벤트가 "지금 화면에 보이는
    // 일정"의 RSVP일 때만 다시 불러오도록 클라이언트에서 한 번 더 걸러낸다.
    const rsvpsChannel = supabase
      .channel(`guild-event-rsvps-${guildId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "guild_event_rsvps" },
        (payload) => {
          const changedEventId =
            (payload.new as { event_id?: string } | null)?.event_id ??
            (payload.old as { event_id?: string } | null)?.event_id;

          if (changedEventId && eventIdsRef.current.includes(changedEventId)) {
            reload();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(rsvpsChannel);
    };
  }, [guildId, reload]);

  async function createEvent(
    title: string,
    description: string | null,
    startsAt: string,
  ) {
    if (!guildId || !user) {
      return;
    }

    const { error: insertError } = await supabase.from("guild_events").insert({
      guild_id: guildId,
      title,
      description,
      starts_at: startsAt,
      created_by: user.id,
    });

    if (insertError) {
      throw new Error(`일정 등록에 실패했습니다: ${insertError.message}`);
    }

    await reload();
  }

  async function deleteEvent(eventId: string) {
    const { error: deleteError } = await supabase
      .from("guild_events")
      .delete()
      .eq("id", eventId);

    if (deleteError) {
      throw new Error(`일정 삭제에 실패했습니다: ${deleteError.message}`);
    }

    await reload();
  }

  async function setMyRsvp(eventId: string, status: GuildEventRsvpStatus) {
    if (!user) {
      return;
    }

    const { error: upsertError } = await supabase
      .from("guild_event_rsvps")
      .upsert(
        { event_id: eventId, user_id: user.id, status },
        { onConflict: "event_id,user_id" },
      );

    if (upsertError) {
      throw new Error(`참석 여부 등록에 실패했습니다: ${upsertError.message}`);
    }

    await reload();
  }

  return {
    events,
    isLoading,
    error,
    reload,
    createEvent,
    deleteEvent,
    setMyRsvp,
  };
}
