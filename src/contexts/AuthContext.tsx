import { createContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

// 로그인 상태와 관련 함수들을 앱 전역에서 꺼내 쓸 수 있게 담아두는 그릇(Context)의 타입.
export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  // Supabase가 로그인 세션을 아직 확인 중인지 여부 (새로고침 직후 등)
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 앱이 처음 켜졌을 때, 이미 로그인되어 있던 세션이 있는지 확인한다.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // 로그인/로그아웃이 일어날 때마다 세션 상태를 실시간으로 갱신받는다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    // Google 계정으로 로그인 창을 띄운다. 성공하면 Supabase가 알아서
    // 현재 페이지로 돌아오면서 위 onAuthStateChange가 세션을 채워준다.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });

    if (error) {
      console.error("[Supabase Auth] Google 로그인에 실패했습니다.", error);
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[Supabase Auth] 로그아웃에 실패했습니다.", error);
    }
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    isLoading,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
