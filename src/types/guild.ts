// guild_role enum (supabase/migrations/20260706120000_extensions_and_roles.sql)과 대응된다.
// guest < member < officer < master 순서로 권한이 커진다 (DB의 enum 선언 순서와 동일).
export type GuildRole = "guest" | "member" | "officer" | "master";

// guilds 테이블 한 행. supabase/migrations/20260706120200_guilds_and_members.sql과 대응된다.
// invite_code는 20260712120000_guild_invite_codes.sql에서 추가된 셀프 참여용 코드.
export interface Guild {
  id: string;
  name: string;
  // 계정 삭제 시 생성자 프로필이 사라지면 null로 남는다(on delete set null).
  created_by: string | null;
  created_at: string;
  invite_code: string;
  // 연동된 디스코드 서버 ID. /파티현황 등 디스코드 슬래시 명령어가 쓴다.
  discord_guild_id: string | null;
}

// 로그인한 유저가 속한 공대 하나. guild_members + guilds 조인 결과를 담는다.
export interface MyGuildMembership {
  guild_id: string;
  guild_name: string;
  role: GuildRole;
  joined_at: string;
}

// 공대 상세(멤버 관리) 화면에서 보여줄 멤버 한 명. guild_members + profiles 조인 결과.
export interface GuildMemberWithProfile {
  id: string;
  guild_id: string;
  user_id: string;
  role: GuildRole;
  joined_at: string;
  display_name: string | null;
  representative_character_name: string | null;
  avatar_url: string | null;
}
