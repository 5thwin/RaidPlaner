import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

// 컴포넌트 어디서든 `const { user, signInWithGoogle } = useAuth();` 처럼
// 로그인 상태와 로그인/로그아웃 함수를 꺼내 쓰기 위한 훅.
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }

  return context;
}
