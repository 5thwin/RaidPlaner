import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// 예상 못한 렌더링 에러가 나면 흰 화면만 뜨고 아무 안내도 없이 멈추는 걸 막기 위한
// 최상위 안전망. 에러 바운더리는 클래스 컴포넌트로만 만들 수 있다(React 제약).
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] 처리되지 않은 에러:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-gray-50 px-4 text-center dark:bg-gray-900">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            문제가 발생했습니다.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            페이지를 새로고침해도 계속되면 잠시 후 다시 시도해주세요.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
