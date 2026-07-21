import { useDiscordLink } from "@/hooks/useDiscordLink";

// 프로필 모달의 "디스코드 연동" 섹션. 코드를 발급받아 디스코드에서
// "/연동 코드:XXXXXX"를 입력하면 연동된다(실제 연동 처리는
// discord-interactions Edge Function이 한다).
export function DiscordLinkSection() {
  const { isLinked, generatedCode, isGenerating, error, generateCode } =
    useDiscordLink();

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
        디스코드 연동
      </p>

      {isLinked ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          ✅ 연동됨 — 디스코드에서 <code>/파티현황 내캐릭터</code>를 쓸 수
          있어요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            연동하면 디스코드에서 <code>/파티현황 내캐릭터</code> 명령어로 내
            캐릭터가 속한 파티를 바로 확인할 수 있어요.
          </p>

          {generatedCode ? (
            <div className="flex flex-col gap-1 rounded-md bg-gray-100 px-3 py-2 dark:bg-gray-700">
              <span className="font-mono text-lg font-bold tracking-widest text-gray-900 dark:text-gray-100">
                {generatedCode}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                디스코드에서 10분 안에{" "}
                <code>/연동 코드:{generatedCode}</code>를 입력하세요.
              </span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => generateCode()}
              className="self-start rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              {isGenerating ? "발급 중..." : "연동 코드 발급"}
            </button>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
