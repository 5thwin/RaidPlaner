-- =========================================================
-- 마이그레이션 9: characters 캐릭터 이미지 URL 컬럼 추가
-- =========================================================
-- 원정대 관리 화면에서 캐릭터 이미지를 보여주기 위해, 로스트아크 프로필 API
-- (/armories/characters/{characterName}, 응답의 ArmoryProfile.CharacterImage 필드)에서
-- 받아온 이미지 URL을 저장한다. 프로필 조회가 실패할 수 있으므로 null을 허용한다.
alter table public.characters
  add column character_image_url text;

comment on column public.characters.character_image_url is
  '로스트아크 프로필 API(ArmoryProfile.CharacterImage)에서 받아온 캐릭터 이미지 URL. 조회 실패 시 null.';
