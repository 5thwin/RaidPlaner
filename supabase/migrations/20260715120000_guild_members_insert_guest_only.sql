-- =========================================================
-- 마이그레이션: guild_members_insert 권한 상승 취약점 수정
-- =========================================================
-- 기존 정책은 "officer 이상이면 삽입 가능"만 검사하고, 삽입되는 role 값 자체는
-- 검사하지 않았다. 그래서 officer 권한만 있으면 REST API를 직접 호출해서
-- 임의의 user_id를 그 공대의 master(혹은 officer)로 즉시 등록할 수 있었다
-- ("officer는 master가 임명한다"는 규칙이 guild_members_update에만 걸려있고
-- insert에는 없었던 구멍).
--
-- 지금 앱의 유일한 가입 경로는 join_guild_by_invite_code() RPC뿐이고,
-- 이 RPC는 role을 'guest'로 하드코딩한 뒤 security definer로 RLS를 우회해서
-- insert하므로 이 정책 자체를 거치지 않는다. 즉 이 정책은 이제 "officer가 알고
-- 있는 유저를 직접 초대"하는 미래 기능을 위한 자리만 남겨두면 되고, role은
-- guest로만 제한해도 현재 기능에 영향이 없다.
drop policy if exists guild_members_insert on public.guild_members;

create policy guild_members_insert on public.guild_members
  for insert
  with check (
    public.has_guild_role_at_least(guild_id, 'officer')
    and role = 'guest'
  );
