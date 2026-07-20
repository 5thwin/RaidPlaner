import { LegalPageSection as Section } from "@/components/layout/LegalPageSection";

// 개인정보처리방침 (/privacy). 구글 OAuth consent screen을 Production으로 전환하려면
// 공개적으로(로그인 없이) 접근 가능한 개인정보처리방침 URL이 필요해서 만들었다 —
// 이 페이지는 다른 페이지들과 달리 로그인 여부를 확인하지 않는다.
//
// 아래 내용은 실제로 이 앱(profiles/characters/rosters/guilds 등 테이블)이 다루는
// 데이터를 기준으로 작성했다. 스키마가 바뀌면(새 개인정보 항목 추가 등) 이 페이지도
// 같이 업데이트해야 한다.
const LAST_UPDATED = "2026-07-20";
const CONTACT_EMAIL = "hisy6887@gmail.com";

export function PrivacyPolicyPage() {
  return (
    <div className="flex w-full flex-col gap-8 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          개인정보처리방침
        </h1>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          최종 수정일 {LAST_UPDATED}
        </p>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300">
        로아팟(이하 &quot;서비스&quot;)은 로스트아크 공대/파티 편성을 관리하는
        개인 프로젝트입니다. 서비스 제공에 필요한 최소한의 정보만 수집하며,
        아래와 같이 처리합니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <p>구글 로그인 시 구글 계정으로부터 아래 정보를 전달받습니다.</p>
        <ul className="list-disc pl-5">
          <li>이름(표시 이름)</li>
          <li>이메일 주소</li>
          <li>프로필 사진</li>
        </ul>
        <p>서비스 이용 중 이용자가 직접 입력하는 정보도 저장됩니다.</p>
        <ul className="list-disc pl-5">
          <li>
            로스트아크 캐릭터명 — 입력한 캐릭터명으로 로스트아크 오픈 API를
            조회해 서버명, 직업, 아이템 레벨, 전투력 등 공개된 게임 정보를
            가져와 저장합니다.
          </li>
          <li>
            공대/파티 활동 기록 — 가입한 공대, 공대 내 역할, 파티 배정 내역,
            일정 참석 여부 등 서비스 이용 과정에서 생성되는 정보.
          </li>
        </ul>
      </Section>

      <Section title="2. 개인정보의 수집 및 이용 목적">
        <ul className="list-disc pl-5">
          <li>회원 식별 및 로그인 유지</li>
          <li>같은 공대원 간 캐릭터/파티 정보 공유</li>
          <li>파티 편성, 공대 일정 관리 기능 제공</li>
        </ul>
        <p>위 목적 외의 용도로는 이용하지 않습니다.</p>
      </Section>

      <Section title="3. 개인정보의 보유 및 이용 기간">
        <p>
          회원 탈퇴(계정 삭제) 시까지 보관하며, 탈퇴 시 지체 없이 파기합니다.
          현재 서비스 내 자체 탈퇴 기능은 준비 중이며, 계정 삭제를 원하시면
          아래 문의처로 요청해주시면 본인 확인 후 처리해드립니다.
        </p>
      </Section>

      <Section title="4. 개인정보의 제3자 제공 및 처리위탁">
        <p>
          로아팟은 광고·마케팅 등 서비스 제공과 무관한 목적으로 개인정보를
          제3자에게 제공하지 않습니다. 다만 서비스 운영을 위해 아래 업체에
          처리를 위탁하고 있습니다.
        </p>
        <ul className="list-disc pl-5">
          <li>Supabase, Inc. — 데이터베이스, 로그인 인증, 서버 운영</li>
          <li>Google LLC — 구글 소셜 로그인</li>
          <li>
            Vercel Inc. — 웹사이트 호스팅, 방문 통계(Vercel Analytics). 방문
            통계는 개인을 특정하지 않는 방문 수·페이지·유입 경로 등 집계
            데이터만 수집합니다(쿠키를 사용하지 않습니다).
          </li>
          <li>
            스마일게이트 로스트아크 오픈 API — 입력한 캐릭터명으로 공개된
            게임 정보 조회
          </li>
        </ul>
      </Section>

      <Section title="5. 이용자의 권리">
        <p>
          이용자는 언제든 본인의 개인정보 열람·정정·삭제를 요청할 수 있습니다.
          아래 문의처로 연락 주시면 신속히 처리하겠습니다.
        </p>
        <p className="font-medium text-gray-900 dark:text-gray-100">
          문의처: {CONTACT_EMAIL}
        </p>
      </Section>

      <Section title="6. 개인정보의 안전성 확보 조치">
        <ul className="list-disc pl-5">
          <li>
            Row Level Security(행 단위 접근 제어)로, 본인 및 같은 공대에
            소속된 이용자만 관련 정보에 접근할 수 있도록 제한합니다.
          </li>
          <li>모든 통신은 HTTPS로 암호화됩니다.</li>
        </ul>
      </Section>

      <Section title="7. 개인정보처리방침의 변경">
        <p>
          이 방침이 변경되는 경우 변경 사항을 이 페이지에 게시하고, 변경된
          방침은 게시한 날부터 효력이 발생합니다.
        </p>
      </Section>
    </div>
  );
}
