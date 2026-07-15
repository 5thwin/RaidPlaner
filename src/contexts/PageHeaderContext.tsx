import { createContext, useState, type ReactNode } from "react";

// 고정 헤더(AppHeader)에 "지금 보고 있는 페이지만의 부가 콘텐츠"(공대명, 뒤로가기
// 링크 등)를 얹을 수 있게 해주는 그릇(Context)의 타입.
// 헤더는 레이아웃(AppLayout)이 그리지만, 그 안에 무엇을 더 보여줄지는 각 페이지가
// 정하므로, 페이지 → 레이아웃 방향으로 콘텐츠를 전달하기 위해 컨텍스트를 사용한다.
export interface PageHeaderContextValue {
  headerExtra: ReactNode;
  setHeaderExtra: (node: ReactNode) => void;
}

export const PageHeaderContext = createContext<
  PageHeaderContextValue | undefined
>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [headerExtra, setHeaderExtra] = useState<ReactNode>(null);

  const value: PageHeaderContextValue = { headerExtra, setHeaderExtra };

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  );
}
