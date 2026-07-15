// rosters 테이블 한 행. supabase/migrations/20260706121000_rosters.sql과 대응된다.
// 유저 한 명이 여러 로스트아크 계정(원정대)을 가질 수 있어서, 원정대를 유저(profiles)와
// 별도 엔티티로 분리한 것이다. 캐릭터의 실제 소유자(characters.owner_id, 파티 슬롯 권한
// 로직의 기준)와는 별개 개념이니 혼동하지 않는다.
export interface Roster {
  id: string;
  owner_id: string;
  representative_character_name: string;
  // 원정대 구분 색상(고정 팔레트 키). src/lib/rosterColor.ts의 getRosterColorScheme으로
  // 실제 스타일 값을 얻는다.
  color: string;
  created_at: string;
  updated_at: string;
}
