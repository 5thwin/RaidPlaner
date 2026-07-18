// characters 테이블 한 행. supabase/migrations의 20260706120400_characters.sql +
// 20260706120800_characters_character_image_url.sql +
// 20260706120900_characters_combat_power.sql +
// 20260706121100_characters_roster_id.sql과 대응된다.
export interface Character {
  id: string;
  owner_id: string;
  // 이 캐릭터가 속한 원정대(rosters.id). owner_id(실제 소유자, 파티 슬롯 권한 기준)와는
  // 별개 값이다 — 한 유저가 여러 원정대(roster)를 가질 수 있다.
  roster_id: string;
  server_name: string;
  character_name: string;
  character_level: number;
  character_class_name: string;
  // 아이템 레벨. combat_power(전투력)와는 별개의 값이다.
  item_avg_level: number;
  // 로스트아크 프로필 API(/armories/characters/{characterName}/profiles, CharacterImage)에서
  // 받아온 캐릭터 이미지 URL. 프로필 조회가 실패했거나 아직 한 번도 갱신되지 않았으면 null이다.
  character_image_url: string | null;
  // 같은 프로필 API의 CombatPower(실제 전투력 수치). item_avg_level과 혼동하지 않는다.
  combat_power: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// "파티원" 페이지(/guilds/:guildId/members)에서 보여줄 공대원의 캐릭터(활성+비활성 모두).
// characters + profiles(소유자 이름) + rosters(원정대 색상/생성일) 조인 결과를 다루기 쉽게 펼친 형태다.
// 읽기 전용 화면이라 활성/비활성 토글이나 갱신에 필요한 값은 다루지 않는다.
export interface GuildCharacter extends Character {
  owner_display_name: string | null;
  // 이 캐릭터가 속한 원정대의 색상(고정 팔레트 키). rosters 조인이 비었을 수 있어
  // null을 허용하고, 표시할 때는 getRosterColorScheme이 기본값으로 폴백한다.
  roster_color: string | null;
  // 이 캐릭터가 속한 원정대의 생성 시각. 한 유저가 여러 원정대를 가질 때,
  // 원정대를 연결한 순서(A원정대 -> B원정대 ...)대로 캐릭터를 묶어서 보여주는 데 쓴다.
  roster_created_at: string | null;
}

// 로스트아크 오픈 API `/characters/{characterName}/siblings` 응답 원소.
// 필드명은 API 원본 표기(PascalCase)를 그대로 따른다.
export interface LostArkSiblingCharacter {
  ServerName: string;
  CharacterName: string;
  CharacterLevel: number;
  CharacterClassName: string;
  // "1,664.17"처럼 천단위 콤마가 포함된 문자열이다. 숫자 비교 전 반드시 파싱해야 한다.
  ItemAvgLevel: string;
  // siblings API 원본에는 없는 필드. Edge Function(lostark-roster)이 프로필 API
  // (/armories/characters/{characterName}/profiles)를 추가로 호출해 병합해준다.
  // 프로필 조회가 실패하면 null로 채워진다.
  CharacterImage: string | null;
  // 같은 프로필 API의 CombatPower. ItemAvgLevel과 마찬가지로 콤마 포함 문자열이며,
  // 프로필 조회가 실패하면 null로 채워진다.
  CombatPower: string | null;
}
