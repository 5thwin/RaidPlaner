import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { readSessionCache, writeSessionCache } from "@/lib/sessionCache";
import type { Party, PartySlot, PartyWithSlots } from "@/types/party";
import type { RaidType } from "@/types/raid";

function getPartiesCacheKey(guildId: string): string {
  return `raid-planner:parties:${guildId}`;
}

interface PartySlotRow {
  id: string;
  party_id: string;
  slot_index: number;
  character_id: string | null;
  characters: {
    id: string;
    character_name: string;
    character_class_name: string;
    item_avg_level: number;
    combat_power: number | null;
    owner_id: string;
    profiles: { display_name: string | null } | null;
    rosters: { color: string } | null;
  } | null;
}

// 현재 공대에 속한 모든 파티 목록(슬롯 포함)을 통째로 불러오고,
// 파티 생성/클리어 토글/삭제, 슬롯 캐릭터 배정/해제를 처리하는 훅.
// 화면(GuildBoardPage)에서는 이 목록을 raid_type_id + difficulty_index로 묶어서
// 레이드/난이도별 섹션으로 나눠 그린다.
// parties/party_slots 테이블 변경은 Supabase Realtime으로 구독해서
// 같은 공대를 보고 있는 다른 탭/유저에게 폴링 없이 즉시 반영되게 한다.
export function useGuildParties(guildId: string | undefined) {
  const { user } = useAuth();
  // 새로고침 직후에도 곧바로 로딩 스피너를 보여주는 대신, 이 공대에서 직전에
  // 캐시해둔 파티 목록을 먼저 그대로 보여주고 백그라운드에서 조용히 재조회한다.
  const [parties, setParties] = useState<PartyWithSlots[]>(
    () =>
      (guildId &&
        readSessionCache<PartyWithSlots[]>(getPartiesCacheKey(guildId))) ||
      [],
  );
  const [isLoading, setIsLoading] = useState(
    () =>
      !guildId ||
      readSessionCache<PartyWithSlots[]>(getPartiesCacheKey(guildId)) ===
        null,
  );
  const [error, setError] = useState<string | null>(null);

  // party_slots Realtime 이벤트가 "지금 화면에 보이는 파티"의 것인지 확인하기 위한 ref.
  // 구독 콜백은 클로저라서 state를 최신 값으로 못 볼 수 있어 ref로 최신 파티 id 목록을 들고 있는다.
  const partyIdsRef = useRef<string[]>([]);

  // 파티 생성/캐릭터 배정 등 액션마다, 그리고 그 결과로 오는 Realtime 이벤트마다
  // reload()가 호출된다. 매번 isLoading을 true로 만들면 화면이 "불러오는 중..."으로
  // 통째로 바뀌었다가 다시 목록이 나타나는 깜빡임이 생겨서, 최초 1회 로딩에만
  // isLoading을 보여주고 이후 재조회는 화면을 비우지 않고 조용히 데이터만 갱신한다.
  // 캐시로 이미 뭔가 보여주고 있었다면 이 시점부터 이미 "한 번 로딩됨" 취급한다.
  const hasLoadedOnceRef = useRef(
    Boolean(
      guildId &&
        readSessionCache<PartyWithSlots[]>(getPartiesCacheKey(guildId)) !==
          null,
    ),
  );

  const reload = useCallback(async () => {
    if (!guildId) {
      setParties([]);
      partyIdsRef.current = [];
      setIsLoading(false);
      return;
    }

    // 최초 1회만 로딩 화면을 보여준다 (재조회 시 화면을 비우지 않기 위함).
    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setError(null);

    const finishLoading = () => {
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
    };

    const cacheKey = getPartiesCacheKey(guildId);

    const { data: partyRows, error: partyError } = await supabase
      .from("parties")
      .select("*")
      .eq("guild_id", guildId)
      .order("created_at", { ascending: true })
      .returns<Party[]>();

    if (partyError) {
      setError(`파티 목록을 불러오지 못했습니다: ${partyError.message}`);
      setParties([]);
      partyIdsRef.current = [];
      finishLoading();
      return;
    }

    const partyIds = (partyRows ?? []).map((party) => party.id);
    partyIdsRef.current = partyIds;

    if (partyIds.length === 0) {
      setParties([]);
      writeSessionCache(cacheKey, []);
      finishLoading();
      return;
    }

    const { data: slotRows, error: slotError } = await supabase
      .from("party_slots")
      .select(
        "id, party_id, slot_index, character_id, characters(id, character_name, character_class_name, item_avg_level, combat_power, owner_id, profiles(display_name), rosters(color))",
      )
      .in("party_id", partyIds)
      .order("slot_index", { ascending: true })
      .returns<PartySlotRow[]>();

    if (slotError) {
      setError(`파티 슬롯을 불러오지 못했습니다: ${slotError.message}`);
      finishLoading();
      return;
    }

    const slotsByParty = new Map<string, PartySlot[]>();
    for (const row of slotRows ?? []) {
      const slot: PartySlot = {
        id: row.id,
        party_id: row.party_id,
        slot_index: row.slot_index,
        character_id: row.character_id,
        character: row.characters
          ? {
              id: row.characters.id,
              character_name: row.characters.character_name,
              character_class_name: row.characters.character_class_name,
              item_avg_level: row.characters.item_avg_level,
              combat_power: row.characters.combat_power,
              owner_id: row.characters.owner_id,
              owner_display_name:
                row.characters.profiles?.display_name ?? null,
              roster_color: row.characters.rosters?.color ?? null,
            }
          : null,
      };

      const list = slotsByParty.get(row.party_id) ?? [];
      list.push(slot);
      slotsByParty.set(row.party_id, list);
    }

    const mapped = (partyRows ?? []).map((party) => ({
      ...party,
      slots: slotsByParty.get(party.id) ?? [],
    }));
    setParties(mapped);
    writeSessionCache(cacheKey, mapped);

    finishLoading();
  }, [guildId]);

  // 이 훅이 처음 마운트될 때(예: 새로고침)는 hasLoadedOnceRef의 초기값(캐시 존재
  // 여부)을 그대로 존중해야, 캐시로 이미 보여준 화면이 reload() 때문에 다시
  // 스피너로 덮이지 않는다. 그 이후 guildId가 실제로 바뀌는(공대 전환) 경우에만
  // "새 공대의 데이터를 아직 한 번도 못 봤다"로 되돌려서 로딩 화면을 다시 보여준다.
  const isFirstEffectRunRef = useRef(true);

  useEffect(() => {
    if (isFirstEffectRunRef.current) {
      isFirstEffectRunRef.current = false;
    } else {
      hasLoadedOnceRef.current = false;
    }
    reload();
  }, [reload]);

  useEffect(() => {
    if (!guildId) {
      return;
    }

    // parties는 guild_id 컬럼이 있어서 서버 단에서 우리 공대 것만 필터링해 구독할 수 있다.
    const partiesChannel = supabase
      .channel(`parties-${guildId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parties",
          filter: `guild_id=eq.${guildId}`,
        },
        () => {
          reload();
        },
      )
      .subscribe();

    // party_slots는 guild_id 컬럼이 없어서(party_id를 거쳐야만 소속 공대를 알 수 있음)
    // 서버 단 필터링이 불가능하다. 테이블 전체를 구독하되, 이벤트가 "지금 화면에 보이는
    // 파티"의 슬롯일 때만 다시 불러오도록 클라이언트에서 한 번 더 걸러낸다.
    const slotsChannel = supabase
      .channel(`party-slots-${guildId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "party_slots" },
        (payload) => {
          const changedPartyId =
            (payload.new as { party_id?: string } | null)?.party_id ??
            (payload.old as { party_id?: string } | null)?.party_id;

          if (changedPartyId && partyIdsRef.current.includes(changedPartyId)) {
            reload();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(partiesChannel);
      supabase.removeChannel(slotsChannel);
    };
  }, [guildId, reload]);

  // 지정한 레이드+난이도로 새 파티를 만든다. 슬롯은 DB 트리거가 자동으로 채워준다.
  async function createParty(raidType: RaidType, difficultyIndex: number) {
    if (!guildId || !user) {
      return;
    }

    const { error: insertError } = await supabase.from("parties").insert({
      guild_id: guildId,
      raid_type_id: raidType.id,
      difficulty_index: difficultyIndex,
      difficulty_name: raidType.difficulties[difficultyIndex],
      created_by: user.id,
    });

    if (insertError) {
      throw new Error(`파티 생성에 실패했습니다: ${insertError.message}`);
    }

    await reload();
  }

  async function toggleCleared(party: Party) {
    const { error: updateError } = await supabase
      .from("parties")
      .update({ is_cleared: !party.is_cleared })
      .eq("id", party.id);

    if (updateError) {
      throw new Error(
        `클리어 상태 변경에 실패했습니다: ${updateError.message}`,
      );
    }

    await reload();
  }

  async function deleteParty(partyId: string) {
    const { error: deleteError } = await supabase
      .from("parties")
      .delete()
      .eq("id", partyId);

    if (deleteError) {
      throw new Error(`파티 삭제에 실패했습니다: ${deleteError.message}`);
    }

    await reload();
  }

  async function assignCharacter(slotId: string, characterId: string) {
    const { error: updateError } = await supabase
      .from("party_slots")
      .update({ character_id: characterId })
      .eq("id", slotId);

    if (updateError) {
      throw new Error(`캐릭터 배정에 실패했습니다: ${updateError.message}`);
    }

    await reload();
  }

  async function clearSlot(slotId: string) {
    const { error: updateError } = await supabase
      .from("party_slots")
      .update({ character_id: null })
      .eq("id", slotId);

    if (updateError) {
      throw new Error(`슬롯 비우기에 실패했습니다: ${updateError.message}`);
    }

    await reload();
  }

  return {
    parties,
    isLoading,
    error,
    reload,
    createParty,
    toggleCleared,
    deleteParty,
    assignCharacter,
    clearSlot,
  };
}
