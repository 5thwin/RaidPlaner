-- =========================================================
-- 마이그레이션: 같은 파티 안에서는 한 유저의 캐릭터가 동시에 두 자리를
-- 차지할 수 없도록 강제 (원정대 캐릭터 여러 개를 같은 파티에 몰아넣기 방지).
--
-- 20260710120000_party_slots_unique_character_per_raid.sql의
-- enforce_party_slot_update_rules()를 create or replace function으로 재정의한다
-- (기존 마이그레이션 파일은 수정하지 않는다).
--
-- "같은 레이드 안에서 캐릭터 하나는 파티 하나에만" 규칙과는 별개의 규칙이다:
-- 이번 규칙은 캐릭터 단위가 아니라 "유저(owner_id)" 단위로, 같은 파티 안에서만 적용된다.
-- 예: 내가 캐릭터 A를 이미 어떤 파티에 넣었으면, 같은 파티의 다른 빈 자리에
-- 내 캐릭터 B를 또 넣을 수 없다. 역할(member/officer/master)과 무관하게 항상 적용되는
-- 데이터 정합성 규칙이다 — officer가 남을 대신 넣어줄 때도 마찬가지로 막힌다.
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
