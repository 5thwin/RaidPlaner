-- =========================================================
-- 2026-07-10: 레이드 표시 순서(display_order) 채우기 (기존 라이브 DB용 1회성 스크립트)
-- =========================================================
-- seed.sql은 `on conflict (name) do nothing`이라 이미 존재하는 row의 값은
-- 갱신하지 못한다. 이미 raid_types row가 있는 DB에서는 이 스크립트를
-- (20260710130000_raid_types_display_order.sql 마이그레이션 적용 후) SQL Editor에서 실행할 것.
--
-- 출시일 순: 서막:에키드나 -> 베히모스 -> 1막 -> 2막 -> 3막 -> 4막
--          -> 종막:카제로스 -> 세르카 -> 지평의 성당

update public.raid_types set display_order = 1 where name = '서막: 에키드나';
update public.raid_types set display_order = 2 where name = '베히모스';
update public.raid_types set display_order = 3 where name = '1막';
update public.raid_types set display_order = 4 where name = '2막';
update public.raid_types set display_order = 5 where name = '3막';
update public.raid_types set display_order = 6 where name = '4막';
update public.raid_types set display_order = 7 where name = '종막: 카제로스';
update public.raid_types set display_order = 8 where name = '세르카';
update public.raid_types set display_order = 9 where name = '지평의 성당';
