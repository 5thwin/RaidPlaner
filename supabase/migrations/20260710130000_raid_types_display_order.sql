-- =========================================================
-- 마이그레이션: raid_types.display_order 컬럼 추가
-- =========================================================
-- 레이드 목록을 입장 레벨(min_item_levels) 오름차순으로만 정렬하면, 같은 레벨대의
-- 레이드가 여러 개 있을 때(예: 세르카/종막:카제로스가 둘 다 1710, 4막/지평의 성당이
-- 둘 다 1700) 실제 출시 순서와 다르게 보일 수 있다. 운영자가 직접 정할 수 있는
-- 정렬 우선순위 컬럼을 추가한다 (작을수록 먼저 보임, null이면 맨 뒤).
alter table public.raid_types
  add column display_order int;

comment on column public.raid_types.display_order is
  '레이드 목록 표시 순서(작을수록 먼저). 운영자가 SQL Editor에서 직접 관리. null이면 정렬 시 맨 뒤로 보낸다.';
