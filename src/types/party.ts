import type { Character } from "@/types/character";

// parties 테이블 한 행. supabase/migrations의
// 20260706120500_parties_and_slots.sql과 대응된다.
// difficulty_index는 raid_types.difficulties의 index, difficulty_name은
// 파티 생성 시점의 난이도 이름 스냅샷이다(이후 raid_types가 바뀌어도 영향받지 않는다).
export interface Party {
  id: string;
  guild_id: string;
  raid_type_id: string;
  difficulty_index: number;
  difficulty_name: string;
  is_cleared: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// 슬롯에 채워진 캐릭터를 화면에 보여줄 때 필요한 최소 정보.
// characters + profiles(소유자 이름) 조인 결과를 다루기 쉽게 펼친 형태다.
export interface PartySlotCharacter {
  id: string;
  character_name: string;
  character_class_name: string;
  item_avg_level: number;
  // 실제 전투력(item_avg_level과 별개 값). 프로필 조회가 안 됐으면 null일 수 있다.
  combat_power: number | null;
  owner_id: string;
  owner_display_name: string | null;
  // 이 캐릭터가 속한 원정대의 색상(고정 팔레트 키). rosters 조인이 비었을 수 있어
  // null을 허용하고, 표시할 때는 getRosterColorScheme이 기본값으로 폴백한다.
  roster_color: string | null;
}

// party_slots 테이블 한 행 + 조인된 캐릭터 정보.
export interface PartySlot {
  id: string;
  party_id: string;
  slot_index: number;
  character_id: string | null;
  character: PartySlotCharacter | null;
}

export interface PartyWithSlots extends Party {
  slots: PartySlot[];
}

// 빈 슬롯에 넣을 수 있는 후보 캐릭터. 원정대 캐릭터 정보 + 소유자 표시 이름을 함께 담는다
// (officer 이상은 다른 사람의 캐릭터도 후보로 볼 수 있으므로 누구 소유인지 표시가 필요하다).
export interface AssignableCharacter extends Character {
  owner_display_name: string | null;
  // 이 캐릭터가 속한 원정대의 표시 이름/색상/생성 시각. 후보 선택 모달에서
  // 원정대별 탭으로 묶어 보여주는 데 쓴다.
  roster_representative_name: string | null;
  roster_color: string | null;
  roster_created_at: string | null;
}
