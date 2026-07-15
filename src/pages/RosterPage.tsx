import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useRosters } from "@/hooks/useRosters";
import {
  fetchLostArkSiblings,
  syncCharactersFromLostArk,
  LostArkRosterError,
} from "@/lib/lostarkRoster";
import { PageSpinner } from "@/components/layout/PageSpinner";
import { RosterConnectForm } from "@/components/roster/RosterConnectForm";
import { RosterSection } from "@/components/roster/RosterSection";

// 원정대 관리 화면 (/roster).
// 유저는 여러 개의 원정대(rosters)를 가질 수 있다 — 원정대별로 섹션을 나눠서 보여준다.
// 각 섹션 안에서는 대표 캐릭터명으로 로스트아크 오픈 API를 조회해 characters 테이블에
// 저장하고, 캐릭터별 활성/비활성 토글을 제공한다. "새 원정대 추가"로 다른 로스트아크
// 계정을 새로 연결하면 섹션이 하나 더 생긴다.
export function RosterPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    rosters,
    isLoading: isRostersLoading,
    error: rostersError,
    createRoster,
    updateRosterColor,
    updateRosterName,
    deleteRoster,
  } = useRosters();

  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
      await syncCharactersFromLostArk(userId, siblings, roster.id);
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
      <h1 className="w-full text-2xl font-bold text-gray-900 dark:text-gray-100">
        원정대 관리
      </h1>

      <RosterConnectForm isSyncing={isAdding} onSubmit={handleAddRoster} />

      {addError && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">
          {addError}
        </p>
      )}

      {rostersError && (
        <p className="w-full text-sm text-red-600 dark:text-red-400">
          {rostersError}
        </p>
      )}

      {isRostersLoading ? (
        <PageSpinner label="원정대 목록 불러오는 중..." />
      ) : rosters.length === 0 ? (
        <p className="w-full text-sm text-gray-500 dark:text-gray-400">
          아직 연결된 원정대가 없습니다. 대표 캐릭터명을 입력해 원정대를
          추가해주세요.
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
    </div>
  );
}
