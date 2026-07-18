import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useMyGuilds } from "@/hooks/useMyGuilds";
import { useGuildMembers } from "@/hooks/useGuildMembers";
import { useGuildCharacters } from "@/hooks/useGuildCharacters";
import { usePageHeaderExtra } from "@/hooks/usePageHeaderExtra";
import { PageSpinner } from "@/components/layout/PageSpinner";
import { GuildMemberSelector } from "@/components/guilds/GuildMemberSelector";
import { getRosterColorScheme } from "@/lib/rosterColor";

// 매 렌더마다 새 JSX 객체를 만들지 않도록 컴포넌트 바깥에서 한 번만 만든다.
// usePageHeaderExtra는 넘겨받은 노드를 참조 동등성으로 비교하므로, 인라인으로 매번
// 새로 만들면 무한 리렌더 루프("Maximum update depth exceeded")로 이어진다.
const backToBoardLink = (
  <Link to="/" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
    파티 현황판으로
  </Link>
);

// 공대 "파티원" 화면(/guilds/:guildId/members).
// 왼쪽에서 공대원(role 무관, guest 포함 전부) 한 명을 고르면, 오른쪽에 그 사람의
// 캐릭터 전체(활성+비활성)를 보여주는 마스터-디테일 레이아웃이다. 활성 캐릭터를
// 원정대 연결 순서대로 먼저 보여주고, 비활성 캐릭터는 흐리게 표시해 그 아래에
// 이어서 보여준다 — 읽기 전용 화면이라 활성/비활성 토글이나 갱신 기능은 /roster에만 있다.
// 실시간 반영은 useGuildCharacters/useGuildMembers 내부의 Supabase Realtime 구독이 담당한다.
export function GuildPartyMembersPage() {
  const { guildId } = useParams<{ guildId: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { guilds, isLoading: isGuildsLoading } = useMyGuilds();
  const {
    members,
    isLoading: isMembersLoading,
    error: membersError,
  } = useGuildMembers(guildId);
  const {
    characters,
    isLoading: isCharactersLoading,
    error: charactersError,
  } = useGuildCharacters(guildId);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  usePageHeaderExtra(backToBoardLink);

  if (isAuthLoading || isGuildsLoading) {
    return <PageSpinner label="불러오는 중..." />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const guild = guilds.find((membership) => membership.guild_id === guildId);

  if (!guild) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        이 공대의 정보를 찾을 수 없습니다.
      </p>
    );
  }

  const isLoading = isMembersLoading || isCharactersLoading;
  const error = membersError ?? charactersError;

  // 명시적으로 고른 멤버가 아직 없거나(최초 진입) 더 이상 목록에 없으면(탈퇴 등),
  // 로그인한 본인이 이 공대 멤버면 본인을 기본 선택하고, 아니면 첫 번째 멤버를 고른다.
  const effectiveSelectedUserId =
    selectedUserId && members.some((member) => member.user_id === selectedUserId)
      ? selectedUserId
      : (members.find((member) => member.user_id === user.id) ?? members[0])
          ?.user_id ?? null;

  const ownerCharacters = effectiveSelectedUserId
    ? characters.filter(
        (character) => character.owner_id === effectiveSelectedUserId,
      )
    : [];

  // 여러 원정대를 가진 유저는 원정대를 연결한 순서(가장 먼저 연결한 게 A원정대)대로
  // 캐릭터를 묶어서 보여준다. roster_created_at이 가장 이른 원정대부터 0, 1, 2...
  const rosterCreatedAtById = new Map<string, string>();
  for (const character of ownerCharacters) {
    if (!rosterCreatedAtById.has(character.roster_id)) {
      rosterCreatedAtById.set(
        character.roster_id,
        character.roster_created_at ?? "",
      );
    }
  }

  const rosterOrder = new Map<string, number>(
    [...rosterCreatedAtById.entries()]
      .sort(([, createdAtA], [, createdAtB]) =>
        createdAtA.localeCompare(createdAtB),
      )
      .map(([rosterId], index) => [rosterId, index]),
  );

  // 활성 캐릭터를 전부 위로, 비활성 캐릭터를 전부 아래로 묶고, 각 묶음 안에서는
  // 원정대 연결 순서(A원정대 -> B원정대 ...)로, 그 안에서는 전투력이 높은 순으로 보여준다
  // (미확인 전투력은 가장 낮은 취급으로 뒤로 보낸다).
  const selectedCharacters = [...ownerCharacters].sort((a, b) => {
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1;
    }

    const rosterCompare =
      (rosterOrder.get(a.roster_id) ?? 0) - (rosterOrder.get(b.roster_id) ?? 0);
    if (rosterCompare !== 0) {
      return rosterCompare;
    }

    return (b.combat_power ?? -1) - (a.combat_power ?? -1);
  });

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {guild.guild_name} 파티원
      </h1>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {isLoading ? (
        <PageSpinner label="불러오는 중..." />
      ) : (
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start">
          <div className="w-full flex-none sm:w-56">
            <GuildMemberSelector
              members={members}
              selectedUserId={effectiveSelectedUserId}
              currentUserId={user.id}
              onSelect={setSelectedUserId}
            />
          </div>

          <div className="min-w-0 flex-1">
            {selectedCharacters.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                등록된 캐릭터가 없습니다.
              </p>
            ) : (
              <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {selectedCharacters.map((character) => {
                  const rosterColorScheme = getRosterColorScheme(
                    character.roster_color ?? "",
                  );

                  return (
                    <li
                      key={character.id}
                      className={`flex flex-col gap-1 rounded-lg border border-l-4 px-4 py-4 ${rosterColorScheme.bar} ${
                        character.is_active
                          ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                          : "border-gray-100 bg-gray-50 opacity-50 dark:border-gray-800 dark:bg-gray-900"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        <span className="truncate">{character.character_name}</span>
                        {!character.is_active && (
                          <span className="flex-none rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            비활성
                          </span>
                        )}
                      </span>
                      <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {character.character_class_name} · Lv.
                        {character.character_level}
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                        전투력{" "}
                        {character.combat_power !== null
                          ? character.combat_power.toLocaleString()
                          : "미확인"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
