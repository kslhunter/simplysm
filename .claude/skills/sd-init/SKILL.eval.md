# Eval: sd-init

## Behavioral Eval

### Scenario 1: 단일 패키지 프로젝트 신규 생성

- Input: "/sd-init"
- 전제조건:
  - CLAUDE.md 없음
  - `.claude/rules/` 비어있음
  - 단일 패키지 구조: root `package.json` (`workspaces` 필드 없음, scripts에 `build`, `dev`, `test` 포함)
  - `pnpm-lock.yaml` 존재
  - `tsconfig.json` 존재 (`verbatimModuleSyntax: true`)
  - `eslint.config.ts` 존재
- Checklist:
  - [ ] 모노레포가 아니라는 이유로 중단하지 않고 정상 실행되었다
  - [ ] root `CLAUDE.md` 파일이 생성되었다
  - [ ] 패키지 매니저가 pnpm으로 기록되어 있다
  - [ ] Commands 섹션에 `build`, `dev`, `test` 명령어가 포함되어 있다

### Scenario 2: 모노레포 프로젝트 신규 생성

- Input: "/sd-init"
- 전제조건:
  - CLAUDE.md 없음
  - `.claude/rules/` 비어있음
  - 모노레포 구조: root `package.json` (workspaces: `["packages/*"]`), `pnpm-workspace.yaml`, 3개 패키지 (`packages/core`, `packages/web`, `packages/api`)
  - 각 패키지에 `package.json` (`name`, `description`, `scripts` 포함)
  - root에 `tsconfig.json`, `eslint.config.ts` 존재
- Checklist:
  - [ ] root `CLAUDE.md` 파일이 생성되었다
  - [ ] 모노레포 구조 정보(워크스페이스 경로 `packages/*`)가 포함되어 있다
  - [ ] 3개 패키지(core, web, api) 각각에 대한 설명이 포함되어 있다
  - [ ] Commands 섹션이 존재하며 root scripts에서 추출한 명령어가 포함되어 있다
  - [ ] 기술 스택 정보(주요 dependencies)가 포함되어 있다

### Scenario 3: 커스텀 CLI 스크립트 분석

- Input: "/sd-init"
- 전제조건:
  - CLAUDE.md 없음
  - `.claude/rules/` 비어있음
  - `package.json` scripts에 `"dev": "tsx src/cli.ts dev"`, `"build": "tsc"` 포함
  - `src/cli.ts` 파일이 존재하며 `--help` 실행 시 서브커맨드 목록을 출력함
  - `pnpm-lock.yaml` 존재
- Checklist:
  - [ ] 잘 알려진 도구(`tsc`)는 그대로 기록되었다
  - [ ] 커스텀 CLI(`tsx src/cli.ts`)에 대해 `--help`를 실행했다
  - [ ] Commands 섹션에 커스텀 CLI의 서브커맨드 정보가 반영되어 있다

### Scenario 4: 코딩룰 추출

- Input: "/sd-init"
- 전제조건:
  - CLAUDE.md 없음
  - `.claude/rules/` 비어있음
  - `tsconfig.json`에 `"verbatimModuleSyntax": true` 설정
  - `.prettierrc`에 `{ "printWidth": 100, "tabWidth": 2, "semi": true }`
  - `eslint.config.ts`에 `"no-console": "error"` 규칙 포함
  - `package.json`에 `build`, `test` scripts 포함
- Checklist:
  - [ ] `verbatimModuleSyntax: true`가 코딩룰에 포함되어 있다 (기본값과 다른 설정)
  - [ ] `no-console: error`가 코딩룰에 포함되어 있다 (error 레벨 비표준 규칙)
  - [ ] Prettier 설정 중 기본값과 다른 항목이 선별적으로 포함되어 있다

### Scenario 5: 기존 CLAUDE.md 병합

- Input: "/sd-init"
- 전제조건:
  - 기존 `CLAUDE.md` 존재 (내용: `## Custom Rules\n- 모든 API 응답은 camelCase로 반환한다\n- 에러 코드는 ERR_XXX 형식을 따른다`)
  - `package.json` (scripts: `build`, `test`), `pnpm-lock.yaml` 존재
  - `.claude/rules/` 비어있음
- Checklist:
  - [ ] 기존 Custom Rules 섹션 내용("camelCase", "ERR_XXX")이 CLAUDE.md에 보존되어 있다
  - [ ] 새로 생성한 섹션(Commands 등)이 추가되었다
  - [ ] 동일한 섹션 헤더(`##`)가 중복되지 않는다
  - [ ] 기존 섹션의 위치가 유지되었다

### Scenario 6: .claude/rules/ 중복 방지

- Input: "/sd-init"
- 전제조건:
  - CLAUDE.md 없음
  - `.claude/rules/coding.md` 존재 (내용: `# Coding Rules\n- import type 필수\n- console.* 금지`)
  - `tsconfig.json`에 `"verbatimModuleSyntax": true`
  - `eslint.config.ts`에 `"no-console": "error"`
  - `package.json` (scripts: `build`, `test`), `pnpm-lock.yaml` 존재
- Checklist:
  - [ ] CLAUDE.md에 `import type` 관련 규칙이 포함되지 않았다 (rules에 이미 존재)
  - [ ] CLAUDE.md에 `console.*` 관련 규칙이 포함되지 않았다 (rules에 이미 존재)
  - [ ] `.claude/rules/coding.md` 파일이 수정되지 않았다
  - [ ] CLAUDE.md에 rules와 중복되지 않는 고유 내용(Commands, 기술 스택 등)이 포함되어 있다

## Anti-pattern Eval

- [ ] "적절히", "필요에 따라", "상황에 따라" 같은 모호한 표현이 CLAUDE.md에 없다
- [ ] `packages/*/CLAUDE.md` 등 하위 패키지에 CLAUDE.md가 생성되지 않았다
