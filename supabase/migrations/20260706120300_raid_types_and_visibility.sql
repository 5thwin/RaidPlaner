-- =========================================================
-- 마이그레이션 4: raid_types(레이드 마스터 데이터) + guild_raid_visibility(공대별 노출 설정)
-- =========================================================
-- raid_types는 "레이드 자체의 정보"를 담는 앱 전역 마스터 데이터다.
-- 아직 앱에서 유저가 직접 레이드를 추가하는 기능은 없으므로,
-- 이 테이블의 실제 데이터는 supabase/seed.sql 로 관리자가 SQL Editor에서 직접 넣는다.

create table public.raid_types (
  id uuid primary key default gen_random_uuid(),
  -- 레이드 이름은 유일해야 한다 (같은 이름의 레이드가 중복 등록되는 것을 막고,
  -- seed.sql에서 `on conflict (name) do nothing`으로 반복 실행해도 안전하게 만들어준다).
  name text not null unique,
  -- 난이도 이름 목록. 레이드마다 개수/이름 체계가 다르므로 고정 enum이 아니라 배열로 저장한다.
  -- 예: 발탄 -> ['노말', '하드'], 쿠크세이튼 -> ['노말']
  difficulties text[] not null,
  -- 위 difficulties와 같은 순서/같은 길이로, 난이도별 입장 최소 아이템 레벨을 저장한다.
  -- (파티 빈 슬롯 후보를 고를 때 캐릭터의 ItemAvgLevel과 비교하기 위해 필요하다.)
  -- 정확한 수치는 자주 바뀌고 이 마이그레이션 작성 시점 기준으로 확신할 수 없는 값이 많아서,
  -- 일단 null(미정)로 시드해두고 운영자가 SQL Editor에서 직접 채워 넣는 것을 전제로 한다.
  min_item_levels numeric[],
  max_players int not null,
  created_at timestamptz not null default now(),
  constraint raid_types_max_players_check check (max_players in (4, 8)),
  constraint raid_types_difficulties_not_empty check (array_length(difficulties, 1) > 0),
  constraint raid_types_min_item_levels_length_check check (
    min_item_levels is null or array_length(min_item_levels, 1) = array_length(difficulties, 1)
  )
);

comment on table public.raid_types is '레이드 종류 마스터 데이터 (전역, 공대와 무관). 앱에서 직접 추가하는 UI는 아직 없고 SQL로 관리한다.';

-- 공대별로 어떤 레이드를 목록에 보여줄지/숨길지 저장하는 오버레이 테이블.
-- raid_types 자체를 건드리지 않고, (공대, 레이드) 조합마다 별도로 노출 여부를 둔다.
create table public.guild_raid_visibility (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  raid_type_id uuid not null references public.raid_types (id) on delete cascade,
  is_visible boolean not null default true,
  unique (guild_id, raid_type_id)
);

comment on table public.guild_raid_visibility is '공대별 레이드 노출(보임/숨김) 설정. 새 공대/새 레이드가 생기면 트리거로 기본값(true) row가 자동 생성된다.';

create index guild_raid_visibility_guild_id_idx on public.guild_raid_visibility (guild_id);
create index guild_raid_visibility_raid_type_id_idx on public.guild_raid_visibility (raid_type_id);

alter table public.raid_types enable row level security;
alter table public.guild_raid_visibility enable row level security;

grant select, insert, update, delete on public.raid_types to authenticated;
grant select, insert, update, delete on public.guild_raid_visibility to authenticated;

-- ---------------------------------------------------------
-- raid_types 정책
-- ---------------------------------------------------------
-- 로그인한 유저라면 누구나 레이드 마스터 데이터를 읽을 수 있다 (민감한 정보가 아님).
create policy raid_types_select on public.raid_types
  for select
  using (auth.uid() is not null);

-- insert/update/delete 정책은 만들지 않는다.
-- RLS가 켜져 있고 정책이 없으면 기본적으로 거부되므로,
-- 일반 유저는 앱을 통해 레이드 마스터 데이터를 바꿀 수 없다.
-- (관리자가 Supabase 대시보드 SQL Editor에서 postgres 권한으로만 수정)

-- ---------------------------------------------------------
-- guild_raid_visibility 정책
-- ---------------------------------------------------------
create policy guild_raid_visibility_select on public.guild_raid_visibility
  for select
  using (public.is_guild_member(guild_id));

-- 레이드 노출 설정 변경은 officer 이상만 가능하다.
create policy guild_raid_visibility_insert on public.guild_raid_visibility
  for insert
  with check (public.has_guild_role_at_least(guild_id, 'officer'));

create policy guild_raid_visibility_update on public.guild_raid_visibility
  for update
  using (public.has_guild_role_at_least(guild_id, 'officer'))
  with check (public.has_guild_role_at_least(guild_id, 'officer'));

create policy guild_raid_visibility_delete on public.guild_raid_visibility
  for delete
  using (public.has_guild_role_at_least(guild_id, 'officer'));

-- ---------------------------------------------------------
-- 새 공대가 생기면, 현재 존재하는 모든 레이드에 대해
-- "기본적으로 보이는(true)" 설정 row를 자동으로 만들어준다.
-- ---------------------------------------------------------
create function public.seed_guild_raid_visibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.guild_raid_visibility (guild_id, raid_type_id, is_visible)
  select new.id, rt.id, true
  from public.raid_types rt;

  return new;
end;
$$;

create trigger on_guild_created_seed_visibility
  after insert on public.guilds
  for each row execute function public.seed_guild_raid_visibility();

-- ---------------------------------------------------------
-- 새 레이드가 raid_types에 추가되면, 이미 존재하는 모든 공대에 대해
-- 마찬가지로 "기본적으로 보이는(true)" 설정 row를 자동으로 만들어준다.
-- ---------------------------------------------------------
create function public.seed_raid_visibility_for_guilds()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.guild_raid_visibility (guild_id, raid_type_id, is_visible)
  select g.id, new.id, true
  from public.guilds g;

  return new;
end;
$$;

create trigger on_raid_type_created_seed_visibility
  after insert on public.raid_types
  for each row execute function public.seed_raid_visibility_for_guilds();
