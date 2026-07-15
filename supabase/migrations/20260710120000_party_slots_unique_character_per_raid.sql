-- =========================================================
-- 마이그레이션: 같은 레이드(raid_type_id) 안에서 한 캐릭터는
-- 난이도/파티에 상관없이 동시에 하나의 슬롯에만 들어갈 수 있도록 강제.
--
-- 20260706120500_parties_and_slots.sql의 enforce_party_slot_update_rules()를
-- create or replace function으로 재정의한다 (기존 마이그레이션 파일은 수정하지 않는다).
--
-- 이 검사는 공대 단위가 아니라 전역이다 (다른 공대의 파티까지 포함).
-- 한 캐릭터가 실제로 참여 가능한 레이드 세션은 동시에 하나뿐이라는 데이터
-- 정합성 규칙이라, 역할(member/officer/master)과 무관하게 항상 적용된다.
-- 함수가 이미 security definer라서, RLS로는 안 보이는 다른 공대의 파티/슬롯도
-- 이 검사 안에서는 조회할 수 있다.
-- =========================================================

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

  -- 같은 레이드 안에서는 난이도/파티/공대에 상관없이 한 캐릭터가 동시에 하나의
  -- 슬롯에만 들어갈 수 있다. 새로 캐릭터를 배정하는 경우(character_id가 바뀌면서
  -- null이 아닌 경우)에만 검사하고, 역할과 무관하게 항상 적용되는 정합성 규칙이라
  -- 아래 member 전용 분기보다 앞쪽(바깥)에 둔다.
  if new.character_id is not null and new.character_id is distinct from old.character_id then
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

    if new.character_id is not null then
      select owner_id into v_new_owner from public.characters where id = new.character_id;
      if v_new_owner is distinct from auth.uid() then
        raise exception '다른 유저의 캐릭터는 슬롯에 추가할 수 없습니다. (officer 이상 필요)';
      end if;
    end if;
  end if;

  return new;
end;
$$;
