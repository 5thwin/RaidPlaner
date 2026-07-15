import { useState } from "react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
}

// DeleteGuildModal/DeleteRosterModal처럼 이름을 타이핑해서 확인하는 게 아니라,
// 되돌릴 수는 있지만(재조회일 뿐) 데이터를 덮어쓰는 작업 전에 한 번 더 물어보는
// 가벼운 확인 모달. 버튼 두 개(취소/확인)만 있다.
export function ConfirmModal({
  title,
  message,
  confirmLabel = "확인",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function handleConfirm() {
    setConfirmError(null);
    setIsConfirming(true);

    try {
      await onConfirm();
    } catch (error) {
      setConfirmError(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
      setIsConfirming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>

        {confirmError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {confirmError}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={isConfirming}
            onClick={onClose}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={handleConfirm}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConfirming ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
