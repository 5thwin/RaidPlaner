// 월간 달력 그리드를 계산하는 순수 함수 모음.
// 일요일 시작(한국 관례) 기준으로, 보이는 달의 앞뒤로 남는 칸을 이전/다음 달
// 날짜로 채워서 항상 완전한 주 단위(7의 배수)의 그리드를 만들어준다.

// 그리드에 표시할 날짜 칸 하나의 정보.
export interface CalendarGridDay {
  date: Date;
  // 지금 보고 있는 달(year, month)에 속하는 날짜인지. false면 앞/뒤 달의 날짜.
  isCurrentMonth: boolean;
  // 오늘 날짜인지.
  isToday: boolean;
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// year/month(0~11, Date의 월 인덱스와 동일)에 해당하는 달을 보여주는 완전한
// 주 단위 그리드를 계산한다. 보통 5~6주 x 7일 = 35~42칸이 된다.
export function getMonthGrid(year: number, month: number): CalendarGridDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0(일) ~ 6(토)
  const gridStart = new Date(year, month, 1 - startWeekday);

  const lastOfMonth = new Date(year, month + 1, 0);
  const endWeekday = lastOfMonth.getDay();
  const daysAfterLast = 6 - endWeekday;

  const totalCells = startWeekday + lastOfMonth.getDate() + daysAfterLast;
  const today = new Date();

  const days: CalendarGridDay[] = [];
  for (let i = 0; i < totalCells; i += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);

    days.push({
      date,
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDate(date, today),
    });
  }

  return days;
}

// 날짜를 "YYYY-MM-DD" 키로 바꾼다. 일정을 날짜별로 묶을 때, 그리드의 각 날짜
// 칸과 매칭시킬 때 둘 다 이 함수로 만든 키를 써야 시간대 문제 없이 맞아떨어진다.
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
