---
name: sd-init
description: "초기화", "init", "sd-init", "CLAUDE.md 생성" 등을 요청할 때 사용.
---

# SD Init — CLAUDE.md 자동 생성

프로젝트를 분석하여 CLAUDE.md를 자동 생성한다. 기존 파일이 있으면 덮어쓴다.

---

## Step 1: 패키지 매니저 감지

프로젝트 루트의 lock 파일로 PM을 판별하라:

1. `pnpm-lock.yaml` → pnpm
2. `yarn.lock` → yarn
3. 그외 → npm

## Step 2: 스크립트 분석

`package.json`의 `scripts`를 읽고, 각 스크립트가 호출하는 CLI 도구에 대해 Bash로 `--help`등의 도움말 보기를 실행하여 사용 가능한 인자와 플래그를 파악하라.

파악한 정보를 바탕으로 스크립트를 카테고리별(개발, 빌드, 테스트, 린트 등)로 그룹화하고, 각 스크립트의 기본 사용법과 주요 플래그 예시를 정리하라.

## Step 3: 코딩 규칙 분석

프로젝트 루트에서 아래 설정 파일들을 찾아 읽어라 (존재하는 것만):

- ESLint: `eslint.config.*`, `.eslintrc.*`, `packages/*/eslint.*` 등
- Prettier: `.prettierrc*`, `prettier.config.*`
- EditorConfig: `.editorconfig`
- TypeScript: `tsconfig.json` (루트)의 `compilerOptions` 중 `strict`, `noImplicitAny` 등 코드 스타일에 영향을 주는 옵션
- Stylelint: `.stylelintrc*`, `stylelint.config.*`

Claude가 규칙과 반대로 수정하기를 제안할 정도의 자주 실수할 내용들만 대폭 간결하게 정리하라.

## Step 4: CLAUDE.md 생성

아래 정보를 종합하여 프로젝트 루트에 `CLAUDE.md`를 작성하라:

- **프로젝트 정보**: `package.json`의 `name`, `description`
- **PM**: Step 1에서 감지한 패키지 매니저
- **모노레포 구조**: `workspaces` 필드 또는 `pnpm-workspace.yaml`이 있으면 워크스페이스 경로를 간단히 기술
- **기술스택**: `dependencies`/`devDependencies`에서 주요 기술(프레임워크, 번들러, 테스트 도구 등)을 파악하여 아주 간단히 기술
- **명령어**: Step 2에서 정리한 스크립트 사용법
- **코딩 규칙**: Step 3에서 분석한 규칙 중 Claude가 지켜야 할 것들. `## 코딩 규칙` 섹션으로 작성

### 참고 예시

아래는 잘 작성된 CLAUDE.md의 예시다. 형식을 그대로 복사하지 말고, 프로젝트 특성에 맞게 유연하게 작성하라.

```markdown
# Simplysm

pnpm 모노레포. 패키지 경로: `packages/*`, 테스트: `tests/*`

## 명령어

모든 명령어는 내부적으로 `pnpm sd-cli <명령>`을 실행한다. 모든 명령에 `--debug` 플래그 사용 가능.
`[targets..]`를 지정하지 않으면 `sd.config.ts`에 정의된 전체 패키지 대상으로 실행된다.
타겟은 패키지 경로로 지정한다 (예: `packages/core-common`, `tests/orm`).

### 개발

​```bash
pnpm dev [targets..]                     # client+server 패키지 개발 모드 실행
pnpm dev packages/solid-demo             # 특정 패키지만 dev 모드
pnpm dev -o key=value                    # sd.config.ts에 옵션 전달

pnpm watch [targets..]                   # 라이브러리 패키지 빌드 워치 모드
pnpm watch packages/core-common          # 특정 패키지만 워치
​```

### 빌드 & 배포

​```bash
pnpm build [targets..]                   # 프로덕션 빌드
pnpm build packages/solid                # 특정 패키지만 빌드

pnpm pub [targets..]                     # 빌드 후 배포 (npm/sftp)
pnpm pub --no-build                      # 빌드 생략하고 배포만
pnpm pub --dry-run                       # 실제 배포 없이 시뮬레이션
​```

### 코드 품질 검사

​```bash
pnpm typecheck [targets..]               # TypeScript 타입 체크
pnpm lint [targets..]                    # ESLint + Stylelint 실행
pnpm lint:fix [targets..]               # 린트 자동 수정 (--fix)
pnpm check [targets..]                   # 전체 검사 (typecheck + lint + test 병렬)
pnpm vitest [targets..]                  # vitest 워치 모드
pnpm vitest run [targets..]              # 테스트 1회 실행
​```

## 아키텍처

의존 방향: 위 → 아래. `core-common`은 내부 의존 없는 leaf 패키지.

​```
Apps:     solid-demo (client) / solid-demo-server (server)
UI:       solid (SolidJS + Tailwind)
Service:  service-server (Fastify) / service-client / service-common
ORM:      orm-node (MySQL/PostgreSQL/MSSQL) / orm-common
Core:     core-common (neutral) / core-browser / core-node
Tools:    sd-cli, lint, excel, storage, sd-claude, mcp-playwright
​```


## 통합 테스트

`tests/` 폴더에 위치. `pnpm vitest run tests/orm` 등으로 실행.

- `tests/orm` — DB 커넥션, DbContext, 이스케이프 테스트 (MySQL, PostgreSQL, MSSQL). Docker 필요.
- `tests/service` — 서비스 클라이언트-서버 통신 테스트.

## 코딩 규칙

- `import type` 필수 (`verbatimModuleSyntax`), `#private` 금지 → `private` 사용                                                                             
- `console.*` 금지, `if (str)` 금지 → `str !== ""` 명시 비교 (nullable boolean/object는 허용)                                                               
- `Buffer` 금지 → `Uint8Array`, `events` 금지 → `@simplysm/core-common`의 `EventEmitter`                                                                    
- SolidJS: props 구조 분해 금지, `.map()` 대신 `<For>`, `className` 대신 `class`                                                                            
- Prettier: 100자, 2칸 스페이스, 세미콜론, trailing comma, LF
```

## Step 5: 완료 안내

생성이 완료되면 아래를 출력하라:

```
CLAUDE.md가 생성되었습니다. 커밋하려면 /sd-commit 을 실행하세요.
```
