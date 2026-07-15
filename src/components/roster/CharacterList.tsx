import type { Character } from "@/types/character";

interface CharacterListProps {
  characters: Character[];
  onToggleActive: (character: Character) => void;
  // 선택 업데이트 대상으로 체크된 캐릭터명 집합.
  selectedCharacterNames: Set<string>;
  onToggleSelect: (character: Character) => void;
}

// 원정대 캐릭터 목록. 캐릭터 이미지/전투력(아이템 레벨)을 카드형 그리드로 보여주고,
// 캐릭터별로 활성/비활성 토글 버튼과 선택 업데이트용 체크박스를 둔다.
// 비활성 캐릭터는 파티 빈 슬롯 후보 목록에서 제외되므로(도메인 규칙), 여기서는 흐리게 표시한다.
export function CharacterList({
  characters,
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

  return (
    <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {characters.map((character) => (
        <li
          key={character.id}
          className={`flex flex-col gap-3 rounded-lg border px-4 py-4 ${
            character.is_active
              ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              : "border-gray-100 bg-gray-50 opacity-50 dark:border-gray-800 dark:bg-gray-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedCharacterNames.has(character.character_name)}
              onChange={() => onToggleSelect(character)}
              aria-label={`${character.character_name} 선택`}
              className="h-4 w-4 flex-none rounded border-gray-200 accent-blue-600 dark:border-gray-700"
            />

            {character.character_image_url ? (
              <img
                src={character.character_image_url}
                alt={character.character_name}
                className="h-16 w-16 flex-none rounded-md bg-gray-100 object-cover dark:bg-gray-700"
              />
            ) : (
              <div className="flex h-16 w-16 flex-none items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                이미지 없음
              </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {character.character_name}
              </span>
              <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                {character.server_name} · {character.character_class_name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Lv.{character.character_level}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                아이템 레벨 {character.item_avg_level.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                전투력{" "}
                {character.combat_power !== null
                  ? character.combat_power.toLocaleString()
                  : "미확인"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleActive(character)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              character.is_active
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {character.is_active ? "비활성화" : "활성화"}
          </button>
        </li>
      ))}
    </ul>
  );
}
