// raid_types 테이블 한 행. supabase/migrations의
// 20260706120300_raid_types_and_visibility.sql과 대응된다.
// difficulties/min_item_levels는 같은 길이/같은 순서로 짝지어진 배열이다.
export interface RaidType {
  id: string;
  name: string;
  difficulties: string[];
  // 난이도별 입장 최소 아이템 레벨. 값 하나하나가 null일 수도 있고(운영자가 아직 안 정함),
  // 배열 자체가 null일 수도 있다(레이드 전체에 아직 아무 값도 안 정해진 경우).
  min_item_levels: (number | null)[] | null;
  max_players: number;
  // 목록 표시 순서(작을수록 먼저). 운영자가 SQL로 직접 관리한다. null이면 정렬 시 맨 뒤.
  display_order: number | null;
  created_at: string;
}

// guild_raid_visibility 테이블 한 행. 공대별 레이드 노출 여부.
export interface GuildRaidVisibility {
  id: string;
  guild_id: string;
  raid_type_id: string;
  is_visible: boolean;
}

// 메인 화면(레이드-파티 현황판)에서 쓰는, "현재 공대에서 노출 중인 레이드" 하나.
// raid_types + guild_raid_visibility 조인 결과를 다루기 쉽게 펼친 형태다.
export interface VisibleRaidType extends RaidType {
  guild_raid_visibility_id: string;
}

// 공대 레이드 노출 설정 화면(officer 이상)에서 쓰는, 레이드 하나 + 노출 여부.
// VisibleRaidType과 달리 is_visible=false인 레이드도 토글해서 다시 켤 수 있도록 함께 포함한다.
export interface RaidVisibilityEntry extends RaidType {
  guild_raid_visibility_id: string;
  is_visible: boolean;
}
