import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import type { Character, LostArkSiblingCharacter } from "@/types/character";

// 원정대 연결/갱신 과정에서 발생하는 에러를 구분하기 위한 전용 에러 클래스.
// 화면에서는 이 에러의 message를 그대로 사용자에게 보여준다.
export class LostArkRosterError extends Error {}

// Edge Function(lostark-roster)이 500/404 등 에러 응답을 줄 때, 그 JSON 본문 안의
// { error: string } 메시지를 최대한 꺼내서 사용자에게 원인을 정확히 보여준다.
async function extractErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body.error === "string") {
        return body.error;
      }
    } catch {
      // 본문이 JSON이 아니면 아래 기본 메시지로 대체한다.
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
}

// 대표 캐릭터명으로 로스트아크 오픈 API에 원정대(형제) 캐릭터 목록을 조회한다.
// 실제 API 키 호출은 Supabase Edge Function(lostark-roster)이 서버 사이드에서 대신 수행한다.
export async function fetchLostArkSiblings(
  characterName: string,
): Promise<LostArkSiblingCharacter[]> {
  const { data, error } = await supabase.functions.invoke<
    LostArkSiblingCharacter[]
  >("lostark-roster", {
    body: { characterName },
  });

  if (error) {
    const message = await extractErrorMessage(error);
    throw new LostArkRosterError(
      `원정대 조회에 실패했습니다: ${message} (Edge Function "lostark-roster"이 배포되어 있는지 확인해주세요.)`,
    );
  }

  if (!Array.isArray(data)) {
    throw new LostArkRosterError(
      "원정대 조회 응답 형식이 올바르지 않습니다.",
    );
  }

  return data;
}

// 개별 캐릭터 갱신이 실패했을 때(비공개 설정 등) 어떤 캐릭터가 왜 실패했는지 담는다.
export interface LostArkProfileFailure {
  characterName: string;
  error: string;
}

// 체크된 캐릭터명 목록만 골라 로스트아크 오픈 API에서 각각 최신 정보를 조회한다.
// 대표 캐릭터명으로 원정대 전체를 조회하는 fetchLostArkSiblings와 달리,
// 캐릭터마다 프로필 API를 직접 호출하므로 일부 캐릭터만 실패할 수 있다.
export async function fetchLostArkProfiles(characterNames: string[]): Promise<{
  profiles: LostArkSiblingCharacter[];
  failures: LostArkProfileFailure[];
}> {
  const { data, error } = await supabase.functions.invoke<{
    profiles: LostArkSiblingCharacter[];
    failures: LostArkProfileFailure[];
  }>("lostark-roster", {
    body: { characterNames },
  });

  if (error) {
    const message = await extractErrorMessage(error);
    throw new LostArkRosterError(
      `선택한 캐릭터 갱신에 실패했습니다: ${message} (Edge Function "lostark-roster"이 배포되어 있는지 확인해주세요.)`,
    );
  }

  if (
    !data ||
    !Array.isArray(data.profiles) ||
    !Array.isArray(data.failures)
  ) {
    throw new LostArkRosterError(
      "선택한 캐릭터 갱신 응답 형식이 올바르지 않습니다.",
    );
  }

  return data;
}

function parseItemAvgLevel(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

// CombatPower는 프로필 조회가 실패하면 null로 올 수 있다 (ItemAvgLevel과 달리 필수 값이 아님).
function parseCombatPower(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }

  return Number(raw.replace(/,/g, ""));
}

interface SyncCharactersOptions {
  // 새 원정대를 처음 연결할 때만 넘긴다: 아이템 레벨이 가장 높은 N개만 활성화 상태로
  // 시작하고 나머지는 비활성으로 시작한다. 넘기지 않으면(기존 원정대 갱신) is_active를
  // 아예 건드리지 않아 사용자가 토글해둔 상태 그대로 유지된다.
  activateTopByItemLevel?: number;
}

// 로스트아크 API에서 받아온 원정대 캐릭터들을 characters 테이블에 upsert한다.
// - 신규 캐릭터: options.activateTopByItemLevel이 있으면 그 기준으로, 없으면
//   컬럼 기본값(true)으로 is_active가 채워진다.
// - 기존 캐릭터: API 원본 필드만 갱신되고, is_active는 upsert 대상에서 제외되어 그대로 유지된다.
// - rosterId는 필수다. characters.roster_id는 not null이라, ON CONFLICT DO UPDATE로
//   기존 행을 갱신할 뿐이어도 Postgres가 제안된 INSERT 값의 NOT NULL 제약을 먼저
//   검사하므로 생략하면 실패한다(과거에 "선택 업데이트"에서 생략했다가 겪은 버그).
export async function syncCharactersFromLostArk(
  ownerId: string,
  siblings: LostArkSiblingCharacter[],
  rosterId: string,
  options?: SyncCharactersOptions,
): Promise<Character[]> {
  if (siblings.length === 0) {
    return [];
  }

  // 서버+캐릭터명 조합으로 "아이템 레벨 상위 N개"를 골라낸다(캐릭터명은 서버당
  // 유일하지만, 같은 원정대 안에 서버가 여러 개 섞일 수 있어 조합으로 식별한다).
  const activeKeys =
    options?.activateTopByItemLevel !== undefined
      ? new Set(
          [...siblings]
            .sort(
              (a, b) =>
                parseItemAvgLevel(b.ItemAvgLevel) -
                parseItemAvgLevel(a.ItemAvgLevel),
            )
            .slice(0, options.activateTopByItemLevel)
            .map((sibling) => `${sibling.ServerName}::${sibling.CharacterName}`),
        )
      : null;

  const rows = siblings.map((sibling) => ({
    owner_id: ownerId,
    roster_id: rosterId,
    server_name: sibling.ServerName,
    character_name: sibling.CharacterName,
    character_level: sibling.CharacterLevel,
    character_class_name: sibling.CharacterClassName,
    item_avg_level: parseItemAvgLevel(sibling.ItemAvgLevel),
    character_image_url: sibling.CharacterImage ?? null,
    combat_power: parseCombatPower(sibling.CombatPower),
    ...(activeKeys
      ? {
          is_active: activeKeys.has(
            `${sibling.ServerName}::${sibling.CharacterName}`,
          ),
        }
      : {}),
  }));

  const { data, error } = await supabase
    .from("characters")
    .upsert(rows, { onConflict: "owner_id,server_name,character_name" })
    .select();

  if (error) {
    throw new LostArkRosterError(`캐릭터 저장에 실패했습니다: ${error.message}`);
  }

  return data ?? [];
}
