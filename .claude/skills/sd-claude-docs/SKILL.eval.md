# Eval: sd-claude-docs

## 행동 Eval

### 시나리오 1: 모노레포 라이브러리 전체 실행 (핵심 통합)

- 입력: "/sd-claude-docs"
- 전제조건:
  - CLAUDE.md·README·docs 없음 (루트, 패키지 모두)
  - 모노레포: `pnpm-workspace.yaml`, 2개 패키지 (`packages/core`, `packages/web`)
  - 루트 `package.json`: `{ "name": "mylib", "version": "2.0.0", "workspaces": ["packages/*"] }`
  - 각 패키지 `package.json` (name, description, scripts, `"main": "./dist/index.js"`), `tsconfig.json`, `src/index.ts` (export 3개 이상)
  - `packages/web/package.json`에 `"private": true`
  - 루트에 `pnpm-lock.yaml`, `eslint.config.ts`, `.prettierrc`
- 체크리스트:
  - [ ] 루트 `CLAUDE.md` 파일이 존재한다
  - [ ] `packages/core/CLAUDE.md` 파일이 존재한다
  - [ ] `packages/core/README.md` 파일이 존재한다
  - [ ] `packages/web/CLAUDE.md` 파일이 존재한다
  - [ ] `packages/web/README.md` 파일이 존재하지 않는다
  - [ ] `packages/web/docs/` 디렉토리가 존재하지 않는다
  - [ ] `packages/core/CLAUDE.md`에 `[README.md](./README.md)` 문자열이 포함되어 있다
  - [ ] `packages/web/CLAUDE.md`에 `[README.md](./README.md)` 문자열이 포함되지 않았다

### 시나리오 2: 단일 패키지 라이브러리

- 입력: "/sd-claude-docs"
- 전제조건:
  - CLAUDE.md·README·docs 없음
  - 단일 패키지: 루트 `package.json` (`"name": "myutil"`, scripts: `build`/`dev`/`test`, `"main": "./dist/index.js"`, `workspaces` 필드 없음, `private` 없음)
  - `pnpm-lock.yaml`, `tsconfig.json` (`"verbatimModuleSyntax": true`), `eslint.config.ts`
  - `src/index.ts`에 export 5개
- 체크리스트:
  - [ ] 루트 `CLAUDE.md` 파일이 존재한다
  - [ ] 루트 `README.md` 파일이 존재한다
  - [ ] 루트 `CLAUDE.md`에 `## 명령어` 또는 `## Commands` 섹션 헤더가 포함되어 있다
  - [ ] `packages/` 디렉토리가 존재하지 않거나 비어 있다

### 시나리오 3: 패키지 지정 실행

- 입력: "/sd-claude-docs core"
- 전제조건:
  - 모노레포: 2개 패키지 (`packages/core`, `packages/web`)
  - 기존 루트 `CLAUDE.md` 존재 (내용에 `## Legacy Section` 헤더 포함)
  - `packages/core/`에 `package.json`, `src/index.ts` (export 5개)
  - `packages/core/CLAUDE.md`, `packages/core/README.md` 없음
  - `packages/web/`에 기존 파일 없음
- 체크리스트:
  - [ ] `packages/core/CLAUDE.md` 파일이 존재한다
  - [ ] `packages/core/README.md` 파일이 존재한다
  - [ ] `packages/web/CLAUDE.md` 파일이 존재하지 않는다
  - [ ] `packages/web/README.md` 파일이 존재하지 않는다
  - [ ] 루트 `CLAUDE.md`에 `## Legacy Section` 문자열이 그대로 포함되어 있다

### 시나리오 4: 기존 CLAUDE.md 병합

- 입력: "/sd-claude-docs"
- 전제조건:
  - 기존 루트 `CLAUDE.md` 존재. 내용:
    ```
    # MyProject

    ## Custom Rules
    - 모든 API 응답은 camelCase로 반환한다
    ```
  - 단일 패키지: 루트 `package.json` (scripts: `build`, `test`), `pnpm-lock.yaml`
  - `src/index.ts`에 export 2개
- 체크리스트:
  - [ ] 루트 `CLAUDE.md`에 "camelCase" 문자열이 포함되어 있다
  - [ ] 루트 `CLAUDE.md`에 `## Custom Rules` 섹션 헤더가 포함되어 있다
  - [ ] 루트 `CLAUDE.md`에 `## 명령어` 또는 `## Commands` 섹션 헤더가 포함되어 있다

### 시나리오 5: .claude/rules/ 중복 방지

- 입력: "/sd-claude-docs"
- 전제조건:
  - CLAUDE.md 없음
  - `.claude/rules/coding.md` 존재. 내용:
    ```
    # Coding Rules
    - import type 필수
    - console.* 금지
    ```
  - 루트에 `tsconfig.json` (`"verbatimModuleSyntax": true`), `eslint.config.ts` (`"no-console": "error"`)
  - 단일 패키지: 루트 `package.json` (scripts: `build`, `test`), `pnpm-lock.yaml`
  - `src/index.ts`에 export 2개
- 체크리스트:
  - [ ] 루트 `CLAUDE.md`에 "import type" 문자열이 포함되지 않았다
  - [ ] 루트 `CLAUDE.md`에 "console.*" 문자열이 포함되지 않았다
  - [ ] `.claude/rules/coding.md`의 첫 줄이 `# Coding Rules`이다 (수정되지 않았다)

### 시나리오 6: API 문서 품질 (interface / union type)

- 입력: "/sd-claude-docs pkg-config"
- 전제조건:
  - 모노레포: 루트 `package.json`, `pnpm-workspace.yaml`
  - `packages/pkg-config/package.json`: `{ "name": "@mylib/pkg-config", "main": "./dist/index.js" }`
  - `packages/pkg-config/src/index.ts`:
    ```ts
    export type { ServerConfig, AppConfig } from "./types";
    export { createConfig } from "./factory";
    ```
  - `packages/pkg-config/src/types.ts`:
    ```ts
    export interface ServerConfig {
      host: string;
      port: number;
      ssl: boolean;
      timeout: number;
    }
    export type AppConfig =
      | { type: "dev"; verbose: boolean }
      | { type: "prod"; replicas: number };
    ```
  - `packages/pkg-config/src/factory.ts`: `export function createConfig(config: AppConfig): ServerConfig`
- 체크리스트:
  - [ ] `packages/pkg-config/README.md` 파일이 존재한다
  - [ ] `packages/pkg-config/` 하위의 어느 md 파일에 "host", "port", "ssl", "timeout" 네 문자열이 모두 포함되어 있다
  - [ ] `packages/pkg-config/` 하위의 어느 md 파일에 `"dev"`와 `"prod"` 두 variant 리터럴이 모두 포함되어 있다
  - [ ] `packages/pkg-config/` 하위의 어느 md 파일에 "createConfig" 문자열이 포함되어 있다
  - [ ] `packages/pkg-config/` 하위의 md 파일 중 어디에도 `ServerConfig {}` 또는 `interface ServerConfig {}` 같이 빈 중괄호로 축약된 표기가 포함되지 않았다

### 시나리오 7: 소비앱 (CLAUDE.md만 생성)

- 입력: "/sd-claude-docs"
- 전제조건:
  - CLAUDE.md 없음
  - 모노레포: `pnpm-workspace.yaml`, 2개 패키지 (`packages/client`, `packages/server`)
  - 모든 패키지의 `package.json`에 `"private": true`
  - 루트에 `pnpm-lock.yaml`, `eslint.config.ts`
- 체크리스트:
  - [ ] 루트 `CLAUDE.md` 파일이 존재한다
  - [ ] `packages/client/CLAUDE.md` 파일이 존재한다
  - [ ] `packages/server/CLAUDE.md` 파일이 존재한다
  - [ ] `packages/client/README.md` 파일이 존재하지 않는다
  - [ ] `packages/server/README.md` 파일이 존재하지 않는다
  - [ ] `packages/client/docs/` 디렉토리가 존재하지 않는다
  - [ ] `packages/server/docs/` 디렉토리가 존재하지 않는다

## 안티패턴 Eval

- [ ] 어느 CLAUDE.md에도 "적절히", "필요에 따라", "상황에 따라" 문자열이 포함되지 않았다
- [ ] 단일 패키지 프로젝트에서 `packages/` 경로 하위에 CLAUDE.md 또는 README.md가 생성되지 않았다
- [ ] `private: true` 패키지의 디렉토리에 README.md 파일이 존재하지 않는다
- [ ] 소비앱(모든 패키지가 private)의 어느 패키지 디렉토리에도 README.md 파일이 존재하지 않는다
- [ ] 패키지 지정 실행 시 루트 `CLAUDE.md`의 사전 조건 내용이 그대로 포함되어 있다 (루트 문서가 재생성되지 않았다)
- [ ] 생성된 어느 md 파일에도 존재하지 않는 API 이름이 (사전 조건 소스 코드 기준으로) 포함되지 않았다
