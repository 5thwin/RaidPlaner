-- =========================================================
-- 마이그레이션 19: rosters.color 컬럼 추가 (원정대 구분 색상)
-- =========================================================
-- 파티 슬롯에서 캐릭터가 어느 원정대 소속인지 색으로 구분해서 보여주기 위해,
-- 원정대(rosters)마다 유저가 고정 팔레트 중 하나를 골라 저장한다.
-- 팔레트 키 목록/의미는 src/lib/rosterColor.ts가 유일한 출처이고, 여기서는
-- 그 키 문자열을 그대로 저장하는 단순 text 컬럼이라 enum은 두지 않는다.
--
-- 기존 rosters_update 정책(owner_id = auth.uid()만 update 가능)이 컬럼 추가와
-- 무관하게 이 컬럼도 그대로 커버하므로 정책은 새로 추가하지 않는다. 조회도
-- 이미 rosters_select_public 정책(로그인한 유저 전체 select 허용)이 있어서
-- 파티를 보는 모든 공대원이 이 색상 값을 함께 조회할 수 있다.
alter table public.rosters
  add column color text not null default 'blue';

comment on column public.rosters.color is
  '원정대 구분 색상. src/lib/rosterColor.ts의 고정 팔레트 키(예: blue, rose)를 저장한다.';
