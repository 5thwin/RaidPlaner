import { RosterConnectForm } from "@/components/roster/RosterConnectForm";

interface AddRosterModalProps {
  isSyncing: boolean;
  error: string | null;
  onSubmit: (characterName: string) => void;
  onClose: () => void;
}

// "새 원정대 추가"를 모달 뒤로 숨긴다 — 원정대 관리 화면에 입력창이 상시 떠 있으면
// 화면이 복잡해 보여서, 헤더의 "+ 새 원정대 추가" 버튼을 눌러야만 열리게 했다.
// 조회/저장이 끝날 때까지(isSyncing) 닫지 않고, 성공하면 호출한 쪽(RosterPage)이
// onClose를 불러 자동으로 닫는다 — 실패하면 error만 보여주고 모달은 열린 채로 둔다.
export function AddRosterModal({
  isSyncing,
  error,
  onSubmit,
  onClose,
}: AddRosterModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            새 원정대 추가
          </h3>
          <button
            type="button"
            disabled={isSyncing}
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
          >
            닫기
          </button>
        </div>

        <RosterConnectForm isSyncing={isSyncing} onSubmit={onSubmit} />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
