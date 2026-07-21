-- =========================================================
-- 마이그레이션: 디스코드 연동 (공대 <-> 디스코드 서버, 유저 <-> 디스코드 계정)
-- =========================================================
-- /파티현황 슬래시 명령어(discord-interactions Edge Function)가 "이 디스코드
-- 서버가 어느 로아팟 공대인지", "이 디스코드 유저가 로아팟의 누구인지"를
-- 알아야 해서 필요한 매핑 테이블들이다.

-- ---------------------------------------------------------
-- 공대 <-> 디스코드 서버
-- ---------------------------------------------------------
alter table public.guilds
  add column discord_guild_id text unique;

comment on column public.guilds.discord_guild_id is
  '연동된 디스코드 서버 ID. 디스코드 서버 하나는 최대 하나의 로아팟 공대에만 연결된다.
   설정은 guilds_update 정책을 그대로 따르므로 master만 바꿀 수 있다.';

-- ---------------------------------------------------------
-- 유저 <-> 디스코드 계정
-- ---------------------------------------------------------
create table public.discord_links (
  discord_user_id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  linked_at timestamptz not null default now()
);

comment on table public.discord_links is
  '디스코드 유저 ID <-> 로아팟 계정(profiles) 연동. 연동 자체는
  discord-interactions Edge Function이 service role로 기록한다(/연동 명령어).';

create index discord_links_user_id_idx on public.discord_links (user_id);

alter table public.discord_links enable row level security;

-- 조회만 authenticated에 열어서, 프로필 화면에서 "연동됨" 여부를 본인이 볼 수 있게 한다.
-- 쓰기는 Edge Function(service role, RLS 우회)을 통해서만 이뤄진다.
grant select on public.discord_links to authenticated;

create policy discord_links_select_own on public.discord_links
  for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------
-- 계정 연동용 1회성 코드
-- ---------------------------------------------------------
-- 로아팟 프로필 화면에서 코드를 발급받아, 디스코드에서 "/연동 코드:XXXXXX"로
-- 입력하면 Edge Function이 이 코드를 확인하고 discord_links를 만든다.
create table public.discord_link_codes (
  code text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.discord_link_codes is '디스코드 계정 연동용 1회성 코드(10분 만료).';

create index discord_link_codes_user_id_idx on public.discord_link_codes (user_id);

alter table public.discord_link_codes enable row level security;

grant select, insert, delete on public.discord_link_codes to authenticated;

-- 본인 코드만 발급/조회/삭제(재발급 시 이전 코드 정리용) 가능.
create policy discord_link_codes_select_own on public.discord_link_codes
  for select
  using (user_id = auth.uid());

create policy discord_link_codes_insert_own on public.discord_link_codes
  for insert
  with check (user_id = auth.uid());

create policy discord_link_codes_delete_own on public.discord_link_codes
  for delete
  using (user_id = auth.uid());
