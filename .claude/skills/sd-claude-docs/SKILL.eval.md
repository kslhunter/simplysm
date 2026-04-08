# Eval: sd-claude-docs

## 행동 Eval

### 시나리오 1: 모노레포 라이브러리 전체 실행 (핵심 통합 시나리오)

- 입력: "/sd-claude-docs"
- 전제조건:
  - CLAUDE.md 없음 (루트, 패키지 모두), usage 문서 없음
  - 모노레포 구조: `pnpm-workspace.yaml`, 2개 패키지 (`packages/core`, `packages/web`)
  - root `package.json`: `{ "name": "mylib", "version": "2.0.0" }`
  - 각 패키지에 `package.json` (name, description, scripts, main), `tsconfig.json`, `src/index.ts` (export 3개 이상)
  - `packages/web/package.json`에 `"private": true`
  - root에 `eslint.config.ts`, `.prettierrc` 존재
- 체크리스트:
  - [ ] root `CLAUDE.md`가 생성되었다
  - [ ] `.claude/references/sd-mylib2.md` 인덱스가 생성되었다
  - [ ] `packages/core/CLAUDE.md`가 생성되었다
  - [ ] `.claude/references/sd-mylib2/core/usage.md`가 생성되었다
  - [ ] `packages/web/CLAUDE.md`가 생성되었다 (private이어도 CLAUDE.md는 생성)
  - [ ] `packages/web`의 usage 문서는 생성되지 않았다 (private 패키지)
  - [ ] `sd-mylib2.md` 인덱스의 패키지 테이블에 `packages/web`이 포함되지 않았다

### 시나리오 2: 단일 패키지 라이브러리

- 입력: "/sd-claude-docs"
- 전제조건:
  - CLAUDE.md 없음, usage 문서 없음
  - 단일 패키지 구조: root `package.json` (`"name": "myutil"`, `"version": "1.5.0"`, `workspaces` 필드 없음, scripts에 `build`, `dev`, `test`, main: `./dist/index.js`, `private` 없음)
  - `pnpm-lock.yaml`, `tsconfig.json` (`verbatimModuleSyntax: true`), `eslint.config.ts` 존재
  - `src/index.ts`에 export 5개
- 체크리스트:
  - [ ] root `CLAUDE.md`가 생성되었다
  - [ ] `.claude/references/sd-myutil1.md` 인덱스가 생성되었다
  - [ ] `.claude/references/sd-myutil1/usage.md`에 API 문서가 포함되었다
  - [ ] 패키지별 CLAUDE.md는 생성되지 않았다 (모노레포가 아님)
  - [ ] CLAUDE.md에 Commands 섹션이 포함되었다

### 시나리오 3: 패키지 지정 실행

- 입력: "/sd-claude-docs core"
- 전제조건:
  - 모노레포 구조: `{ "name": "mylib", "version": "2.0.0" }`, 2개 패키지 (`packages/core`, `packages/web`)
  - 기존 root CLAUDE.md 있음, `sd-mylib2.md` 있음
  - `packages/core/` 하위에 `package.json`, `src/index.ts` (export 5개)
- 체크리스트:
  - [ ] `packages/core/CLAUDE.md`가 생성 또는 갱신되었다
  - [ ] `.claude/references/sd-mylib2/core/usage.md`가 생성 또는 갱신되었다
  - [ ] `packages/web/`에는 어떤 문서도 생성·변경되지 않았다
  - [ ] root CLAUDE.md가 변경되지 않았다
  - [ ] `sd-mylib2.md`가 변경되지 않았다

### 시나리오 4: 기존 CLAUDE.md 병합

- 입력: "/sd-claude-docs"
- 전제조건:
  - 기존 `CLAUDE.md` 존재 (내용: `## Custom Rules\n- 모든 API 응답은 camelCase로 반환한다`)
  - 단일 패키지, `package.json` (scripts: `build`, `test`), `pnpm-lock.yaml`
  - `src/index.ts`에 export 2개
- 체크리스트:
  - [ ] 기존 Custom Rules 섹션("camelCase")이 CLAUDE.md에 보존되어 있다
  - [ ] 새로 생성한 섹션(Commands 등)이 추가되었다
  - [ ] 동일한 섹션 헤더(`##`)가 중복되지 않는다
  - [ ] 기존 섹션의 위치가 유지되었다

### 시나리오 5: .claude/rules/ 중복 방지

- 입력: "/sd-claude-docs"
- 전제조건:
  - CLAUDE.md 없음
  - `.claude/rules/coding.md` 존재 (내용: `# Coding Rules\n- import type 필수\n- console.* 금지`)
  - `tsconfig.json`에 `"verbatimModuleSyntax": true`, `eslint.config.ts`에 `"no-console": "error"`
  - 단일 패키지, `package.json` (scripts: `build`, `test`), `pnpm-lock.yaml`
  - `src/index.ts`에 export 2개
- 체크리스트:
  - [ ] CLAUDE.md에 `import type` 관련 규칙이 포함되지 않았다
  - [ ] CLAUDE.md에 `console.*` 관련 규칙이 포함되지 않았다
  - [ ] `.claude/rules/coding.md` 파일이 수정되지 않았다

### 시나리오 6: 커스텀 CLI 스크립트 분석

- 입력: "/sd-claude-docs"
- 전제조건:
  - CLAUDE.md 없음
  - `package.json` scripts에 `"dev": "tsx src/cli.ts dev"`, `"build": "tsc"` 포함
  - `src/cli.ts` 파일 존재, `--help` 실행 시 서브커맨드 목록 출력
  - `pnpm-lock.yaml`, 단일 패키지
  - `src/index.ts`에 export 2개
- 체크리스트:
  - [ ] 잘 알려진 도구(`tsc`)는 그대로 기록되었다
  - [ ] 커스텀 CLI(`tsx src/cli.ts`)에 대해 `--help`를 실행했다
  - [ ] Commands 섹션에 커스텀 CLI의 서브커맨드 정보가 반영되어 있다

### 시나리오 7: API 문서 품질 (interface/union type)

- 입력: "/sd-claude-docs pkg-config"
- 전제조건:
  - 모노레포 구조: `{ "name": "mylib", "version": "2.0.0" }`
  - `packages/pkg-config/package.json`: `{ "name": "@mylib/pkg-config", "main": "./dist/index.js" }`
  - `packages/pkg-config/src/index.ts`: `export type { ServerConfig, AppConfig } from "./types"; export { createConfig } from "./factory";`
  - `packages/pkg-config/src/types.ts`: ServerConfig interface (4필드), AppConfig discriminated union
  - `packages/pkg-config/src/factory.ts`: createConfig 함수
- 체크리스트:
  - [ ] ServerConfig의 각 필드가 개별적으로 문서에 설명되었다
  - [ ] AppConfig가 union type임이 명시되었다
  - [ ] AppConfig의 각 variant가 나열되었다
  - [ ] createConfig 함수가 문서에 포함되었다
  - [ ] 총 export 항목이 모두 문서에 포함되었다 (누락 없음)

### 시나리오 8: 패키지별 CLAUDE.md 상세 분석 품질

- 입력: "/sd-claude-docs app"
- 전제조건:
  - 모노레포 구조: 1개 패키지 (`packages/app`)
  - `packages/app/`: `package.json`, `tsconfig.json`, `src/` 하위에 3-layer 디렉토리 구조, 테스트 디렉토리
  - `src/index.ts`에 export 10개
- 체크리스트:
  - [ ] CLAUDE.md에 디렉토리 구조가 트리 형태로 표현되어 있다
  - [ ] CLAUDE.md에 소스 코드에서 반복되는 패턴(코드 예시 포함)이 기술되어 있다
  - [ ] CLAUDE.md에 루트 CLAUDE.md와 중복되는 내용(명령어, 코딩 규칙)이 없다
  - [ ] usage.md에 export된 모든 API가 문서화되었다

### 시나리오 9: 소비앱 (CLAUDE.md만 생성)

- 입력: "/sd-claude-docs"
- 전제조건:
  - CLAUDE.md 없음
  - 모노레포 구조: `pnpm-workspace.yaml`, 2개 패키지 (`packages/client`, `packages/server`)
  - 모든 패키지의 `package.json`에 `"private": true`
  - root에 `eslint.config.ts`, `pnpm-lock.yaml` 존재
- 체크리스트:
  - [ ] root `CLAUDE.md`가 생성되었다
  - [ ] `packages/client/CLAUDE.md`가 생성되었다
  - [ ] `packages/server/CLAUDE.md`가 생성되었다
  - [ ] `.claude/references/` 하위에 usage 문서가 생성되지 않았다
  - [ ] `sd-{name}{ver}.md` 인덱스 파일이 생성되지 않았다

## 안티패턴 Eval

- [ ] "적절히", "필요에 따라", "상황에 따라" 같은 모호한 표현이 CLAUDE.md에 없다
- [ ] 단일 패키지 프로젝트에서 패키지별 CLAUDE.md가 생성되지 않았다
- [ ] 패키지별 CLAUDE.md에 루트 CLAUDE.md와 중복되는 내용(명령어, 코딩 규칙 등)이 포함되지 않았다
- [ ] internal(export되지 않은) 모듈이 usage 문서에 문서화되지 않았다
- [ ] src/ 전체를 무차별 스캔하지 않았다 (exports 기반 추적)
- [ ] private 패키지에 usage 문서가 생성되지 않았다
- [ ] 소비앱에서 usage 문서가 생성되지 않았다
- [ ] 존재하지 않는 API를 hallucination으로 생성하지 않았다
- [ ] interface/type의 필드를 생략하고 시그니처만 나열하지 않았다
- [ ] 패키지 지정 실행 시 root 문서를 생성·변경하지 않았다
