// 원정대(rosters) 구분 색상은 difficultyColor.ts와 같은 방식으로, 자유 hex 입력이
// 아니라 고정 팔레트 중 하나를 유저가 골라서 rosters.color(팔레트 키 문자열)에 저장한다.
// 파티 슬롯에 캐릭터가 채워졌을 때 "이 캐릭터가 어느 원정대 소속인지"를 색으로
// 구분해서 보여주기 위한 용도다 — 난이도 색상(difficultyColor.ts)과는 목적이 다르다.
export interface RosterColorScheme {
  key: string;
  label: string;
  // 원정대 관리 화면에서 색을 고르는 원형 스와치 버튼 배경색.
  swatch: string;
  // 파티 슬롯 카드 좌측에 그리는 컬러 바(border-left)로, 라이트/다크 짝을 포함한다.
  bar: string;
}

// Tailwind의 표준 유채색 17개(회색 계열 제외)를 색상환 순서 그대로 전부 쓴다.
// 처음엔 10개만 골랐었는데, 공대 하나에 원정대가 10개를 넘어가면 색이 겹치는
// 경우가 생겨서(2026-07-12 사용자 요청) 구분을 더 세분화했다.
const ROSTER_COLOR_PALETTE: RosterColorScheme[] = [
  { key: "red", label: "레드", swatch: "bg-red-500", bar: "border-l-red-500 dark:border-l-red-400" },
  { key: "orange", label: "오렌지", swatch: "bg-orange-500", bar: "border-l-orange-500 dark:border-l-orange-400" },
  { key: "amber", label: "앰버", swatch: "bg-amber-500", bar: "border-l-amber-500 dark:border-l-amber-400" },
  { key: "yellow", label: "옐로우", swatch: "bg-yellow-500", bar: "border-l-yellow-500 dark:border-l-yellow-400" },
  { key: "lime", label: "라임", swatch: "bg-lime-500", bar: "border-l-lime-500 dark:border-l-lime-400" },
  { key: "green", label: "그린", swatch: "bg-green-500", bar: "border-l-green-500 dark:border-l-green-400" },
  { key: "emerald", label: "에메랄드", swatch: "bg-emerald-500", bar: "border-l-emerald-500 dark:border-l-emerald-400" },
  { key: "teal", label: "틸", swatch: "bg-teal-500", bar: "border-l-teal-500 dark:border-l-teal-400" },
  { key: "cyan", label: "시안", swatch: "bg-cyan-500", bar: "border-l-cyan-500 dark:border-l-cyan-400" },
  { key: "sky", label: "스카이", swatch: "bg-sky-500", bar: "border-l-sky-500 dark:border-l-sky-400" },
  { key: "blue", label: "블루", swatch: "bg-blue-500", bar: "border-l-blue-500 dark:border-l-blue-400" },
  { key: "indigo", label: "인디고", swatch: "bg-indigo-500", bar: "border-l-indigo-500 dark:border-l-indigo-400" },
  { key: "violet", label: "바이올렛", swatch: "bg-violet-500", bar: "border-l-violet-500 dark:border-l-violet-400" },
  { key: "purple", label: "퍼플", swatch: "bg-purple-500", bar: "border-l-purple-500 dark:border-l-purple-400" },
  { key: "fuchsia", label: "푸시아", swatch: "bg-fuchsia-500", bar: "border-l-fuchsia-500 dark:border-l-fuchsia-400" },
  { key: "pink", label: "핑크", swatch: "bg-pink-500", bar: "border-l-pink-500 dark:border-l-pink-400" },
  { key: "rose", label: "로즈", swatch: "bg-rose-500", bar: "border-l-rose-500 dark:border-l-rose-400" },
];

const DEFAULT_ROSTER_COLOR_KEY = "blue";

// 팔레트 선택 UI(스와치 나열)에서 쓰는 전체 목록.
export function getRosterColorPalette(): RosterColorScheme[] {
  return ROSTER_COLOR_PALETTE;
}

// 알 수 없는 키(과거 데이터 손상 등)가 들어와도 기본 색으로 안전하게 폴백한다.
export function getRosterColorScheme(colorKey: string): RosterColorScheme {
  return (
    ROSTER_COLOR_PALETTE.find((scheme) => scheme.key === colorKey) ??
    ROSTER_COLOR_PALETTE.find((scheme) => scheme.key === DEFAULT_ROSTER_COLOR_KEY)!
  );
}
