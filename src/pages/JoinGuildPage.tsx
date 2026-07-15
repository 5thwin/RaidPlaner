import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useJoinGuildByCode } from "@/hooks/useJoinGuildByCode";
import { PageSpinner } from "@/components/layout/PageSpinner";

// 초대 코드로 공대에 참여하는 화면. "/onboarding"과 달리 소속 공대 개수와 무관하게
// 로그인만 되어 있으면 항상 접근할 수 있어야 하므로(이미 다른 공대에 속해 있어도
// 새 공대에 코드로 참여할 수 있어야 함) 별도 라우트("/guilds/join")로 분리했다.
export function JoinGuildPage() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { joinGuild, isJoining } = useJoinGuildByCode();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (isAuthLoading) {
    return <PageSpinner label="로그인 상태 확인 중..." />;
  }

  if (!user) {
    // 로그인 화면(로그인 버튼)은 "/"에만 있으므로, 로그아웃 상태로 여기 남아있지 않도록 되돌려보낸다.
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = code.trim();
    if (trimmed.length === 0) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      await joinGuild(trimmed);
      setSuccessMessage(
        "공대에 참여했습니다. 잠시 후 메인 화면으로 이동합니다.",
      );
      setCode("");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "참여에 실패했습니다.");
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        코드로 공대 참여
      </h1>
      <p className="max-w-xl text-center text-sm text-gray-500 dark:text-gray-400">
        공대장/운영진에게 받은 초대 코드를 입력하면 게스트(guest) 권한으로 그
        공대에 참여합니다. 여러 공대에 이미 속해 있어도 계속 참여할 수
        있습니다.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xl items-center gap-2"
      >
        <input
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="초대 코드를 입력하세요"
          disabled={isJoining}
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <button
          type="submit"
          disabled={isJoining || code.trim().length === 0}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isJoining ? "참여 중..." : "참여하기"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {successMessage && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {successMessage}
        </p>
      )}
    </div>
  );
}
