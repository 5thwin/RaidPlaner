-- =========================================================
-- 마이그레이션: characters 조회 정책 보완 (공대원 전체 - 파티원 페이지용)
-- =========================================================
-- "파티원" 페이지(/guilds/:guildId/members)는 guest를 포함한 공대원 누구나
-- 같은 공대에 속한 모든 유저의 활성 캐릭터 목록을 조회할 수 있어야 한다.
-- 기존 정책들은 아래 세 경우만 커버한다.
--   - characters_select_own: 본인 캐릭터만
--   - characters_select_via_party: 이미 파티 슬롯에 들어간 캐릭터만
--   - characters_select_by_guild_officer: officer 이상만, 같은 공대원 캐릭터 전체
-- 즉 member/guest는 아직 파티에 들어가지 않은 "남의 캐릭터"를 볼 방법이 없었다.
--
-- select 정책은 여러 개를 만들어도 OR로 합쳐지므로, 기존 정책들을 건드리지 않고
-- 아래 정책 하나만 추가해서 "같은 공대에 속한 유저라면(role 무관, guest 포함)
-- 그 공대원들의 캐릭터를 전부 조회할 수 있다"를 허용한다.
create policy characters_select_by_guild_member on public.characters
  for select
  using (
    exists (
      select 1
      from public.guild_members gm
      where gm.user_id = characters.owner_id
        and public.is_guild_member(gm.guild_id)
    )
  );
