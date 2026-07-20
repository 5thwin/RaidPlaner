import { useState } from "react";

interface DeleteAccountModalProps {
  onDelete: () => Promise<void>;
  onClose: () => void;
}

const CONFIRM_PHRASE = "계정 삭제";

// 계정 자체를 삭제하는 확인 모달. DeleteGuildModal과 같은 "타이핑해서 확인"
// 패턴을 쓰되, 매번 다른 값(공대 이름) 대신 고정 문구를 쓴다 — 계정 삭제는
// 공대 하나가 아니라 이 계정이 속한 모든 공대/원정대 데이터에 영향을 미치는
// 더 무거운 동작이라, 실수로 누르는 걸 막는 게 더 중요하다.
export function DeleteAccountModal({
  onDelete,
  onClose,
}: DeleteAccountModalProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isConfirmed = confirmText === CONFIRM_PHRASE;

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
        error instanceof Error ? error.message : "계정 삭제에 실패했습니다.",
      );
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            계정 삭제
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
          정말 삭제하시겠습니까? 복구할 수 없으며, 등록한 원정대/캐릭터
          정보와 소속된 모든 공대에서의 활동 기록이 함께 삭제됩니다. 공대장으로
          있는 공대가 있다면 먼저 위임하거나 삭제해야 탈퇴할 수 있습니다.
        </p>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          확인을 위해 <strong>&apos;{CONFIRM_PHRASE}&apos;</strong>를
          입력하세요.
        </p>

        <input
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={CONFIRM_PHRASE}
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
            {isDeleting ? "삭제 중..." : "계정 삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
