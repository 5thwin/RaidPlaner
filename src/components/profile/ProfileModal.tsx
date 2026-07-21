import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useMyGuilds } from "@/hooks/useMyGuilds";
import { ProfileNameEditor } from "@/components/profile/ProfileNameEditor";
import { DeleteAccountModal } from "@/components/profile/DeleteAccountModal";
import { DiscordLinkSection } from "@/components/profile/DiscordLinkSection";
import { GuildRoleIcon } from "@/components/guilds/GuildRoleIcon";
import { getRosterColorScheme } from "@/lib/rosterColor";
import type { Roster } from "@/types/roster";

interface ProfileModalProps {
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  rosters: Roster[];
  onSave: (name: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onClose: () => void;
}

// 프로필(표시 이름) 수정을 모달 뒤로 숨긴다 — 원정대 관리 화면에 상시 노출되면
// 화면이 복잡해 보여서, 헤더의 프로필 아이콘을 눌러야만 열리게 했다.
// 아바타 + 이름 + 이메일을 "계정 요약" 한 블록으로 묶어서, 각각 따로 박스로
// 떨어져 있던(구글 로그인 프로필 사진이 앱 어디에도 안 쓰이던) 예전 레이아웃보다
// 한눈에 "지금 이 계정"이라는 게 읽히게 했다. 로그아웃은 구분선 아래에 둔다.
export function ProfileModal({
  displayName,
  email,
  avatarUrl,
  rosters,
  onSave,
  onDeleteAccount,
  onClose,
}: ProfileModalProps) {
  const { signOut } = useAuth();
  const { guilds, isLoading: isGuildsLoading } = useMyGuilds();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    onClose();
  }

  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            프로필
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            닫기
          </button>
        </div>

        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-14 w-14 flex-none rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-700"
            />
          ) : (
            <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
              {initial}
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ProfileNameEditor displayName={displayName} onSave={onSave} />
            {email && (
              <span className="truncate text-xs text-gray-400 dark:text-gray-500">
                {email}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            소속 공대
          </p>
          {isGuildsLoading ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              불러오는 중...
            </p>
          ) : guilds.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              소속된 공대가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {guilds.map((guild) => (
                <li key={guild.guild_id}>
                  <Link
                    to={`/guilds/${guild.guild_id}`}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    <GuildRoleIcon
                      role={guild.role}
                      className="h-3.5 w-3.5 flex-none text-gray-400 dark:text-gray-500"
                    />
                    <span className="truncate">{guild.guild_name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            원정대
          </p>
          {rosters.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              연결된 원정대가 없습니다.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {rosters.map((roster) => (
                <li
                  key={roster.id}
                  className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  <span
                    className={`h-1.5 w-1.5 flex-none rounded-full ${getRosterColorScheme(roster.color).swatch}`}
                  />
                  {roster.representative_character_name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <DiscordLinkSection />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <button
            type="button"
            disabled={isSigningOut}
            onClick={handleSignOut}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            {isSigningOut ? "로그아웃 중..." : "로그아웃"}
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            계정 삭제
          </button>
        </div>
      </div>

      {isDeleteModalOpen && (
        <DeleteAccountModal
          onDelete={onDeleteAccount}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  );
}
