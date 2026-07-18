import type { ReactNode } from "react";

// 개인정보처리방침/이용약관처럼 "제목 + 본문 문단·목록"이 반복되는 약관류 페이지에서
// 공통으로 쓰는 섹션 틀.
export function LegalPageSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
        {children}
      </div>
    </section>
  );
}
