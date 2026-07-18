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

// 원정대 캐릭터 목록. 캐릭터 이미지/전투력(아이템 레벨)을 카드형 그리드로 보여준다.
// 정보 밀도를 낮추려고 이름+레벨/서버·직업/전투력·아이템레벨 3줄로 압축했고, 원정대
// 색상(rosterColor)을 카드 좌측 바에 실제로 써서 원정대끼리 시각적으로 구분되게 한다
// (2026-07-18 사용자 피드백: "레이아웃/정보 밀도"와 "전체적으로 밋밋함" 개선).
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
            className={`flex flex-col gap-2.5 rounded-lg border border-l-4 bg-white p-3 shadow-sm transition hover:shadow-md dark:bg-gray-800 ${colorScheme.bar} ${
              character.is_active
                ? "border-gray-200 dark:border-gray-700"
                : "border-gray-100 opacity-55 dark:border-gray-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <label className="relative flex-none">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(character)}
                  aria-label={`${character.character_name} 선택`}
                  className="peer sr-only"
                />
                {character.character_image_url ? (
                  <img
                    src={character.character_image_url}
                    alt={character.character_name}
                    className="h-12 w-12 rounded-md bg-gray-100 object-cover ring-2 ring-transparent peer-checked:ring-blue-600 dark:bg-gray-700"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-[10px] text-gray-400 ring-2 ring-transparent peer-checked:ring-blue-600 dark:bg-gray-700 dark:text-gray-500">
                    이미지 없음
                  </div>
                )}
                <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-[9px] font-bold text-transparent peer-checked:bg-blue-600 peer-checked:text-white dark:border-gray-800 dark:bg-gray-600">
                  ✓
                </span>
              </label>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {character.character_name}
                  </span>
                  <span className="flex-none rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    Lv.{character.character_level}
                  </span>
                </div>
                <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                  {character.server_name} · {character.character_class_name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onToggleActive(character)}
                aria-label={character.is_active ? "비활성화" : "활성화"}
                title={character.is_active ? "비활성화" : "활성화"}
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-md ${
                  character.is_active
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
              </button>
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
          </li>
        );
      })}
    </ul>
  );
}
