import { useContext } from "react";
import { ThemeContext } from "@/contexts/ThemeContext";

// 컴포넌트 어디서든 `const { theme, toggleTheme } = useTheme();` 처럼
// 현재 테마와 전환 함수를 꺼내 쓰기 위한 훅.
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme은 ThemeProvider 내부에서만 사용할 수 있습니다.");
  }

  return context;
}
