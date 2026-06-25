# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

`simplysm` 모노레포. pnpm workspace 기반이며 `packages/*` 와 `tests/*` 두 곳을 워크스페이스로 둠. 모든 패키지는 단일 버전(현재 `14.0.x`)을 공유함.

자체 CLI(`@simplysm/sd-cli`)가 빌드/배포 오케스트레이터 역할을 함. 일반 도구(tsc/eslint/vite-build)를 직접 부르지 않고 `pnpm sd-cli ...` 로 통합함.

## 자주 쓰는 명령

루트에서:

| 명령                | 설명                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm watch`        | 워크스페이스 전체 watch 빌드                                                                    |
| `pnpm dev`          | 서버 패키지 dev 모드 실행                                                                       |
| `pnpm build`        | 프로덕션 빌드                                                                                   |
| `pnpm pub`          | 빌드 후 배포 (`sd.config.ts`의 `publish` 설정 따름)                                             |
| `pnpm pub:no-build` | 기존 빌드 산출물로 배포                                                                         |
| `pnpm check --fix`  | **기본 검증 명령** — typecheck + lint 한꺼번에, 자동수정 포함, -t 옵션으로 타겟프로젝트 선택    |
| `pnpm typecheck`    | `pnpm check` 에서 문제 났을 때 타입만 따로 보기 위함 (직접 `npx tsc` 호출은 훅으로 차단)        |
| `pnpm lint`         | `pnpm check` 에서 문제 났을 때 lint 만 따로 보기 위함 (직접 `npx eslint` 호출은 훅으로 차단)    |
| `pnpm test`         | Vitest 전체 (`--reporter=dot --silent=passed-only`)                                             |

타겟 한정·옵션 전달:

- `pnpm sd-cli <cmd> -t <package> -t <package2>` — 특정 패키지만. `<package>` 는 `sd.config.ts` 의 `packages` 키 (`@simplysm/` 접두사 **제외** 한 짧은 이름. 예: `excel`, `core-node`, `sd-cli`). 풀네임(`@simplysm/excel`) 사용 시 `Unknown target` 에러.
- `pnpm sd-cli <cmd> -o <opt>` — `sd.config.ts` 함수에 전달되는 `opt[]`.
- `pnpm sd-cli check --type lint --fix` — 자동 수정 lint.
- `pnpm sd-cli --help` — 모든 서브커맨드 통합 도움말.

단일 테스트: `pnpm exec vitest run <file-pattern>` 또는 `pnpm exec vitest run --project <node|browser|angular|sd-cli-server|sd-cli-client|orm|service> <pattern>`.

ORM 통합 테스트는 Docker DB 컨테이너 필요:

```
docker compose -f tests/orm/docker-compose.test.yml up -d   # mysql 23306, postgres 25432, mssql 21433
docker compose -f tests/orm/docker-compose.test.yml down
```

## 환경

- Node 20, pnpm 11, Python 3 (`mise.toml` 참조). `sd` 플러그인 훅이 Python 사용.
- TypeScript 경로 alias: `@simplysm/*` → `packages/*/src/index.ts`. 워크스페이스 내부 의존성은 빌드 없이 곧바로 소스 import 됨.
- ESM 전용 (`"type": "module"`), `verbatimModuleSyntax` 활성. type-only import 는 반드시 `import type` 로 작성.

## 아키텍처 핵심

### 빌드 타겟 (`sd.config.ts` → `packages` 키)

`sd-cli` 가 패키지마다 다음 타겟 중 하나로 빌드함:

- `node` / `browser` / `neutral` — esbuild 라이브러리 패키지. npm 배포용.
- `client` — Frontend 앱 (Angular + Capacitor/Electron + PWA 옵션). esbuild + define 으로 env 주입.
- `server` — Fastify 서버 앱. esbuild banner 로 env 주입, PM2 옵션.
- `scripts` — 유틸 패키지. `watch` 훅으로 임의 명령 실행 가능.

타입 정의는 `packages/sd-cli/src/sd-config.types.ts` 가 권위 있는 소스.

### sd-cli 진입 흐름

`packages/sd-cli/src/sd-cli.ts` → `sd-cli-entry.ts` (yargs).

1. **Dev 실행 (`tsx`, `.ts`)**: CPU affinity/priority 설정 후 `sd-cli-entry` 를 직접 import.
2. **Prod 실행 (`.js`)**: ① `replaceDeps` 인라인 처리(node_modules 의 패키지를 로컬 소스로 심링크) ② 서브프로세스로 `sd-cli-entry.js` 재실행 (모듈 캐시 분리, `--max-old-space-size=8192`).

서브커맨드 구현은 `packages/sd-cli/src/commands/` 에, 빌드 엔진/오케스트레이터는 `engines/`, `orchestrators/` 에 있음.

### sd 플러그인

sd-* 스킬·훅·레퍼런스는 Claude Code 플러그인(`plugins/sd/`)으로 제공되고, 팀 공용 원격 지식 위키는 별도 플러그인(`plugins/sd-wiki/`)으로 분리됨(목차 주입·조회 CLI·작성 규칙·인증 토큰). 둘 다 루트 `.claude-plugin/marketplace.json` 카탈로그에 등재. hook·skill 은 `${CLAUDE_PLUGIN_ROOT}` 기준으로 자기완결, 캐시·statusline 복제본과 위키 인증 토큰은 `${CLAUDE_PLUGIN_DATA}`. 개발 중엔 `claude --plugin-dir ./plugins/sd`(위키는 `./plugins/sd-wiki`) 로 로드(소스 편집 후 `/reload-plugins`). sd 의 rules(행동·설계)와 sd-wiki 의 rules(위키)는 각 SessionStart hook 이 `additionalContext` 로 주입하고, references 버전 폴더는 프로젝트의 `@simplysm/sd-cli` major 로 런타임 선택됨.

## Vitest 프로젝트 구조

`vitest.config.ts` 는 9 개 project 로 분리됨:

| project         | 환경                         | 대상                                                          |
| --------------- | ---------------------------- | ------------------------------------------------------------- |
| `node`          | node                         | core-node, sd-cli, lint, orm-node, service-server, storage 등 |
| `browser`       | chromium (playwright)        | core-browser, service-client 등                               |
| `angular`       | chromium + `sdAngularPlugin` | `packages/angular/tests` (TestBed)                            |
| `sd-cli-server` | node                         | `tests/sd-cli-server` (esbuild banner 주입 검증)              |
| `sd-cli-client` | node                         | `tests/sd-cli-client` (esbuild define 주입 검증)              |
| `ssg`           | node                         | `tests/ssg` — 빌드 타임 프리렌더(SSG)                         |
| `orm`           | node + globalSetup           | `tests/orm` — Docker DB 필요, `fileParallelism: false`        |
| `service`       | chromium + globalSetup       | `tests/service` — server+browser 통합                         |
| `service-server-acme` | node + globalSetup     | `tests/service-server-acme` — Let's Encrypt(pebble) 통합, Docker 필요 |

## 개발 시 주의사항

- 코드베이스 분석/변경에서 `.back/`, `.gitignore` 등재 경로(`.tmp`, `.logs`, `.tasks`, `.cache`, `node_modules`, `dist` 등)는 **사용자가 명시적으로 첨부하지 않는 한 읽지 않음**. 자세한 행동 지침은 `sd` 플러그인이 SessionStart 로 주입하는 행동·설계 규칙(`sd-behavior-rules`·`sd-design-rules`) 참조.
- Pre-tool 훅(`.claude/settings.json`)이 Edit/Write/Bash 호출 전 검증 수행. 훅 차단 시 우회하지 말고 원인 해결.
- ESLint 글로벌 무시: `plugins/sd/**`, `packages/sd-cli/src/commands/init/templates/**` (`@simplysm/lint/eslint-recommended` 에서 처리).
- `@simplysm/*` 패키지의 공개 API/동작 변경 시 `plugins/sd/references/simplysm<major>/apis/<패키지>/README.md` 갱신 필요 여부 검토.
- 기본 응답 언어는 한국어.
