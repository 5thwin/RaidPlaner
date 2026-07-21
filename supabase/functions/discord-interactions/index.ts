// =========================================================
// Edge Function: discord-interactions
// =========================================================
// 디스코드 슬래시 명령어("/파티현황", "/연동") 웹훅 엔드포인트.
//
// 디스코드는 이 함수를 Supabase JWT 없이 직접 호출하므로(자체 ed25519 서명으로
// 인증), 이 함수는 config.toml에서 verify_jwt = false로 설정돼 있어야 한다.
// 대신 모든 요청은 X-Signature-Ed25519/X-Signature-Timestamp 헤더를 반드시
// 검증한다 — 이게 유일한 인증 수단이라 검증을 통과 못 하면 무조건 401이다.
//
// 명령어:
// - "/파티현황 미완료|전체|내캐릭터": 이 요청이 온 디스코드 서버(interaction.guild_id)를
//   guilds.discord_guild_id로 찾아 그 공대의 파티 현황을 보여준다. "내캐릭터"는
//   추가로 요청한 디스코드 유저(interaction.member.user.id)를 discord_links에서
//   찾아 로아팟 계정으로 변환한다.
// - "/연동 코드:XXXXXX": 로아팟 프로필 화면에서 발급한 1회성 코드로 디스코드 계정을
//   로아팟 계정에 연결한다.
//
// DB 접근은 SUPABASE_SERVICE_ROLE_KEY로 하므로 RLS를 전부 우회한다 — 그래서
// 이 함수 자체가 "누가 어느 공대에 물어볼 권한이 있는지"를 스스로 검증해야
// 하는데, 지금은 "그 디스코드 서버가 그 공대에 연동돼 있으면 그 서버의 아무나
// 조회 가능"으로 단순화했다(공대 자체가 이미 디스코드 서버 멤버에게만 보이는
// 채널에서 명령어를 치는 상황을 전제).
//
// 설정/배포:
//   1) supabase secrets set DISCORD_PUBLIC_KEY=디스코드_개발자_포탈에서_발급받은_공개키
//   2) supabase functions deploy discord-interactions
//   3) 디스코드 개발자 포탈의 "Interactions Endpoint URL"에
//      https://<project-ref>.supabase.co/functions/v1/discord-interactions 등록
//   (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY는 Edge Function 런타임이 자동으로 주입한다.)

import nacl from "npm:tweetnacl@1.0.3";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const EMBED_COLOR = 0x2563eb; // 앱 강조색(blue-600)과 맞춤.

// ---------------------------------------------------------
// 디스코드 요청 서명 검증
// ---------------------------------------------------------
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function verifyDiscordSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
  publicKey: string,
): boolean {
  try {
    return nacl.sign.detached.verify(
      new TextEncoder().encode(timestamp + rawBody),
      hexToUint8Array(signature),
      hexToUint8Array(publicKey),
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------
// 디스코드 인터랙션/응답 타입 (필요한 필드만)
// ---------------------------------------------------------
interface DiscordOption {
  name: string;
  type: number;
  value?: string;
  options?: DiscordOption[];
}

interface DiscordInteraction {
  type: number;
  guild_id?: string;
  member?: { user?: { id: string } };
  user?: { id: string };
  data?: {
    name: string;
    options?: DiscordOption[];
  };
}

function ephemeralReply(content: string) {
  return { type: 4, data: { content, flags: 64 } };
}

// ---------------------------------------------------------
// 파티 조회
// ---------------------------------------------------------
interface PartySlotRow {
  slot_index: number;
  characters: { character_name: string } | null;
}

interface PartyRow {
  id: string;
  difficulty_index: number;
  difficulty_name: string;
  is_cleared: boolean;
  raid_types: { name: string } | null;
  party_slots: PartySlotRow[];
}

async function getGuildForDiscordServer(
  supabase: SupabaseClient,
  discordGuildId: string,
): Promise<{ id: string; name: string } | null> {
  const { data } = await supabase
    .from("guilds")
    .select("id, name")
    .eq("discord_guild_id", discordGuildId)
    .maybeSingle();

  return data;
}

async function getLinkedUserId(
  supabase: SupabaseClient,
  discordUserId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("discord_links")
    .select("user_id")
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  return data?.user_id ?? null;
}

async function fetchParties(
  supabase: SupabaseClient,
  guildId: string,
  onlyIncomplete: boolean,
): Promise<PartyRow[]> {
  let query = supabase
    .from("parties")
    .select(
      "id, difficulty_index, difficulty_name, is_cleared, raid_types(name), party_slots(slot_index, characters(character_name))",
    )
    .eq("guild_id", guildId);

  if (onlyIncomplete) {
    query = query.eq("is_cleared", false);
  }

  const { data } = await query.returns<PartyRow[]>();
  return data ?? [];
}

async function fetchPartiesForCharacterOwner(
  supabase: SupabaseClient,
  guildId: string,
  userId: string,
): Promise<PartyRow[]> {
  const { data: characters } = await supabase
    .from("characters")
    .select("id")
    .eq("owner_id", userId)
    .returns<{ id: string }[]>();

  const characterIds = (characters ?? []).map((c) => c.id);
  if (characterIds.length === 0) {
    return [];
  }

  const { data } = await supabase
    .from("party_slots")
    .select(
      "parties!inner(id, guild_id, difficulty_index, difficulty_name, is_cleared, raid_types(name), party_slots(slot_index, characters(character_name)))",
    )
    .in("character_id", characterIds)
    .eq("parties.guild_id", guildId)
    .returns<{ parties: PartyRow }[]>();

  // 같은 파티에 내 캐릭터가 여러 개 배정돼 있을 리는 없지만(정합성 규칙으로
  // 막혀 있음), 혹시 몰라 party id 기준으로 중복 제거한다.
  const byId = new Map<string, PartyRow>();
  for (const row of data ?? []) {
    byId.set(row.parties.id, row.parties);
  }
  return [...byId.values()];
}

function formatParty(party: PartyRow, index: number): string {
  const slots = [...party.party_slots].sort(
    (a, b) => a.slot_index - b.slot_index,
  );
  const filled = slots.filter((s) => s.characters).length;
  const status = party.is_cleared ? "✅ 클리어" : "⬜ 미완료";
  const members = slots
    .map((s) => s.characters?.character_name ?? "빈 자리")
    .join(", ");

  return `**파티 ${index + 1}** (${filled}/${slots.length}) ${status}\n${members}`;
}

function buildPartyEmbed(title: string, parties: PartyRow[]) {
  if (parties.length === 0) {
    return {
      type: 4,
      data: {
        embeds: [
          {
            title,
            description: "조건에 맞는 파티가 없습니다.",
            color: EMBED_COLOR,
          },
        ],
      },
    };
  }

  const groups = new Map<string, PartyRow[]>();
  for (const party of parties) {
    const key = `${party.raid_types?.name ?? "알 수 없는 레이드"} · ${party.difficulty_name}`;
    const group = groups.get(key);
    if (group) {
      group.push(party);
    } else {
      groups.set(key, [party]);
    }
  }

  const fields = [...groups.entries()]
    .slice(0, 25) // 디스코드 임베드는 필드 25개까지만 허용한다.
    .map(([name, groupParties]) => ({
      name,
      value: groupParties
        .map((p, i) => formatParty(p, i))
        .join("\n\n")
        .slice(0, 1000), // 필드 value는 1024자 제한이라 여유를 두고 자른다.
    }));

  return {
    type: 4,
    data: {
      embeds: [{ title, color: EMBED_COLOR, fields }],
    },
  };
}

// ---------------------------------------------------------
// 명령어 핸들러
// ---------------------------------------------------------
async function handlePartyStatusCommand(
  supabase: SupabaseClient,
  interaction: DiscordInteraction,
) {
  const discordGuildId = interaction.guild_id;
  if (!discordGuildId) {
    return ephemeralReply("이 명령어는 디스코드 서버 안에서만 사용할 수 있습니다.");
  }

  const guild = await getGuildForDiscordServer(supabase, discordGuildId);
  if (!guild) {
    return ephemeralReply(
      "이 디스코드 서버는 아직 로아팟 공대와 연동되지 않았습니다. 공대장이 로아팟 공대 상세 페이지에서 먼저 연동해주세요.",
    );
  }

  const subcommand = interaction.data?.options?.[0]?.name;

  if (subcommand === "내캐릭터") {
    const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;
    const userId = discordUserId
      ? await getLinkedUserId(supabase, discordUserId)
      : null;

    if (!userId) {
      return ephemeralReply(
        "먼저 계정을 연동해주세요. 로아팟 프로필 화면에서 연동 코드를 발급받아 `/연동 코드:XXXXXX`로 연동할 수 있습니다.",
      );
    }

    const parties = await fetchPartiesForCharacterOwner(
      supabase,
      guild.id,
      userId,
    );
    return buildPartyEmbed(`${guild.name} · 내 캐릭터가 속한 파티`, parties);
  }

  const onlyIncomplete = subcommand === "미완료";
  const parties = await fetchParties(supabase, guild.id, onlyIncomplete);
  return buildPartyEmbed(
    `${guild.name} · ${onlyIncomplete ? "미완료 파티" : "전체 파티"}`,
    parties,
  );
}

async function handleLinkCommand(
  supabase: SupabaseClient,
  interaction: DiscordInteraction,
) {
  const discordUserId = interaction.member?.user?.id ?? interaction.user?.id;
  const rawCode = interaction.data?.options?.find((o) => o.name === "코드")
    ?.value;

  if (!discordUserId || typeof rawCode !== "string") {
    return ephemeralReply("잘못된 요청입니다.");
  }

  const code = rawCode.trim().toUpperCase();

  const { data: codeRow } = await supabase
    .from("discord_link_codes")
    .select("user_id, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!codeRow || new Date(codeRow.expires_at).getTime() < Date.now()) {
    return ephemeralReply(
      "코드가 유효하지 않거나 만료되었습니다. 로아팟 프로필 화면에서 새 코드를 발급받아주세요.",
    );
  }

  const { error: upsertError } = await supabase
    .from("discord_links")
    .upsert(
      { discord_user_id: discordUserId, user_id: codeRow.user_id },
      { onConflict: "discord_user_id" },
    );

  if (upsertError) {
    return ephemeralReply(`연동에 실패했습니다: ${upsertError.message}`);
  }

  await supabase.from("discord_link_codes").delete().eq("code", code);

  return ephemeralReply(
    "연동이 완료되었습니다! 이제 `/파티현황 내캐릭터`를 사용할 수 있어요.",
  );
}

// ---------------------------------------------------------
// 엔트리포인트
// ---------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }

  const signature = req.headers.get("X-Signature-Ed25519");
  const timestamp = req.headers.get("X-Signature-Timestamp");
  const rawBody = await req.text();
  const publicKey = Deno.env.get("DISCORD_PUBLIC_KEY");

  if (
    !publicKey ||
    !signature ||
    !timestamp ||
    !verifyDiscordSignature(rawBody, signature, timestamp, publicKey)
  ) {
    return new Response("invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as DiscordInteraction;

  // 디스코드가 엔드포인트 등록 시 보내는 헬스체크. 반드시 PONG(type 1)으로 응답해야
  // "Interactions Endpoint URL" 저장이 통과된다.
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (interaction.type === 2 && interaction.data) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const commandName = interaction.data.name;
    const result =
      commandName === "파티현황"
        ? await handlePartyStatusCommand(supabase, interaction)
        : commandName === "연동"
          ? await handleLinkCommand(supabase, interaction)
          : ephemeralReply("알 수 없는 명령어입니다.");

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify(ephemeralReply("지원하지 않는 요청입니다.")),
    { headers: { "Content-Type": "application/json" } },
  );
});
