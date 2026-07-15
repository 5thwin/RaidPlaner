import { Outlet, useLocation } from "react-router";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageHeaderProvider } from "@/contexts/PageHeaderContext";

// 모든 라우트가 공유하는 레이아웃 라우트.
// 고정 헤더(AppHeader)를 항상 위에 두고, 실제 페이지 콘텐츠는 Outlet으로 그 아래에 그린다.
//
// 페이지마다 제각각이던 바깥 폭 제한(max-w-*)/여백을 여기 하나로 통일한다: 콘텐츠를
// 화면 중앙의 카드 영역(기본 max-w-4xl)에 두고, 화면이 넓을수록 좌우에 자연스럽게
// 여백이 남게 해서 추후 그 여백에 광고 등을 배치할 수 있는 구조로 잡아둔다.
//
// 예외: 메인 파티 보드("/")는 레이드 2열 x 파티 2열이 겹치는 넓은 화면 레이아웃이라
// max-w-4xl 안에 욱여넣으면 파티 카드 폭이 너무 좁아져 텍스트가 다 줄바꿈되는 문제가
// 있었다(2026-07-13 사용자 확인). 아직 광고를 넣지 않은 단계라, 이 페이지만
// max-w-7xl로 더 넓게 쓰고 나머지 페이지는 광고 여백을 위해 max-w-4xl을 유지한다.
export function AppLayout() {
  const location = useLocation();
  const isBoardPage = location.pathname === "/";
  const maxWidthClass = isBoardPage ? "max-w-7xl" : "max-w-4xl";

  return (
    <PageHeaderProvider>
      <div className="flex min-h-screen w-full flex-col items-center">
        <AppHeader />
        <main className={`mx-auto w-full ${maxWidthClass} flex-1 px-4 py-8`}>
          <Outlet />
        </main>
      </div>
    </PageHeaderProvider>
  );
}
