-- =========================================================
-- 마이그레이션 7: profiles.representative_character_name 컬럼 추가
-- =========================================================
-- 원정대 연결(로스트아크 API 조회) 시 유저가 매번 대표 캐릭터명을
-- 다시 입력하지 않아도 되도록, 마지막으로 조회에 사용한 대표 캐릭터명을
-- profiles 테이블에 저장해둔다. 이후 "업데이트" 버튼은 이 값을 그대로 재사용한다.

alter table public.profiles
  add column representative_character_name text;

comment on column public.profiles.representative_character_name is
  '원정대 연결(로스트아크 오픈 API 조회)에 사용할 대표 캐릭터명. 유저가 재입력하지 않도록 저장해둔다.';

-- 본인 프로필 수정 정책(profiles_update)이 이미 있으므로,
-- 이 컬럼도 그 정책을 통해 본인만 수정할 수 있다 (별도 정책 불필요).
