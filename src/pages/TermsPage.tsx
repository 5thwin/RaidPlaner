import { LegalPageSection as Section } from "@/components/layout/LegalPageSection";

// 이용약관 (/terms). 개인정보처리방침(PrivacyPolicyPage)과 마찬가지로 로그인 없이도
// 볼 수 있어야 하는 공개 페이지다.
const LAST_UPDATED = "2026-07-18";
const CONTACT_EMAIL = "hisy6887@gmail.com";

export function TermsPage() {
  return (
    <div className="flex w-full flex-col gap-8 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          이용약관
        </h1>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          최종 수정일 {LAST_UPDATED}
        </p>
      </div>

      <Section title="1. 목적">
        <p>
          이 약관은 로아팟(이하 &quot;서비스&quot;)의 이용 조건과 절차, 이용자와
          서비스 운영자의 권리·의무를 정하는 것을 목적으로 합니다.
        </p>
      </Section>

      <Section title="2. 서비스 소개">
        <p>
          로아팟은 로스트아크 공대/파티 편성을 돕기 위해 개인이 운영하는
          비영리 프로젝트입니다. 스마일게이트의 공식 서비스가 아니며, 로스트아크
          오픈 API를 통해 공개된 게임 정보를 조회해 보여줍니다.
        </p>
      </Section>

      <Section title="3. 이용 계약의 성립">
        <p>
          이용자가 구글 계정으로 로그인하면 이 약관에 동의한 것으로 봅니다.
          만 14세 미만은 이용할 수 없습니다.
        </p>
      </Section>

      <Section title="4. 서비스의 제공 및 변경·중단">
        <p>
          서비스는 무료로 제공되며, 운영자는 서비스의 전부 또는 일부를
          사전 고지 없이 변경하거나 중단할 수 있습니다. 서버 점검, 로스트아크
          오픈 API 장애 등으로 일시적으로 서비스 이용이 제한될 수 있습니다.
        </p>
      </Section>

      <Section title="5. 이용자의 의무">
        <ul className="list-disc pl-5">
          <li>본인 계정 및 로그인 정보를 안전하게 관리해야 합니다.</li>
          <li>
            타인의 로스트아크 캐릭터 정보를 도용하거나, 다른 이용자의 공대
            운영을 방해하는 행위를 해서는 안 됩니다.
          </li>
          <li>
            서비스의 정상적인 운영을 방해하는 행위(과도한 자동화 요청, 취약점
            악용 등)를 해서는 안 됩니다.
          </li>
        </ul>
      </Section>

      <Section title="6. 공대/파티 데이터의 관리">
        <p>
          공대 이름 변경, 공대원 관리, 공대 삭제 등 공대 관련 데이터는 해당
          공대의 공대장·운영진 권한으로 관리됩니다. 공대장이 공대를 삭제하면
          소속 공대원의 파티·일정 데이터도 함께 삭제되며 복구되지 않습니다.
        </p>
      </Section>

      <Section title="7. 면책조항">
        <ul className="list-disc pl-5">
          <li>
            서비스는 무료로 제공되며, 운영자는 서비스 이용과 관련해 발생한
            손해에 대해 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.
          </li>
          <li>
            캐릭터 정보(아이템 레벨, 전투력 등)는 로스트아크 오픈 API 응답을
            그대로 반영하므로, 실제 게임 정보와 일시적으로 다를 수 있습니다.
          </li>
          <li>
            &quot;로스트아크&quot; 관련 상표·게임 데이터의 권리는 스마일게이트에
            있으며, 로아팟은 이를 상업적으로 이용하지 않습니다.
          </li>
        </ul>
      </Section>

      <Section title="8. 약관의 변경">
        <p>
          이 약관이 변경되는 경우 변경 사항을 이 페이지에 게시하고, 변경된
          약관은 게시한 날부터 효력이 발생합니다.
        </p>
      </Section>

      <Section title="9. 문의">
        <p className="font-medium text-gray-900 dark:text-gray-100">
          문의처: {CONTACT_EMAIL}
        </p>
      </Section>
    </div>
  );
}
