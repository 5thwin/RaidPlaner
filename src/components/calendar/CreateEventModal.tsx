import { useState, type FormEvent } from "react";

interface CreateEventModalProps {
  // 달력에서 클릭한 날짜. 날짜는 고정하고 시간만 폼에서 고른다.
  selectedDate: Date;
  onSubmit: (
    title: string,
    description: string | null,
    startsAtISOString: string,
  ) => Promise<void>;
  onClose: () => void;
}

function formatSelectedDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

// 달력의 특정 날짜 칸을 클릭했을 때 뜨는 일정 등록 모달.
// 날짜는 selectedDate로 이미 정해져 있으므로, 폼에서는 시간만 고르면 된다.
export function CreateEventModal({
  selectedDate,
  onSubmit,
  onClose,
}: CreateEventModalProps) {
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("20:00");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("제목을 입력해주세요.");
      return;
    }
    if (!time) {
      setError("시간을 선택해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const startsAt = combineDateAndTime(selectedDate, time);
      await onSubmit(
        trimmedTitle,
        description.trim() || null,
        startsAt.toISOString(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "일정 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              새 일정 등록
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatSelectedDate(selectedDate)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            닫기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="제목 (예: 토요일 카멘 하드)"
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          />

          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="설명 (선택)"
            rows={2}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="self-start rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "등록 중..." : "일정 등록"}
          </button>
        </form>
      </div>
    </div>
  );
}
