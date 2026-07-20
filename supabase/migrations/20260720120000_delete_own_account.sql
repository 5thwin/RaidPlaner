-- =========================================================
-- 마이그레이션: 계정 자체 탈퇴(회원 탈퇴) 기능
-- =========================================================
-- 지금까지는 "공대 탈퇴"만 있고, 계정 자체를 지우려면 문의로 운영자가 수동
-- 처리해야 했다(개인정보처리방침에도 그렇게 적혀 있었음). 이걸 자체 서비스로
-- 만든다(2026-07-20).
--
-- 준비 작업: guilds/parties/guild_events.created_by, donations.recorded_by가
-- profiles를 참조하면서 on delete cascade가 없어서(기본값 = 제약으로 막음),
-- 공대/파티/일정을 하나라도 만들어봤거나 후원을 기록해본 적 있는 유저는
-- auth.users에서 자기 행을 지우려는 순간 FK 제약 위반으로 그냥 막혀버린다.
-- 이 네 컬럼은 전부 "누가 만들었는지"를 남기는 감사(audit) 성격일 뿐 접근 제어에
-- 쓰이지 않으므로(guilds_select 등은 is_guild_member/is_app_admin 등으로 이미
-- 판단하고, created_by는 생성 직후 RETURNING 시점의 임시 보강용일 뿐이다),
-- on delete set null로 바꿔서 계정이 지워져도 그 공대/파티/일정 자체는 남게 한다.

alter table public.guilds alter column created_by drop not null;
alter table public.guilds drop constraint guilds_created_by_fkey;
alter table public.guilds
  add constraint guilds_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.parties alter column created_by drop not null;
alter table public.parties drop constraint parties_created_by_fkey;
alter table public.parties
  add constraint parties_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.guild_events alter column created_by drop not null;
alter table public.guild_events drop constraint guild_events_created_by_fkey;
alter table public.guild_events
  add constraint guild_events_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.donations alter column recorded_by drop not null;
alter table public.donations drop constraint donations_recorded_by_fkey;
alter table public.donations
  add constraint donations_recorded_by_fkey
  foreign key (recorded_by) references public.profiles (id) on delete set null;

-- ---------------------------------------------------------
-- delete_own_account: 본인 계정을 완전히 삭제한다.
-- ---------------------------------------------------------
-- profiles가 auth.users를 on delete cascade로 참조하고 있어서, auth.users에서
-- 행을 지우면 profiles -> characters/rosters/guild_members/... 로 자동
-- 연쇄 삭제된다(이 함수가 직접 지우는 건 auth.users 한 행뿐이다).
--
-- 다만 공대장(master)인 공대가 있는 상태로 탈퇴하면 그 공대에 관리자가 없는
-- 상태가 남는다 — "공대 탈퇴"(leaveGuild) 때와 동일한 문제라 똑같이 막는다.
-- 공대장을 위임하거나 공대를 삭제한 뒤 다시 시도해야 한다.
create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_master_guild_count integer;
begin
  select count(*) into v_master_guild_count
  from public.guild_members
  where user_id = auth.uid() and role = 'master';

  if v_master_guild_count > 0 then
    raise exception
      '공대장으로 있는 공대가 있어 탈퇴할 수 없습니다. 다른 사람에게 공대장을 위임하거나 공대를 삭제한 뒤 다시 시도해주세요.';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
