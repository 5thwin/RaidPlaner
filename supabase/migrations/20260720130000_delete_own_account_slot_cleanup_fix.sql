-- =========================================================
-- 마이그레이션: 계정 삭제 시 "파티 슬롯 수정 권한 없음" 오류 수정
-- =========================================================
-- 게스트(guest) 등 파티 슬롯을 만질 권한이 없는 유저가 계정을 삭제하면 실패했다.
-- 원인: 계정을 지우면 characters가 cascade로 함께 삭제되는데, 그 캐릭터가 어느
-- 파티 슬롯에 들어가 있었다면(officer가 대신 넣어준 경우 등) party_slots.character_id가
-- on delete set null로 자동 비워진다. 이 UPDATE도 party_slots의 BEFORE UPDATE
-- 트리거(enforce_party_slot_update_rules)를 그대로 거치는데, 이 트리거는 "지금
-- 로그인한 유저가 이 공대에서 슬롯을 만질 권한이 있는지"(member 이상)를 무조건
-- 검사하기 때문에, guest가 자기 캐릭터를 지우는 것뿐인데도 권한 에러로 막혔다.
--
-- 사람이 직접 슬롯을 비우는 것과, 계정 삭제로 인해 시스템이 자동으로 비우는 것은
-- 구분해야 한다. delete_own_account() 실행 중에만 세션 로컬 설정
-- (app.deleting_own_account)을 켜두고, 트리거는 "이 설정이 켜져 있고 + 슬롯을
-- 비우는 중(character_id를 null로)"일 때만 권한 검사를 건너뛴다 — 슬롯에 새
-- 캐릭터를 채우는 동작은 이 우회로 허용되지 않는다(new.character_id가 null이
-- 아니면 그대로 기존 검사를 다 받는다).

create or replace function public.enforce_party_slot_update_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild_id uuid;
  v_is_cleared boolean;
  v_role public.guild_role;
  v_old_owner uuid;
  v_new_owner uuid;
  v_raid_type_id uuid;
  v_duplicate_exists boolean;
  v_same_party_owner_conflict boolean;
begin
  if new.party_id <> old.party_id or new.slot_index <> old.slot_index then
    raise exception '슬롯의 party_id/slot_index는 변경할 수 없습니다.';
  end if;

  select guild_id, is_cleared, raid_type_id
    into v_guild_id, v_is_cleared, v_raid_type_id
  from public.parties
  where id = old.party_id;

  if v_is_cleared then
    raise exception '클리어 완료된 파티는 슬롯을 수정할 수 없습니다. 먼저 클리어를 해제해주세요.';
  end if;

  -- 계정 삭제로 인한 자동 정리(캐릭터가 사라져서 슬롯이 비워지는 것)라면,
  -- 아래의 역할 기반 권한 검사를 건너뛴다. 슬롯을 "채우는" 경우는 대상이 아니다.
  if new.character_id is null
     and current_setting('app.deleting_own_account', true) = 'true' then
    return new;
  end if;

  -- 새로 캐릭터를 배정하는 경우(character_id가 바뀌면서 null이 아닌 경우)에만
  -- 아래 두 정합성 규칙을 검사한다. 이 캐릭터의 소유자(owner_id)는 두 검사에서
  -- 공통으로 쓰이므로 한 번만 조회해서 v_new_owner에 담아두고, 역할별 권한 체크
  -- (아래 member 분기)에서도 재사용한다.
  if new.character_id is not null and new.character_id is distinct from old.character_id then
    select owner_id into v_new_owner from public.characters where id = new.character_id;

    -- 규칙 1) 같은 레이드 안에서는 난이도/파티/공대에 상관없이 한 "캐릭터"가
    -- 동시에 하나의 슬롯에만 들어갈 수 있다.
    select exists (
      select 1
      from public.party_slots ps
      join public.parties p on p.id = ps.party_id
      where p.raid_type_id = v_raid_type_id
        and ps.character_id = new.character_id
        and ps.id <> old.id
    ) into v_duplicate_exists;

    if v_duplicate_exists then
      raise exception '이 캐릭터는 이미 같은 레이드의 다른 파티에 배정되어 있습니다.';
    end if;

    -- 규칙 2) 같은 "파티" 안에서는 한 유저(owner_id)의 캐릭터가 동시에 두 자리를
    -- 차지할 수 없다 (내 원정대 캐릭터 여러 명을 같은 파티에 몰아넣는 것 방지).
    select exists (
      select 1
      from public.party_slots ps
      join public.characters c on c.id = ps.character_id
      where ps.party_id = old.party_id
        and ps.id <> old.id
        and c.owner_id = v_new_owner
    ) into v_same_party_owner_conflict;

    if v_same_party_owner_conflict then
      raise exception '같은 파티에는 한 유저의 캐릭터를 하나만 넣을 수 있습니다.';
    end if;
  end if;

  v_role := public.current_guild_role(v_guild_id);

  if v_role is null or v_role = 'guest' then
    raise exception '이 공대에서 파티 슬롯을 수정할 권한이 없습니다.';
  end if;

  if v_role = 'member' then
    if old.character_id is not null then
      select owner_id into v_old_owner from public.characters where id = old.character_id;
      if v_old_owner is distinct from auth.uid() then
        raise exception '다른 유저의 캐릭터는 슬롯에서 뺄 수 없습니다. (officer 이상 필요)';
      end if;
    end if;

    if new.character_id is not null and v_new_owner is distinct from auth.uid() then
      raise exception '다른 유저의 캐릭터는 슬롯에 추가할 수 없습니다. (officer 이상 필요)';
    end if;
  end if;

  return new;
end;
$$;

-- delete_own_account()가 삭제를 실행하기 전에 위 우회 플래그를 켜둔다.
-- set_config(..., true)의 세 번째 인자 true는 "이 트랜잭션 안에서만" 적용된다는
-- 뜻이라(LOCAL), 함수가 끝나고 트랜잭션이 커밋/롤백되면 자동으로 원래대로 돌아간다.
create or replace function public.delete_own_account()
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

  perform set_config('app.deleting_own_account', 'true', true);

  delete from auth.users where id = auth.uid();
end;
$$;
