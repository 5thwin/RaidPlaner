import { useState, type FormEvent } from "react";

interface RosterConnectFormProps {
  isSyncing: boolean;
  onSubmit: (characterName: string) => void;
}

// "새 원정대 추가" 폼. 다른 로스트아크 계정의 대표 캐릭터명을 입력받아
// 조회 → rosters에 새 원정대로 등록하는 흐름을 시작한다.
export function RosterConnectForm({
  isSyncing,
  onSubmit,
}: RosterConnectFormProps) {
  const [characterName, setCharacterName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = characterName.trim();
    if (trimmed.length === 0) {
      return;
    }

    onSubmit(trimmed);
    setCharacterName("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl items-center gap-2"
    >
      <input
        type="text"
        value={characterName}
        onChange={(event) => setCharacterName(event.target.value)}
        placeholder="새로 연결할 대표 캐릭터명을 입력하세요"
        disabled={isSyncing}
        className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
      <button
        type="submit"
        disabled={isSyncing || characterName.trim().length === 0}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSyncing ? "조회 중..." : "새 원정대 추가"}
      </button>
    </form>
  );
}
