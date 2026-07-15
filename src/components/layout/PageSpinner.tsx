interface PageSpinnerProps {
  // 스피너 아래에 같이 보여줄 안내 문구. 없으면 스피너만 보여준다.
  label?: string;
  // 페이지 전체 로딩과 카드/섹션 등 부분 영역 로딩에서 모두 재사용할 수 있도록
  // 세로로 차지하는 최소 높이를 상황에 맞게 조절할 수 있게 열어둔다.
  minHeightClassName?: string;
}

// 페이지 전환/새로고침 시 잠깐 나오는 로딩 화면을 통일하기 위한 공용 컴포넌트.
// 기존에는 페이지마다 제각각 한 줄짜리 안내 문구만 보여줘서, 화면 전체가
// 갑자기 훅 바뀌는 느낌이 부자연스러웠다. 화면 가운데에 어느 정도 공간을 차지하는
// 회전 스피너를 두어 "로딩 중"임을 시각적으로 자연스럽게 전달한다.
export function PageSpinner({
  label,
  minHeightClassName = "min-h-[240px]",
}: PageSpinnerProps) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-3 ${minHeightClassName}`}
    >
      <div
        role="status"
        aria-label={label ?? "불러오는 중"}
        className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"
      />
      {label && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      )}
    </div>
  );
}
