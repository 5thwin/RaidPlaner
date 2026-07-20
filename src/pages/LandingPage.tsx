import type { SVGProps } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AppLogo } from "@/components/layout/AppLogo";

function RosterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="4" width="14" height="18" rx="2" transform="rotate(-6 10 13)" />
      <path d="M8 9h6M8 13h6M8 17h3" />
    </svg>
  );
}

function BoardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="4" width="8" height="8" rx="1.5" />
      <rect x="13" y="4" width="8" height="8" rx="1.5" />
      <rect x="3" y="14" width="8" height="6" rx="1.5" />
      <rect x="13" y="14" width="8" height="6" rx="1.5" strokeDasharray="2.5 2.5" />
    </svg>
  );
}

function RoleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 18h16" />
      <path d="m4 18-1.2-9 5.2 4 4-7 4 7 5.2-4-1.2 9" />
    </svg>
  );
}

function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

const FEATURES: {
  Icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element;
  title: string;
  description: string;
}[] = [
  {
    Icon: RosterIcon,
    title: "원정대 자동 연동",
    description:
      "대표 캐릭터명 하나만 입력하면 로스트아크 오픈 API에서 원정대 전체를 불러옵니다. 여러 계정도 원정대별로 따로 관리할 수 있어요.",
  },
  {
    Icon: BoardIcon,
    title: "레이드 파티 편성 현황판",
    description:
      "난이도별 파티 슬롯에 캐릭터를 배정하면 공대원 전체가 같은 화면을 실시간으로 봅니다. 누가 어디 배정됐는지 더 이상 단톡방에서 물어볼 필요 없어요.",
  },
  {
    Icon: RoleIcon,
    title: "역할 기반 공대 관리",
    description:
      "공대장·운영진·파티원·게스트 4단계 권한으로 공대를 체계적으로 운영합니다. 초대 코드 하나로 새 공대원을 받을 수 있어요.",
  },
  {
    Icon: CalendarIcon,
    title: "공대 일정 캘린더",
    description:
      "레이드/보스 일정을 캘린더에 올리고 참석 여부를 공유합니다. 일정 조율도 파티 편성처럼 한곳에서 끝내세요.",
  },
];

// 로그아웃 상태에서 "/"에 뜨는 랜딩 페이지. 예전엔 "헤더에서 로그인해주세요" 한 줄이
// 전부라 검색엔진이 색인할 내용도, 처음 온 사람이 뭘 하는 서비스인지 알 방법도
// 없었다(2026-07-20 사용자 피드백 + SEO 작업의 일환). 로그인 버튼을 헤더뿐 아니라
// 여기서도 바로 누를 수 있게 했다.
export function LandingPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="flex w-full flex-col items-center gap-16 py-8">
      <section className="flex flex-col items-center gap-5 text-center">
        <AppLogo className="h-14 w-14" />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">
            로스트아크 공대 운영, 로아팟으로
          </h1>
          <p className="max-w-xl text-balance text-sm text-gray-500 dark:text-gray-400 sm:text-base">
            원정대 등록부터 레이드 파티 편성, 공대 일정까지 — 공대원 전체가
            함께 보는 파티 현황판.
          </p>
        </div>
        <button
          type="button"
          onClick={signInWithGoogle}
          className="rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          Google로 시작하기
        </button>
      </section>

      <section className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map(({ Icon, title, description }) => (
          <div
            key={title}
            className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        ))}
      </section>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        구글 계정으로 로그인하면 바로 시작할 수 있습니다. 별도 회원가입은
        없어요.
      </p>
    </div>
  );
}
