-- =========================================================
-- 마이그레이션 10: characters 전투력(CombatPower) 컬럼 추가
-- =========================================================
-- 로스트아크 프로필 API(/armories/characters/{characterName}/profiles)의
-- CombatPower는 ItemAvgLevel(아이템 레벨)과는 별개의 실제 "전투력" 수치다.
-- API 원본은 천단위 콤마가 포함된 문자열이므로, item_avg_level과 동일하게
-- 콤마를 제거하고 숫자로 파싱해서 저장한다. 프로필 조회가 실패할 수 있으므로 null을 허용한다.
alter table public.characters
  add column combat_power numeric;

comment on column public.characters.combat_power is
  '로스트아크 프로필 API(CombatPower)에서 받아온 전투력 수치. item_avg_level(아이템 레벨)과 별개 값. 조회 실패 시 null.';
