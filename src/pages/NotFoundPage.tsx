import { Link } from "react-router";

// main.tsx의 catch-all 라우트("*")가 렌더링하는 화면. 정의되지 않은 경로로
// 들어오면(오타, 잘못된 링크 등) 완전히 빈 화면 대신 이 안내를 보여준다.
// AppLayout의 자식 라우트라서 고정 헤더는 그대로 유지된다.
export function NotFoundPage() {
  return (
    <div className="flex w-full flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        주소가 잘못되었거나 더 이상 존재하지 않는 페이지입니다.
      </p>
      <Link
        to="/"
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        홈으로 이동
      </Link>
    </div>
  );
}
