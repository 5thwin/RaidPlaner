-- =========================================================
-- 마이그레이션 12: characters.roster_id 컬럼 추가 (nullable)
-- =========================================================
-- 캐릭터가 어느 원정대(rosters) 소속인지 표시한다. 캐릭터의 실제 소유자(owner_id, 파티
-- 슬롯 권한 로직의 기준)는 그대로 유지되고 이번 변경으로 바뀌지 않는다 — roster_id는
-- 같은 owner_id 아래 여러 원정대를 구분하기 위한 값일 뿐이다.
--
-- 기존 characters 행에는 아직 값이 없으므로 우선 nullable로 추가하고,
-- 다음 마이그레이션(20260706121200)에서 백필한 뒤 not null로 바꾼다.
alter table public.characters
  add column roster_id uuid references public.rosters (id) on delete cascade;

comment on column public.characters.roster_id is
  '이 캐릭터가 속한 원정대. owner_id(실제 소유자, 파티 슬롯 권한 기준)와는 별개 값이다.';

create index characters_roster_id_idx on public.characters (roster_id);
