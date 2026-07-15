// 새로고침 시 이전에 불러온 데이터를 먼저 그대로 보여주고(로딩 스피너 없이)
// 백그라운드에서 조용히 재조회해 최신 값으로 갈아끼우기 위한 sessionStorage 캐시.
// sessionStorage는 탭을 닫으면 사라지므로, "새로고침 순간의 깜빡임"만 없애줄 뿐
// 다른 브라우저 세션/기기 간에 낡은 데이터가 새는 일은 없다.
export function readSessionCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 프라이빗 브라우징 등 sessionStorage를 못 쓰는 환경이면 캐싱을 조용히 건너뛴다.
  }
}
