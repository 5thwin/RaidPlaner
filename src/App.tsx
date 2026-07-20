import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { GuildSwitcher } from "@/components/board/GuildSwitcher";
import { GuildMenuDropdown } from "@/components/board/GuildMenuDropdown";
import { PageSpinner } from "@/components/layout/PageSpinner";
import { GuildBoardPage } from "@/pages/GuildBoardPage";
import { LandingPage } from "@/pages/LandingPage";
import { useAuth } from "@/hooks/useAuth";
import { useMyGuilds } from "@/hooks/useMyGuilds";
import { usePageHeaderExtra } from "@/hooks/usePageHeaderExtra";

// 메인 화면(/). 로그인 안 했으면 로그인 유도, 소속 공대가 없으면 온보딩으로 보낸다.
// 소속 공대가 하나 이상이면 "현재 공대"(여러 개면 스위처로 선택)의
// 레이드-파티 현황판(GuildBoardPage)을 보여준다.
function App() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { guilds, isLoading: isGuildsLoading, error } = useMyGuilds();
  const location = useLocation();
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);

  // 초대 코드로 막 참여한 공대로 곧장 이동하고 싶을 때(GuildStartPage), "/"로
  // 이동하면서 location.state에 그 guildId를 실어 보낸다. useMyGuilds는 새로고침
  // 깜빡임 방지를 위해 sessionStorage 캐시를 먼저 보여주는데, 그 캐시엔 방금
  // 참여한 공대가 아직 없을 수 있어서 — 캐시가 갱신될 때까지는 이 값을 기억해뒀다가
  // guilds 목록에 실제로 나타나는 순간 선택하도록 ref로 들고 있는다(state로 하면
  // "적용 완료" 렌더 한 번 더 필요해서 오히려 더 늦게 반영된다).
  const pendingGuildIdRef = useRef<string | null>(
    (location.state as { selectedGuildId?: string } | null)?.selectedGuildId ??
      null,
  );

  // 소속 공대 목록이 바뀌거나(가입/탈퇴) 아직 선택된 공대가 없으면 첫 번째 공대를 기본값으로 쓴다.
  useEffect(() => {
    if (guilds.length === 0) {
      setSelectedGuildId(null);
      return;
    }

    const pendingGuildId = pendingGuildIdRef.current;
    if (
      pendingGuildId &&
      guilds.some((guild) => guild.guild_id === pendingGuildId)
    ) {
      setSelectedGuildId(pendingGuildId);
      pendingGuildIdRef.current = null;
      return;
    }

    if (!guilds.some((guild) => guild.guild_id === selectedGuildId)) {
      setSelectedGuildId(guilds[0].guild_id);
    }
  }, [guilds, selectedGuildId]);

  // 공대명/공대 스위처/공대 스코프 메뉴는 이 페이지("/")에서만 필요한 헤더 콘텐츠이므로,
  // 고정 헤더(AppHeader)에 위임하지 않고 이 페이지가 직접 올려보낸다.
  const selectedGuildForHeader =
    guilds.length > 0
      ? guilds.find((guild) => guild.guild_id === selectedGuildId) ?? guilds[0]
      : null;

  // usePageHeaderExtra는 넘겨받은 노드를 참조 동등성으로 비교해서 헤더에 반영한다.
  // 인라인 JSX를 그냥 넘기면 렌더될 때마다 새 객체가 생겨서 매 렌더마다 컨텍스트가
  // 갱신되고, 그게 다시 이 컴포넌트를 리렌더시키는 무한 루프("Maximum update depth
  // exceeded")로 이어진다. useMemo로 실제 값이 바뀔 때만 새 노드를 만들도록 한다.
  const headerExtra = useMemo(
    () =>
      selectedGuildForHeader ? (
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {selectedGuildForHeader.guild_name}
          </h1>
          <GuildSwitcher
            guilds={guilds}
            selectedGuildId={selectedGuildForHeader.guild_id}
            onSelect={setSelectedGuildId}
          />
          <GuildMenuDropdown
            guildId={selectedGuildForHeader.guild_id}
            role={selectedGuildForHeader.role}
          />
        </div>
      ) : null,
    [selectedGuildForHeader, guilds],
  );

  usePageHeaderExtra(headerExtra);

  if (isAuthLoading) {
    return <PageSpinner label="로그인 상태 확인 중..." />;
  }

  if (!user) {
    return <LandingPage />;
  }

  if (isGuildsLoading) {
    return <PageSpinner label="공대 목록 확인 중..." />;
  }

  if (guilds.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  const selectedGuild =
    guilds.find((guild) => guild.guild_id === selectedGuildId) ?? guilds[0];

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <GuildBoardPage guild={selectedGuild} />
    </div>
  );
}

export default App;
