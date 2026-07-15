import { useState } from "react";

interface InviteCodeCardProps {
  inviteCode: string;
  onRegenerate: () => Promise<void>;
}

// officer 이상인 경우에만 렌더링되는 초대 코드 카드 (표시 여부는 GuildDetailPage가 결정).
// 이 코드를 아는 로그인 유저는 누구나 /guilds/join에서 스스로 게스트(guest)로 참여할 수 있다.
export function InviteCodeCard({
  inviteCode,
  onRegenerate,
}: InviteCodeCardProps) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopyMessage("복사되었습니다.");
    } catch {
      setCopyMessage("복사에 실패했습니다. 직접 선택해서 복사해주세요.");
    }
  }

  async function handleRegenerate() {
    const confirmed = window.confirm(
      "코드를 재발급하면 기존 코드로는 더 이상 참여할 수 없습니다. 계속할까요?",
    );
    if (!confirmed) {
      return;
    }

    setRegenerateError(null);
    setIsRegenerating(true);

    try {
      await onRegenerate();
      setCopyMessage(null);
    } catch (error) {
      setRegenerateError(
        error instanceof Error ? error.message : "코드 재발급에 실패했습니다.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-2 rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        초대 코드로 참여
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        이 코드를 아는 로그인 유저는 누구나 스스로 게스트 권한으로 이 공대에
        참여할 수 있습니다.
      </p>

      <div className="flex items-center gap-2">
        <span className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
          {inviteCode}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          복사
        </button>
        <button
          type="button"
          disabled={isRegenerating}
          onClick={handleRegenerate}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          {isRegenerating ? "재발급 중..." : "코드 재발급"}
        </button>
      </div>

      {copyMessage && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {copyMessage}
        </p>
      )}
      {regenerateError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {regenerateError}
        </p>
      )}
    </div>
  );
}
