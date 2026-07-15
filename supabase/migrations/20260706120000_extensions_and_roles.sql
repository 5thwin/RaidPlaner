-- =========================================================
-- 마이그레이션 1: 확장 기능 + 공대 역할(enum) 타입
-- =========================================================
-- 이 프로젝트는 Supabase(Postgres)를 백엔드로 사용한다.
-- 여기서는 앞으로 계속 쓰게 될 UUID 생성 기능과,
-- 공대 내 4단계 권한을 표현하는 enum 타입(guild_role)을 가장 먼저 만들어둔다.

-- gen_random_uuid() 함수를 쓰기 위한 확장 기능.
-- Supabase 프로젝트에는 보통 기본으로 켜져 있지만, 없을 수도 있으니 안전하게 한 번 더 켠다.
-- (이미 켜져 있으면 아무 일도 일어나지 않는다.)
create extension if not exists pgcrypto;

-- 공대 안에서의 권한 4단계.
-- Postgres의 enum 타입은 "선언한 순서"대로 크기 비교(<, >, >=)가 가능하다.
-- 그래서 guest < member < officer < master 순서로 선언해두면,
-- 나중에 정책/함수에서 `role >= 'member'` 처럼 써서
-- "member 이상의 권한인지" 를 아주 간단하게 검사할 수 있다.
create type public.guild_role as enum ('guest', 'member', 'officer', 'master');
