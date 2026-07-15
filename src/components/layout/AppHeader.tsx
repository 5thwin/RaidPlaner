import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { Link, useLocation } from "react-router";
import { AuthStatus } from "@/components/auth/AuthStatus";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AppLogo } from "@/components/layout/AppLogo";
import { useHeaderExtraValue } from "@/hooks/usePageHeaderExtra";

function HomeIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="9.5" cy="7.5" r="3.5" />
      <path d="M17 11a3 3 0 1 0-1.2-5.75" />
      <path d="M20 19v-1a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

function PlusCircleIcon(props: SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function TicketIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
      <path d="M10 6v12" strokeDasharray="2 2" />
    </svg>
  );
}

// 홈/원정대 이동 링크는 데스크톱 가로 nav와 모바일 오버레이 세로 목록에서 함께 쓴다.
const NAV_LINKS: {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}[] = [
  { to: "/", label: "홈", Icon: HomeIcon },
  { to: "/roster", label: "원정대", Icon: UsersIcon },
  { to: "/onboarding", label: "공대 만들기", Icon: PlusCircleIcon },
  { to: "/guilds/join", label: "공대 참여", Icon: TicketIcon },
];

// 모든 페이지가 공유하는 고정(sticky) 상단 헤더.
//
// 반응형 처리:
// - 데스크톱(md 이상): 로고, "홈"/"원정대" 이동 링크, 페이지별 부가 콘텐츠(왼쪽), 테마 토글,
//   로그인 상태(오른쪽)를 한 줄에 전부 보여준다.
// - 모바일(md 미만): 왼쪽에 햄버거 버튼 + 로고, 오른쪽엔 로그인 상태를 아이콘
//   하나로 축약해서만 보여준다. 나머지(원정대 링크, 페이지별 부가 콘텐츠, 테마 토글,
//   전체 로그인 정보)는 햄버거 버튼을 눌렀을 때 헤더 바로 아래에서 펼쳐지는, 화면
//   위쪽을 덮는 전체 폭 오버레이 패널에 몰아넣는다.
//
// 폭: 본문(AppLayout)과 마찬가지로 메인 파티 보드("/")에서만 max-w-7xl로 더 넓게
// 쓰고, 나머지 페이지는 광고 여백용 max-w-4xl을 유지한다 (AppLayout의 같은 분기와
// 항상 짝을 맞춰야 헤더와 본문의 좌우 정렬이 어긋나지 않는다).
export function AppHeader() {
  const headerExtra = useHeaderExtraValue();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const maxWidthClass = location.pathname === "/" ? "max-w-7xl" : "max-w-4xl";

  // 페이지 이동(라우트 변경) 시 열려 있던 모바일 오버레이 메뉴는 자동으로 닫는다.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-20 w-full border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      <div
        className={`mx-auto hidden w-full ${maxWidthClass} items-center justify-between gap-4 px-4 py-4 md:flex`}
      >
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/" aria-label="홈으로 이동">
            <AppLogo className="h-7 w-7" />
          </Link>
          <nav className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-200">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-4">{headerExtra}</div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <ThemeToggle />
          <AuthStatus />
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-lg leading-none text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {isMenuOpen ? "✕" : "☰"}
          </button>
          <Link to="/" aria-label="홈으로 이동">
            <AppLogo className="h-7 w-7" />
          </Link>
        </div>

        <AuthStatus compact />
      </div>

      {isMenuOpen && (
        <div className="absolute inset-x-0 top-full z-30 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-gray-200 bg-gray-50 shadow-lg dark:border-gray-700 dark:bg-gray-900 md:hidden">
          <nav className="flex flex-col">
            {NAV_LINKS.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Icon className="h-5 w-5 flex-none" />
                {label}
              </Link>
            ))}
          </nav>

          {headerExtra && (
            <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              {headerExtra}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              테마
            </span>
            <ThemeToggle />
          </div>

          <div className="px-4 py-3">
            <AuthStatus />
          </div>
        </div>
      )}
    </header>
  );
}
