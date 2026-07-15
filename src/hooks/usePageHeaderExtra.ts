import { useContext, useEffect, type ReactNode } from "react";
import { PageHeaderContext } from "@/contexts/PageHeaderContext";

function usePageHeaderContext() {
  const context = useContext(PageHeaderContext);

  if (context === undefined) {
    throw new Error(
      "usePageHeaderExtra/useHeaderExtraValue는 PageHeaderProvider 내부에서만 사용할 수 있습니다.",
    );
  }

  return context;
}

// 페이지 컴포넌트가 고정 헤더에 자기만의 부가 콘텐츠(공대명, 공대 스위처,
// 뒤로가기 링크 등)를 얹고 싶을 때 호출하는 훅.
// 페이지 렌더 결과가 바뀌거나 페이지에서 벗어나면(언마운트) 자동으로 정리(clear)된다.
//
// 중요: node는 참조 동등성으로 비교된다(useEffect 의존성 배열에 그대로 들어감).
// 매 렌더마다 새로 생기는 인라인 JSX(`usePageHeaderExtra(<div>...</div>)`)를 그대로
// 넘기면, 렌더 → setHeaderExtra 호출 → 컨텍스트 갱신 → 이 컴포넌트 리렌더 → 새 JSX
// 생성 → 다시 setHeaderExtra 호출... 로 이어지는 무한 루프("Maximum update depth
// exceeded")가 난다. 호출하는 쪽에서 값이 바뀔 때만 새 노드가 생기도록
// `useMemo`로 감싸거나(동적인 경우), 완전히 정적인 노드라면 컴포넌트 바깥
// 모듈 스코프 상수로 선언해서 넘겨야 한다.
export function usePageHeaderExtra(node: ReactNode): void {
  const { setHeaderExtra } = usePageHeaderContext();

  useEffect(() => {
    setHeaderExtra(node);
    return () => setHeaderExtra(null);
  }, [node, setHeaderExtra]);
}

// AppHeader가 지금 등록되어 있는 부가 콘텐츠를 읽어오기 위한 훅.
export function useHeaderExtraValue(): ReactNode {
  return usePageHeaderContext().headerExtra;
}
