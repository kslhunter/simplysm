# 테스트 작성

`@simplysm/*` v14 모노레포의 패키지 테스트(`packages/<pkg>/tests/`)와 통합 테스트(`tests/<name>/`) 작성 시 따름. Vitest project 구성·실행 명령은 루트 `CLAUDE.md` 의 "Vitest 프로젝트 구조" 참조 — 여기서는 작성 규약만 다룸.

## 파일 규약

- 위치.
  - 패키지: `packages/<pkg>/tests/**/*.spec.ts`.
  - 통합: `tests/<name>/src/**/*.spec.ts`.
- 확장자.
  - `*.spec.ts` — vitest 실행 대상.
  - `*.acc.spec.ts` — Acceptance 단위 spec. 동일 project 에서 함께 실행.
  - `*.verify.md` — LLM 수동 검증 항목. vitest 실행 대상 아님. 자동화로 잡기 어려운 검증(JSDoc 표현·문서 일관성 등)에만.
- import 경로: 워크스페이스 패키지는 `@simplysm/<pkg>`. 검증 목적상 내부 구현이 필요하면 상대 경로(`../src/...`).
- 환경 변수: `vitest.config.ts` 진입 시 `process.env.DEV=true`/`VER=1.0.0-test` 및 동일 값의 `import.meta.env.*` define 자동 주입. 스펙에서 별도 설정 불필요.

## Vitest project 매핑 (패키지 추가 시)

`vitest.config.ts` 의 `include`/`exclude` 가 어느 project 에서 도는지 결정. 새 패키지 추가 시:

- **Node 전용**: 기본 `node` project 가 자동 include — 추가 작업 없음.
- **브라우저 환경 필요** (DOM·`window`·Worker 등 사용): `node` project 의 `exclude` 에 해당 패키지 경로 추가. `browser` project 가 자동 include 함.
- **Angular**: `packages/angular` 전용 project (TestBed + AOT plugin + setupFile) — 다른 패키지에서 따라하지 말 것.

## 통합 테스트 project 추가 절차

`tests/<name>/` 디렉토리 1개 = vitest project 1개. 추가 시:

1. `tests/<name>/package.json` — `name: "@simplysm-test/<name>"`, `"private": true`, `"type": "module"`. 필요한 `@simplysm/*` 는 `workspace:*` 로 devDependency 등재.
2. `tests/<name>/tsconfig.json` — `extends: "../../tsconfig.json"`, `compilerOptions.typeRoots: ["./node_modules/@types"]`.
3. `tests/<name>/src/**/*.spec.ts` — 스펙.
4. `vitest.config.ts` `projects[]` 에 entry 추가.
   - `name: "<name>"`, `include: ["tests/<name>/**/*.spec.ts"]`.
   - 외부 자원 기동 필요시 `globalSetup: "./tests/<name>/vitest.setup.ts"` + `setup`/`teardown` export.
   - 외부 자원이 단일 인스턴스 공유면 `fileParallelism: false` (스펙 파일 직렬 실행).
   - 브라우저 런타임 필요시 `browser: { provider: playwright(), enabled: true, headless: true, instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }] }`.

`pnpm-workspace.yaml` 은 이미 `tests/*` 를 포함하므로 `pnpm install` 만 하면 워크스페이스 인식.

### globalSetup 패턴

`tests/<name>/vitest.setup.ts`:

- `setup({ provide })` 에서 외부 자원 기동(DB 컨테이너·테스트 서버 등). 동적 값(랜덤 포트 등)은 `provide("key", value)` 로 스펙에 전달.
- `teardown()` 에서 정리. 실패해도 다음 실행이 망가지지 않도록 best-effort.
- 타입 보강: 파일 상단에.
  ```ts
  declare module "vitest" {
    export interface ProvidedContext { key: T }
  }
  ```
  스펙에서 `inject("key")` 로 수신.

기동 명령에 외부 도구(`docker compose`, `execa` 등) 사용 시 timeout 명시. 재시도가 필요한 자원(MSSQL 초기화 등)은 횟수 한정 retry, 한도 초과 시 throw — silent skip 금지.

## 공통 패턴

### Lint 룰 테스트

`@typescript-eslint/rule-tester` 는 vitest 직접 지원 안 함. `vitest.setup.ts` 에서 `RuleTester.describe`/`it`/`afterAll` 에 vitest 함수 바인딩. 스펙은 첫 줄에 `import "./vitest.setup"` 후 `new RuleTester().run(...)`.

### Angular 테스트

- 스펙은 `import { TestBed }` 후 `TestBed.configureTestingModule(...)` 부터 시작.
- TestEnvironment 초기화 + `beforeEach` 의 `resetTestingModule` 은 project setupFile 이 이미 처리. 스펙에서 다시 하지 말 것.

### ORM 다이얼렉트 매트릭스

- **단위** (`packages/orm-common/tests`): dialect 별 기대 SQL 비교. 패턴 — `dialects` 상수(`["mysql", "mssql", "postgresql"]`) + `it.each(dialects)` + 커스텀 `toMatchSql` matcher(whitespace 정규화). 기대 SQL 은 같은 폴더 `*.expected.ts` 에 dialect 키 객체로.
- **통합** (`tests/orm/src`): 실 DB 3종. `describe.each(dbCases)` 로 mysql/postgresql/mssql 반복. dialect 별 DDL 차이는 `tests/orm/src/setup/db-helpers.ts` 가 흡수 — 새 모델 추가 시 이 파일의 CREATE/DROP SQL 에 dialect 분기 추가.

### Service 통합 테스트

`tests/service` globalSetup 이 `createServiceServer({ port: 0, ... }).listen()` 으로 랜덤 포트 서버 기동 → `provide("servicePort", port)`. 스펙은 `const TEST_PORT = inject("servicePort")` 로 받아 `createServiceClient` 연결.

## 안티패턴

- 스펙 파일에 직접 외부 자원(DB·서버) 기동 코드 박기 — globalSetup 으로 옮길 것.
- `*.verify.md` 자리에 자동화 가능한 검증 작성 — 자동화 가능하면 `.spec.ts` 로.
- 통합 테스트 project 에서 `exclude` 로 단위 스펙 빼내기 — 단위는 패키지 `tests/` 에 두고 통합 project 가 절대 include 하지 못하게 분리.
- 같은 외부 자원을 여러 project 가 동시 점유 — `fileParallelism: false` + project 1개로 통합하거나, project 별로 자원 분리.
