import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useRosters } from "@/hooks/useRosters";
import { useProfile } from "@/hooks/useProfile";
import {
  fetchLostArkSiblings,
  syncCharactersFromLostArk,
  LostArkRosterError,
} from "@/lib/lostarkRoster";
import { PageSpinner } from "@/components/layout/PageSpinner";
import { RosterSection } from "@/components/roster/RosterSection";
import { AddRosterModal } from "@/components/roster/AddRosterModal";
import { ProfileModal } from "@/components/profile/ProfileModal";

// 원정대 관리 화면 (/roster).
// 유저는 여러 개의 원정대(rosters)를 가질 수 있다 — 원정대별로 섹션을 나눠서 보여준다.
// 각 섹션 안에서는 대표 캐릭터명으로 로스트아크 오픈 API를 조회해 characters 테이블에
// 저장하고, 캐릭터별 활성/비활성 토글을 제공한다. "새 원정대 추가"와 "프로필"은 화면이
// 복잡해 보이지 않도록 상시 노출하지 않고, 헤더의 아이콘/버튼을 눌러야 모달로 열린다.
export function RosterPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    rosters,
    isLoading: isRostersLoading,
    error: rostersError,
    reload: reloadRosters,
    createRoster,
    updateRosterColor,
    updateRosterName,
    deleteRoster,
  } = useRosters();

  const {
    profile,
    isLoading: isProfileLoading,
    updateDisplayName,
    deleteAccount,
  } = useProfile();

  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (isAuthLoading) {
    return <PageSpinner label="로그인 상태 확인 중..." />;
  }

  if (!user) {
    // 로그인 화면(로그인 버튼)은 "/"에만 있으므로, 로그아웃 상태로 여기 남아있지 않도록 되돌려보낸다.
    return <Navigate to="/" replace />;
  }

  const userId = user.id;

  async function handleAddRoster(characterName: string) {
    setIsAdding(true);
    setAddError(null);

    try {
      const siblings = await fetchLostArkSiblings(characterName);

      if (siblings.length === 0) {
        throw new LostArkRosterError(
          "조회된 캐릭터가 없습니다. 캐릭터명을 다시 확인해주세요.",
        );
      }

      const roster = await createRoster(characterName);
      // 새 원정대는 아이템 레벨 상위 6개만 기본 활성화 상태로 시작한다.
      await syncCharactersFromLostArk(userId, siblings, roster.id, {
        activateTopByItemLevel: 6,
      });
      // 캐릭터 저장이 끝난 뒤에야 rosters 목록을 다시 불러온다 — 새 원정대 섹션이
      // 화면에 나타나는(마운트되는) 시점엔 이미 캐릭터가 DB에 있어야, 그 섹션의
      // 최초 조회가 빈 목록을 보는 race condition이 생기지 않는다.
      await reloadRosters();
      setIsAddModalOpen(false);
    } catch (error) {
      setAddError(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex w-full items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          원정대 관리
        </h1>

        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            aria-label="프로필"
            title="프로필"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setAddError(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 flex-none"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            새 원정대 추가
          </button>
        </div>
      </div>

      {rostersError && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">
          {rostersError}
        </p>
      )}

      {isRostersLoading ? (
        <PageSpinner label="원정대 목록 불러오는 중..." />
      ) : rosters.length === 0 ? (
        <p className="w-full text-sm text-gray-500 dark:text-gray-400">
          아직 연결된 원정대가 없습니다. 우측 상단의 &quot;새 원정대 추가&quot;
          버튼으로 대표 캐릭터명을 입력해 원정대를 추가해주세요.
        </p>
      ) : (
        <div className="flex w-full flex-col gap-6">
          {rosters.map((roster) => (
            <RosterSection
              key={roster.id}
              roster={roster}
              onColorChange={updateRosterColor}
              onNameChange={updateRosterName}
              onDelete={deleteRoster}
            />
          ))}
        </div>
      )}

      {isAddModalOpen && (
        <AddRosterModal
          isSyncing={isAdding}
          error={addError}
          onSubmit={handleAddRoster}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {isProfileModalOpen && !isProfileLoading && profile && (
        <ProfileModal
          displayName={profile.display_name ?? ""}
          email={profile.email}
          avatarUrl={profile.avatar_url}
          rosters={rosters}
          onSave={async (name) => {
            await updateDisplayName(name);
          }}
          onDeleteAccount={deleteAccount}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </div>
  );
}
