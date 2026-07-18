-- =========================================================
-- 마이그레이션: 공대장 위임(delegate) 기능 + 일반 역할 변경으로부터 master 보호
-- =========================================================
-- 지금까지 guild_members_update 정책은 "master면 아무 role이나 아무 행에나
-- 자유롭게 update 가능"이었다. 그래서 master가 (실수로든 의도적으로든) 자기
-- 자신의 role을 select 하나로 officer/member/guest로 강등하거나, 다른 유저의
-- role을 곧바로 master로 바꿔서 공대에 master가 2명(혹은 0명)이 되는 상태를
-- DB가 막아주지 못했다.
--
-- 이번 마이그레이션은:
-- 1) guild_members_update 정책을 "role이 master인 행은 건드릴 수 없고,
--    새 role 값으로 master를 지정할 수도 없다"로 좁혀서, 일반적인 역할 변경
--    UI(드롭다운)로는 master를 만들거나 강등할 수 없게 만든다.
-- 2) "기존 master -> officer, 대상 유저 -> master"를 원자적으로 한 번에 처리하는
--    delegate_guild_master() RPC를 추가해서, 공대장 위임은 오직 이 함수를 통해서만
--    (트랜잭션 안에서 안전하게) 이뤄지게 한다.

-- ---------------------------------------------------------
-- 1) guild_members_update 정책 강화: master 행은 일반 update로 건드릴 수 없음
-- ---------------------------------------------------------
drop policy if exists guild_members_update on public.guild_members;

create policy guild_members_update on public.guild_members
  for update
  using (
    public.has_guild_role_at_least(guild_id, 'master')
    and role <> 'master'
  )
  with check (
    public.has_guild_role_at_least(guild_id, 'master')
    and role <> 'master'
  );

-- ---------------------------------------------------------
-- 2) 공대장 위임 RPC
-- ---------------------------------------------------------
-- 현재 로그인한 유저(현재 master)가 p_new_master_user_id에게 master를 넘기고,
-- 본인은 바로 아래 권한인 officer가 된다. 두 UPDATE를 하나의 함수(=하나의 트랜잭션)
-- 안에서 처리하므로, 중간에 실패하면 전체가 롤백되어 "master가 0명 또는 2명"이
-- 되는 상태가 발생하지 않는다.
create function public.delegate_guild_master(
  p_guild_id uuid,
  p_new_master_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid := auth.uid();
begin
  if v_caller_id is null then
    raise exception '로그인이 필요합니다.';
  end if;

  if not public.has_guild_role_at_least(p_guild_id, 'master') then
    raise exception '공대장만 위임할 수 있습니다.';
  end if;

  if v_caller_id = p_new_master_user_id then
    raise exception '자기 자신에게는 위임할 수 없습니다.';
  end if;

  if not exists (
    select 1
    from public.guild_members
    where guild_id = p_guild_id
      and user_id = p_new_master_user_id
  ) then
    raise exception '대상 유저가 이 공대의 멤버가 아닙니다.';
  end if;

  update public.guild_members
  set role = 'officer'
  where guild_id = p_guild_id
    and user_id = v_caller_id;

  update public.guild_members
  set role = 'master'
  where guild_id = p_guild_id
    and user_id = p_new_master_user_id;
end;
$$;

comment on function public.delegate_guild_master(uuid, uuid) is
  '현재 master가 대상 유저에게 공대장을 위임한다. 기존 master는 officer로,
   대상 유저는 master로 원자적으로 바뀐다.';

grant execute on function public.delegate_guild_master(uuid, uuid) to authenticated;
