-- =========================================================
-- 마이그레이션: guild_events(공대 일정) + guild_event_rsvps(참석/불참) 테이블
-- =========================================================
-- 파티(parties)와는 완전히 독립적인, 공대 단위의 "언제 모일지" 일정이다.
-- 투표/설문형이 아니라 member 이상이 날짜/시간을 직접 정해서 바로 등록하는
-- 고정 일정 등록형이고, 다른 공대원은 등록된 일정에 참석/불참만 표시한다.

create table public.guild_events (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guild_events is '공대 단위의 고정 일정(모임 시간). 특정 레이드 파티와는 무관한 독립적인 이벤트다.';

create index guild_events_guild_id_idx on public.guild_events (guild_id);
create index guild_events_starts_at_idx on public.guild_events (starts_at);

alter table public.guild_events enable row level security;

grant select, insert, update, delete on public.guild_events to authenticated;

create trigger touch_guild_events_updated_at
  before update on public.guild_events
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------
-- guild_events 정책
-- ---------------------------------------------------------
-- 조회는 공대 멤버 전부(guest 포함) 가능.
create policy guild_events_select on public.guild_events
  for select
  using (public.is_guild_member(guild_id));

-- 일정 등록은 member 이상만 가능하다(guest는 등록 불가). created_by는 반드시 본인.
create policy guild_events_insert on public.guild_events
  for insert
  with check (
    public.has_guild_role_at_least(guild_id, 'member')
    and created_by = auth.uid()
  );

-- 수정/삭제는 만든 본인이거나, officer 이상(공대 정리 목적)만 가능하다.
create policy guild_events_update on public.guild_events
  for update
  using (
    created_by = auth.uid()
    or public.has_guild_role_at_least(guild_id, 'officer')
  )
  with check (
    created_by = auth.uid()
    or public.has_guild_role_at_least(guild_id, 'officer')
  );

create policy guild_events_delete on public.guild_events
  for delete
  using (
    created_by = auth.uid()
    or public.has_guild_role_at_least(guild_id, 'officer')
  );

-- =========================================================
-- guild_event_rsvps (일정별 참석/불참 표시)
-- =========================================================
create table public.guild_event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.guild_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('going', 'not_going')),
  updated_at timestamptz not null default now(),

  -- 한 유저는 한 일정에 하나의 RSVP만 가진다(다시 누르면 status를 바꾼다).
  unique (event_id, user_id)
);

comment on table public.guild_event_rsvps is '공대 일정(guild_events)에 대한 유저별 참석/불참 표시. guild_id 컬럼은 없고 event_id를 거쳐 guild_events로 소속 공대를 알아낸다.';

create index guild_event_rsvps_event_id_idx on public.guild_event_rsvps (event_id);
create index guild_event_rsvps_user_id_idx on public.guild_event_rsvps (user_id);

alter table public.guild_event_rsvps enable row level security;

grant select, insert, update, delete on public.guild_event_rsvps to authenticated;

create trigger touch_guild_event_rsvps_updated_at
  before update on public.guild_event_rsvps
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------
-- guild_event_rsvps 정책
-- ---------------------------------------------------------
-- 조회는 그 일정이 속한 공대의 멤버 전부.
create policy guild_event_rsvps_select on public.guild_event_rsvps
  for select
  using (
    exists (
      select 1 from public.guild_events ge
      where ge.id = guild_event_rsvps.event_id
        and public.is_guild_member(ge.guild_id)
    )
  );

-- 참석/불참 표시는 파티에 캐릭터를 넣는 것과는 다른 종류의 액션이라
-- 역할 제약 없이(guest 포함) 그 공대의 멤버라면 누구나 자기 자신의 응답만 등록/수정할 수 있다.
create policy guild_event_rsvps_insert on public.guild_event_rsvps
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.guild_events ge
      where ge.id = event_id
        and public.is_guild_member(ge.guild_id)
    )
  );

create policy guild_event_rsvps_update on public.guild_event_rsvps
  for update
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.guild_events ge
      where ge.id = guild_event_rsvps.event_id
        and public.is_guild_member(ge.guild_id)
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.guild_events ge
      where ge.id = event_id
        and public.is_guild_member(ge.guild_id)
    )
  );

-- 삭제(응답 취소)는 본인 응답만 가능하다.
create policy guild_event_rsvps_delete on public.guild_event_rsvps
  for delete
  using (user_id = auth.uid());
