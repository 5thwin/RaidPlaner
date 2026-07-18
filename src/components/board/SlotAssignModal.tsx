import { useEffect, useMemo, useState } from "react";
import { useAssignableCharacters } from "@/hooks/useAssignableCharacters";
import { getRosterColorScheme } from "@/lib/rosterColor";
import type { RaidType } from "@/types/raid";
import type { GuildRole } from "@/types/guild";

interface SlotAssignModalProps {
  guildId: string;
  raidType: RaidType;
  difficultyIndex: number;
  myRole: GuildRole | null;
  userId: string | undefined;
  // 같은 레이드(raidType)의 다른 난이도/다른 파티에 이미 배정되어 있어 후보에서
  // 제외해야 하는 character_id 집합. 지금 화면에 로드된 이 공대의 파티 기준
  // best-effort 필터이고, 다른 공대에서의 배정까지는 DB 트리거가 최종적으로 막는다.
  assignedCharacterIds: Set<string>;
  // 지금 이 슬롯이 속한 "바로 그 파티"에 이미 캐릭터를 넣어둔 유저(owner_id) 집합
  // (지금 편집 중인 슬롯 자신은 제외). 같은 파티에는 한 유저의 캐릭터를 하나만
  // 넣을 수 있으므로, 이미 이 파티에 캐릭터가 있는 유저의 다른 캐릭터는 후보에서 뺀다.
  occupiedOwnerIdsInParty: Set<string>;
  onAssign: (characterId: string) => Promise<void>;
  onClose: () => void;
}

// 빈 슬롯을 클릭했을 때 뜨는 후보 캐릭터 선택 모달.
// 후보 범위(본인만 vs 같은 공대 전체)는 useAssignableCharacters가 역할에 맞춰 가져오고,
// 여기서는 레이드 입장 조건(min_item_levels[difficultyIndex])으로 한 번 더 걸러서 보여준다.
// officer 이상은 공대 전체 캐릭터가 한 번에 뜨면 너무 많아지므로, 원정대별 탭으로
// 나눠서 보여준다 — 본인 원정대가 가장 먼저, 그다음 다른 공대원 원정대는 이름순이다.
export function SlotAssignModal({
  guildId,
  raidType,
  difficultyIndex,
  myRole,
  userId,
  assignedCharacterIds,
  occupiedOwnerIdsInParty,
  onAssign,
  onClose,
}: SlotAssignModalProps) {
  const { candidates, isLoading, error } = useAssignableCharacters(
    guildId,
    myRole,
    userId,
  );
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  const minItemLevel = raidType.min_item_levels?.[difficultyIndex] ?? null;

  useEffect(() => {
    if (minItemLevel === null) {
      console.info(
        `[파티 슬롯] "${raidType.name}" ${raidType.difficulties[difficultyIndex]} 난이도는 ` +
          "입장 레벨(min_item_levels)이 아직 설정되지 않아, 활성 캐릭터를 필터링 없이 전부 보여줍니다.",
      );
    }
  }, [minItemLevel, raidType, difficultyIndex]);

  const filteredCandidates = useMemo(
    () =>
      candidates
        .filter((c) => !assignedCharacterIds.has(c.id))
        .filter((c) => !occupiedOwnerIdsInParty.has(c.owner_id))
        .filter((c) => minItemLevel === null || c.item_avg_level >= minItemLevel),
    [candidates, minItemLevel, assignedCharacterIds, occupiedOwnerIdsInParty],
  );

  // 원정대별 탭 목록. 후보가 하나도 없는 원정대는 탭 자체를 만들지 않는다.
  // 본인 원정대가 먼저, 그 안에서는 원정대를 연결한 순서대로. 그 다음 다른
  // 공대원의 원정대는 이름순으로, 그 안에서는 마찬가지로 연결한 순서대로 나온다.
  const rosterTabs = useMemo(() => {
    const rosterById = new Map<
      string,
      {
        rosterId: string;
        name: string;
        ownerDisplayName: string | null;
        isMine: boolean;
        color: string | null;
        createdAt: string;
      }
    >();

    for (const character of filteredCandidates) {
      if (rosterById.has(character.roster_id)) {
        continue;
      }
      rosterById.set(character.roster_id, {
        rosterId: character.roster_id,
        name: character.roster_representative_name ?? "이름 없는 원정대",
        ownerDisplayName: character.owner_display_name,
        isMine: character.owner_id === userId,
        color: character.roster_color,
        createdAt: character.roster_created_at ?? "",
      });
    }

    return [...rosterById.values()].sort((a, b) => {
      if (a.isMine !== b.isMine) {
        return a.isMine ? -1 : 1;
      }
      if (!a.isMine) {
        const ownerCompare = (a.ownerDisplayName ?? "").localeCompare(
          b.ownerDisplayName ?? "",
        );
        if (ownerCompare !== 0) {
          return ownerCompare;
        }
      }
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [filteredCandidates, userId]);

  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(
    null,
  );

  // 탭 목록이 바뀌었는데(모달을 처음 열었거나, 필터링 결과가 달라져서) 지금 선택된
  // 원정대가 더 이상 없으면 첫 번째 탭(본인 원정대 우선)을 자동으로 선택한다.
  useEffect(() => {
    if (
      selectedRosterId === null ||
      !rosterTabs.some((tab) => tab.rosterId === selectedRosterId)
    ) {
      setSelectedRosterId(rosterTabs[0]?.rosterId ?? null);
    }
  }, [rosterTabs, selectedRosterId]);

  const rosterFilteredCandidates = useMemo(
    () =>
      selectedRosterId === null
        ? []
        : filteredCandidates.filter(
            (character) => character.roster_id === selectedRosterId,
          ),
    [filteredCandidates, selectedRosterId],
  );

  async function handleAssign(characterId: string) {
    setAssignError(null);
    setAssigningId(characterId);

    try {
      await onAssign(characterId);
    } catch (err) {
      setAssignError(
        err instanceof Error ? err.message : "캐릭터 배정에 실패했습니다.",
      );
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            후보 캐릭터 선택
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            닫기
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {minItemLevel === null
            ? "입장 레벨 미설정 (모든 활성 캐릭터 표시)"
            : `입장 조건: 아이템 레벨 ${minItemLevel.toLocaleString()} 이상`}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          이미 같은 레이드의 다른 파티에 배정된 캐릭터, 이미 이 파티에 캐릭터를
          넣어둔 유저의 다른 캐릭터는 표시되지 않습니다.
        </p>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {assignError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {assignError}
          </p>
        )}

        {!isLoading && rosterTabs.length > 0 && (
          <ul className="flex gap-1.5 overflow-x-auto pb-1">
            {rosterTabs.map((tab) => {
              const isSelected = tab.rosterId === selectedRosterId;
              const colorScheme = getRosterColorScheme(tab.color ?? "");

              return (
                <li key={tab.rosterId} className="flex-none">
                  <button
                    type="button"
                    onClick={() => setSelectedRosterId(tab.rosterId)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 flex-none rounded-full ${colorScheme.swatch}`}
                    />
                    {tab.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            후보 불러오는 중...
          </p>
        ) : filteredCandidates.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            조건을 충족하는 활성 캐릭터가 없습니다.
          </p>
        ) : (
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
            {rosterFilteredCandidates.map((character) => (
              <li key={character.id}>
                <button
                  type="button"
                  disabled={assigningId === character.id}
                  onClick={() => handleAssign(character.id)}
                  className="flex w-full items-center justify-between rounded-md border border-gray-100 bg-gray-100 px-3 py-2 text-left hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  <span className="flex flex-col">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {character.character_name}
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {character.character_class_name}
                      </span>
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      전투력{" "}
                      {character.combat_power !== null
                        ? character.combat_power.toLocaleString()
                        : "미확인"}
                      {" · 아이템 레벨 "}
                      {character.item_avg_level.toLocaleString()}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {assigningId === character.id ? "배정 중..." : "선택"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
