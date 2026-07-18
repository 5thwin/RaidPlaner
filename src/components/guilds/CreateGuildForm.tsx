import { useState, type FormEvent } from "react";

interface CreateGuildFormProps {
  isCreating: boolean;
  onSubmit: (name: string) => void;
}

// 공대 이름을 입력받는 폼. 생성 성공 후 어디로 이동할지는 이 폼을 쓰는
// 페이지(GuildStartPage)가 결정한다.
export function CreateGuildForm({
  isCreating,
  onSubmit,
}: CreateGuildFormProps) {
  const [name, setName] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return;
    }

    onSubmit(trimmed);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xl items-center gap-2"
    >
      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="공대 이름을 입력하세요"
        disabled={isCreating}
        className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
      <button
        type="submit"
        disabled={isCreating || name.trim().length === 0}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating ? "생성 중..." : "공대 만들기"}
      </button>
    </form>
  );
}
