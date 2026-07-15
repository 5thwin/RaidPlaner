-- =========================================================
-- 마이그레이션 2: profiles (유저 프로필) 테이블
-- =========================================================
-- Supabase Auth가 관리하는 auth.users 테이블은 앱 코드에서 직접 조회/조인하기
-- 불편하고 민감한 정보(이메일 등)도 섞여 있어서, 화면에 보여줄 최소한의
-- 정보(이름/아바타 등)만 담은 public.profiles 테이블을 따로 만들어 쓰는 것이
-- Supabase에서 흔히 쓰는 패턴이다.
--
-- Google 로그인이 성공해서 auth.users에 새 유저가 생기면,
-- 아래 트리거가 자동으로 profiles에도 같은 id로 한 줄을 만들어준다.

create table public.profiles (
  -- auth.users.id와 값을 그대로 공유한다 (1:1 관계).
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is '로그인한 유저의 공개 프로필 정보 (auth.users를 앱에서 다루기 쉽게 미러링한 테이블)';

-- 이 테이블에도 Row Level Security(행 단위 접근 제어)를 켠다.
alter table public.profiles enable row level security;

-- Supabase 기본 설정상 public 스키마의 새 테이블은 anon/authenticated 롤에
-- 기본 권한(grant)이 자동으로 부여되지만, 혹시 모를 상황에 대비해 명시적으로도 부여해둔다.
-- 실제 접근 제어는 아래 RLS 정책들이 담당한다.
grant select, insert, update, delete on public.profiles to authenticated;

-- 로그인한 사람이면 누구나 다른 사람의 프로필(이름/아바타 정도)을 볼 수 있다.
-- 공대원 목록, 파티 슬롯에 표시되는 캐릭터의 소유자 이름 등을 보여주려면 필요하다.
create policy profiles_select on public.profiles
  for select
  using (auth.uid() is not null);

-- 본인 프로필만 수정할 수 있다.
create policy profiles_update on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- insert/delete 정책은 만들지 않는다.
-- profiles row는 아래 트리거가 auth.users에 새 유저가 생길 때 자동으로 만들어주고,
-- 삭제는 auth.users에서 유저가 삭제될 때 on delete cascade로 자동 처리된다.
-- (클라이언트가 직접 insert/delete 할 일이 없다.)

-- updated_at을 자동으로 현재 시각으로 갱신해주는 공용 트리거 함수.
-- 이후 다른 테이블(characters, parties 등)에서도 재사용한다.
create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- auth.users에 새 유저가 추가되면 profiles에도 자동으로 한 줄 만들어주는 트리거.
-- security definer로 만들어야, RLS 때문에 막히지 않고 테이블 소유자 권한으로 insert 할 수 있다.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    -- 구글 로그인 메타데이터에서 이름을 꺼내온다. 없으면 이메일로 대체.
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
