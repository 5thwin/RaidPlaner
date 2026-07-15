-- =========================================================
-- 마이그레이션 13: rosters 백필 + characters.roster_id not null 전환
-- =========================================================
-- 이미 대표 캐릭터명을 연결해둔 프로필마다 rosters에 한 행을 만들고, 그 프로필이
-- owner_id인 characters 행들의 roster_id를 방금 만든 roster로 채운다(데이터 손실 없음).
do $$
declare
  profile_row record;
  new_roster_id uuid;
begin
  -- 1) representative_character_name이 있는 프로필: 그 이름으로 원정대 1개를 만든다.
  for profile_row in
    select id, representative_character_name
    from public.profiles
    where representative_character_name is not null
  loop
    insert into public.rosters (owner_id, representative_character_name)
    values (profile_row.id, profile_row.representative_character_name)
    returning id into new_roster_id;

    update public.characters
    set roster_id = new_roster_id
    where owner_id = profile_row.id
      and roster_id is null;
  end loop;

  -- 2) 예외 케이스: representative_character_name이 없는 프로필인데 이미 캐릭터가 있는 경우.
  --    그 프로필 소유 캐릭터 중 가장 먼저 생성된 캐릭터명을 대표 캐릭터명으로 삼아
  --    원정대를 만들어서, roster_id가 비는 orphan 캐릭터가 남지 않게 한다.
  for profile_row in
    select distinct c.owner_id as id
    from public.characters c
    where c.roster_id is null
  loop
    insert into public.rosters (owner_id, representative_character_name)
    select profile_row.id, c.character_name
    from public.characters c
    where c.owner_id = profile_row.id
      and c.roster_id is null
    order by c.created_at asc
    limit 1
    returning id into new_roster_id;

    update public.characters
    set roster_id = new_roster_id
    where owner_id = profile_row.id
      and roster_id is null;
  end loop;
end $$;

-- 백필이 끝나면 모든 characters 행에 roster_id가 채워져 있어야 한다.
alter table public.characters
  alter column roster_id set not null;
