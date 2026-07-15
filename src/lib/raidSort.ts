import type { RaidType } from "@/types/raid";

// 레이드 목록을 입장 레벨(가장 낮은 난이도 기준) 오름차순으로 보여주기 위한 정렬 키.
// min_item_levels는 난이도별 배열이라 DB에서 바로 order by 하기 까다로워서,
// 클라이언트에서 받아온 뒤 이 값 기준으로 정렬한다.
// 값이 아직 안 정해진(null) 레이드는 맨 뒤로 보내기 위해 Infinity를 쓴다.
export function minEntryItemLevel(raidType: RaidType): number {
  return raidType.min_item_levels?.[0] ?? Infinity;
}

// 레이드 목록 정렬 비교 함수.
// 같은 레벨대의 레이드가 여러 개 있으면 입장 레벨만으로는 실제 출시 순서와
// 다르게 보일 수 있어서(예: 세르카/종막:카제로스가 둘 다 1710), 운영자가 직접
// 정하는 display_order를 우선 기준으로 삼고, display_order가 같거나 없는
// 레이드끼리는 입장 레벨로 보조 정렬한다.
export function compareRaidTypeDisplayOrder(a: RaidType, b: RaidType): number {
  const orderA = a.display_order ?? Infinity;
  const orderB = b.display_order ?? Infinity;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return minEntryItemLevel(a) - minEntryItemLevel(b);
}
