import { PartyCard } from "@/components/board/PartyCard";
import type { PartyWithSlots } from "@/types/party";
import type { GuildRole } from "@/types/guild";

interface PartyGridProps {
  parties: PartyWithSlots[];
  maxPlayers: number;
  myRole: GuildRole | null;
  userId: string | undefined;
  onToggleCleared: (party: PartyWithSlots) => void;
  onDeleteParty: (partyId: string) => void;
  onOpenAssignModal: (slotId: string, party: PartyWithSlots) => void;
  onRemoveCharacter: (slotId: string) => void;
}

// 한 레이드에 생성된 파티들을 나열한다(난이도 불문, 한 목록).
// 각 파티 카드가 이미 자기 난이도 배지를 갖고 있어서 목록만 봐도 난이도가 구분된다.
export function PartyGrid({
  parties,
  maxPlayers,
  myRole,
  userId,
  onToggleCleared,
  onDeleteParty,
  onOpenAssignModal,
  onRemoveCharacter,
}: PartyGridProps) {
  if (parties.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        아직 생성된 파티가 없습니다.
      </p>
    );
  }

  return (
    // 고정 2열 그리드 대신 가로로 흐르게 배치한다: 카드마다 최소 폭(min-w-80)을
    // 보장하고 남는 공간은 flex-1로 나눠 가지므로, 넓은 화면에선 한 줄에 여러 개가
    // 나란히 놓이고(자연스러운 "한 줄" 배치), 다 안 들어가면 다음 줄로 넘어간다.
    // 폭이 min-w-80보다 좁은 화면(모바일)에서는 자동으로 한 줄에 하나씩만 놓인다.
    <div className="flex flex-wrap gap-2">
      {parties.map((party, index) => (
        <div key={party.id} className="min-w-80 flex-1">
          <PartyCard
            label={`파티 ${index + 1}`}
            party={party}
            maxPlayers={maxPlayers}
            myRole={myRole}
            userId={userId}
            onToggleCleared={() => onToggleCleared(party)}
            onDeleteParty={() => onDeleteParty(party.id)}
            onOpenAssignModal={(slotId) => onOpenAssignModal(slotId, party)}
            onRemoveCharacter={onRemoveCharacter}
          />
        </div>
      ))}
    </div>
  );
}
