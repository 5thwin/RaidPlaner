import { useState } from "react";
import { useCharacters } from "@/hooks/useCharacters";
import {
  fetchLostArkSiblings,
  fetchLostArkProfiles,
  syncCharactersFromLostArk,
  LostArkRosterError,
  type LostArkProfileFailure,
} from "@/lib/lostarkRoster";
import { CharacterList } from "@/components/roster/CharacterList";
import { RosterColorPicker } from "@/components/roster/RosterColorPicker";
import { DeleteRosterModal } from "@/components/roster/DeleteRosterModal";
import { ConfirmModal } from "@/components/layout/ConfirmModal";
import { getRosterColorScheme } from "@/lib/rosterColor";
import type { Roster } from "@/types/roster";
import type { Character } from "@/types/character";

interface RosterSectionProps {
  roster: Roster;
  onColorChange: (rosterId: string, color: string) => Promise<Roster>;
  onNameChange: (
    rosterId: string,
    representativeCharacterName: string,
  ) => Promise<Roster>;
  onDelete: (rosterId: string) => Promise<void>;
}

// 원정대(rosters) 한 개에 대한 섹션. 그 원정대 소속 캐릭터 목록을 보여주고,
// 업데이트 버튼 하나로 전체 갱신(대표 캐릭터명 재조회, 선택 없음)과 선택 갱신
// (체크된 캐릭터만 개별 조회)을 겸한다 — 캐릭터를 체크하면 버튼이 자동으로
// "선택 업데이트"로 바뀐다.
export function RosterSection({
  roster,
  onColorChange,
  onNameChange,
  onDelete,
}: RosterSectionProps) {
  const {
    characters,
    isLoading: isCharactersLoading,
    error: charactersError,
    reload: reloadCharacters,
    toggleActive,
  } = useCharacters(roster.id);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [colorError, setColorError] = useState<string | null>(null);

  // DeleteRosterModal 자체가 실패 시 에러 표시/재시도를 처리하므로(DeleteGuildModal과
  // 동일한 패턴), 여기서는 성공했을 때 모달을 닫아주기만 하면 된다.
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  async function handleDeleteRoster() {
    await onDelete(roster.id);
    setIsDeleteModalOpen(false);
  }

  // 원정대 색상 스와치를 클릭하면 바로 저장한다(별도 저장 버튼 없음).
  async function handleColorSelect(colorKey: string) {
    if (colorKey === roster.color) {
      return;
    }

    setColorError(null);

    try {
      await onColorChange(roster.id, colorKey);
    } catch (error) {
      setColorError(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
    }
  }

  // 원정대 이름(representative_character_name) 인라인 편집. 순수 표시용 이름이라
  // "전체 업데이트"(handleUpdateAll)는 이 값 대신 원정대 내 캐릭터명을 직접 조회 키로
  // 쓰므로, 사용자가 원하는 아무 이름으로나 자유롭게 바꿀 수 있다.
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(roster.representative_character_name);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  function handleStartEditName() {
    setNameDraft(roster.representative_character_name);
    setNameError(null);
    setIsEditingName(true);
  }

  function handleCancelEditName() {
    setIsEditingName(false);
    setNameError(null);
  }

  async function handleSaveName() {
    const trimmed = nameDraft.trim();

    if (trimmed.length === 0) {
      setNameError("원정대 이름을 입력해주세요.");
      return;
    }

    if (trimmed === roster.representative_character_name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    setNameError(null);

    try {
      await onNameChange(roster.id, trimmed);
      setIsEditingName(false);
    } catch (error) {
      setNameError(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setIsSavingName(false);
    }
  }

  // 활성/비활성 캐릭터를 같은 목록에 섞어서 흐리게 보여주던 것 대신, 탭으로
  // 완전히 분리한다. 기본값은 "활성"이라 비활성 캐릭터는 원정대 관리 화면에
  // 처음엔 아예 보이지 않고, 탭을 눌러야만 보인다.
  const [viewMode, setViewMode] = useState<"active" | "inactive">("active");

  const [selectedCharacterNames, setSelectedCharacterNames] = useState<
    Set<string>
  >(new Set());
  const [isUpdatingSelected, setIsUpdatingSelected] = useState(false);
  const [updateSelectedError, setUpdateSelectedError] = useState<
    string | null
  >(null);
  const [updateFailures, setUpdateFailures] = useState<
    LostArkProfileFailure[]
  >([]);

  // 원정대 내 캐릭터 아무거나(첫 번째로 로드된 캐릭터) 하나의 이름으로 로스트아크
  // API를 조회해 원정대 전체를 재조회한다. 원정대 이름(representative_character_name)은
  // 이제 순수 표시용이라 조회 키로 쓰지 않는다 — 사용자가 자유롭게 바꿀 수 있다.
  async function handleUpdateAll() {
    const referenceCharacterName = characters[0]?.character_name;

    if (!referenceCharacterName) {
      setSyncError(
        "원정대에 캐릭터가 없어 업데이트할 수 없습니다. 원정대를 다시 연결해주세요.",
      );
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      const siblings = await fetchLostArkSiblings(referenceCharacterName);

      if (siblings.length === 0) {
        throw new LostArkRosterError(
          "조회된 캐릭터가 없습니다. 캐릭터명을 다시 확인해주세요.",
        );
      }

      await syncCharactersFromLostArk(roster.owner_id, siblings, roster.id);
      await reloadCharacters();
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  function handleToggleSelect(character: Character) {
    setSelectedCharacterNames((prev) => {
      const next = new Set(prev);
      if (next.has(character.character_name)) {
        next.delete(character.character_name);
      } else {
        next.add(character.character_name);
      }
      return next;
    });
  }

  async function handleUpdateSelected() {
    if (selectedCharacterNames.size === 0) {
      return;
    }

    setIsUpdatingSelected(true);
    setUpdateSelectedError(null);
    setUpdateFailures([]);

    try {
      const { profiles, failures } = await fetchLostArkProfiles(
        Array.from(selectedCharacterNames),
      );

      if (profiles.length > 0) {
        // 체크된 캐릭터는 전부 이 원정대(roster.id) 소속이므로 그대로 다시 넘긴다.
        // roster_id를 생략하면 "기존 값 유지"를 기대했지만, Postgres는 ON CONFLICT
        // DO UPDATE라도 제안된 INSERT 값 자체의 NOT NULL 제약을 먼저 검사하기
        // 때문에 roster_id가 없으면 기존 행과 충돌하기 전에 NOT NULL 위반으로 실패한다.
        await syncCharactersFromLostArk(roster.owner_id, profiles, roster.id);
        await reloadCharacters();
      }

      setUpdateFailures(failures);
      setSelectedCharacterNames(new Set());
    } catch (error) {
      setUpdateSelectedError(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setIsUpdatingSelected(false);
    }
  }

  const hasSelection = selectedCharacterNames.size > 0;
  const isBusy = isSyncing || isUpdatingSelected;
  const activeCharacters = characters.filter((c) => c.is_active);
  const inactiveCharacters = characters.filter((c) => !c.is_active);

  // 선택된 캐릭터가 있으면 그것만 갱신하고, 없으면 원정대 전체를 갱신한다 —
  // 버튼 하나가 상황에 따라 역할을 바꾸는 방식으로, 늘 같이 떠 있던
  // "업데이트"/"선택 업데이트" 두 버튼과 "N개 선택됨" 안내 줄을 하나로 합쳤다.
  // 로스트아크 API 최신 값으로 캐릭터 정보를 덮어쓰는 동작이라, 바로 실행하지
  // 않고 ConfirmModal로 한 번 더 확인받은 뒤에 실행한다.
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState(false);

  function handleUpdateClick() {
    setIsUpdateConfirmOpen(true);
  }

  // handleUpdateAll/handleUpdateSelected는 실패해도 각자의 에러 상태(syncError,
  // updateSelectedError)에 담아 섹션 안에 표시할 뿐 밖으로 던지지 않으므로, 여기서는
  // 그냥 끝까지 기다렸다가(ConfirmModal이 그동안 "처리 중..."을 보여준다) 닫기만 한다.
  async function handleConfirmUpdate() {
    if (hasSelection) {
      await handleUpdateSelected();
    } else {
      await handleUpdateAll();
    }
    setIsUpdateConfirmOpen(false);
  }

  const colorScheme = getRosterColorScheme(roster.color);

  return (
    <section className="relative flex w-full flex-col gap-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-4 pt-[19px] dark:border-gray-700 dark:bg-gray-800">
      <span
        className={`absolute inset-x-0 top-0 h-[3px] ${colorScheme.swatch}`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {isEditingName ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSaveName();
                    } else if (event.key === "Escape") {
                      handleCancelEditName();
                    }
                  }}
                  disabled={isSavingName}
                  autoFocus
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-lg font-semibold text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  disabled={isSavingName}
                  onClick={handleSaveName}
                  className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSavingName ? "저장 중..." : "저장"}
                </button>
                <button
                  type="button"
                  disabled={isSavingName}
                  onClick={handleCancelEditName}
                  className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  취소
                </button>
              </div>
              {nameError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {nameError}
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartEditName}
              title="원정대 이름 수정"
              className="rounded-md text-lg font-semibold text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {roster.representative_character_name}
            </button>
          )}
          {!isCharactersLoading && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {characters.length}개
            </span>
          )}
          <RosterColorPicker color={roster.color} onSelect={handleColorSelect} />
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            title="원정대 삭제"
            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/40"
          >
            원정대 삭제
          </button>
        </div>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setSelectedCharacterNames(new Set())}
              className="text-xs text-gray-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400"
            >
              선택 해제
            </button>
          )}
          <button
            type="button"
            disabled={isBusy}
            onClick={handleUpdateClick}
            className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
              hasSelection
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {isBusy
              ? "갱신 중..."
              : hasSelection
                ? `선택 업데이트 (${selectedCharacterNames.size})`
                : "업데이트"}
          </button>
        </div>
      </div>

      {colorError && (
        <p className="text-sm text-red-600 dark:text-red-400">{colorError}</p>
      )}

      {syncError && (
        <p className="text-sm text-red-600 dark:text-red-400">{syncError}</p>
      )}

      {charactersError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {charactersError}
        </p>
      )}

      {updateSelectedError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {updateSelectedError}
        </p>
      )}

      {updateFailures.length > 0 && (
        <div className="rounded-md bg-red-50 px-4 py-3 dark:bg-red-900">
          <p className="text-sm text-red-600 dark:text-red-400">
            다음 캐릭터는 갱신에 실패했습니다:
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-red-600 dark:text-red-400">
            {updateFailures.map((failure) => (
              <li key={failure.characterName}>
                {failure.characterName} — {failure.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isCharactersLoading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          캐릭터 목록 불러오는 중...
        </p>
      ) : (
        <>
          <div className="flex w-fit gap-1 rounded-full bg-gray-100 p-1 text-sm dark:bg-gray-700">
            <button
              type="button"
              onClick={() => setViewMode("active")}
              className={`rounded-full px-3 py-1 font-medium ${
                viewMode === "active"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              활성 {activeCharacters.length}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("inactive")}
              className={`rounded-full px-3 py-1 font-medium ${
                viewMode === "inactive"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              비활성 {inactiveCharacters.length}
            </button>
          </div>

          <CharacterList
            characters={
              viewMode === "active" ? activeCharacters : inactiveCharacters
            }
            rosterColor={roster.color}
            onToggleActive={toggleActive}
            selectedCharacterNames={selectedCharacterNames}
            onToggleSelect={handleToggleSelect}
          />
        </>
      )}

      {isDeleteModalOpen && (
        <DeleteRosterModal
          rosterName={roster.representative_character_name}
          onDelete={handleDeleteRoster}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      )}

      {isUpdateConfirmOpen && (
        <ConfirmModal
          title={hasSelection ? "선택 캐릭터 업데이트" : "원정대 전체 업데이트"}
          message={
            hasSelection
              ? `선택한 캐릭터 ${selectedCharacterNames.size}개를 로스트아크 최신 정보로 덮어씁니다. 계속할까요?`
              : "원정대 전체를 로스트아크 최신 정보로 덮어씁니다. 계속할까요?"
          }
          confirmLabel="업데이트"
          onConfirm={handleConfirmUpdate}
          onClose={() => setIsUpdateConfirmOpen(false)}
        />
      )}
    </section>
  );
}
