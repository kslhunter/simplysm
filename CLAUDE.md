# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 작업 흐름 규칙

- **스킬(Skill) 완료 후 자동 진행 금지**: 사용자가 명시적으로 스킬을 호출한 경우, 스킬 실행이 완료되면 반드시 결과를 사용자에게 보고하고 **멈출 것**. 스킬 결과를 바탕으로 다음 단계를 추측하여 임의로 진행하지 않는다. 추가 작업이 필요한 경우 사용자의 명시적 지시를 기다린다.

## 프로젝트 개요

**중요**: 모든 응답과 설명은 반드시 **한국어**로 작성해야 합니다. (.claude폴더내 md파일및 각 패키지의 README.md 파일은 영문 작성)
- 기술 용어, 코드 식별자(변수명, 함수명 등), 라이브러리 이름은 원문 그대로 유지
- 영어로 된 에러 메시지나 로그는 원문을 보여주되, 설명은 한국어로 제공

Simplysm은 TypeScript 기반의 풀스택 프레임워크 모노레포이다. pnpm 워크스페이스로 관리되며, SolidJS UI, ORM, 서비스 통신, Excel 처리 등의 패키지를 제공한다.

### 설계 철학

- **표준 패턴 우선**: TypeScript/JavaScript/SolidJS의 표준 패턴과 관용적인 코드 스타일을 최대한 활용하여 러닝커브를 낮춘다. 독자적인 패턴보다 익숙한 패턴을 선호한다.
- **명시적이고 예측 가능한 코드**: 암묵적인 동작보다 명시적인 코드를 선호하여 코드의 의도를 쉽게 파악할 수 있게 한다.
- **점진적 학습**: 각 패키지가 독립적으로 사용 가능하여 필요한 부분만 학습하고 적용할 수 있다.

## 주요 명령어

```bash
# 의존성 설치
pnpm install

# ESLint 린트 (전체 또는 특정 경로)
pnpm lint
pnpm lint packages/core-common
pnpm lint --fix              # 자동 수정

# TypeScript 타입체크
pnpm typecheck
pnpm typecheck packages/core-common

# 빌드 (프로덕션)
pnpm build
pnpm build solid              # 특정 패키지만 빌드

# Watch 모드 (라이브러리 빌드 + .d.ts 생성, 변경 감지)
pnpm watch
pnpm watch solid              # 특정 패키지만 watch

# Dev 모드 (client: Vite dev server, server: 빌드)
pnpm dev                      # solid-demo: 주소 출력됨 포트가 달라질 수 있음

# NPM 배포
pnpm pub                  # 빌드 후 배포
pnpm pub:no-build         # 빌드 없이 배포

# 테스트 (Vitest)
pnpm vitest                     # 모든 프로젝트
pnpm vitest --project=node      # Node 환경 테스트만
pnpm vitest --project=browser   # 브라우저 환경 테스트만
pnpm vitest --project=solid     # SolidJS 컴포넌트 테스트
pnpm vitest --project=orm       # ORM 통합 테스트 (Docker DB 필요)
pnpm vitest --project=service   # Service 통합 테스트
pnpm vitest packages/core-common      # 패키지 테스트
pnpm vitest packages/core-common/tests/DateTime.spec.ts --project=node  # 단일 파일
pnpm vitest -t "DateTime" --project=node   # 테스트 이름으로 필터링
```

## 패키지 구조

### 라이브러리 패키지 (`packages/`)
| 패키지 | 타겟 | 설명                                    |
|--------|------|---------------------------------------|
| `core-common` | neutral | 공통 유틸리티, 타입, 에러 클래스                   |
| `core-browser` | browser | 브라우저 전용 확장                            |
| `core-node` | node | Node.js 유틸리티 (파일시스템, 워커)              |
| `cli` | node | 빌드/린트/타입체크 CLI 도구                     |
| `eslint-plugin` | node | ESLint 커스텀 규칙                         |
| `orm-common` | neutral | ORM 쿼리 빌더, 스키마 정의                     |
| `orm-node` | node | DB 커넥션 (MySQL, MSSQL, PostgreSQL)     |
| `service-common` | neutral | 서비스 프로토콜, 타입 정의                       |
| `service-client` | neutral | WebSocket 클라이언트                       |
| `service-server` | node | Fastify 기반 HTTP/WebSocket 서버          |
| `solid` | browser | SolidJS UI 컴포넌트                       |
| `solid-demo` | client | SolidJS 데모 앱 (http://localhost:40081) |
| `excel` | neutral | Excel(.xlsx) 읽기/쓰기                    |
| `storage` | node | FTP/SFTP 클라이언트                        |

### 통합 테스트 (`tests/`)
- `tests/orm/`: ORM 통합 테스트 (Docker DB 필요, `orm-node` 패키지 자체에는 단위 테스트 없음)
- `tests/service/`: 서비스 통합 테스트 (브라우저 테스트)

### 커스텀 타입 (`core-common`)
`@simplysm/core-common`에서 제공하는 불변 타입:
- `DateTime`, `DateOnly`, `Time`: 날짜/시간 처리
- `Uuid`: UUID v4
- `LazyGcMap`: LRU 캐시 (자동 만료)

### 디렉토리 참조
- `.cache/`: (더 이상 사용되지 않음. 기존 파일이 남아있을 수 있으나 CLI가 읽거나 쓰지 않음)
- `.playwright-mcp/`: Playwright MCP 도구의 스크린샷 등 출력 디렉토리
  - 스크린샷/스냅샷 저장 시 반드시 `.playwright-mcp/` 디렉토리에 저장할 것

## 아키텍처

### 의존성 계층
```
core-common (최하위, 공통 유틸리티)
    ↑
core-browser / core-node (환경별 확장)
    ↑
orm-common / service-common (도메인별 공통)
    ↑
orm-node / service-server / service-client (구현체)
    ↑
solid (UI 컴포넌트)
```

### 빌드 타겟 (sd.config.ts)
- `node`: Node.js 전용 (DOM 제외, `@types/node` 포함)
- `browser`: 브라우저 전용 (DOM 포함, `@types/node` 제외)
- `neutral`: Node/브라우저 공용
- `client`: Vite dev server로 개발

### 주요 패턴

**ORM 테이블 정의:**
```typescript
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
  }))
  .primaryKey("id");
```

**서비스 아키텍처:**
- `ServiceServer`: Fastify 기반 HTTP/WebSocket 서버
- `ServiceClient`: WebSocket 클라이언트, RPC 호출
- `ServiceProtocol`: 메시지 분할/병합 (3MB 초과 시 300KB 청크)

## ORM 보안 가이드

### SQL 인젝션 방지

orm-common은 문자열 이스케이프 방식으로 SQL을 생성합니다.
다음 규칙을 준수하세요:

#### ✓ 안전한 사용
- 애플리케이션 코드에서 값 검증 후 ORM 사용
- 타입이 보장된 값 (number, boolean, DateTime 등)
- 신뢰할 수 있는 내부 데이터

#### ✗ 위험한 사용
- 사용자 입력을 검증 없이 WHERE 조건에 직접 사용
- 외부 API 응답을 검증 없이 사용
- 파일 업로드 내용을 검증 없이 사용

#### 권장 패턴
```typescript
// 나쁜 예: 사용자 입력 직접 사용
const userInput = req.query.name; // "'; DROP TABLE users; --"
await db.user().where((u) => [expr.eq(u.name, userInput)]).result();

// 좋은 예: 검증 후 사용
const userName = validateUserName(req.query.name); // 검증 실패 시 예외
await db.user().where((u) => [expr.eq(u.name, userName)]).result();

// 더 좋은 예: 타입 강제
const userId = Number(req.query.id); // NaN 체크 필수
if (Number.isNaN(userId)) throw new Error("Invalid ID");
await db.user().where((u) => [expr.eq(u.id, userId)]).result();
```

#### 기술적 제약

orm-common은 동적 쿼리 특성상 파라미터 바인딩을 사용하지 않습니다.
대신 강화된 문자열 이스케이프를 사용합니다:
- MySQL: 백슬래시, 따옴표, NULL 바이트, 제어 문자 이스케이프
- utf8mb4 charset 강제로 멀티바이트 공격 방어
- **애플리케이션 레벨 입력 검증 필수**

## 코드 컨벤션

### ESLint 규칙 (`@simplysm/eslint-plugin`)
- ECMAScript private 필드(`#field`) 금지 → TypeScript `private` 사용
- `@simplysm/*/src/` 경로 import 금지 (*.ts, *.tsx 파일만 해당)
  → import 추가 전: 해당 패키지의 `index.ts`를 Read하여 export 확인
- `no-console`, `eqeqeq`, `no-shadow` 적용
- Node.js 내장 `Buffer` → `Uint8Array` 사용
  - 단, 외부 라이브러리가 `Buffer`를 요구하는 경우 `eslint-disable` 주석으로 예외 처리
  - 패턴: `// eslint-disable-next-line no-restricted-globals -- {라이브러리}가 Buffer를 요구함`
- async 함수에 await 필수

### 함수 명명 규칙
- 함수명 끝에 `Async` 접미사 사용 금지 → 비동기 함수가 기본
- 동기/비동기 버전이 모두 존재할 때는 동기 함수에 `Sync` 접미사 사용
  ```typescript
  // 좋은 예
  async function readFile() { ... }      // 비동기 (기본)
  function readFileSync() { ... }        // 동기 버전

  // 나쁜 예
  async function readFileAsync() { ... } // Async 접미사 금지
  ```

### TypeScript 설정
- `strict: true`, `verbatimModuleSyntax: true`
- 경로 별칭: `@simplysm/*` → `packages/*/src/index.ts`
- JSX: SolidJS (`jsxImportSource: "solid-js"`)

### 프로토타입 확장
`core-common`을 import하면 Array, Map, Set에 확장 메서드가 추가됨:
- `Array`: `single()`, `filterExists()`, `groupBy()`, `orderBy()` 등
- `Map`: `getOrCreate()`, `update()`
- `Set`: `adds()`, `toggle()`

→ 확장 메서드 사용 전: `core-common/src/extensions/` 소스에서 실제 존재 여부 확인. 존재하지 않는 메서드를 추측하여 사용하지 말 것

### SolidJS 규칙

**SolidJS와 React는 다르다! React에 대한 지식으로 SolidJS를 추측하지 말라**
- **컴포넌트 함수는 마운트 시 한 번만 실행됨** (React는 상태 변경마다 재실행)
- **Fine-grained Reactivity**: 시그널이 변경되지 않으면 해당 expression 자체가 다시 평가되지 않음
- **`createMemo`**: 비용이 비싼 계산을 여러 곳에서 사용할 때 필요
  - 시그널 변경 시 같은 함수를 3곳에서 호출하면 3번 실행됨, `createMemo`는 1번 계산 + 캐시 반환
  - 단순 조건 분기나 가벼운 연산은 일반 함수 `() => count() * 2`로도 충분
- **Props 구조 분해 금지** → `{ label }` 대신 `props.label`로 접근 (반응성 유지)
- **조건부: `<Show when={...}>`**, 리스트: **`<For each={...}>`** 사용
- **Compound Components 패턴**: 복합 컴포넌트는 부모-자식 관계를 명시적으로 표현
- **SSR 미지원**: `window`, `document` 등 브라우저 API 직접 사용 가능
- 반응형: 520px 미만에서 모바일 UI
- Chrome 84+ 타겟
  - TypeScript는 esbuild로 트랜스파일됨 → `?.`, `??` 등 최신 JS 문법 사용 가능
  - CSS는 트랜스파일 안됨 → Chrome 84 미지원 CSS 기능 사용 금지
    - 사용 가능: Flexbox gap
    - 사용 금지: `aspect-ratio`, `inset`, `:is()`, `:where()` (Chrome 88+)

**Hook 네이밍 컨벤션:**
- `create*`: SolidJS primitive를 래핑/조합하는 반응형 Hook (`createControllableSignal`, `createMountTransition`, `createTrackedWidth`)
- `use*`: Provider Context에 의존하는 Hook (`useConfig`, `usePersisted`, `useTheme`)
- 일반 유틸리티 함수는 Hook prefix 없이 명명

**컴파운드 컴포넌트 네이밍 규칙:**

모든 서브 컴포넌트는 dot notation(`Parent.Child`)으로만 접근한다.

- 부모 컴포넌트에 `interface ParentComponent { Child: typeof ChildComponent }` 인터페이스 정의
- `Parent.Child = ChildComponent;` 할당
- `index.ts`에서 서브 컴포넌트의 별도 export 금지 (부모만 export)
- 사용 시 부모만 import: `import { Select } from "@simplysm/solid"`
- 예시: `Select.Item`, `Select.Action`, `List.Item`, `DataSheet.Column`, `Sidebar.Container`, `Topbar.Menu`, `Tabs.Tab`

→ 컴포넌트 수정 전: 반드시 해당 파일을 Read하여 기존 props/패턴 확인

**구현 단순화 규칙:**
- Provider/Context 패턴보다 단순 시그널/스토어를 우선 사용
- 불필요한 추상화 계층 도입 금지 — 기존 코드베이스의 동일 패턴을 먼저 확인

### 데모 페이지 규칙
- raw HTML 요소(`<button>`, `<input>`, `<select>`, `<textarea>`) 직접 사용 금지 → `@simplysm/solid` 라이브러리 컴포넌트 사용
- 과도한 커스텀 인라인 스타일 금지
- 새 데모 페이지 작성 전 기존 데모 파일의 패턴을 Read하여 확인

### Tailwind CSS

**설정 (`packages/solid/tailwind.config.ts`):**
- `darkMode: "class"` → `<html class="dark">`로 다크 모드 전환
- Chrome 84 미지원으로 `aspectRatio` 플러그인 비활성화
- 크기 단위는 `rem` 기본. 단, 주변 텍스트 크기에 비례해야 하는 경우(예: Icon)는 `em` 사용

**커스텀 테마:**
```typescript
// 시맨틱 색상 (Tailwind colors 기반)
colors: {
  primary: colors.blue,
  info: colors.sky,
  success: colors.green,
  warning: colors.amber,
  danger: colors.red,
  base: colors.zinc,       // 중립 회색 (배경, 테두리, 보조 텍스트 등)
}
// → zinc-* 직접 사용 금지 → base-* 사용

// 폼 필드 높이
height/size: {
  field: "...",      // 기본 (py-1 기준)
  "field-sm": "...", // 작은 (py-0.5 기준)
  "field-lg": "...", // 큰 (py-2 기준)
}

// z-index 계층
zIndex: {
  sidebar: "100",
  "sidebar-backdrop": "99",
  dropdown: "1000",
}
```

**스타일 작성 패턴:**
```typescript
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

// 기본 클래스와 조건부 클래스 조합
const baseClass = clsx("inline-flex items-center", "px-2 py-1");

// 테마/변형별 클래스 객체로 정의
const themeClasses = {
  primary: {
    solid: clsx("bg-primary-500", "hover:bg-primary-600", "dark:hover:bg-primary-400"),
    outline: clsx("bg-transparent", "border border-primary-300"),
  },
};

// twMerge로 클래스 충돌 해결
const className = twMerge(baseClass, themeClasses.primary.solid, props.class);
```

**`clsx` 템플릿 필수 사용 규칙:**
- 여러 Tailwind 클래스를 나열할 때 반드시 `clsx()`로 묶어야 한다
- 의미 단위(레이아웃, 색상, 간격, dark 모드 등)별로 문자열을 분리하여 가독성을 높인다
```typescript
// 좋은 예: clsx로 의미 단위별 분리
const cls = clsx(
  "bg-primary-100 text-primary-900",
  "dark:bg-primary-900/40 dark:text-primary-100",
);

// 나쁜 예: 긴 클래스를 하나의 문자열에 모두 나열
const cls = "bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100";
```

**앱에서 preset으로 사용:**
```typescript
// solid-demo/tailwind.config.ts
import simplysmPreset from "@simplysm/solid/tailwind.config";

export default {
  darkMode: "class",
  presets: [simplysmPreset],
  content: [..., ...simplysmPreset.content],
};
```

→ 스타일 수정 전: 같은 컴포넌트의 기존 클래스 패턴을 Read하여 확인

## 테스트 환경 (vitest.config.ts)

| 프로젝트 | 환경 | 패턴 |
|---------|------|------|
| node | Node.js | `packages/*/tests/**/*.spec.ts` (node 패키지) |
| browser | Playwright | `packages/*/tests/**/*.spec.ts` (browser 패키지) |
| solid | Playwright + vite-plugin-solid | `packages/solid/tests/**/*.spec.tsx` |
| orm | Node.js + Docker | `tests/orm/**/*.spec.ts` |
| service | Playwright | `tests/service/**/*.spec.ts` |

## 코드 작성 전 필수 확인

- 새 파일 생성 전: 유사한 기존 파일을 Glob/Read하여 구조와 패턴 확인
- 함수/클래스 수정 전: 해당 파일을 Read하여 기존 코드 스타일 파악
- API/메서드 사용 시 확신이 없으면: 소스코드에서 시그니처 확인
- CLI 명령어 실행 전: 이 문서의 "주요 명령어" 섹션 참조 (임의의 플래그 사용 금지)
- **확신도가 낮으면 코드를 작성하지 말고 사용자에게 질문할 것**

### 검증 절차
1. 코드 작성 후 `pnpm typecheck` 또는 `pnpm lint`로 검증
2. 새로운 패턴 도입 시 기존 코드베이스에서 유사 사례 검색
3. 테스트 코드 작성 시 `vitest.config.ts`의 프로젝트 구성 확인
