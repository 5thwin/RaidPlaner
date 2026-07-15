-- =========================================================
-- 마이그레이션 8: characters 조회 정책 보완 (officer 이상 - 같은 공대원의 캐릭터 전체)
-- =========================================================
-- 메인 화면(레이드-파티 현황판)에서 officer/master는 빈 슬롯에
-- "다른 사람의 캐릭터"도 넣을 수 있어야 한다(도메인 규칙).
-- 그러려면 아직 어떤 파티 슬롯에도 들어가 있지 않은 상태의 캐릭터도
-- 후보 목록 조회 시점에 미리 볼 수 있어야 하는데,
-- 기존 정책 2개는 이 경우를 커버하지 못한다.
--   - characters_select_own: 본인 캐릭터만 허용
--   - characters_select_via_party: "이미 파티 슬롯에 들어간" 캐릭터만 허용
-- 즉 "아직 어느 슬롯에도 없는 남의 캐릭터"는 officer라도 조회할 방법이 없었다.
-- 아래 정책을 추가해서, 같은 공대에서 officer 이상 권한을 가진 유저는
-- 그 공대에 소속된 모든 유저의 캐릭터를 조회할 수 있게 한다.
--
-- select 정책은 여러 개를 만들어도 OR로 합쳐지므로, 기존 두 정책과 함께
-- "본인 것 or 파티에 들어간 것 or 내가 officer 이상인 공대의 같은 공대원 것" 중
-- 하나라도 해당하면 조회가 허용된다.
create policy characters_select_by_guild_officer on public.characters
  for select
  using (
    exists (
      select 1
      from public.guild_members gm
      where gm.user_id = characters.owner_id
        and public.has_guild_role_at_least(gm.guild_id, 'officer')
    )
  );
