/// <reference types="vite/client" />

// Vite는 `import.meta.env`로 환경변수를 노출하는데,
// 아래처럼 타입을 직접 선언해줘야 TypeScript가 자동완성/타입체크를 해준다.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
