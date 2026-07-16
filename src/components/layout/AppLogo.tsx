interface AppLogoProps {
  className?: string;
}

// 이 앱의 핵심 화면 요소인 "파티 슬롯 그리드"를 그대로 모티프로 쓴 로고.
// 2x2 칸 중 3칸은 채워진 슬롯(파란 사각형), 1칸은 빈 슬롯(점선 테두리)으로 표현해서
// PartySlotCell의 "+ 빈 자리" 점선 테두리 시각 언어와 자연스럽게 이어지게 했다.
export function AppLogo({ className }: AppLogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label="로아팟 로고"
    >
      <rect x="2" y="2" width="16" height="16" rx="4" className="fill-blue-600" />
      <rect x="22" y="2" width="16" height="16" rx="4" className="fill-blue-600" />
      <rect x="2" y="22" width="16" height="16" rx="4" className="fill-blue-600" />
      <rect
        x="22"
        y="22"
        width="16"
        height="16"
        rx="4"
        className="fill-none stroke-gray-400 dark:stroke-gray-500"
        strokeWidth="2"
        strokeDasharray="3 3"
      />
    </svg>
  );
}
