-- =========================================================
-- 마이그레이션 5: characters (원정대 캐릭터) 테이블
-- =========================================================
-- 유저 한 명(profiles)이 여러 캐릭터를 가질 수 있다 (원정대).
-- 로스트아크 오픈 API 응답 필드를 최대한 그대로 담되,
-- is_active는 API에 없는 앱 전용 필드이므로 API 갱신 시에도 절대 덮어쓰지 않아야 한다
-- (이건 이번 마이그레이션이 아니라, 나중에 API 연동 코드를 짤 때 지켜야 할 규칙이다).

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  -- 이 캐릭터가 속한 원정대의 주인.
  owner_id uuid not null references public.profiles (id) on delete cascade,

  -- 아래 5개는 로스트아크 오픈 API 원본 필드에 대응한다.
  server_name text not null,
  character_name text not null,
  character_level numeric not null,
  character_class_name text not null,
  -- API 원본은 "1,664.17" 같은 콤마 포함 문자열이지만,
  -- 여기서는 항상 콤마를 제거하고 숫자로 파싱한 값을 저장한다 (비교 연산을 위해).
  item_avg_level numeric not null,

  -- API에는 없는 앱 전용 필드. 비활성 캐릭터는 파티 빈 슬롯 후보 목록에서 제외된다.
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 로스트아크 캐릭터 이름은 서버 단위로 유일하다 (서버가 다르면 같은 이름이 있을 수 있음).
  unique (server_name, character_name)
);

comment on table public.characters is '유저 원정대 소속 캐릭터. is_active는 API 갱신 시 보존해야 하는 앱 전용 필드.';

create index characters_owner_id_idx on public.characters (owner_id);

alter table public.characters enable row level security;

grant select, insert, update, delete on public.characters to authenticated;

create trigger touch_characters_updated_at
  before update on public.characters
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------
-- characters 정책
-- ---------------------------------------------------------
-- 조회 정책 1: 본인 소유 캐릭터는 항상 볼 수 있다 (원정대 관리 화면에서 필요).
-- 조회 정책 2: "같은 공대의 파티 슬롯에 들어가 있는 다른 사람의 캐릭터"를 보여주는 정책은
--   parties/party_slots 테이블이 아직 만들어지지 않아서 지금은 걸 수 없다.
--   같은 command(select)에 대한 permissive 정책은 여러 개를 만들어도 OR로 합쳐지므로,
--   해당 정책은 parties/party_slots를 만드는 마이그레이션(20260706120500)에서 추가한다.
create policy characters_select_own on public.characters
  for select
  using (owner_id = auth.uid());

-- 캐릭터 추가/수정/삭제(원정대 관리)는 본인 것만 가능하다.
-- ("officer 이상이 남의 캐릭터도 넣을 수 있다"는 규칙은 characters 테이블 자체를 바꾸는 게 아니라
--  party_slots에 다른 사람의 character_id를 연결하는 것이므로, 그 권한은 party_slots 정책에서 다룬다.)
create policy characters_insert on public.characters
  for insert
  with check (owner_id = auth.uid());

create policy characters_update on public.characters
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy characters_delete on public.characters
  for delete
  using (owner_id = auth.uid());
