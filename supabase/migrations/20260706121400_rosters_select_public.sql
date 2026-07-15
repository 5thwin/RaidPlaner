-- =========================================================
-- 마이그레이션 15: rosters 조회 정책 보완 (공대 유저 초대 검색용)
-- =========================================================
-- profiles.representative_character_name 컬럼이 있었을 때는 profiles_select 정책
-- (로그인한 사람이면 누구나 다른 사람 프로필을 볼 수 있음) 덕분에 유저 초대 검색
-- (대표 캐릭터명으로 검색)과 공대원 목록의 대표 캐릭터명 표시가 가능했다.
-- 그 컬럼이 rosters로 옮겨갔으므로, 같은 수준의 조회 범위를 rosters에도 그대로 옮겨준다
-- (select 정책은 여러 개를 만들어도 OR로 합쳐지므로 기존 rosters_select_own과 함께 적용된다).
create policy rosters_select_public on public.rosters
  for select
  using (auth.uid() is not null);
