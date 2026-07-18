-- =========================================================
-- 마이그레이션: 후원(sponsor) 기능의 기반 스키마
-- =========================================================
-- 아직 결제 연동은 없다 — 계좌이체 등으로 후원을 받으면 운영자가 수동으로 기록하는
-- 방식을 전제로 설계한다. 확정된 요구사항은 아니고, 향후 예정된 혜택 3종
-- (모코코 아이콘 / 파티 색상 프리미엄 팔레트+금테 / 광고 제거)을 염두에 두고
-- 먼저 스키마만 만들어둔다(2026-07-19 논의).
--
-- 설계 방향:
-- 1) donations(원장) + sponsor_benefits(현재 상태 캐시)를 분리한다.
--    - donations: "누가 언제 얼마를 후원했는지"의 감사(audit) 기록. 절대 UPDATE하지
--      않고 쌓기만 한다 — 정정이 필요하면 새 행을 남긴다.
--    - sponsor_benefits: 혜택별로 "지금 몇 시까지 활성 상태인지"만 담는다. 화면에서는
--      매번 donations를 합산할 필요 없이 expires_at > now()만 확인하면 된다.
-- 2) 혜택마다 금액→기간 환산 규칙(예: "광고 제거는 1000원당 2주")은 아직 확정이 아니고
--    바뀔 수 있어서, DB 함수에 하드코딩하지 않는다. 대신 record_donation() 호출 시
--    "이 후원으로 어떤 혜택을 며칠 연장할지"를 호출하는 쪽(운영자 조작 화면/스크립트)이
--    직접 넘긴다 — 요율이 바뀌어도 마이그레이션 없이 앱 코드만 고치면 된다.
-- 3) 이 앱엔 "공대 단위" 권한(guild_role)만 있고 앱 전체를 관리하는 admin 개념이
--    없었다. 후원 기록처럼 공대와 무관한 전역 작업을 위해 profiles.is_app_admin을
--    최소한으로 추가한다. 이 값은 운영자가 직접 SQL로 본인 계정에만 true를 준다
--    (별도 관리 UI 없음 — 운영자 1인 체제를 전제로 한 의도적으로 단순한 설계).

alter table public.profiles
  add column is_app_admin boolean not null default false;

comment on column public.profiles.is_app_admin is
  '앱 전역 관리 작업(후원 기록 등) 권한. 공대 단위 권한(guild_role)과는 별개다.';

-- ---------------------------------------------------------
-- 후원 혜택 종류 (enum) — 나중에 새 혜택이 추가되면
-- alter type public.sponsor_benefit_type add value '새값' 으로 늘리면 된다.
-- ---------------------------------------------------------
create type public.sponsor_benefit_type as enum (
  -- 캐릭터명 옆에 모코코 아이콘 표시
  'mokoko_icon',
  -- 원정대 색상 프리미엄 팔레트(검정/흰색 등) + 금색 줄무늬 사용 가능
  'premium_roster_color',
  -- 광고 제거
  'ad_free'
);

-- ---------------------------------------------------------
-- donations: 후원 원장
-- ---------------------------------------------------------
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- 원(KRW) 단위 정수 금액.
  amount integer not null check (amount > 0),
  -- 지금은 전부 'manual'(계좌이체 등 수동 확인). 나중에 실제 결제 연동이 생기면
  -- 'toss', 'kakaopay' 같은 값을 추가해서 구분한다.
  method text not null default 'manual',
  -- 입금자명 등, 어떤 후원인지 운영자가 확인한 근거를 남기는 메모.
  memo text,
  -- 이 후원을 시스템에 기록한 관리자(본인이 직접 후원해도 recorded_by는 관리자 자신).
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.donations is
  '후원 원장(감사 기록). 정정이 필요해도 UPDATE하지 않고 새 행을 남긴다.';

create index donations_user_id_idx on public.donations (user_id);

alter table public.donations enable row level security;

-- 조회만 authenticated에 열어둔다 — 실제 기록(INSERT)은 record_donation() RPC
-- (security definer)를 통해서만 이뤄지므로, 테이블 자체엔 insert grant를 주지 않는다.
grant select on public.donations to authenticated;

-- 본인 후원 내역은 스스로 확인할 수 있고, 관리자는 전체를 본다.
create policy donations_select_own_or_admin on public.donations
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_app_admin
    )
  );

-- ---------------------------------------------------------
-- sponsor_benefits: 혜택별 "지금 활성 상태인지"를 나타내는 캐시.
-- ---------------------------------------------------------
create table public.sponsor_benefits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  benefit_type public.sponsor_benefit_type not null,
  -- 이 시각이 지나면 혜택이 만료된 것으로 취급한다(별도 배치 삭제 없이 조회 시점에
  -- expires_at > now()로만 판단 — 만료된 행을 지우지 않아도 무해하다).
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  -- 유저당 혜택 종류마다 한 행만 있고, 후원할 때마다 이 행의 expires_at을 늘린다.
  unique (user_id, benefit_type)
);

comment on table public.sponsor_benefits is
  '후원으로 얻는 혜택별 만료 시각. donations를 근거로 record_donation()이 갱신하는 캐시.';

alter table public.sponsor_benefits enable row level security;

-- 모코코 아이콘/프리미엄 색상은 "다른 사람"이 봐야 의미가 있으므로(파티 슬롯,
-- 공대원 목록 등에서 표시), profiles_select와 동일하게 로그인한 누구나 조회 가능하게 한다.
grant select on public.sponsor_benefits to authenticated;

create policy sponsor_benefits_select_all on public.sponsor_benefits
  for select
  using (auth.uid() is not null);

-- ---------------------------------------------------------
-- 헬퍼 함수: 특정 유저가 특정 혜택을 지금 활성 상태로 갖고 있는지.
-- 나중에 rosters_update RLS(프리미엄 색상 선택 제한)나 화면 표시 로직에서 재사용한다.
-- ---------------------------------------------------------
create function public.has_active_sponsor_benefit(
  p_user_id uuid,
  p_benefit public.sponsor_benefit_type
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sponsor_benefits
    where user_id = p_user_id
      and benefit_type = p_benefit
      and expires_at > now()
  );
$$;

grant execute on function public.has_active_sponsor_benefit(uuid, public.sponsor_benefit_type)
  to authenticated;

-- ---------------------------------------------------------
-- record_donation: 관리자가 후원을 기록하면서, 지정한 혜택들의 만료 시각을
-- "지금 만료 시각(또는 지금 시각 중 늦은 쪽) + 연장 일수"로 늘린다.
-- 한 번의 후원으로 여러 혜택을 동시에 연장할 수 있어 배열(jsonb)로 받는다.
--
-- 예시 호출:
--   select record_donation(
--     '<user-id>', 1000, '카카오뱅크 이체 확인',
--     '[{"benefit_type":"ad_free","extend_days":14}]'::jsonb
--   );
-- ---------------------------------------------------------
create function public.record_donation(
  p_user_id uuid,
  p_amount integer,
  p_memo text,
  p_benefit_extensions jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_extension jsonb;
  v_benefit public.sponsor_benefit_type;
  v_days integer;
  v_current_expiry timestamptz;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_app_admin
  ) then
    raise exception '관리자만 후원을 기록할 수 있습니다.';
  end if;

  insert into public.donations (user_id, amount, memo, recorded_by)
  values (p_user_id, p_amount, p_memo, auth.uid());

  for v_extension in select * from jsonb_array_elements(p_benefit_extensions)
  loop
    v_benefit := (v_extension ->> 'benefit_type')::public.sponsor_benefit_type;
    v_days := (v_extension ->> 'extend_days')::integer;

    select expires_at into v_current_expiry
    from public.sponsor_benefits
    where user_id = p_user_id and benefit_type = v_benefit;

    insert into public.sponsor_benefits (user_id, benefit_type, expires_at, updated_at)
    values (
      p_user_id,
      v_benefit,
      greatest(now(), coalesce(v_current_expiry, now())) + (v_days || ' days')::interval,
      now()
    )
    on conflict (user_id, benefit_type)
    do update set
      expires_at = excluded.expires_at,
      updated_at = now();
  end loop;
end;
$$;

grant execute on function public.record_donation(uuid, integer, text, jsonb) to authenticated;
