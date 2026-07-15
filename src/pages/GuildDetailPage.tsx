import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useGuildMembers } from "@/hooks/useGuildMembers";
import { useGuildRaidVisibility } from "@/hooks/useGuildRaidVisibility";
import { PageSpinner } from "@/components/layout/PageSpinner";
import { MemberList } from "@/components/guilds/MemberList";
import { InviteCodeCard } from "@/components/guilds/InviteCodeCard";
import { RaidVisibilityList } from "@/components/guilds/RaidVisibilityList";
import { DeleteGuildModal } from "@/components/guilds/DeleteGuildModal";
import { usePageHeaderExtra } from "@/hooks/usePageHeaderExtra";
import { hasGuildRoleAtLeast } from "@/lib/guildRole";
import type { GuildRole } from "@/types/guild";
import type { RaidVisibilityEntry } from "@/types/raid";

// 매 렌더마다 새 JSX 객체를 만들지 않도록 컴포넌트 바깥에서 한 번만 만든다.
// usePageHeaderExtra는 넘겨받은 노드를 참조 동등성으로 비교하므로, 인라인으로 매번
// 새로 만들면 렌더마다 컨텍스트가 갱신되며 무한 리렌더 루프("Maximum update depth
// exceeded")로 이어진다.
const backToGuildListLink = (
  <Link
    to="/"
    className="text-sm text-blue-600 hover:underline dark:text-blue-400"
  >
    내 공대 목록으로
  </Link>
);

// 공대 상세(멤버 관리 + 레이드 노출 설정) 화면.
// - 공대원이면 누구나 멤버 목록을 볼 수 있다.
// - officer 이상만 초대 코드 카드, 레이드 노출 설정 섹션을 볼 수 있다.
//   (초대는 초대 코드(/guilds/join)로만 가능 — 대표 캐릭터명 검색 초대는 폐지됨)
// - master만 멤버 역할을 바꿀 수 있다.
// 이 화면에서의 역할 분기는 어디까지나 "UI 노출"이고, 실제 차단은
// guild_members/guilds/guild_raid_visibility 테이블의 Supabase RLS 정책이 DB 단에서 강제한다.
export function GuildDetailPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const {
    guild,
    members,
    isLoading,
    error,
    updateMemberRole,
    regenerateInviteCode,
    deleteGuild,
  } = useGuildMembers(guildId);
  const {
    entries: raidVisibilityEntries,
    isLoading: isRaidVisibilityLoading,
    error: raidVisibilityError,
    toggleVisibility,
  } = useGuildRaidVisibility(guildId);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // "내 공대 목록으로" 뒤로가기 링크는 이 페이지에서만 필요한 헤더 콘텐츠이므로
  // 고정 헤더에 직접 올려보낸다.
  usePageHeaderExtra(backToGuildListLink);

  if (isAuthLoading || isLoading) {
    return <PageSpinner label="불러오는 중..." />;
  }

  if (!user) {
    // 로그인 화면(로그인 버튼)은 "/"에만 있으므로, 로그아웃 상태로 여기 남아있지 않도록 되돌려보낸다.
    return <Navigate to="/" replace />;
  }

  if (!guild) {
    // guildId가 잘못됐거나(오타 등), 존재하지 않거나, 이 공대의 멤버가 아니라서
    // RLS로 조회 자체가 안 되는 경우다. 빈 멤버 목록과 함께 원인 모를 에러만 보여주지
    // 않도록 명확한 안내로 대체한다.
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        이 공대를 찾을 수 없거나 접근 권한이 없습니다.
      </p>
    );
  }

  const myRole: GuildRole | null =
    members.find((member) => member.user_id === user.id)?.role ?? null;

  async function handleChangeRole(memberId: string, role: GuildRole) {
    setActionError(null);

    try {
      await updateMemberRole(memberId, role);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "역할 변경에 실패했습니다.",
      );
    }
  }

  async function handleDeleteGuild() {
    await deleteGuild();
    setIsDeleteModalOpen(false);
    navigate("/");
  }

  async function handleToggleVisibility(entry: RaidVisibilityEntry) {
    setActionError(null);

    try {
      await toggleVisibility(entry);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "노출 설정 변경에 실패했습니다.",
      );
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {guild?.name ?? "공대"}
      </h1>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}

      {hasGuildRoleAtLeast(myRole, "officer") && guild && (
        <InviteCodeCard
          inviteCode={guild.invite_code}
          onRegenerate={regenerateInviteCode}
        />
      )}

      <MemberList
        members={members}
        myRole={myRole}
        onChangeRole={handleChangeRole}
      />

      {hasGuildRoleAtLeast(myRole, "officer") && (
        <div className="flex w-full max-w-xl flex-col gap-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            레이드 노출 설정
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            여기서 끈 레이드는 메인 화면의 레이드-파티 현황판에서 이 공대
            전체에 보이지 않게 됩니다.
          </p>

          {raidVisibilityError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {raidVisibilityError}
            </p>
          )}

          {isRaidVisibilityLoading ? (
            <PageSpinner label="불러오는 중..." minHeightClassName="min-h-[120px]" />
          ) : (
            <RaidVisibilityList
              entries={raidVisibilityEntries}
              onToggleVisibility={handleToggleVisibility}
            />
          )}
        </div>
      )}

      {hasGuildRoleAtLeast(myRole, "master") && guild && (
        <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-2 dark:border-red-900 dark:bg-red-900/20">
          <p
            className="text-xs text-red-600 dark:text-red-400"
            title="공대를 삭제하면 이 공대의 모든 파티/일정/멤버 정보가 함께 삭제되며 복구할 수 없습니다."
          >
            공대 삭제 시 모든 데이터가 복구 불가능하게 사라집니다.
          </p>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="shrink-0 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800"
          >
            공대 삭제
          </button>
        </div>
      )}

      {isDeleteModalOpen && guild && (
        <DeleteGuildModal
          guildName={guild.name}
          onDelete={handleDeleteGuild}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  );
}
