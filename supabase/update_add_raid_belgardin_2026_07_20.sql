-- =========================================================
-- 레이드 추가: 벨가르딘
-- =========================================================
-- 노말/하드/나이트메어, 8인, 입장 레벨 [1750, 1770, 1780].
-- display_order는 기존 마지막(지평의 성당 = 9) 다음 순번인 10으로 둔다.
-- INSERT하면 트리거(on_raid_type_created_seed_visibility)가 자동으로 모든
-- 기존 공대에 guild_raid_visibility(기본 노출 true) row를 만들어준다.
insert into public.raid_types (name, difficulties, max_players, min_item_levels, display_order)
values
  ('벨가르딘', array['노말', '하드', '나이트메어'], 8, array[1750, 1770, 1780]::numeric[], 10)
on conflict (name) do nothing;
