import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useGuildMembers } from "@/hooks/useGuildMembers";
import { useGuildRaidVisibility } from "@/hooks/useGuildRaidVisibility";
import { PageSpinner } from "@/components/layout/PageSpinner";
import { MemberList } from "@/components/guilds/MemberList";
import { GuildRoleGuide } from "@/components/guilds/GuildRoleGuide";
import { InviteCodeCard } from "@/components/guilds/InviteCodeCard";
import { RaidVisibilityList } from "@/components/guilds/RaidVisibilityList";
import { DeleteGuildModal } from "@/components/guilds/DeleteGuildModal";
import { GuildNameEditor } from "@/components/guilds/GuildNameEditor";
import { ConfirmModal } from "@/components/layout/ConfirmModal";
import { usePageHeaderExtra } from "@/hooks/usePageHeaderExtra";
import { hasGuildRoleAtLeast } from "@/lib/guildRole";
import type { GuildMemberWithProfile, GuildRole } from "@/types/guild";
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
// - master만 멤버 역할을 바꿀 수 있고, 공대 이름도 바꿀 수 있다.
// - master 자리는 일반 역할 변경 드롭다운으로는 바꿀 수 없고, "공대장 위임" 절차
//   (delegate_guild_master RPC)를 통해서만 다른 유저에게 넘어간다 — 위임하면 기존
//   master는 officer로 강등된다.
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
    updateGuildName,
    delegateMaster,
    regenerateInviteCode,
    leaveGuild,
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
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [delegateTarget, setDelegateTarget] =
    useState<GuildMemberWithProfile | null>(null);

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

  const myMembershipId =
    members.find((member) => member.user_id === user.id)?.id ?? null;
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

  async function handleSaveGuildName(name: string) {
    await updateGuildName(name);
  }

  async function handleDelegateMaster() {
    if (!delegateTarget) {
      return;
    }

    await delegateMaster(delegateTarget.user_id);
    setDelegateTarget(null);
  }

  async function handleDeleteGuild() {
    await deleteGuild();
    setIsDeleteModalOpen(false);
    navigate("/");
  }

  async function handleLeaveGuild() {
    if (!myMembershipId) {
      return;
    }

    await leaveGuild(myMembershipId);
    setIsLeaveModalOpen(false);
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
      <GuildNameEditor
        guildName={guild.name}
        canEdit={hasGuildRoleAtLeast(myRole, "master")}
        onSave={handleSaveGuildName}
      />

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

      <GuildRoleGuide />

      <MemberList
        members={members}
        myRole={myRole}
        currentUserId={user.id}
        onChangeRole={handleChangeRole}
        onRequestDelegateMaster={setDelegateTarget}
      />

      {myRole && myRole !== "master" && myMembershipId && (
        <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-md border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            공대에서 탈퇴하면 이 공대의 파티/멤버 목록에서 더 이상 보이지
            않습니다. 다시 참여하려면 초대 코드가 필요합니다.
          </p>
          <button
            type="button"
            onClick={() => setIsLeaveModalOpen(true)}
            className="shrink-0 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            공대 탈퇴
          </button>
        </div>
      )}

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

      {isLeaveModalOpen && guild && (
        <ConfirmModal
          title="공대 탈퇴"
          message={`정말 '${guild.name}' 공대에서 탈퇴하시겠습니까?`}
          confirmLabel="탈퇴"
          onConfirm={handleLeaveGuild}
          onClose={() => setIsLeaveModalOpen(false)}
        />
      )}

      {delegateTarget && (
        <ConfirmModal
          title="공대장 위임"
          message={
            <>
              정말 &apos;
              {delegateTarget.representative_character_name ??
                delegateTarget.display_name ??
                "이 유저"}
              &apos;님에게 공대장을 위임하시겠습니까?
              <br />
              위임하면 회원님은{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                운영진
              </span>
              이 됩니다.
            </>
          }
          confirmLabel="위임"
          onConfirm={handleDelegateMaster}
          onClose={() => setDelegateTarget(null)}
        />
      )}
    </div>
  );
}
