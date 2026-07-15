import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useCreateGuild } from "@/hooks/useCreateGuild";
import { useMyGuilds } from "@/hooks/useMyGuilds";
import { CreateGuildForm } from "@/components/guilds/CreateGuildForm";
import { PageSpinner } from "@/components/layout/PageSpinner";

// 공대 만들기 화면. 소속 공대가 0개인 유저는 App.tsx에서 여기로 강제 리다이렉트
// 되지만, 그 경우가 아니어도(이미 공대가 있는 유저가 공대를 "추가로" 만들고 싶을 때)
// 헤더의 "공대 만들기" 링크로 언제든 들어올 수 있다 — /guilds/join(공대 참여)과
// 마찬가지로 소속 공대 개수와 무관하게 항상 접근 가능해야 한다(2026-07-13 이전에는
// 이미 공대가 있으면 "/"로 튕겨내서, 두 번째 공대를 만들 방법이 아예 없었다).
// 공대를 새로 만들면 생성 트리거가 자동으로 생성자를 master로 등록해주므로,
// 여기서는 만들고 나서 그 공대의 상세 화면으로 이동만 시키면 된다.
export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { createGuild, isCreating } = useCreateGuild();
  const { guilds, isLoading: isGuildsLoading } = useMyGuilds();
  const [error, setError] = useState<string | null>(null);

  if (isAuthLoading || isGuildsLoading) {
    return <PageSpinner label="로그인 상태 확인 중..." />;
  }

  if (!user) {
    // 로그인 화면(로그인 버튼)은 "/"에만 있으므로, 로그아웃 상태로 여기 남아있지 않도록 되돌려보낸다.
    return <Navigate to="/" replace />;
  }

  async function handleCreate(name: string) {
    setError(null);

    try {
      const guildId = await createGuild(name);
      navigate(`/guilds/${guildId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "공대 생성에 실패했습니다.",
      );
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        공대 만들기
      </h1>
      <p className="max-w-xl text-center text-sm text-gray-500 dark:text-gray-400">
        {guilds.length === 0
          ? "아직 소속된 공대가 없습니다. 새 공대를 만들면 자동으로 공대장(master) 권한을 갖게 되고, 이후 다른 유저를 초대할 수 있습니다."
          : "새 공대를 만들면 자동으로 그 공대의 공대장(master) 권한을 갖게 되고, 이후 다른 유저를 초대할 수 있습니다."}
      </p>

      <CreateGuildForm isCreating={isCreating} onSubmit={handleCreate} />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <p className="text-sm text-gray-500 dark:text-gray-400">
        이미 초대 코드가 있으신가요?{" "}
        <Link
          to="/guilds/join"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          코드로 참여하기
        </Link>
      </p>
    </div>
  );
}
