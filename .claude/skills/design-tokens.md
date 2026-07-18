# 디자인 토큰 (UI 스타일 가이드)

이 프로젝트는 **라이트/다크 테마를 유저가 직접 선택**할 수 있어야 한다. 아래 모든 토큰은 라이트 기본값과 `dark:` 변형을 한 쌍으로 정의하니, 새 화면을 만들 때 반드시 두 값을 같이 적용한다 (한쪽만 넣지 않는다). 임의로 새 색상/톤을 추가하지 말고, 표현이 안 되면 이 문서부터 갱신한다.

**모바일 대응은 필수다** (2026-07-09부터). 새 화면/컴포넌트를 만들 때 좁은 화면에서도 요소가 겹치거나 넘치지 않는지 항상 고려하고, Tailwind 반응형 유틸리티(`sm:`/`md:` 등)로 분기한다. 특히 헤더/네비게이션처럼 항상 보이는 UI는 모바일에서 요소 수를 줄이는 방향(햄버거 메뉴 등)으로 설계한다.

## 다크 모드 적용 방식
Tailwind v4는 기본적으로 OS 설정(`prefers-color-scheme`)만 따라가므로, 유저가 직접 고를 수 있게 하려면 **클래스 기반 다크 모드**로 전환되어 있어야 한다 (`<html>`에 `.dark` 클래스가 있을 때만 `dark:` 유틸리티 적용). 테마 상태는 `ThemeContext`/`useTheme` 훅이 관리하고(localStorage에 저장, 없으면 시스템 설정을 초기값으로 사용), 토글 버튼으로 전환한다.

## 배경(surface) 계층
- 페이지 배경: `bg-gray-50 dark:bg-gray-900`
- 카드/패널 배경: `bg-white dark:bg-gray-800`
- 입력창 배경: `bg-white dark:bg-gray-900`
- 강조/호버 배경: `bg-gray-100 dark:bg-gray-700`, hover 시 `bg-gray-200 dark:bg-gray-600`

## 테두리
- 기본 테두리: `border-gray-200 dark:border-gray-700`
- 옅은 구분선: `border-gray-100 dark:border-gray-800`

## 텍스트 계층
- 제목/강조: `text-gray-900 dark:text-gray-100`
- 본문 강조: `text-gray-700 dark:text-gray-200`
- 기본 본문/설명: `text-gray-500 dark:text-gray-400`
- 부가 설명/placeholder/비활성: `text-gray-400 dark:text-gray-500`

## 강조 색상(accent)
- 기본 액션(버튼 등): `bg-blue-600 hover:bg-blue-700` (양쪽 테마 공통 — 채도 높은 색이라 흰 배경/어두운 배경 모두에서 잘 보임)
- 링크/강조 텍스트: `text-blue-600 dark:text-blue-400`
- 위험/에러 텍스트: `text-red-600 dark:text-red-400`
- 위험/에러 배경(경고 배지 등): `bg-red-50 dark:bg-red-900`
- 성공/긍정 배경: `bg-emerald-600` (공통), 성공 텍스트: `text-emerald-600 dark:text-emerald-400`
- 강조 배경(soft accent chip — 핵심 수치/활성 상태를 옅은 색 배경으로 강조할 때): `bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400`

## 난이도별 색상 (고정 팔레트, index 기반)
레이드 난이도 색상은 이름이 아니라 `difficulty_index` 순서로 고정 팔레트에 매핑한다. **이 로직과 색상값의 유일한 출처는 `src/lib/difficultyColor.ts`다** — 다른 곳에서 난이도 색을 새로 정의하지 말고 항상 `getDifficultyColorScheme()`을 가져다 쓴다. (순서: index 0 초록 → 1 파랑 → 2 빨강 → 3 보라 → 4 이후 주황, 반복) 세 가지 변형이 있다:
- `solid`(칠해진 배지: 색배경+흰 글자, 라이트/다크 공통)
- `outline`(테두리만 있는 비활성 탭: 라이트 `text-{color}-600`, 다크 `text-{color}-400`)
- `card`(파티 카드처럼 넓은 영역을 옅게 구분할 때: 라이트 `border-{color}-300 bg-{color}-50`, 다크 `border-{color}-700 bg-{color}-950/40`)

세 변형 모두 `difficultyColor.ts`에 라이트/다크 짝이 이미 반영되어 있다 (예: `card`는 `border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40`).

## 원정대별 색상 (고정 팔레트, 유저 선택)
난이도 색상과 별개로, 원정대(rosters)마다 유저가 직접 고르는 구분용 색상이 있다 — 파티 슬롯에 채워진 캐릭터가 어느 원정대 소속인지 한눈에 구분하기 위한 용도다. 자유 hex 입력이 아니라 고정 팔레트 중 하나를 골라 `rosters.color`(팔레트 키 문자열)에 저장한다. **이 로직과 색상값의 유일한 출처는 `src/lib/rosterColor.ts`다** — `getRosterColorPalette()`로 선택 UI용 전체 목록을, `getRosterColorScheme(colorKey)`로 키 하나의 스킴을 얻는다(알 수 없는 키는 기본값 `blue`로 폴백). 팔레트는 Tailwind 표준 유채색 17개를 색상환 순서로 전부 쓴다(red/orange/amber/yellow/lime/green/emerald/teal/cyan/sky/blue/indigo/violet/purple/fuchsia/pink/rose — 공대 하나에 원정대가 많아져도 색이 덜 겹치도록 2026-07-12에 10색에서 확장함), 두 가지 변형이 있다:
- `swatch`(원정대 관리 화면의 색상 선택 원형 버튼 배경: `bg-{color}-500`, 라이트/다크 공통)
- `bar`(파티 슬롯 카드 좌측 컬러 바: `border-l-{color}-500 dark:border-l-{color}-400`)

## 여백/간격
- 요소 사이 촘촘한 간격(같은 줄 아이콘+텍스트 등): `gap-2`
- 기본 가로 배치 간격: `gap-3`
- 섹션 사이: `gap-4` ~ `gap-6`
- 버튼/입력창 안쪽 여백: `px-3 py-2` (기본), 작은 버튼은 `px-3 py-1.5`, 큰 버튼/컨테이너는 `px-4`
- 페이지 상하 여백: `py-8`

## 모서리 둥글기
- 기본: `rounded-md`
- 아바타/원형 배지: `rounded-full`
- 모달 등 큰 컨테이너: `rounded-lg`

## 타이포그래피
- 페이지 제목(h1): `text-2xl font-bold text-gray-900 dark:text-gray-100`
- 기본 폰트 크기: `text-sm` (이 앱은 정보 밀도가 높은 대시보드형 UI라 `text-base`보다 작은 걸 기본으로 한다)
- 힌트/캡션: `text-xs`

## 컴포넌트 패턴
- **기본(primary) 버튼**: `rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50`
- **보조(secondary/neutral) 버튼**: `rounded-md bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600`
- **텍스트 입력**: `flex-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500`
- **에러 메시지**: `text-sm text-red-600 dark:text-red-400`
- **로딩/안내 문구**: `text-sm text-gray-500 dark:text-gray-400`
- **테마 토글 버튼**: 보조 버튼과 동일한 톤 사용, 아이콘/텍스트로 현재 상태 표시 (예: "🌙"/"☀️" 또는 "다크"/"라이트")

## 이 문서를 적용하는 방법
`developer`/`feature-planner` 에이전트는 이미 `.claude/skills/` 폴더의 모든 `.md` 파일을 매번 읽으므로, 별도 설정 없이 이 문서가 자동으로 적용된다. 새 컴포넌트를 스타일링할 때 위 값 중에서 라이트/다크 쌍을 **함께** 골라 쓰고, 여기 없는 조합이 필요하면 즉흥적으로 새 색/톤을 쓰지 말고 먼저 이 문서에 추가할지 판단한다.
