import { useTheme } from "@/hooks/useTheme";

// 라이트/다크 테마 전환 버튼. 로그인 여부와 무관하게 항상 접근 가능해야 하므로
// 로그인 화면, 온보딩 화면, 메인 보드 화면 등 사용자가 머무를 수 있는 화면 전반에 배치한다.
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
    >
      {isDark ? "🌙 다크" : "☀️ 라이트"}
    </button>
  );
}
