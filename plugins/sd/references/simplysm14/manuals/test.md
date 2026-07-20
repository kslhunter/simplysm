# 테스트 작성

`@simplysm/*` v14 모노레포의 패키지 테스트(`packages/<pkg>/tests/`)와 통합 테스트(`tests/<name>/`) 작성 시 따르세요.
Vitest 실행 명령은 루트 `CLAUDE.md` 의 "명령"/"단일 테스트 실행" 섹션을 참조하세요. 이 문서는 작성 규약만 다룹니다.

## 파일 규약

- 위치.
  - 패키지: `packages/<pkg>/tests/**/*.spec.ts`.
  - 통합: `tests/<name>/src/**/*.spec.ts`.
- 확장자.
  - `*.spec.ts` — vitest 실행 대상입니다.
  - `*.acc.spec.ts` — 인수(Acceptance) 단위 spec 입니다. `*.spec.ts` 와 동일 project 에서 함께 실행됩니다.
  - `*.verify.md` — LLM 이 수동으로 검증할 항목 기술 파일입니다. vitest 실행 대상이 아닙니다.
    - 자동화로 잡기 어려운 검증에만 사용하세요.
    - 대상 예: JSDoc 표현, 문서 일관성.
- import 경로: 워크스페이스 패키지는 `@simplysm/<pkg>` 로 import 하세요.
  - 검증 목적상 내부 구현(public export 가 아닌 모듈)이 필요한 경우에 한해 상대 경로(`../src/...`) 를 허용합니다.
- 환경 변수: `vitest.config.ts` 진입 시 `process.env.DEV=true`, `process.env.VER=1.0.0-test`, 그리고 동일 값의 `import.meta.env.*` 가 define 으로 자동 주입됩니다.
  - 스펙에서 별도 설정은 불필요합니다.

## Vitest project 매핑 (패키지 추가 시)

`vitest.config.ts` 의 `include`/`exclude` 설정이 각 스펙 파일이 어느 project 에서 실행될지를 결정합니다. 새 패키지 추가 시:

- **Node 전용**: 기본 `node` project 가 자동 include 하지만 `browser` project 도 `packages/*/tests` 를 넓게 include 하므로, `browser` project 의 `exclude` 에 해당 패키지 경로를 추가하세요.
- **브라우저 환경 필요** (DOM, `window`, Worker 등 사용): `browser` project 가 자동 include 하고, Node 에서 실행되면 안 되면 `node` project 의 `exclude` 에 해당 패키지 경로를 추가하세요.
- **Node, browser 양쪽 공용**: 어느 쪽 `exclude` 에도 넣지 마세요. 같은 스펙이 두 project 에서 모두 실행됩니다.
- **Angular**: `packages/angular` 전용 project (TestBed + AOT 플러그인 + setupFile 구성) 입니다. 다른 패키지에서 이 구성을 따라하지 마세요.

## 통합 테스트 project 추가 절차

`tests/<name>/` 디렉토리 1개가 vitest project 1개에 대응합니다. 추가 절차:

1. `tests/<name>/package.json` 작성 — `name: "@simplysm-test/<name>"`, `"private": true`, `"type": "module"`. 필요한 `@simplysm/*` 패키지는 `workspace:*` 로 devDependency 에 등재하세요.
2. `tests/<name>/tsconfig.json` 작성 — `extends: "../../tsconfig.json"`, `compilerOptions.typeRoots: ["./node_modules/@types"]`.
3. `tests/<name>/src/**/*.spec.ts` 에 스펙을 작성하세요.
4. `vitest.config.ts` 의 `projects[]` 에 entry 를 추가하세요.
   - `name: "<name>"`, `include: ["tests/<name>/**/*.spec.ts"]` 를 지정하세요.
   - 외부 자원(DB, 서버 등) 기동이 필요한 경우 `globalSetup: "./tests/<name>/vitest.setup.ts"` 와 함께 setup 파일에서 `setup`/`teardown` 함수를 export 하세요.
   - 공유 외부 자원이 병렬 안전하지 않은 경우 `fileParallelism: false` 를 지정하세요 (스펙 파일 직렬 실행).
     - 단일 테스트 서버처럼 동시 요청을 처리할 수 있으면 `true` 유지가 가능합니다.
   - 브라우저 런타임이 필요한 경우 `browser: { provider: playwright(), enabled: true, headless: true, instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }] }` 를 지정하세요.

루트 `pnpm-workspace.yaml` 가 `tests/*` 를 포함하므로 `pnpm install` 만으로 워크스페이스에 인식됩니다.

### globalSetup 패턴

`tests/<name>/vitest.setup.ts`:

- `setup({ provide })` 함수에서 외부 자원(DB 컨테이너, 테스트 서버 등)을 기동하세요.
  - 동적으로 결정되는 값(랜덤 포트 등)은 `provide("key", value)` 로 스펙에 전달하세요.
- `teardown()` 함수에서 자원을 정리하세요.
  - 정리 실패가 다음 실행을 망가뜨리지 않도록 best-effort 로 처리하세요.
- 타입 보강: 파일 상단에 다음 선언을 추가하세요.
  ```ts
  declare module "vitest" {
    export interface ProvidedContext {
      key: T;
    }
  }
  ```
  스펙에서는 `inject("key")` 로 값을 받으세요.

- 기동 명령에 외부 도구(`docker compose`, `execa` 등)를 사용할 때는 timeout 을 명시하세요.
- 재시도가 필요한 자원(MSSQL 초기화 등)은 횟수 제한을 둔 retry 로 처리하고, 한도 초과 시 throw 하세요. silent skip 은 금지입니다.

## 공통 패턴

### Lint 룰 테스트

`@typescript-eslint/rule-tester` 는 vitest 를 직접 지원하지 않습니다.

- `vitest.setup.ts` 에서 `RuleTester.describe`/`it`/`afterAll` 에 vitest 함수를 바인딩하세요.
- 스펙 파일의 첫 줄에 `import "./vitest.setup"` 을 둔 뒤 `new RuleTester().run(...)` 을 호출하세요.

### Angular 테스트

- 스펙은 `import { TestBed }` 후 `TestBed.configureTestingModule(...)` 호출로 시작하세요.
- TestEnvironment 초기화와 `beforeEach` 의 `resetTestingModule` 호출은 project setupFile 에서 이미 처리됩니다.
  - 스펙에서 다시 호출하지 마세요.

### ORM 다이얼렉트 매트릭스

- **단위 테스트** (`packages/orm-common/tests`): dialect 별 기대 SQL 을 비교합니다.
  - 패턴 — `dialects` 상수(`["mysql", "mssql", "postgresql"]`) + `it.each(dialects)` + 커스텀 `toMatchSql` matcher(whitespace 정규화).
  - 기대 SQL 은 같은 폴더의 `*.expected.ts` 파일에 dialect 를 키로 하는 객체 형태로 작성하세요.
- **통합 테스트** (`tests/orm/src`): 실 DB 3종을 사용합니다. `describe.each(dbCases)` 로 mysql/postgresql/mssql 을 반복하세요.
  - dialect 별 DDL 차이는 `tests/orm/src/setup/db-helpers.ts` 가 흡수합니다.
    - 새 모델 추가 시 이 파일의 CREATE/DROP SQL 에 dialect 분기를 추가하세요.

### Service 통합 테스트

- `tests/service` 의 globalSetup 이 `createServiceServer({ port: 0, ... }).listen()` 으로 랜덤 포트 서버를 기동한 뒤 `provide("servicePort", port)` 로 전달합니다.
- 스펙에서는 `const TEST_PORT = inject("servicePort")` 로 포트를 받아 `createServiceClient` 에 연결하세요.

## 안티패턴

- 스펙 파일 안에 외부 자원(DB, 서버) 기동 코드를 직접 작성 — globalSetup 으로 옮기세요.
- 자동화 가능한 검증을 `*.verify.md` 에 작성 — 자동화 가능하면 `.spec.ts` 로 작성하세요.
- 통합 테스트 project 의 `include` 가 단위 스펙까지 흡수한 뒤 `exclude` 로 빼내는 구성.
  - 단위 스펙은 패키지의 `tests/` 에 두고, 통합 project 의 `include` 패턴이 단위 스펙을 처음부터 잡지 않도록 분리하세요.
- 같은 외부 자원을 여러 project 가 동시에 점유 — `fileParallelism: false` 를 적용한 단일 project 로 통합하거나, project 별로 자원을 분리하세요.
