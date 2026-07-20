import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { GoogleGLogo } from "@/components/auth/GoogleGLogo";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

interface AuthStatusProps {
  // 모바일 헤더 우측처럼 좁은 공간에 놓일 때, 이름/버튼 텍스트 없이 아이콘 하나로만
  // 로그인 상태를 보여준다(전체 로그인/로그아웃 정보는 오버레이 메뉴 쪽에 그대로 남는다).
  compact?: boolean;
}

// 로그인 상태에 따라 "구글 로그인 버튼" 또는 "로그인한 유저 정보 + 로그아웃 버튼"을 보여준다.
export function AuthStatus({ compact = false }: AuthStatusProps) {
  const { user, isLoading, signInWithGoogle, signOut } = useAuth();
  // profiles.display_name은 유저가 프로필 모달에서 직접 바꿀 수 있으니, 구글 로그인
  // 당시 이름(user.user_metadata.full_name)보다 이 값을 우선한다 — 아직 프로필을
  // 못 불러왔거나 표시 이름을 따로 설정 안 했으면 구글 이름/이메일로 폴백한다.
  const { profile } = useProfile();

  if (isLoading) {
    if (compact) {
      return null;
    }

    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        로그인 상태 확인 중...
      </p>
    );
  }

  if (!user) {
    if (compact) {
      // 좁은 모바일 헤더에서도 "이건 구글 로그인 버튼"이라는 게 한눈에 보이도록
      // 아이콘만 구글 G 로고로 바꿨다(정식 버튼 규격은 아니지만, 일반 사람 아이콘보다
      // 브랜딩 가이드라인의 취지에 더 가깝다).
      return (
        <button
          type="button"
          onClick={signInWithGoogle}
          aria-label="Google로 로그인"
          title="Google로 로그인"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <GoogleGLogo className="h-4 w-4" />
        </button>
      );
    }

    return <GoogleSignInButton onClick={signInWithGoogle} />;
  }

  const displayName =
    profile?.display_name ?? user.user_metadata.full_name ?? user.email ?? "";

  if (compact) {
    const initial = displayName.trim().charAt(0).toUpperCase() || "?";

    return (
      <span
        title={`${displayName} 님 환영합니다`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
      >
        {initial}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        to="/roster"
        className="text-sm text-gray-700 hover:text-blue-600 hover:underline dark:text-gray-200 dark:hover:text-blue-400"
      >
        {displayName} 님 환영합니다
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
      >
        로그아웃
      </button>
    </div>
  );
}
