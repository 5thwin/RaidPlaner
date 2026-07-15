// guild_events 테이블 한 행. supabase/migrations의
// 20260713120000_guild_events.sql과 대응된다.
// parties(파티)와는 독립적인, 공대 단위의 고정 일정(모임 시간)이다.
export interface GuildEvent {
  id: string;
  guild_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 참석/불참 상태. guild_event_rsvps.status의 check 제약과 대응된다.
export type GuildEventRsvpStatus = "going" | "not_going";

// guild_event_rsvps 테이블 한 행.
export interface GuildEventRsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: GuildEventRsvpStatus;
  updated_at: string;
}

// 화면에 카드로 보여줄 때 필요한, 일정 + 집계된 RSVP 정보.
export interface GuildEventWithRsvps extends GuildEvent {
  created_by_display_name: string | null;
  goingCount: number;
  notGoingCount: number;
  myStatus: GuildEventRsvpStatus | null;
}
