// profiles 테이블 한 행. supabase/migrations/20260706120100_profiles.sql과 대응된다.
// auth.users를 앱에서 다루기 쉽게 미러링한 테이블로, 구글 로그인 시 트리거가 자동으로
// 한 줄을 만들어준다. display_name은 초기값이 구글 프로필 이름이지만 이후 유저가
// 직접 바꿀 수 있다(본인 프로필만 수정 가능한 profiles_update RLS 정책).
export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
