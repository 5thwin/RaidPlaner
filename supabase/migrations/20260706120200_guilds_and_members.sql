-- =========================================================
-- 마이그레이션 3: guilds(공대) + guild_members(공대원/권한) 테이블
-- =========================================================
-- 한 유저는 여러 공대에 서로 다른 역할(guild_role)로 속할 수 있다.
-- 그래서 "역할"은 유저 개인 정보가 아니라, (공대, 유저) 조합에 붙는 정보다.

create table public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- 공대를 만든 사람. 아래 트리거로 자동으로 master 권한을 받는다.
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.guilds is '공대(길드) 조직 단위';

create table public.guild_members (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.guild_role not null default 'guest',
  joined_at timestamptz not null default now(),
  -- 한 유저는 같은 공대에 한 줄(하나의 역할)만 가질 수 있다.
  unique (guild_id, user_id)
);

comment on table public.guild_members is '공대별 소속 유저 + 그 공대에서의 권한(role)';

create index guild_members_guild_id_idx on public.guild_members (guild_id);
create index guild_members_user_id_idx on public.guild_members (user_id);

alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;

grant select, insert, update, delete on public.guilds to authenticated;
grant select, insert, update, delete on public.guild_members to authenticated;

-- ---------------------------------------------------------
-- 권한 체크용 헬퍼 함수들
-- ---------------------------------------------------------
-- guild_members를 참조하는 RLS 정책을 guild_members 테이블 자신에게도 걸면
-- "정책이 정책을 검사하려고 자기 테이블을 다시 읽는" 무한 재귀 위험이 있다.
-- 이를 피하기 위해, 아래 함수들은 security definer로 만들어서
-- RLS를 우회해 guild_members를 직접 조회하고, 그 "결과"만 정책에서 사용하게 한다.

-- 현재 로그인한 유저가 특정 공대에서 가진 role을 돌려준다. (소속 아니면 null)
create function public.current_guild_role(p_guild_id uuid)
returns public.guild_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.guild_members
  where guild_id = p_guild_id
    and user_id = auth.uid();
$$;

-- 현재 로그인한 유저가 특정 공대에서 p_min_role "이상"의 권한을 가졌는지 여부.
-- guild_role enum이 guest < member < officer < master 순서로 선언되어 있어서
-- role >= p_min_role 비교만으로 "이상" 체크가 된다.
create function public.has_guild_role_at_least(p_guild_id uuid, p_min_role public.guild_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.guild_members
    where guild_id = p_guild_id
      and user_id = auth.uid()
      and role >= p_min_role
  );
$$;

-- 현재 로그인한 유저가 해당 공대의 멤버(guest 이상, 즉 아무 역할이나)인지 여부.
create function public.is_guild_member(p_guild_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_guild_role_at_least(p_guild_id, 'guest');
$$;

-- ---------------------------------------------------------
-- guilds 정책
-- ---------------------------------------------------------
-- 공대 멤버만 그 공대 정보를 볼 수 있다 (검색/발견 기능은 아직 없음).
-- + 방금 내가 만든 공대는 무조건 볼 수 있다: insert().select()는 내부적으로
--   INSERT ... RETURNING을 쓰는데, 생성자를 master로 등록하는 트리거는 AFTER 트리거라
--   RETURNING 평가 시점엔 아직 guild_members 행이 없을 수 있다. is_guild_member(id)만
--   조건으로 두면 이 순간 SELECT 정책에 막혀 "방금 만든 공대를 못 돌려주는" RLS 에러가 난다.
create policy guilds_select on public.guilds
  for select
  using (public.is_guild_member(id) or created_by = auth.uid());

-- 로그인한 유저는 누구나 새 공대를 만들 수 있다. 단, created_by는 반드시 본인이어야 한다.
create policy guilds_insert on public.guilds
  for insert
  with check (created_by = auth.uid());

-- 공대 정보 수정/삭제는 master만.
create policy guilds_update on public.guilds
  for update
  using (public.has_guild_role_at_least(id, 'master'))
  with check (public.has_guild_role_at_least(id, 'master'));

create policy guilds_delete on public.guilds
  for delete
  using (public.has_guild_role_at_least(id, 'master'));

-- ---------------------------------------------------------
-- guild_members 정책
-- ---------------------------------------------------------
create policy guild_members_select on public.guild_members
  for select
  using (public.is_guild_member(guild_id));

-- 유저 초대(=guild_members row 추가)는 officer 이상만 할 수 있다.
-- 참고: 공대를 처음 만들 때 창설자를 master로 넣는 것은 이 정책을 거치지 않고
-- 아래 handle_new_guild() 트리거(security definer)가 대신 처리한다.
create policy guild_members_insert on public.guild_members
  for insert
  with check (public.has_guild_role_at_least(guild_id, 'officer'));

-- 역할 변경(예: member -> officer 승격)은 master만 할 수 있다.
-- ("officer는 master가 임명한다"는 도메인 규칙)
create policy guild_members_update on public.guild_members
  for update
  using (public.has_guild_role_at_least(guild_id, 'master'))
  with check (public.has_guild_role_at_least(guild_id, 'master'));

-- 공대원 삭제(추방/탈퇴):
-- - officer 이상은 master를 제외한 다른 멤버를 추방할 수 있다.
-- - 누구든 자기 자신의 소속 row는 스스로 지울 수 있다 (탈퇴).
create policy guild_members_delete on public.guild_members
  for delete
  using (
    (public.has_guild_role_at_least(guild_id, 'officer') and role <> 'master')
    or user_id = auth.uid()
  );

-- ---------------------------------------------------------
-- 공대 생성 시, 만든 사람을 자동으로 master로 등록하는 트리거
-- ---------------------------------------------------------
create function public.handle_new_guild()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.guild_members (guild_id, user_id, role)
  values (new.id, new.created_by, 'master');

  return new;
end;
$$;

create trigger on_guild_created
  after insert on public.guilds
  for each row execute function public.handle_new_guild();
