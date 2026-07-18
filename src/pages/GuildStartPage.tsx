import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useCreateGuild } from "@/hooks/useCreateGuild";
import { useMyGuilds } from "@/hooks/useMyGuilds";
import { useJoinGuildByCode } from "@/hooks/useJoinGuildByCode";
import { CreateGuildForm } from "@/components/guilds/CreateGuildForm";
import { PageSpinner } from "@/components/layout/PageSpinner";

export type GuildStartTab = "create" | "join";

interface GuildStartPageProps {
  // "/onboarding"(공대 0개인 유저가 강제로 오는 곳)은 "만들기" 탭이 기본이고,
  // "/guilds/join"(초대 코드를 받은 사람이 오는 곳)은 "참여" 탭이 기본이다.
  // 두 경로 다 같은 화면을 쓰되 시작 탭만 다르게 해서, 기존에 공유됐을 수 있는
  // 두 경로 모두 계속 동작하게 한다.
  defaultTab: GuildStartTab;
}

// 공대 만들기 + 코드로 참여하기를 탭 하나로 합친 화면(2026-07-19 사용자 요청).
// 둘 다 "공대에 들어가는 방법"이라는 점에서 같은 화면으로 묶고, 헤더 메뉴도
// 이제 하나로 줄었다. 소속 공대 개수와 무관하게 항상 접근 가능해야 한다
// (이미 공대가 있어도 공대를 더 만들거나, 다른 공대에 코드로 참여할 수 있어야 함).
export function GuildStartPage({ defaultTab }: GuildStartPageProps) {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { guilds, isLoading: isGuildsLoading } = useMyGuilds();
  const { createGuild, isCreating } = useCreateGuild();
  const { joinGuild, isJoining } = useJoinGuildByCode();

  const [tab, setTab] = useState<GuildStartTab>(defaultTab);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccessMessage, setJoinSuccessMessage] = useState<string | null>(
    null,
  );

  if (isAuthLoading || isGuildsLoading) {
    return <PageSpinner label="로그인 상태 확인 중..." />;
  }

  if (!user) {
    // 로그인 화면(로그인 버튼)은 "/"에만 있으므로, 로그아웃 상태로 여기 남아있지 않도록 되돌려보낸다.
    return <Navigate to="/" replace />;
  }

  async function handleCreate(name: string) {
    setCreateError(null);

    try {
      const guildId = await createGuild(name);
      navigate(`/guilds/${guildId}`);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "공대 생성에 실패했습니다.",
      );
    }
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = joinCode.trim();
    if (trimmed.length === 0) {
      return;
    }

    setJoinError(null);
    setJoinSuccessMessage(null);

    try {
      await joinGuild(trimmed);
      setJoinSuccessMessage(
        "공대에 참여했습니다. 잠시 후 메인 화면으로 이동합니다.",
      );
      setJoinCode("");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "참여에 실패했습니다.");
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        공대 시작하기
      </h1>

      <div className="flex w-fit gap-1 rounded-full bg-gray-100 p-1 text-sm dark:bg-gray-700">
        <button
          type="button"
          onClick={() => setTab("create")}
          className={`rounded-full px-4 py-1.5 font-medium ${
            tab === "create"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          새로 만들기
        </button>
        <button
          type="button"
          onClick={() => setTab("join")}
          className={`rounded-full px-4 py-1.5 font-medium ${
            tab === "join"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          코드로 참여하기
        </button>
      </div>

      {tab === "create" ? (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="max-w-xl text-center text-sm text-gray-500 dark:text-gray-400">
            {guilds.length === 0
              ? "아직 소속된 공대가 없습니다. 새 공대를 만들면 자동으로 공대장(master) 권한을 갖게 되고, 이후 다른 유저를 초대할 수 있습니다."
              : "새 공대를 만들면 자동으로 그 공대의 공대장(master) 권한을 갖게 되고, 이후 다른 유저를 초대할 수 있습니다."}
          </p>

          <CreateGuildForm isCreating={isCreating} onSubmit={handleCreate} />

          {createError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {createError}
            </p>
          )}
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="max-w-xl text-center text-sm text-gray-500 dark:text-gray-400">
            공대장/운영진에게 받은 초대 코드를 입력하면 게스트(guest) 권한으로
            그 공대에 참여합니다. 여러 공대에 이미 속해 있어도 계속 참여할 수
            있습니다.
          </p>

          <form
            onSubmit={handleJoin}
            className="flex w-full max-w-xl items-center gap-2"
          >
            <input
              type="text"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="초대 코드를 입력하세요"
              disabled={isJoining}
              className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={isJoining || joinCode.trim().length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isJoining ? "참여 중..." : "참여하기"}
            </button>
          </form>

          {joinError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {joinError}
            </p>
          )}
          {joinSuccessMessage && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {joinSuccessMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
