// =========================================================
// Edge Function: lostark-roster
// =========================================================
// 로스트아크 오픈 API 키를 브라우저(클라이언트 번들)에 절대 노출하지 않기 위한
// 서버 사이드 프록시. 요청 바디 형태에 따라 두 가지 모드로 동작한다.
//
// 모드 1) { characterName: string } — 대표 캐릭터명 하나로 원정대(형제) 캐릭터
// 전체를 조회한다(siblings API). siblings 응답에는 캐릭터 이미지/전투력이 없으므로,
// 캐릭터마다 프로필 API(/armories/characters/{characterName}/profiles)를 추가로
// 호출해서 CharacterImage, CombatPower를 병합해서 돌려준다.
//
// 모드 2) { characterNames: string[] } — 체크된 일부 캐릭터만 개별 갱신할 때 쓴다.
// siblings 호출 없이 각 이름마다 프로필 API를 직접 병렬 호출한다. 이 API 하나로
// ServerName/CharacterName/CharacterLevel/CharacterClassName/ItemAvgLevel까지
// 전부 나오므로 siblings가 필요 없다. 캐릭터별로 성공/실패를 구분해서
// { profiles, failures } 형태로 돌려준다(비공개 캐릭터 등 일부 실패해도 나머지는
// 정상 처리되도록).
//
// CombatPower는 ItemAvgLevel(아이템 레벨)과는 별개의 실제 "전투력" 수치다.
// 프로필 조회가 캐릭터별로 실패해도(비공개 설정 등) 전체 동기화가 죽지 않도록,
// 모드 1에서는 실패한 캐릭터의 이미지/전투력만 null로 채우고 계속 진행한다.
//
// API 키는 이 함수 전용 환경변수(secret)로만 관리한다 — .env의 VITE_* 방식이 아니다.
// 배포/설정은 이 프로젝트에 Supabase CLI가 설치·로그인·링크된 뒤 아래 순서로 진행한다.
//   1) supabase login
//   2) supabase link --project-ref <프로젝트-ref>
//   3) supabase secrets set LOSTARK_API_KEY=발급받은_로스트아크_API_키
//   4) supabase functions deploy lostark-roster

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOSTARK_API_BASE = "https://developer-lostark.game.onstove.com";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

interface LostArkSibling {
  ServerName: string;
  CharacterName: string;
  CharacterLevel: number;
  CharacterClassName: string;
  ItemAvgLevel: string;
}

interface CharacterProfileExtras {
  characterImage: string | null;
  combatPower: string | null;
}

// 모드 2(개별 선택 갱신) 응답의 캐릭터 하나 형태. 기존 LostArkSibling +
// CharacterImage/CombatPower와 동일한 필드 셋이다.
interface ProfileResult {
  ServerName: string;
  CharacterName: string;
  CharacterLevel: number;
  CharacterClassName: string;
  ItemAvgLevel: string;
  CharacterImage: string | null;
  CombatPower: string | null;
}

interface ProfileFailure {
  characterName: string;
  error: string;
}

// 프로필 API 응답이 실패했을 때, 상태 코드에 따라 원인 메시지를 구분해서 돌려준다.
// (기존 siblings 조회 실패 메시지 패턴과 동일하게 맞춘다.)
function describeLostArkStatus(status: number): string {
  if (status === 404) {
    return "해당 이름의 캐릭터를 로스트아크에서 찾을 수 없습니다.";
  }

  if (status === 401 || status === 403) {
    return "로스트아크 API 키가 유효하지 않거나 권한이 없습니다. LOSTARK_API_KEY를 확인해주세요.";
  }

  return `로스트아크 API 호출에 실패했습니다. (status: ${status})`;
}

// 캐릭터 한 명의 전체 정보를 프로필 API 하나로 조회한다.
// 성공하면 ProfileResult를, 실패하면 이유가 담긴 ProfileFailure를 반환한다.
async function fetchCharacterProfile(
  apiKey: string,
  characterName: string,
): Promise<{ profile: ProfileResult } | { failure: ProfileFailure }> {
  try {
    const response = await fetch(
      `${LOSTARK_API_BASE}/armories/characters/${encodeURIComponent(
        characterName,
      )}/profiles`,
      {
        headers: {
          Authorization: `bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        failure: {
          characterName,
          error: describeLostArkStatus(response.status),
        },
      };
    }

    const body = (await response.json()) as {
      ServerName?: unknown;
      CharacterName?: unknown;
      CharacterLevel?: unknown;
      CharacterClassName?: unknown;
      ItemAvgLevel?: unknown;
      CharacterImage?: unknown;
      CombatPower?: unknown;
    } | null;

    if (
      typeof body?.ServerName !== "string" ||
      typeof body?.CharacterName !== "string" ||
      typeof body?.CharacterLevel !== "number" ||
      typeof body?.CharacterClassName !== "string" ||
      typeof body?.ItemAvgLevel !== "string"
    ) {
      return {
        failure: {
          characterName,
          error: "캐릭터 정보를 찾을 수 없습니다. 비공개 설정되어 있을 수 있습니다.",
        },
      };
    }

    return {
      profile: {
        ServerName: body.ServerName,
        CharacterName: body.CharacterName,
        CharacterLevel: body.CharacterLevel,
        CharacterClassName: body.CharacterClassName,
        ItemAvgLevel: body.ItemAvgLevel,
        CharacterImage:
          typeof body.CharacterImage === "string" &&
          body.CharacterImage.length > 0
            ? body.CharacterImage
            : null,
        CombatPower:
          typeof body.CombatPower === "string" && body.CombatPower.length > 0
            ? body.CombatPower
            : null,
      },
    };
  } catch (fetchError) {
    return {
      failure: {
        characterName,
        error: `로스트아크 API 서버에 연결하지 못했습니다. (${String(fetchError)})`,
      },
    };
  }
}

// 캐릭터 프로필 API를 조회해 캐릭터 이미지 URL과 전투력(CombatPower)을 뽑아온다.
// 캐릭터가 비공개거나 API 호출에 실패해도 전체 동기화를 막지 않기 위해,
// 어떤 에러든 여기서 삼키고 둘 다 null인 값을 반환한다.
async function fetchCharacterProfileExtras(
  apiKey: string,
  characterName: string,
): Promise<CharacterProfileExtras> {
  const empty: CharacterProfileExtras = {
    characterImage: null,
    combatPower: null,
  };

  try {
    const response = await fetch(
      `${LOSTARK_API_BASE}/armories/characters/${encodeURIComponent(
        characterName,
      )}/profiles`,
      {
        headers: {
          Authorization: `bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return empty;
    }

    // /profiles 응답은 중첩 없이 평평한(flat) 객체이고, CharacterImage/CombatPower를 바로 갖고 있다.
    const body = (await response.json()) as {
      CharacterImage?: unknown;
      CombatPower?: unknown;
    } | null;

    return {
      characterImage:
        typeof body?.CharacterImage === "string" &&
        body.CharacterImage.length > 0
          ? body.CharacterImage
          : null,
      combatPower:
        typeof body?.CombatPower === "string" && body.CombatPower.length > 0
          ? body.CombatPower
          : null,
    };
  } catch {
    return empty;
  }
}

Deno.serve(async (req: Request) => {
  // 브라우저가 실제 요청 전에 보내는 사전 확인(preflight) 요청 처리.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST 요청만 지원합니다." }, 405);
  }

  const apiKey = Deno.env.get("LOSTARK_API_KEY");

  if (!apiKey) {
    return jsonResponse(
      {
        error:
          "서버에 LOSTARK_API_KEY가 설정되어 있지 않습니다. " +
          "`supabase secrets set LOSTARK_API_KEY=...` 명령으로 등록한 뒤 다시 시도해주세요.",
      },
      500,
    );
  }

  let characterName: unknown;
  let characterNames: unknown;

  try {
    const body = await req.json();
    characterName = (body as { characterName?: unknown } | null)
      ?.characterName;
    characterNames = (body as { characterNames?: unknown } | null)
      ?.characterNames;
  } catch {
    return jsonResponse({ error: "요청 본문(JSON)이 올바르지 않습니다." }, 400);
  }

  // 모드 2: 체크된 캐릭터명 목록만 개별 갱신.
  if (Array.isArray(characterNames)) {
    const trimmedNames = characterNames
      .filter((name): name is string => typeof name === "string")
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (trimmedNames.length === 0) {
      return jsonResponse({ error: "characterNames가 필요합니다." }, 400);
    }

    const results = await Promise.all(
      trimmedNames.map((name) => fetchCharacterProfile(apiKey, name)),
    );

    const profiles: ProfileResult[] = [];
    const failures: ProfileFailure[] = [];

    for (const result of results) {
      if ("profile" in result) {
        profiles.push(result.profile);
      } else {
        failures.push(result.failure);
      }
    }

    return jsonResponse({ profiles, failures }, 200);
  }

  if (typeof characterName !== "string" || characterName.trim().length === 0) {
    return jsonResponse(
      { error: "characterName 또는 characterNames가 필요합니다." },
      400,
    );
  }

  let lostArkResponse: Response;

  try {
    lostArkResponse = await fetch(
      `${LOSTARK_API_BASE}/characters/${encodeURIComponent(
        characterName.trim(),
      )}/siblings`,
      {
        headers: {
          Authorization: `bearer ${apiKey}`,
          Accept: "application/json",
        },
      },
    );
  } catch (fetchError) {
    return jsonResponse(
      {
        error: `로스트아크 API 서버에 연결하지 못했습니다. (${String(fetchError)})`,
      },
      502,
    );
  }

  if (!lostArkResponse.ok) {
    const message =
      lostArkResponse.status === 404
        ? "해당 이름의 캐릭터를 로스트아크에서 찾을 수 없습니다."
        : lostArkResponse.status === 401 || lostArkResponse.status === 403
          ? "로스트아크 API 키가 유효하지 않거나 권한이 없습니다. LOSTARK_API_KEY를 확인해주세요."
          : `로스트아크 API 호출에 실패했습니다. (status: ${lostArkResponse.status})`;

    return jsonResponse({ error: message }, lostArkResponse.status);
  }

  const siblings = (await lostArkResponse.json()) as LostArkSibling[];

  // 캐릭터마다 프로필(이미지+전투력)을 병렬로 추가 조회한다. 개별 실패는
  // fetchCharacterProfileExtras 내부에서 null로 처리되므로 전체 응답은 항상 성공한다.
  const siblingsWithExtras = await Promise.all(
    siblings.map(async (sibling) => {
      const extras = await fetchCharacterProfileExtras(
        apiKey,
        sibling.CharacterName,
      );

      return {
        ...sibling,
        CharacterImage: extras.characterImage,
        CombatPower: extras.combatPower,
      };
    }),
  );

  return jsonResponse(siblingsWithExtras, 200);
});
