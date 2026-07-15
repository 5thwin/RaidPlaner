-- =========================================================
-- 2026-07-11: 1막~4막/종막:카제로스 난이도별 입장 레벨 정확한 값 반영
-- (기존 라이브 DB용 1회성 스크립트)
-- =========================================================
-- seed.sql은 `on conflict (name) do nothing`이라서 이미 존재하는 row의 값은
-- 갱신하지 못한다. 이미 raid_types row가 있는 DB에서는 이 스크립트를
-- SQL Editor에서 실행할 것. 사용자가 확인해준 난이도별(노말/하드) 정확한
-- 입장 레벨 값이다. 세르카/지평의 성당은 이미 정확한 값이 들어있어 대상에서 뺐다.

update public.raid_types set min_item_levels = array[1660, 1680]::numeric[] where name = '1막';
update public.raid_types set min_item_levels = array[1670, 1690]::numeric[] where name = '2막';
update public.raid_types set min_item_levels = array[1680, 1700]::numeric[] where name = '3막';
update public.raid_types set min_item_levels = array[1700, 1720]::numeric[] where name = '4막';
update public.raid_types set min_item_levels = array[1710, 1730]::numeric[] where name = '종막: 카제로스';
