# CLAUDE.md — `@simplysm/sd-cli`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

모노레포 전체의 **빌드/배포 오케스트레이터**. tsc/eslint/esbuild/Angular ngtsc/Capacitor/Electron/PWA 어댑터를 한 CLI 로 묶고, watch/dev/build/check/typecheck/lint/publish/replace-deps/device 서브커맨드를 제공한다. 빌드 타겟 `node`.

`sd.config.ts` 의 `packages` 키 = 권위 있는 빌드 타겟 매니페스트. 스키마 정의는 `src/sd-config.types.ts`.

## 진입 흐름

`bin/sd-cli` → `src/sd-cli.ts` → `src/sd-cli-entry.ts`(yargs).

- **Dev (`tsx` + `.ts`)**: CPU affinity/priority 세팅 후 `sd-cli-entry` 직접 import.
- **Prod (`.js`)**: ① `replaceDeps` 인라인(node_modules 의 `@simplysm/*` → 로컬 소스 심링크) ② 서브프로세스로 `sd-cli-entry.js` 재실행(모듈 캐시 분리, `--max-old-space-size=8192`).

## 구조

| 경로                       | 내용                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `commands/`                | 서브커맨드 — `build`, `check`, `dev`, `device`, `lint`, `typecheck`, `watch`, `replace-deps`, `publish/` (version-upgrade → git-phase → npm/local/storage publisher → deployment → post-publish, env-utils 포함). |
| `engines/`                 | 빌드 엔진 — `BaseEngine`, `TscEngine`, `NgtscEngine`(Angular), `EsbuildClientEngine`(client/browser), `ServerEsbuildEngine`(server). `engine-factory` 로 패키지 타입에 따라 분기. |
| `orchestrators/`           | 엔진 묶음 — `BuildOrchestrator`, `DevOrchestrator`, `WatchOrchestrator`, `TypecheckOrchestrator`, `ServerRuntimeManager`(서버 dev 재시작). |
| `dev-server/`              | `dev-http-server`, `hmr-service`, `hmr-client-script`(client 빌드 시 인라인 주입).                |
| `angular/`                 | ngtsc 통합·Vite/esbuild 플러그인·SCSS·HMR 후보 추적.                                              |
| `esbuild/`                 | esbuild config·플러그인 모음 — Angular compiler, postcss, scss, tsc, worker, PWA, indexHtml. `lmdb-cache-store` 로 영속 캐시. |
| `ts-compiler/SdTsCompiler.ts` | TS 단일 컴파일러 추상 — engines 가 공통 사용.                                                  |
| `typecheck/`               | 비-패키지 영역(`tests/*` 등) typecheck 보조.                                                      |
| `lint/`                    | ESLint 호출 래퍼(워크스페이스 단위 + 캐시).                                                       |
| `capacitor/`               | Android(Studio) 통합·아이콘·config 작성.                                                          |
| `electron/`                | Electron 패키징.                                                                                  |
| `runtime/`                 | watch 이벤트·재빌드 큐·시그널·로거 등 런타임 보조.                                                 |
| `workers/`                 | 빌드/lint/server-runtime worker — 무거운 처리는 worker_threads 로 분리.                           |
| `deps/replace-deps/` / `deps/server-externals/` | npm 산출물에서 워크스페이스 의존 풀어내기 / 서버 external 결정.                |
| `utils/`                   | 공용 — sd-config 로딩, package 분류, tsconfig 해석, env, shell spawn 등.                          |
| `sd-config.types.ts`       | **권위 있는 설정 스키마**. 타입 변경 = 사용자 코드 호환 영향이므로 신중.                          |

## 작업 시 주의

- 직접 `tsc`/`eslint`/`vite`/`esbuild` 호출 금지(루트 hook 으로 차단). 새 동작은 엔진/오케스트레이터로 통합.
- env 주입:
  - **client** 타겟: esbuild `define` 으로 컴파일 타임 치환 → `tests/sd-cli-client` 가 검증.
  - **server** 타겟: esbuild `banner` 로 런타임 `process.env` 세팅 → `tests/sd-cli-server` 가 검증.
- 새 서브커맨드: `commands/<name>.ts` 추가 + `sd-cli-entry.ts` yargs 등록 + 필요시 orchestrator 추가.
- worker 들은 dev(tsx) / prod(js) 양쪽에서 동작해야 한다. 새 worker 추가 시 entry 결정 로직(`shared-worker-lifecycle`) 확인.
- 영속 캐시(`lmdb-cache-store`)는 빌드 결과 재사용에 핵심. invalidation 키에 새 입력을 추가하는 걸 빠뜨리지 마라.
