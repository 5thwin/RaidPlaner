// 난이도 색상은 이름이 아니라 difficulty_index(=raid_types.difficulties의 index)를
// 고정 팔레트에 매핑해서 정한다. 레이드마다 난이도 이름 체계가 달라도
// "첫 번째 난이도는 항상 초록, 두 번째는 항상 파랑" 식으로 일관된 색을 보여주기 위함이다.
export interface DifficultyColorScheme {
  // 선택된 탭/배지 등에 쓰는 배경색+글자색 조합.
  solid: string;
  // 선택되지 않은 탭에 쓰는 테두리+글자색 조합 (배경은 투명).
  outline: string;
  // 파티 카드처럼 넓은 영역을 옅은 배경+테두리로 난이도별 구분할 때 쓰는 조합.
  card: string;
}

const DIFFICULTY_COLOR_PALETTE: DifficultyColorScheme[] = [
  {
    solid: "bg-emerald-600 text-white",
    outline: "border-emerald-600 text-emerald-600 dark:text-emerald-400",
    card: "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40",
  }, // index 0: 초록
  {
    solid: "bg-blue-600 text-white",
    outline: "border-blue-600 text-blue-600 dark:text-blue-400",
    card: "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/40",
  }, // index 1: 파랑
  {
    solid: "bg-red-600 text-white",
    outline: "border-red-600 text-red-600 dark:text-red-400",
    card: "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/40",
  }, // index 2: 빨강
  {
    solid: "bg-purple-600 text-white",
    outline: "border-purple-600 text-purple-600 dark:text-purple-400",
    card: "border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-950/40",
  }, // index 3: 보라
  {
    solid: "bg-amber-600 text-white",
    outline: "border-amber-600 text-amber-600 dark:text-amber-400",
    card: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40",
  }, // 그 이후는 순환
];

export function getDifficultyColorScheme(
  difficultyIndex: number,
): DifficultyColorScheme {
  return DIFFICULTY_COLOR_PALETTE[
    difficultyIndex % DIFFICULTY_COLOR_PALETTE.length
  ];
}
