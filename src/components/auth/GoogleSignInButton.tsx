import { GoogleGLogo } from "@/components/auth/GoogleGLogo";

interface GoogleSignInButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

// 구글 "Sign in with Google" 브랜딩 가이드라인을 따르는 버튼.
// (https://developers.google.com/identity/branding-guidelines)
// - 색상/테두리/텍스트 색은 라이트·다크 각각 가이드라인에 명시된 값 그대로.
// - 로고는 표준 색상 G 로고(GoogleGLogo)를 임의로 바꾸지 않고 그대로 사용.
// - 높이 40px(h-10), 로고 좌측 12px/우측 10px, 텍스트 우측 12px 패딩도 가이드 값 그대로.
// - "Google Sans Medium"은 서드파티가 임베드할 수 없는 구글 전용 폰트라, 앱 기본
//   폰트에 medium 굵기만 맞춰 근사치로 표현한다.
export function GoogleSignInButton({
  onClick,
  label = "Google로 로그인",
  className = "",
}: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 flex-none items-center gap-2.5 rounded-md border border-[#747775] bg-white pl-3 pr-3 text-sm font-medium text-[#1F1F1F] hover:bg-[#F8F8F8] dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3] dark:hover:bg-[#1E1F20] ${className}`}
    >
      <GoogleGLogo className="h-5 w-5 flex-none" />
      {label}
    </button>
  );
}
