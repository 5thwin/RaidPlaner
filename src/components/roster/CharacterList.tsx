import { getRosterColorScheme } from "@/lib/rosterColor";
import type { Character } from "@/types/character";

interface CharacterListProps {
  characters: Character[];
  rosterColor: string | null;
  onToggleActive: (character: Character) => void;
  // 선택 업데이트 대상으로 체크된 캐릭터명 집합.
  selectedCharacterNames: Set<string>;
  onToggleSelect: (character: Character) => void;
}

// 원정대 캐릭터 목록. 캐릭터 이미지/전투력/아이템 레벨을 카드형 그리드로 보여준다.
// 파티 편성에 안 쓰이는 캐릭터 레벨은 표시하지 않는다. 원정대 색상(rosterColor)을
// 카드 좌측 바에 실제로 써서 원정대끼리 시각적으로 구분되게 한다(2026-07-18 사용자
// 피드백: "레이아웃/정보 밀도"와 "전체적으로 밋밋함" 개선).
// 비활성 캐릭터는 파티 빈 슬롯 후보 목록에서 제외되므로(도메인 규칙), 여기서는 흐리게 표시한다.
export function CharacterList({
  characters,
  rosterColor,
  onToggleActive,
  selectedCharacterNames,
  onToggleSelect,
}: CharacterListProps) {
  if (characters.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        아직 저장된 캐릭터가 없습니다. 대표 캐릭터명을 입력해 원정대를
        연결해주세요.
      </p>
    );
  }

  const colorScheme = getRosterColorScheme(rosterColor ?? "");

  return (
    <ul className="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((character) => {
        const isSelected = selectedCharacterNames.has(character.character_name);

        return (
          <li
            key={character.id}
            className={`relative flex flex-col gap-2.5 rounded-lg border border-l-4 bg-white p-3 shadow-sm transition hover:shadow-md dark:bg-gray-800 ${colorScheme.bar} ${
              character.is_active
                ? "border-gray-200 dark:border-gray-700"
                : "border-gray-100 opacity-55 dark:border-gray-800"
            }`}
          >
            {/* 선택 체크박스: 이미지 모서리에 작게 얹혀있던 걸 카드 우측 상단으로
                옮기고 크기도 키워서(2026-07-19 사용자 피드백: "너무 작다") 누르기 쉽게 했다. */}
            <label className="absolute right-2 top-2 z-10">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(character)}
                aria-label={`${character.character_name} 선택`}
                className="peer sr-only"
              />
              <span className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-gray-200 bg-white text-transparent peer-checked:border-blue-600 peer-checked:bg-blue-600 peer-checked:text-white dark:border-gray-600 dark:bg-gray-800">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </span>
            </label>

            {/* 캐릭터 레벨은 파티 편성에 안 쓰이는 정보라 표시하지 않는다(2026-07-19
                사용자 요청) — 아이템 레벨/전투력만 아래 통계 칸에 보여준다. */}
            <div className="flex items-center gap-2.5 pr-8">
              <div className="flex-none">
                {character.character_image_url ? (
                  <img
                    src={character.character_image_url}
                    alt={character.character_name}
                    className="h-12 w-12 rounded-md bg-gray-100 object-cover dark:bg-gray-700"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                    이미지 없음
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {character.character_name}
                </span>
                <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {character.server_name} · {character.character_class_name}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5 rounded-md bg-blue-50 px-2.5 py-1.5 dark:bg-blue-900/40">
                <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70">
                  전투력
                </span>
                <span className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {character.combat_power !== null
                    ? character.combat_power.toLocaleString()
                    : "미확인"}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 rounded-md bg-gray-100 px-2.5 py-1.5 dark:bg-gray-700">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  아이템 레벨
                </span>
                <span className="text-sm font-bold tabular-nums text-gray-700 dark:text-gray-200">
                  {character.item_avg_level.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 활성/비활성 토글: 이름 줄에 끼워 넣으니 캐릭터명 표시 영역이 좁아져서
                (2026-07-19 사용자 피드백) 카드 하단에 전체 폭 버튼으로 뺐다. */}
            <button
              type="button"
              onClick={() => onToggleActive(character)}
              aria-label={
                character.is_active
                  ? "활성 상태 — 눌러서 비활성화"
                  : "비활성 상태 — 눌러서 활성화"
              }
              className={`flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold ${
                character.is_active
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
              }`}
            >
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-current" />
              {character.is_active ? "활성" : "비활성"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
