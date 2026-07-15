-- =========================================================
-- 마이그레이션 11: rosters (원정대) 테이블
-- =========================================================
-- 여러 계정을 쓰는 유저는 로스트아크 계정(원정대)을 여러 개 가질 수 있다.
-- 그래서 "원정대"를 유저(profiles)와 별도의 엔티티로 분리한다.
-- 유저 한 명이 여러 rosters를 가질 수 있고, 각 roster는 로스트아크 오픈 API 조회에
-- 사용한 대표 캐릭터명 하나로 연결된다.
--
-- characters가 어느 원정대 소속인지는 다음 마이그레이션(roster_id 컬럼)에서 표시하지만,
-- 캐릭터의 실제 소유자(characters.owner_id, 파티 슬롯 권한 로직이 기준으로 삼는 값)는
-- 그대로 유저이고 이번 변경과 무관하다.

create table public.rosters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  representative_character_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rosters is
  '유저가 보유한 원정대. 유저 한 명이 여러 로스트아크 계정(원정대)을 가질 수 있다.';

create index rosters_owner_id_idx on public.rosters (owner_id);

alter table public.rosters enable row level security;

grant select, insert, update, delete on public.rosters to authenticated;

create trigger touch_rosters_updated_at
  before update on public.rosters
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------
-- rosters 정책
-- ---------------------------------------------------------
-- 기본은 profiles/characters와 동일하게 본인 것만 select/insert/update/delete.
-- (공대 유저 초대 검색처럼 다른 유저의 대표 캐릭터명을 봐야 하는 경우를 위한 추가 select
--  정책은, characters가 officer 조회 정책을 후속 마이그레이션에서 추가한 것과 같은 방식으로
--  20260706121400_rosters_select_public.sql에서 따로 얹는다.)
create policy rosters_select_own on public.rosters
  for select
  using (owner_id = auth.uid());

create policy rosters_insert on public.rosters
  for insert
  with check (owner_id = auth.uid());

create policy rosters_update on public.rosters
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy rosters_delete on public.rosters
  for delete
  using (owner_id = auth.uid());
