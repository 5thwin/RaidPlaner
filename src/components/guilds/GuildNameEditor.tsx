import { useState } from "react";

interface GuildNameEditorProps {
  guildName: string;
  canEdit: boolean;
  onSave: (name: string) => Promise<void>;
}

// 공대 이름 표시 + (master만) 수정 UI. 평소엔 제목처럼 보이다가, 연필 버튼을 누르면
// 인풋+저장/취소로 바뀐다. canEdit이 false(master가 아님)면 그냥 제목만 보여준다.
export function GuildNameEditor({
  guildName,
  canEdit,
  onSave,
}: GuildNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(guildName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setName(guildName);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setError(null);
  }

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName === guildName) {
      setIsEditing(false);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await onSave(trimmedName);
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "공대 이름 변경에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {guildName}
        </h1>
        {canEdit && (
          <button
            type="button"
            onClick={startEditing}
            aria-label="공대 이름 수정"
            title="공대 이름 수정"
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
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
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              <path d="m14.5 5.5 3 3" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          maxLength={50}
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <button
          type="button"
          disabled={isSaving || !name.trim()}
          onClick={handleSave}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={cancelEditing}
          className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        >
          취소
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
