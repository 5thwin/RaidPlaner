-- =========================================================
-- 마이그레이션: 매주 수요일 오전 6시(KST) 파티 클리어 상태 자동 초기화
-- =========================================================
-- 로스트아크 주간 리셋(수요일 06:00 KST)에 맞춰, 모든 파티의 is_cleared를
-- false로 되돌린다. pg_cron은 UTC 기준으로 돌기 때문에, 수요일 06:00 KST는
-- 화요일 21:00 UTC다(KST = UTC+9).
--
-- 사전 조건: Supabase 대시보드 → Database → Extensions에서 pg_cron이
-- 켜져 있어야 한다. 안 켜져 있으면 아래 create extension이 권한 오류로
-- 실패할 수 있다 — 그러면 대시보드에서 먼저 켠 뒤 이 마이그레이션을
-- 다시 적용해야 한다.
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------
-- parties 테이블의 is_cleared 변경은 enforce_party_update_rules 트리거가
-- "지금 로그인한 유저가 이 공대에서 member 이상인지"를 검사한다. 스케줄
-- 작업은 로그인 세션이 없어 auth.uid()가 null이라 이 검사를 그냥 통과할 수
-- 없으므로, delete_own_account 때와 같은 패턴(세션 로컬 플래그로 우회)을 쓴다.
-- ---------------------------------------------------------
create or replace function public.enforce_party_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.guild_id <> old.guild_id
     or new.raid_type_id <> old.raid_type_id
     or new.difficulty_index <> old.difficulty_index
     or new.difficulty_name <> old.difficulty_name
     or new.created_by <> old.created_by then
    raise exception '파티의 공대/레이드/난이도/생성자 정보는 생성 후에는 변경할 수 없습니다.';
  end if;

  if new.is_cleared <> old.is_cleared
     and current_setting('app.weekly_party_reset', true) = 'true' then
    return new;
  end if;

  if new.is_cleared <> old.is_cleared
     and not public.has_guild_role_at_least(old.guild_id, 'member') then
    raise exception '클리어 상태를 변경할 권한이 없습니다. (member 이상 필요)';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------
-- 실제 초기화를 수행하는 함수. 이미 false인 행은 건드리지 않는다
-- (불필요한 updated_at 갱신/트리거 실행을 피하기 위해).
-- ---------------------------------------------------------
create function public.reset_weekly_party_clears()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.weekly_party_reset', 'true', true);

  update public.parties
  set is_cleared = false
  where is_cleared = true;
end;
$$;

-- 화요일 21:00 UTC = 수요일 06:00 KST, 매주 반복.
select cron.schedule(
  'weekly-party-clear-reset',
  '0 21 * * 2',
  $$select public.reset_weekly_party_clears();$$
);
