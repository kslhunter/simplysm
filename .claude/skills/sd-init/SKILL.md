---
name: sd-init
description: 프로젝트 설정 파일을 분석하여 CLAUDE.md를 자동 생성. 사용자가 CLAUDE.md 생성이나 갱신을 요청할 때 사용
argument-hint: ""
---

# sd-init: CLAUDE.md 자동 생성

프로젝트를 분석하여 CLAUDE.md를 생성한다. 기존 파일이 있으면 비교하여 병합한다.

1~3단계는 독립적이므로 병렬로 수행할 수 있다.

## 1. 패키지 매니저 감지

프로젝트 루트의 lock 파일로 패키지 매니저를 판별한다:

1. `pnpm-lock.yaml` → pnpm
2. `yarn.lock` → yarn
3. `bun.lock` 또는 `bun.lockb` → bun
4. 그 외 → npm

## 2. 스크립트 분석

`package.json`의 `scripts` 섹션을 Read하고, 각 스크립트가 실행하는 CLI 도구를 분석한다.

- 잘 알려진 도구(`tsc`, `vitest`, `eslint`, `prettier`, `playwright` 등)를 직접 실행하는 경우: 실행 내용을 그대로 기록
- 프로젝트 내부 CLI나 커스텀 스크립트(예: `tsx packages/.../cli.ts`)를 실행하는 경우: Bash로 `--help`를 붙여 실행(timeout 5초)하여 사용 가능한 서브커맨드와 주요 옵션을 파악. 실패하면 scripts 내용만 기록

이 단계에서는 정보 수집만 수행한다. 최종 포맷팅은 4단계에서 한다.

## 3. 코딩룰 분석

프로젝트 루트에서 다음 설정 파일을 찾아 존재하는 것만 Read한다:

- ESLint: 프로젝트 루트의 `eslint.config.*`, `.eslintrc.*`
- Prettier: `.prettierrc*`, `prettier.config.*`
- EditorConfig: `.editorconfig`
- TypeScript: 루트 `tsconfig.json`의 `compilerOptions`
- Stylelint: `.stylelintrc*`, `stylelint.config.*`

다음 기준으로 규칙을 선별하여 요약한다:
- 기본값과 다른 설정 (예: `verbatimModuleSyntax: true`)
- error 레벨의 비표준 규칙 (예: `no-console: error`)
- 특정 API 사용 금지/강제 규칙 (예: `Buffer` 금지 → `Uint8Array` 사용)

## 4. CLAUDE.md 생성

1~3단계에서 수집한 정보를 종합하여 CLAUDE.md 내용을 생성한다. 이미 읽은 파일은 다시 읽지 않는다.

포함할 내용:

- **프로젝트 정보**: `package.json`의 `name`, `description`, 패키지 매니저
- **모노레포 구조**: `workspaces` 필드나 `pnpm-workspace.yaml`이 있으면 워크스페이스 경로를 간략히 기술
- **기술 스택**: `dependencies`/`devDependencies`에서 프레임워크, 번들러, 테스트 도구 등 주요 라이브러리를 나열 (최대 10개)
- **명령어**: 2단계에서 수집한 스크립트를 카테고리별로 bash 코드블록에 사용 예시로 포맷팅
- **코딩룰**: 3단계에서 선별한 규칙을 불릿 리스트로 작성

### 참고 예시

아래 예시의 **섹션 구성과 포맷팅 스타일**(bash 코드블록, 인라인 주석, 불릿 리스트)을 따르되, 내용은 대상 프로젝트에 맞게 작성한다. 예시에 없는 섹션을 추가하거나, 프로젝트에 해당하지 않는 섹션은 생략할 수 있다.

````markdown
# Simplysm

pnpm 모노레포. 패키지 경로: `packages/*`, 테스트: `tests/*`

## 명령어

모든 명령어는 내부적으로 `pnpm sd-cli <command>`를 실행한다. `--debug` 플래그를 모든 명령어에 사용할 수 있다.
`[targets..]`를 지정하지 않으면 `sd.config.ts`에 정의된 모든 패키지가 대상이 된다.
대상은 패키지 경로로 지정한다 (예: `packages/core-common`, `tests/orm`).

### 개발

```bash
pnpm dev [targets..]                     # 클라이언트+서버 패키지를 개발 모드로 실행
pnpm dev packages/solid-demo             # 특정 패키지만 개발 모드로 실행
pnpm dev -o key=value                    # sd.config.ts에 옵션 전달

pnpm watch [targets..]                   # 라이브러리 패키지 빌드 watch 모드
pnpm watch packages/core-common          # 특정 패키지만 watch
```

### 빌드 & 배포

```bash
pnpm build [targets..]                   # 프로덕션 빌드
pnpm build packages/solid                # 특정 패키지만 빌드

pnpm pub [targets..]                     # 빌드 후 배포 (npm/sftp)
pnpm pub --no-build                      # 빌드 없이 배포만
pnpm pub --dry-run                       # 실제 배포 없이 시뮬레이션
```

### 코드 품질 검사

```bash
pnpm typecheck [targets..]               # TypeScript 타입 검사
pnpm lint [targets..]                    # ESLint + Stylelint 실행
pnpm lint:fix [targets..]               # 린트 이슈 자동 수정 (--fix)
pnpm check [targets..]                   # 전체 검사 (타입 검사 + 린트 + 테스트 병렬 실행)
pnpm vitest [targets..]                  # vitest watch 모드
pnpm vitest run [targets..]              # 테스트 1회 실행
```

## 아키텍처

의존 방향: 위 → 아래. `core-common`은 내부 의존성이 없는 리프 패키지이다.

```
앱:       solid-demo (클라이언트) / solid-demo-server (서버)
UI:       solid (SolidJS + Tailwind)
서비스:   service-server (Fastify) / service-client / service-common
ORM:      orm-node (MySQL/PostgreSQL/MSSQL) / orm-common
코어:     core-common (중립) / core-browser / core-node
도구:     sd-cli, lint, excel, storage, sd-claude, mcp-playwright
```

## 통합 테스트

`tests/` 폴더에 위치한다. `pnpm vitest run tests/orm` 등으로 실행한다.

- `tests/orm` — DB 연결, DbContext, escape 테스트 (MySQL, PostgreSQL, MSSQL). Docker 필요.
- `tests/service` — 서비스 클라이언트-서버 통신 테스트.

## 코딩룰

- `import type` 필수 (`verbatimModuleSyntax`), `#private` 금지 → `private` 키워드 사용
- `console.*` 금지, `if (str)` 금지 → 명시적 비교 `str !== ""` 사용 (nullable boolean/object는 허용)
- `Buffer` 금지 → `Uint8Array`, `events` 금지 → `@simplysm/core-common`의 `EventEmitter` 사용
- SolidJS: props 구조분해 금지, `.map()` 대신 `<For>` 사용, `className` 대신 `class` 사용
- Prettier: 100자, 2칸 들여쓰기, 세미콜론, trailing comma, LF
````

## 5. 기존 CLAUDE.md와 병합

- 기존 `CLAUDE.md`가 없으면 4단계의 결과를 그대로 저장한다
- 기존 `CLAUDE.md`가 있으면:
  1. 기존 파일을 Read한다
  2. 4단계에서 생성한 새 내용과 기존 내용을 섹션(`##` 헤딩) 단위로 비교한다
  3. 병합 규칙:
     - 4단계에서 생성한 섹션과 동일 주제의 기존 섹션이 있으면 → 새 내용으로 교체
     - 기존에만 있고 4단계에서 생성하지 않은 섹션 → 그대로 보존
     - 기존 섹션의 위치를 유지하되, 새로 추가된 섹션은 관련 섹션 근처에 배치

## 6. 완료 안내

저장이 완료되면 다음을 출력한다:

```
CLAUDE.md가 생성되었습니다. 커밋하려면 /sd-commit을 실행하세요.
```
