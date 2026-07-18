import { useState } from "react";

interface ProfileNameEditorProps {
  displayName: string;
  onSave: (name: string) => Promise<void>;
}

// 로그인한 유저 본인의 표시 이름(profiles.display_name)을 보여주고 수정하는 UI.
// GuildNameEditor(공대 이름 인라인 편집)와 같은 패턴 — 평소엔 이름만 보이다가
// 연필 버튼을 누르면 인풋+저장/취소로 바뀐다. 표시 이름은 공대원 목록, 파티 슬롯
// 소유자 표시 등 여러 화면에서 쓰이므로, 여기서 바꾸면 그 화면들에도 자연히 반영된다.
export function ProfileNameEditor({
  displayName,
  onSave,
}: ProfileNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(displayName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setName(displayName);
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setError(null);
  }

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName === displayName) {
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
        err instanceof Error ? err.message : "표시 이름 변경에 실패했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  // 프로필 모달의 "계정 요약" 헤더(아바타 옆) 안에 바로 얹어 쓰므로, 여기서는
  // 자체 카드 테두리/라벨 없이 이름 자체만 다룬다 — 이름이라는 건 옆 아바타로
  // 이미 문맥상 분명하다.
  if (!isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="truncate text-base font-semibold text-gray-900 dark:text-gray-100">
          {displayName}
        </span>
        <button
          type="button"
          onClick={startEditing}
          aria-label="표시 이름 수정"
          title="표시 이름 수정"
          className="flex-none rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            <path d="m14.5 5.5 3 3" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          maxLength={50}
          className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
        <button
          type="button"
          disabled={isSaving || !name.trim()}
          onClick={handleSave}
          className="flex-none rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={cancelEditing}
          className="flex-none rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
