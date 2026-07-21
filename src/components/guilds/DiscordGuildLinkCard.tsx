import { useState } from "react";

interface DiscordGuildLinkCardProps {
  discordGuildId: string | null;
  onSave: (discordGuildId: string) => Promise<void>;
}

// master 전용. 이 공대와 연동할 디스코드 서버 ID를 설정한다 — 연동해두면
// 그 디스코드 서버에서 "/파티현황" 슬래시 명령어로 이 공대의 파티 현황을
// 조회할 수 있다(discord-interactions Edge Function).
export function DiscordGuildLinkCard({
  discordGuildId,
  onSave,
}: DiscordGuildLinkCardProps) {
  const [value, setValue] = useState(discordGuildId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);

    try {
      await onSave(value);
      setSavedMessage(value.trim() ? "연동됐습니다." : "연동이 해제됐습니다.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "디스코드 연동에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-2 rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        디스코드 연동
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        연동하면 그 디스코드 서버에서 <code>/파티현황</code> 명령어로 이
        공대의 파티 현황을 바로 확인할 수 있습니다. 디스코드 앱 설정에서
        개발자 모드를 켜면, 서버 아이콘 우클릭 → &quot;서버 ID 복사하기&quot;로
        ID를 얻을 수 있어요.
      </p>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="디스코드 서버 ID"
          disabled={isSaving}
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <button
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {savedMessage && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {savedMessage}
        </p>
      )}
    </div>
  );
}
