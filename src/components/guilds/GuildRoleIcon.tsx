import type { SVGProps } from "react";
import type { GuildRole } from "@/types/guild";

// 공대장: 왕관 모양.
function MasterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 18h16" />
      <path d="m4 18-1.2-9 5.2 4 4-7 4 7 5.2-4-1.2 9" />
    </svg>
  );
}

// 운영진: 방패 모양.
function OfficerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3.5 5 6v5.5c0 4.5 3 8 7 9 4-1 7-4.5 7-9V6l-7-2.5Z" />
    </svg>
  );
}

// 파티원: 사람 하나(실선).
function MemberIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

// 게스트: 사람 하나(점선) — 아직 정식 소속이 아님을 나타낸다.
function GuestIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="3.5" strokeDasharray="2.2 2.2" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeDasharray="2.2 2.2" />
    </svg>
  );
}

const GUILD_ROLE_ICON: Record<
  GuildRole,
  (props: SVGProps<SVGSVGElement>) => React.JSX.Element
> = {
  master: MasterIcon,
  officer: OfficerIcon,
  member: MemberIcon,
  guest: GuestIcon,
};

interface GuildRoleIconProps extends SVGProps<SVGSVGElement> {
  role: GuildRole;
}

// 역할별로 다른 아이콘을 그려주는 컴포넌트. 멤버 목록에서 역할 뱃지 옆에 붙여 쓴다.
export function GuildRoleIcon({ role, ...props }: GuildRoleIconProps) {
  const Icon = GUILD_ROLE_ICON[role];
  return <Icon {...props} />;
}
