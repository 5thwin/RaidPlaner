-- =========================================================
-- 마이그레이션 14: profiles.representative_character_name 컬럼 제거
-- =========================================================
-- 대표 캐릭터명 개념이 rosters 테이블로 옮겨갔으므로(20260706121000, 20260706121200에서
-- 백필 완료), profiles 쪽 컬럼은 더 이상 필요 없다.
alter table public.profiles
  drop column representative_character_name;
