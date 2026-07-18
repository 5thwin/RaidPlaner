-- =========================================================
-- 마이그레이션: characters 유니크 제약을 계정(owner_id) 단위로 변경
-- =========================================================
-- 기존에는 unique (server_name, character_name)이라, 같은 서버+캐릭터명이
-- 전 계정 통틀어 딱 하나만 존재할 수 있었다.
-- 문제: 악의적인 유저가 다른 사람의 실제 로스트아크 캐릭터명을 먼저 등록해버리면(선점),
-- 진짜 주인이 나중에 같은 캐릭터를 자기 계정에 등록하려 할 때
-- upsert가 "on conflict (server_name, character_name) do update"로 남의 행을 건드리려 하지만
-- characters_update 정책은 owner_id = auth.uid()인 행만 허용하므로
-- "new row violates row-level security policy" 에러가 나며 영영 등록할 수 없게 된다.
--
-- 해결: 유니크 제약을 (owner_id, server_name, character_name)으로 바꿔서,
-- 계정마다 독립적으로 같은 캐릭터를 등록할 수 있게 한다.
-- 이러면 계정 간 선점/충돌 문제 자체가 사라진다
-- (같은 계정 안에서 동일 캐릭터가 중복 등록되는 것만 계속 막는다).

alter table public.characters
  drop constraint characters_server_name_character_name_key;

alter table public.characters
  add constraint characters_owner_id_server_name_character_name_key
  unique (owner_id, server_name, character_name);
