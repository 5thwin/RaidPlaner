// supabase/migrations/20260719120000_sponsor_benefits.sql과 대응된다.
// 아직 이 타입들을 쓰는 훅/화면은 없다 — 후원 기능 본체(아이콘 표시, 프리미엄
// 색상, 광고 제거 UI)를 실제로 만들 때 사용할 스키마를 미리 맞춰둔 것이다.

export type SponsorBenefitType =
  | "mokoko_icon"
  | "premium_roster_color"
  | "ad_free";

// donations 테이블 한 행 (후원 원장).
export interface Donation {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  memo: string | null;
  recorded_by: string;
  created_at: string;
}

// sponsor_benefits 테이블 한 행 (혜택별 만료 시각 캐시).
// 화면에서 "지금 활성 상태인지"는 new Date(expires_at) > new Date()로 판단한다.
export interface SponsorBenefit {
  id: string;
  user_id: string;
  benefit_type: SponsorBenefitType;
  expires_at: string;
  updated_at: string;
}
