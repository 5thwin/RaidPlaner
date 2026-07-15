-- =========================================================
-- 마이그레이션: 공대 초대 코드로 셀프 참여(guest) 기능
-- =========================================================
-- 기존에는 officer 이상이 대표 캐릭터명으로 유저를 검색해서 직접 초대하는
-- 방식(guild_members insert, InviteMemberForm)만 있었다.
-- 이번엔 공대마다 초대 코드를 하나씩 두고, 그 코드를 아는 로그인 유저라면
-- 누구나 스스로 그 공대에 guest로 참여할 수 있게 한다.

-- ---------------------------------------------------------
-- guilds.invite_code 컬럼
-- ---------------------------------------------------------
-- gen_random_uuid()의 앞 8자리만 잘라 짧은 랜덤 코드를 기본값으로 쓴다.
-- pgcrypto 확장은 20260706120000_extensions_and_roles.sql에서 이미 켜져 있다.
-- default가 있으므로 기존에 이미 만들어진 공대에도 이 컬럼이 채워진다.
alter table public.guilds
  add column invite_code text not null unique
    default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

comment on column public.guilds.invite_code is
  '공대 셀프 참여용 초대 코드. join_guild_by_invite_code() RPC로만 사용되고,
   조회는 guilds_select 정책(공대 멤버만 조회 가능)을 그대로 따른다.';

-- ---------------------------------------------------------
-- 코드로 공대에 셀프 참여하는 RPC
-- ---------------------------------------------------------
-- 코드로 셀프 조인하려는 유저는 그 공대에 아직 아무 role도 없어서
-- (current_guild_role이 null) guild_members_insert 정책(officer 이상 필요)을
-- 통과할 수 없다. 그래서 일반 INSERT가 아니라 security definer 함수 안에서
-- 코드 검증 + insert를 전부 처리해서 RLS를 우회하되, 함수 내부 로직으로
-- 안전하게 통제한다 (handle_new_guild() 트리거와 같은 원리).
create function public.join_guild_by_invite_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild_id uuid;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다.';
  end if;

  select id into v_guild_id
  from public.guilds
  where invite_code = trim(p_invite_code);

  if v_guild_id is null then
    raise exception '유효하지 않은 초대 코드입니다.';
  end if;

  if exists (
    select 1 from public.guild_members
    where guild_id = v_guild_id and user_id = auth.uid()
  ) then
    raise exception '이미 이 공대에 속해 있습니다.';
  end if;

  insert into public.guild_members (guild_id, user_id, role)
  values (v_guild_id, auth.uid(), 'guest');

  return v_guild_id;
end;
$$;

comment on function public.join_guild_by_invite_code(text) is
  '로그인한 유저가 초대 코드로 공대에 guest 권한으로 셀프 참여한다. 참여한 guild_id를 반환한다.';

grant execute on function public.join_guild_by_invite_code(text) to authenticated;

-- ---------------------------------------------------------
-- 초대 코드 재발급 RPC (officer 이상)
-- ---------------------------------------------------------
create function public.regenerate_guild_invite_code(p_guild_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_code text;
begin
  if not public.has_guild_role_at_least(p_guild_id, 'officer') then
    raise exception '코드를 재발급할 권한이 없습니다. (officer 이상 필요)';
  end if;

  v_new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  update public.guilds
  set invite_code = v_new_code
  where id = p_guild_id;

  return v_new_code;
end;
$$;

comment on function public.regenerate_guild_invite_code(uuid) is
  'officer 이상이 공대 초대 코드를 새 값으로 재발급하고, 새 코드를 반환한다.';

grant execute on function public.regenerate_guild_invite_code(uuid) to authenticated;
