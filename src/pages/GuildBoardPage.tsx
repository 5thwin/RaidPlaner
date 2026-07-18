import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useVisibleRaidTypes } from "@/hooks/useVisibleRaidTypes";
import { useGuildParties } from "@/hooks/useGuildParties";
import { PageSpinner } from "@/components/layout/PageSpinner";
import { PartyGrid } from "@/components/board/PartyGrid";
import { CreatePartyDropdown } from "@/components/board/CreatePartyDropdown";
import { SlotAssignModal } from "@/components/board/SlotAssignModal";
import { hasGuildRoleAtLeast } from "@/lib/guildRole";
import type { MyGuildMembership } from "@/types/guild";
import type { PartyWithSlots } from "@/types/party";
import type { RaidType } from "@/types/raid";

interface GuildBoardPageProps {
  guild: MyGuildMembership;
}

// 지금 배정하려는 빈 슬롯이 어느 레이드의 몇 번째 난이도인지 기억해두는 정보.
// 화면에 레이드/난이도가 전부 동시에 펼쳐져 있어서, 슬롯 클릭 시점에 어떤 섹션의
// 슬롯인지를 같이 저장해둬야 모달의 입장 조건(min_item_levels) 필터링이 가능하다.
interface AssigningSlot {
  slotId: string;
  raidType: RaidType;
  difficultyIndex: number;
  // 이 슬롯이 속한 파티에 이미 캐릭터를 넣어둔 유저(owner_id) 집합(이 슬롯 자신은 제외).
  // 같은 파티에는 한 유저의 캐릭터를 하나만 넣을 수 있다는 규칙을 모달에서 미리 걸러주기 위함.
  occupiedOwnerIds: Set<string>;
}

// 특정 레이드에 아직 배정된 캐릭터가 없을 때 재사용할 빈 Set (렌더마다 새 객체를 만들지 않기 위함).
const EMPTY_ASSIGNED_CHARACTER_IDS = new Set<string>();

// 메인 화면의 핵심: 현재 공대의 레이드-파티 현황판.
// 노출 설정된(is_visible=true) 레이드를 전부 세로로 나열하고, 레이드마다 난이도
// 구분 없이 그 레이드의 모든 파티를 한 목록으로 보여준다(난이도는 각 파티 카드의
// 배지로 구분). "파티 만들기"도 레이드당 버튼 하나 + 드롭다운으로 난이도를 고르는
// 방식이라, 탭을 클릭하지 않아도 한 화면에서 최대한 많은 파티를 스크롤로 볼 수 있다.
// 실시간 반영은 useVisibleRaidTypes/useGuildParties 내부의 Supabase Realtime 구독이 담당한다.
export function GuildBoardPage({ guild }: GuildBoardPageProps) {
  const { user } = useAuth();
  const {
    raidTypes,
    isLoading: isRaidTypesLoading,
    error: raidTypesError,
  } = useVisibleRaidTypes(guild.guild_id);

  const [assigningSlot, setAssigningSlot] = useState<AssigningSlot | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    parties,
    isLoading: isPartiesLoading,
    error: partiesError,
    createParty,
    toggleCleared,
    deleteParty,
    assignCharacter,
    clearSlot,
  } = useGuildParties(guild.guild_id);

  // 공대 전체 파티를 raid_type_id로만 묶는다. 같은 레이드면 난이도에 상관없이
  // 한 목록으로 보여주고(난이도 구분은 각 파티 카드의 배지가 대신한다),
  // 목록 안에서는 난이도 순으로 정렬해서 보기 편하게 한다.
  const partiesByRaid = useMemo(() => {
    const map = new Map<string, PartyWithSlots[]>();

    for (const party of parties) {
      const list = map.get(party.raid_type_id) ?? [];
      list.push(party);
      map.set(party.raid_type_id, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.difficulty_index - b.difficulty_index);
    }

    return map;
  }, [parties]);

  // 같은 레이드 안에서는 난이도/파티에 상관없이 한 캐릭터가 동시에 하나의
  // 슬롯에만 들어갈 수 있다. raid_type_id -> 이미 배정된 character_id 집합을
  // 만들어서, 모달에서 이미 다른 파티에 들어간 캐릭터를 후보에서 미리 걸러낸다.
  // (지금 화면에 로드된 이 공대의 파티만 알 수 있는 best-effort UX이고,
  // 다른 공대에서의 배정은 DB 트리거가 최종적으로 막아준다.)
  const assignedCharacterIdsByRaid = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const party of parties) {
      const set = map.get(party.raid_type_id) ?? new Set<string>();
      for (const slot of party.slots) {
        if (slot.character_id) {
          set.add(slot.character_id);
        }
      }
      map.set(party.raid_type_id, set);
    }

    return map;
  }, [parties]);

  async function runAction(action: () => Promise<void>) {
    setActionError(null);

    try {
      await action();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "요청 처리에 실패했습니다.",
      );
    }
  }

  async function handleAssign(characterId: string) {
    if (!assigningSlot) {
      return;
    }

    await assignCharacter(assigningSlot.slotId, characterId);
    setAssigningSlot(null);
  }

  function handleRemoveCharacter(slotId: string) {
    runAction(() => clearSlot(slotId));
  }

  function handleToggleCleared(party: PartyWithSlots) {
    runAction(() => toggleCleared(party));
  }

  function handleDeleteParty(partyId: string) {
    runAction(() => deleteParty(partyId));
  }

  function handleCreateParty(raidType: RaidType, difficultyIndex: number) {
    runAction(() => createParty(raidType, difficultyIndex));
  }

  const canCreateParty = hasGuildRoleAtLeast(guild.role, "member");

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {raidTypesError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {raidTypesError}
        </p>
      )}
      {partiesError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {partiesError}
        </p>
      )}
      {actionError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      )}

      {isRaidTypesLoading ? (
        <PageSpinner label="레이드 목록 불러오는 중..." />
      ) : raidTypes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          이 공대에 노출 설정된 레이드가 없습니다. officer 이상 권한자가 공대
          관리에서 레이드 노출을 켜주세요.
        </p>
      ) : (
        // 좁은 화면(모바일)에서는 레이드 섹션을 세로 한 줄로 쌓고, 넓은 모니터
        // (xl, 1280px 이상)에서는 레이드 섹션 두 개가 나란히 보이는 2열 그리드로 바꾼다.
        // 레이드 섹션 자체는 박스(테두리/배경)로 감싸지 않는다 — 구분은 그 안의
        // 파티 카드들이 각자 난이도 색상(PartyCard의 color.card)으로 담당한다.
        <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
          {raidTypes.map((raidType) => (
            <section key={raidType.id} className="flex w-full flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {raidType.name}
                </h2>

                {canCreateParty && (
                  <CreatePartyDropdown
                    raidType={raidType}
                    onSelectDifficulty={(difficultyIndex) =>
                      handleCreateParty(raidType, difficultyIndex)
                    }
                  />
                )}
              </div>

              {isPartiesLoading ? (
                <PageSpinner
                  label="파티 목록 불러오는 중..."
                  minHeightClassName="min-h-[160px]"
                />
              ) : (
                <PartyGrid
                  parties={partiesByRaid.get(raidType.id) ?? []}
                  myRole={guild.role}
                  userId={user?.id}
                  onToggleCleared={handleToggleCleared}
                  onDeleteParty={handleDeleteParty}
                  onOpenAssignModal={(slotId, party) => {
                    const occupiedOwnerIds = new Set<string>();
                    for (const slot of party.slots) {
                      if (slot.id !== slotId && slot.character) {
                        occupiedOwnerIds.add(slot.character.owner_id);
                      }
                    }

                    setAssigningSlot({
                      slotId,
                      raidType,
                      difficultyIndex: party.difficulty_index,
                      occupiedOwnerIds,
                    });
                  }}
                  onRemoveCharacter={handleRemoveCharacter}
                />
              )}
            </section>
          ))}
        </div>
      )}

      {assigningSlot && (
        <SlotAssignModal
          guildId={guild.guild_id}
          raidType={assigningSlot.raidType}
          difficultyIndex={assigningSlot.difficultyIndex}
          myRole={guild.role}
          userId={user?.id}
          assignedCharacterIds={
            assignedCharacterIdsByRaid.get(assigningSlot.raidType.id) ??
            EMPTY_ASSIGNED_CHARACTER_IDS
          }
          occupiedOwnerIdsInParty={assigningSlot.occupiedOwnerIds}
          onAssign={handleAssign}
          onClose={() => setAssigningSlot(null)}
        />
      )}
    </div>
  );
}
