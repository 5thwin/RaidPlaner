-- =========================================================
-- 마이그레이션 6: parties(파티) + party_slots(파티 슬롯) 테이블
-- =========================================================

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  raid_type_id uuid not null references public.raid_types (id),

  -- 난이도는 이름이 아니라 raid_types.difficulties 배열의 index로 저장한다.
  -- (레이드마다 난이도 이름 체계가 달라서, 이름 매칭이 아니라 index로 색상/조건을 다뤄야 한다.)
  difficulty_index int not null,
  -- 생성 시점의 난이도 이름 스냅샷. 이후 raid_types.difficulties가 바뀌어도
  -- 이미 만들어진 파티의 표시는 영향받지 않도록 값을 복사해서 저장해둔다.
  difficulty_name text not null,

  is_cleared boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint parties_difficulty_index_check check (difficulty_index >= 0)
);

comment on table public.parties is '공대 + 레이드 + 난이도 조합으로 만들어지는 파티. difficulty_index가 색상/입장조건의 기준이고 difficulty_name은 생성 시점 스냅샷.';

create table public.party_slots (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties (id) on delete cascade,
  slot_index int not null,
  -- 캐릭터가 삭제되면 슬롯을 막지 않고 그냥 빈 슬롯으로 되돌린다 (on delete set null).
  character_id uuid references public.characters (id) on delete set null,

  unique (party_id, slot_index),
  constraint party_slots_slot_index_check check (slot_index >= 0)
);

comment on table public.party_slots is '파티의 빈 자리 하나하나. 파티 생성 시 raid_types.max_players 개수만큼 트리거로 자동 생성된다.';

create index parties_guild_id_idx on public.parties (guild_id);
create index parties_raid_type_id_idx on public.parties (raid_type_id);
create index party_slots_party_id_idx on public.party_slots (party_id);
create index party_slots_character_id_idx on public.party_slots (character_id);

alter table public.parties enable row level security;
alter table public.party_slots enable row level security;

grant select, insert, update, delete on public.parties to authenticated;
grant select, insert, update, delete on public.party_slots to authenticated;

-- ---------------------------------------------------------
-- characters 정책 추가분
-- ---------------------------------------------------------
-- 20260706120400 마이그레이션에서 미뤄뒀던, "같은 공대 파티 슬롯에 들어간 다른 사람의 캐릭터도
-- 볼 수 있어야 한다"는 조회 정책. 이제 parties/party_slots가 존재하므로 여기서 추가한다.
-- select에 대한 permissive 정책 여러 개는 OR로 합쳐지므로, characters_select_own과 함께 적용된다.
create policy characters_select_via_party on public.characters
  for select
  using (
    exists (
      select 1
      from public.party_slots ps
      join public.parties p on p.id = ps.party_id
      where ps.character_id = characters.id
        and public.is_guild_member(p.guild_id)
    )
  );

-- ---------------------------------------------------------
-- parties 정책
-- ---------------------------------------------------------
create policy parties_select on public.parties
  for select
  using (public.is_guild_member(guild_id));

-- 파티 생성은 member 이상 (guest는 불가). created_by는 반드시 본인이어야 한다.
create policy parties_insert on public.parties
  for insert
  with check (
    public.has_guild_role_at_least(guild_id, 'member')
    and created_by = auth.uid()
  );

-- 파티 update는 지금은 사실상 is_cleared 토글 용도로만 쓰인다 (다른 컬럼은 아래 트리거가 막는다).
-- "클리어 토글은 member 이상" 규칙과 동일한 최소 권한을 요구한다.
create policy parties_update on public.parties
  for update
  using (public.has_guild_role_at_least(guild_id, 'member'))
  with check (public.has_guild_role_at_least(guild_id, 'member'));

-- 파티 삭제는 officer 이상만 가능하다.
create policy parties_delete on public.parties
  for delete
  using (public.has_guild_role_at_least(guild_id, 'officer'));

-- ---------------------------------------------------------
-- party_slots 정책
-- ---------------------------------------------------------
-- party_slots는 parties를 거쳐서 guild_id를 알아내야 하므로 exists 서브쿼리로 검사한다.
create policy party_slots_select on public.party_slots
  for select
  using (
    exists (
      select 1 from public.parties p
      where p.id = party_slots.party_id
        and public.is_guild_member(p.guild_id)
    )
  );

-- update의 1차 관문(대략적인 필터): 최소 member 이상만 시도할 수 있다.
-- guest는 여기서 이미 걸러진다.
-- "member는 자기 캐릭터만 추가/삭제 가능" / "클리어된 파티는 잠금" 같은 세부 규칙은
-- RLS만으로 표현하기 애매해서(행 단위 정책은 다른 행 값에 대한 조건은 걸 수 있지만
-- "이전 값 vs 새 값을 비교"하거나 명확한 에러 메시지를 주긴 어렵다) 아래 트리거에서 처리한다.
create policy party_slots_update on public.party_slots
  for update
  using (
    exists (
      select 1 from public.parties p
      where p.id = party_slots.party_id
        and public.has_guild_role_at_least(p.guild_id, 'member')
    )
  )
  with check (
    exists (
      select 1 from public.parties p
      where p.id = party_slots.party_id
        and public.has_guild_role_at_least(p.guild_id, 'member')
    )
  );

-- insert/delete 정책은 없다. 슬롯 row 자체는 파티 생성 시 트리거로만 만들어지고,
-- 파티가 삭제되면 on delete cascade로만 지워진다. 클라이언트는 슬롯의 character_id만 update한다.

-- ---------------------------------------------------------
-- 파티 생성 시, difficulty_index/difficulty_name이 실제 raid_types.difficulties와
-- 맞는지 검증하는 트리거 (잘못된 index나 이름 불일치로 파티가 만들어지는 것을 막는다).
-- ---------------------------------------------------------
create function public.validate_party_difficulty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_difficulties text[];
  v_len int;
begin
  select difficulties into v_difficulties
  from public.raid_types
  where id = new.raid_type_id;

  if v_difficulties is null then
    raise exception '존재하지 않는 레이드입니다. (raid_type_id: %)', new.raid_type_id;
  end if;

  v_len := array_length(v_difficulties, 1);

  if new.difficulty_index < 0 or new.difficulty_index >= v_len then
    raise exception '난이도 index(%)가 이 레이드의 difficulties 범위(0~%)를 벗어났습니다.',
      new.difficulty_index, v_len - 1;
  end if;

  -- Postgres 배열은 1부터 시작하므로 difficulty_index(0부터 시작)에 1을 더해서 조회한다.
  if new.difficulty_name is null or new.difficulty_name <> v_difficulties[new.difficulty_index + 1] then
    raise exception '난이도 이름(%)이 difficulty_index(%)의 실제 난이도(%)와 일치하지 않습니다.',
      new.difficulty_name, new.difficulty_index, v_difficulties[new.difficulty_index + 1];
  end if;

  return new;
end;
$$;

create trigger before_party_insert_validate_difficulty
  before insert on public.parties
  for each row execute function public.validate_party_difficulty();

-- ---------------------------------------------------------
-- 파티 생성 후, 레이드의 max_players 개수만큼 빈 슬롯을 자동으로 만들어주는 트리거.
-- ---------------------------------------------------------
create function public.handle_new_party()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max_players int;
  i int;
begin
  select max_players into v_max_players
  from public.raid_types
  where id = new.raid_type_id;

  for i in 0 .. (v_max_players - 1) loop
    insert into public.party_slots (party_id, slot_index, character_id)
    values (new.id, i, null);
  end loop;

  return new;
end;
$$;

create trigger on_party_created
  after insert on public.parties
  for each row execute function public.handle_new_party();

-- ---------------------------------------------------------
-- 파티 update 시 규칙을 강제하는 트리거:
-- 1) guild_id/raid_type_id/difficulty_index/difficulty_name/created_by는 생성 후 절대 못 바꾼다.
-- 2) is_cleared를 바꾸려면 최소 member 권한이 있어야 한다 (guest는 애초에 RLS에서 걸러지지만,
--    혹시 모를 다른 경로에 대비해 한 번 더 명시적으로 검사하고 에러 메시지를 남긴다).
-- ---------------------------------------------------------
create function public.enforce_party_update_rules()
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
     and not public.has_guild_role_at_least(old.guild_id, 'member') then
    raise exception '클리어 상태를 변경할 권한이 없습니다. (member 이상 필요)';
  end if;

  return new;
end;
$$;

create trigger before_party_update_enforce_rules
  before update on public.parties
  for each row execute function public.enforce_party_update_rules();

-- ---------------------------------------------------------
-- party_slots update 시 세부 규칙을 강제하는 트리거.
-- RLS 정책(party_slots_update)은 "member 이상인지"까지만 걸러주고,
-- 아래 트리거가 그보다 더 세밀한 규칙을 처리한다:
-- 1) party_id/slot_index는 절대 바꿀 수 없다 (슬롯 자체를 다른 파티로 옮기는 것 방지).
-- 2) 파티가 이미 클리어(is_cleared = true) 상태면, 역할과 무관하게 슬롯 수정이 전부 잠긴다.
-- 3) role이 member인 경우, 기존/새 캐릭터 모두 "본인 소유"여야만 한다 (남의 캐릭터는 못 만짐).
--    officer/master는 이 제약 없이 아무 캐릭터나 넣고 뺄 수 있다.
--
-- 이 함수를 security definer로 만든 이유: 만약 invoker 권한으로 characters/parties를
-- 조회하면, RLS 때문에 상대방 캐릭터의 owner_id를 못 봐서 null이 나올 수 있고,
-- "null <> auth.uid()"는 SQL에서 unknown(사실상 거짓 취급)이라 검사를 몰래 통과해버리는
-- 보안 구멍이 생긴다. security definer로 RLS를 우회해서 항상 정확한 owner_id를 봐야 한다.
-- ---------------------------------------------------------
create function public.enforce_party_slot_update_rules()
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
begin
  if new.party_id <> old.party_id or new.slot_index <> old.slot_index then
    raise exception '슬롯의 party_id/slot_index는 변경할 수 없습니다.';
  end if;

  select guild_id, is_cleared into v_guild_id, v_is_cleared
  from public.parties
  where id = old.party_id;

  if v_is_cleared then
    raise exception '클리어 완료된 파티는 슬롯을 수정할 수 없습니다. 먼저 클리어를 해제해주세요.';
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

create trigger before_party_slot_update_enforce_rules
  before update on public.party_slots
  for each row execute function public.enforce_party_slot_update_rules();
