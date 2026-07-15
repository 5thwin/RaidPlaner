import { useState } from "react";

interface DeleteRosterModalProps {
  rosterName: string;
  onDelete: () => Promise<void>;
  onClose: () => void;
}

// 원정대 삭제 확인 모달. 실수로 다른 원정대를 지우는 걸 막기 위해, 입력값이
// rosterName과 대소문자/공백까지 정확히 일치할 때만(트리밍하지 않음) 삭제 버튼이
// 활성화된다 (DeleteGuildModal과 동일한 패턴).
export function DeleteRosterModal({
  rosterName,
  onDelete,
  onClose,
}: DeleteRosterModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isConfirmed = confirmText === rosterName;

  async function handleDelete() {
    if (!isConfirmed) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await onDelete();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "원정대 삭제에 실패했습니다.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            원정대 삭제
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            닫기
          </button>
        </div>

        <p className="text-sm text-red-600 dark:text-red-400">
          정말 삭제하시겠습니까? 복구할 수 없으며 이 원정대 소속 캐릭터가 모두
          함께 삭제됩니다. 그 캐릭터가 파티에 배정되어 있었다면 빈 슬롯으로
          남습니다.
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          확인을 위해 원정대 이름 <strong>&apos;{rosterName}&apos;</strong>을
          입력하세요.
        </p>

        <input
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={rosterName}
          autoComplete="off"
          className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
        />

        {deleteError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {deleteError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!isConfirmed || isDeleting}
            onClick={handleDelete}
            className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-900 dark:text-red-400 dark:hover:bg-red-800"
          >
            {isDeleting ? "삭제 중..." : "원정대 삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
