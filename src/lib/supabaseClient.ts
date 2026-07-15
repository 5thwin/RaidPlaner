import { createClient } from "@supabase/supabase-js";

// Supabase 프로젝트의 URL과 anon(공개) 키는 .env 파일에서 읽어온다.
// 실제 값은 커밋하지 않고, 각자 로컬 .env 파일에 넣어서 사용한다. (.env.example 참고)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 아직 .env에 실제 Supabase 값이 채워지지 않은 상태로 앱을 실행하면
  // 원인을 바로 알 수 있도록 콘솔에 눈에 띄는 에러를 남긴다.
  console.error(
    "[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. " +
      ".env 파일에 Supabase 프로젝트 URL과 anon key를 채워주세요. (.env.example 참고)",
  );
}

// 앱 전체에서 공유해서 쓸 Supabase 클라이언트 인스턴스.
// 이 인스턴스 하나로 DB 조회, 인증(Auth), 실시간(Realtime) 구독을 모두 처리한다.
export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
