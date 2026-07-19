# Plan: cc 런처 패키지

## 0. 메타데이터

| 항목      | 내용                                                                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan ID   | PLAN-260718234707                                                                                                                                                                                           |
| Plan 상태 | Ready                                                                                                                                                                                                       |
| 생성 시각 | 2026-07-18 23:47:07                                                                                                                                                                                         |
| 제목      | cc 런처 패키지                                                                                                                                                                                              |
| 대상 범위 | 신규 `packages/cc`, `packages/sd-cli`(빌드 파이프라인 복사 기능), 루트 `sd.config.ts`                                                                                                                       |
| 근거 자료 | 사용자 발언(대화 확정 6건), `C:\Users\kslhunter\Documents\PowerShell\Microsoft.PowerShell_profile.ps1` 의 `cc` 함수, `packages/sd-cli/src/**`, `plugins/sd/**`, `plugins/sd-wiki/**`, Claude Code 공식 문서 |
| 작성 원칙 | 근거 없는 항목은 `[OPEN]`, 구현은 별도 지시 전까지 보류                                                                                                                                                     |
| 실행 규약 | TASK 는 §8 의 순서·의존대로 실행함. 선행 의존 TASK 가 Done 되기 전 후속 착수 금지, §8 `병렬 가능` 인 무의존 TASK 는 동시 진행 가능. 각 TASK 완료 즉시 상태를 `Done (yyyy-MM-dd)` 로 갱신함                  |

## 1. 목표·문제·완료 정의

- 목표: 사용자의 PowerShell 프로필 `cc` 함수를 `@simplysm/cc` npm 패키지로 만들어 직원들이 `mise use -g npm:@simplysm/cc` 한 줄로 동일한 Claude Code 실행 환경을 갖게 함.
- 해결할 문제:
  - `cc` 가 개인 PowerShell 프로필에만 존재해 직원에게 배포 수단이 없음.
  - 함수 안에 `d:\workspaces-14\simplysm\...` 절대경로 3곳(`--plugin-dir` 2, `--system-prompt-file` 1)이 박혀 있어 저장소를 clone 하지 않은 PC 에서 동작 불가.
- 완료 정의:
  - `@simplysm/cc` 가 npm 에 배포되고, 저장소를 clone 하지 않은 Windows PC 에서 `mise use -g npm:@simplysm/cc` 후 임의 디렉터리에서 `cc` 실행 시 sd·sd-wiki 플러그인과 sd output-style 이 적용된 Claude Code 가 뜸.
  - 배포물에 두 플러그인 복사본이 실제로 포함됨이 테스트로 보증됨.
- 성공 시 관찰 가능한 변화: 직원 세션 시작 시 sd/sd-wiki 의 SessionStart 훅 주입(ROOT MAP·references 안내)이 나타나고, `/plugin` 목록에 `sd`·`sd-wiki` 가 보임.

## 2. 범위 / 비범위 / 제약

### 2.1 범위

| ID        | 포함 항목                                                                                         | 근거                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| SCOPE-001 | `packages/cc` 신설 — `cc` bin 엔트리, 프로필 `cc` 함수와 동일한 환경변수·CLI 인자로 `claude` 실행 | 사용자 발언("cc 라는 명령어로 claude code 실행하는 패키지", "저 powershell 의 cc 에 가까움") |
| SCOPE-002 | `sd-cli` 빌드 파이프라인에 **패키지 외부 경로 → 패키지 dist 복사** 기능 추가                      | 사용자 발언("당연히 sd-cli 로 할거임"), FIND-003 (현 파이프라인에 해당 기능 없음)            |
| SCOPE-003 | `plugins/sd`·`plugins/sd-wiki` 복사본을 `cc` 배포물에 포함하고 `--plugin-dir` 로 지정             | DEC-002                                                                                      |
| SCOPE-004 | `plugins/sd/output-styles/sd.md` 복사본을 `--system-prompt-file` 로 지정                          | 프로필 `cc` 함수 81행                                                                        |
| SCOPE-005 | `sd.config.ts` 에 `cc` 패키지 등록(`target: "node"`, `publish: { type: "npm" }`)                  | CLAUDE.md "새 배포 패키지를 추가할 때는 sd.config.ts 의 packages 에 등록한다"                |
| ~~SCOPE-006~~ | ~~직원용 설치·사용 안내 README~~ → 철회 | 사용자 지시로 제외 |

### 2.2 비범위

| ID           | 제외 항목                                                               | 제외 이유                                                                                                                           | 후속 처리                                           |
| ------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| NONSCOPE-001 | `claude` 본체(`@anthropic-ai/claude-code`) 동봉                         | 사용자 발언("claude 는 무조건 설치임")                                                                                              | 없음                                                |
| NONSCOPE-002 | `claude`·`bun`·`python` 존재 사전 검사                                  | 사용자 발언("검사 안해도 됨. 회사 기본적으로 mise 에 bun python node pnpm 필수")                                                    | 없음                                                |
| NONSCOPE-003 | macOS/Linux 지원 (OS 감지·Bash 도구 분기)                               | 사용자 발언("전원 Windows")                                                                                                         | 직원 OS 구성이 바뀌면 재검토                        |
| NONSCOPE-004 | `ccc`·`cc_back`·`cdx` 등 프로필의 다른 함수 이식                        | 사용자 요청 대상은 `cc` 하나                                                                                                        | 필요 시 별도 요청                                   |
| NONSCOPE-005 | 두 플러그인 `package.json` 의 `files` 수정                              | DEC-002 로 복사 방식 채택 → Pi 배포용 `files` 를 건드릴 필요 없음 (CLAUDE.md 방침 유지)                                             | 없음                                                |
| NONSCOPE-006 | `sd-estimate`/`sd-proposal` SKILL 의 cwd 상대경로 python 호출 결함 수정 | 복사와 무관하게 원본에서도 이미 깨져 있는 기존 문제 (FIND-007)                                                                      | 별도 이슈로 처리                                    |
| NONSCOPE-007 | 사용자 본인의 PowerShell `cc` 함수 제거·대체                            | 사용자 발언("plugin 개발자인 나는 그냥 저 powershell 의 cc 를 쓸거고")                                                              | 없음                                                |
| NONSCOPE-008 | `WatchOrchestrator`(watch 모드) 의 외부 경로 복사 연동                  | `cc` 는 배포용 런처라 watch 개발 대상이 아니며, watch 지원 요구가 사용자 발언·조사 어디에도 없음. sd-cli 공용 코드 변경 표면을 줄임 | OPEN-001 — 사용자 확인 후 필요하면 TASK-001 에 추가 |

### 2.3 제약

| ID             | 제약                                                                                                          | 영향                                                              | 근거                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| CONSTRAINT-001 | `BuildOrchestrator` 는 패키지 경로를 `packages/<name>` 으로 하드코딩함                                        | `cc` 는 반드시 `packages/` 하위여야 함. `plugins/` 하위 배치 불가 | `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts:102,265,313,366`                                  |
| CONSTRAINT-002 | 기존 `copySrc` 는 소스가 `<pkgDir>/src` 로 고정되어 저장소 루트 기준 외부 경로 복사 불가                      | 신규 설정 필드 + 유틸 파라미터화 필요                             | `packages/sd-cli/src/utils/copy-src.ts:11-13`, `sd-config.types.ts:73-82`                                 |
| CONSTRAINT-003 | 빌드 시작 시 `_cleanDist` 가 `dist` 를 통째로 삭제함                                                          | 복사는 엔진 빌드 완료 **후** 시점에 수행해야 함                   | `BuildOrchestrator.ts:206→101`, 기존 `copySrc` 호출 위치 `:312-316`                                       |
| CONSTRAINT-004 | `publish` 는 패키지 **루트**에서 `pnpm publish` 를 실행하며 실제 배포물은 `package.json` 의 `files` 가 결정함 | 복사 산출 디렉터리가 `files` 에 포함되어야 함                     | `packages/sd-cli/src/commands/publish/npm-publisher.ts:29`, `publish-command.ts:80,97,105`                |
| CONSTRAINT-005 | `plugins/*/node_modules` 의 `typebox` 는 저장소 루트 `node_modules/.pnpm` 을 가리키는 심볼릭 링크임           | 복사 시 반드시 제외. 따라가면 무관한 트리가 복제됨                | FIND-005                                                                                                  |
| CONSTRAINT-006 | mise npm backend 는 `--ignore-scripts=true` 를 기본 적용함                                                    | `cc` 설치 시 postinstall 로 무언가를 내려받는 설계 불가           | https://mise.jdx.dev/dev-tools/backends/npm.html                                                          |
| CONSTRAINT-007 | 두 플러그인의 훅 14개(sd 9 + sd-wiki 5)는 전부 `bun` 으로 실행됨                                              | 직원 PC 에 bun 필수 (회사 mise 표준으로 충족됨 — ASM-001)         | `plugins/sd/hooks/hooks.json:9,18,29,38,49,61,65,75,85`, `plugins/sd-wiki/hooks/hooks.json:8,12,16,20,30` |

## 3. 조사 요약

| ID       | 조사 관점 | 확인 내용                                                                                                                                                                                                                                                                                                                                                                              | 근거                                                                                                           | plan 반영                                   |
| -------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| FIND-001 | 외부 근거 | `--plugin-dir` 플러그인이 marketplace 설치본과 **같은 `name`** 이면 그 세션에서 로컬 복사본이 우선하고 설치본은 로드되지 않음. 중복 로드 아님                                                                                                                                                                                                                                          | https://code.claude.com/docs/en/plugins — "the local copy takes precedence for that session"                   | DEC-002 채택 근거                           |
| FIND-002 | 외부 근거 | mise npm backend 는 scoped 패키지를 지원함 (`mise use --global npm:@anthropic-ai/claude-code` 가 공식 예시)                                                                                                                                                                                                                                                                            | https://mise.jdx.dev/getting-started.html, https://mise.jdx.dev/dev-tools/backends/npm.html                    | DEC-001 실현성 확인                         |
| FIND-003 | 코드 패턴 | sd-cli 에 "저장소 루트의 임의 폴더 → 패키지 dist 복사" 기능 **없음**. `copySrc`(`<pkgDir>/src` 고정)와 `copyPublic`(server/client 전용)만 존재                                                                                                                                                                                                                                         | `packages/sd-cli/src/utils/copy-src.ts:11`, `copy-public.ts:16`                                                | SCOPE-002, TASK-001                         |
| FIND-004 | 코드 패턴 | node 타겟 라이브러리는 tsc 파일 단위 emit 으로 `<pkgDir>/dist` 평면 구조 산출. `dist/package.json` 생성·`files`/`bin`/`exports` 가공 없음(server 타겟만 예외)                                                                                                                                                                                                                          | `BuildOrchestrator.ts:193-316`, `workers/library-build.worker.ts:115`, `utils/output-path-rewriter.ts:116-148` | TASK-002 산출 경로 설계                     |
| FIND-005 | 리스크    | 두 플러그인은 저장소 밖에서 자립 동작함 — 훅·shared 의 import 는 `node:*` + 플러그인 내부 상대경로뿐, 하드코딩 절대경로 0건, 상위 탈출 참조 0건. 단 `node_modules/typebox` 는 루트를 가리키는 심링크                                                                                                                                                                                   | `plugins/sd/hooks/*.ts`, `plugins/sd-wiki/hooks/*.ts`, `plugins/*/shared/*.ts` 전체 import 문                  | DEC-002, CONSTRAINT-005, DEC-007(제외 목록) |
| FIND-006 | 코드 패턴 | 훅은 전부 `bun "${CLAUDE_PLUGIN_ROOT}/hooks/<파일>.ts"` 형식. 경로 변수만 사용하므로 복사본 위치가 어디든 유효                                                                                                                                                                                                                                                                         | `plugins/sd/hooks/hooks.json:9,18,29,38,49,61,65,75,85`, `plugins/sd-wiki/hooks/hooks.json:8,12,16,20,30`      | DEC-002                                     |
| FIND-007 | 리스크    | `sd-estimate/SKILL.md:108,110`·`sd-proposal/SKILL.md:15,60` 의 python 호출이 `${CLAUDE_PLUGIN_ROOT}` 없는 cwd 상대경로 — 원본에서도 이미 깨진 상태                                                                                                                                                                                                                                     | 해당 SKILL.md 줄                                                                                               | NONSCOPE-006                                |
| FIND-008 | 코드 패턴 | 이 저장소의 CLI 패키지 선례는 `sd-cli` 하나이며 `bin` 을 최상위가 아닌 **`publishConfig.bin`** 에 둠. `pnpm pack` tarball 검증 회귀 테스트가 존재                                                                                                                                                                                                                                      | `packages/sd-cli/package.json:12-25`, `packages/sd-cli/tests/commands/publish-manifest.acc.spec.ts:47-65`      | DEC-005, TEST-003                           |
| FIND-009 | 코드 패턴 | 패키지 내부 정적 파일 경로 해석 선례: `import.meta.url` → dist/src 여부 판정 → 패키지 루트 기준 해석                                                                                                                                                                                                                                                                                   | `packages/sd-cli/src/commands/init/template-paths.ts:1-8`, `packages/core-node/src/worker/worker.ts:42`        | DEC-006                                     |
| FIND-010 | 리스크    | `session-start-statusline.ts` 는 `<pluginRoot>/hooks/assets/statusline.ts` 를 `~/.claude/sd/statusline.ts` 로 복사함(size/mtime 상이 시). `~/.claude/settings.json` 의 `statusLine` 은 값이 같거나 레거시 python 명령이 아니면 건드리지 않으며, 명령 문자열이 pluginRoot 와 무관한 고정 경로라 원본·복사본이 같은 값을 씀 → **settings.json 경합은 없고 자산 파일만 재복사될 수 있음** | `plugins/sd/hooks/session-start-statusline.ts:33-47,65-75`                                                     | RISK-002                                    |
| FIND-011 | 요구·자료 | `--plugin-dir` 로 로드해도 Claude Code 가 `CLAUDE_PLUGIN_ROOT` 를 주입함 — 현재 세션이 그 방식으로 실행 중이며 sd-wiki ROOT MAP 훅(env 폴백 없음)이 정상 주입됨                                                                                                                                                                                                                        | 현재 세션 SessionStart 출력, `plugins/sd-wiki/hooks/session-start-rootmap.ts:16,28`                            | ASM-002                                     |

## 4. 대안·결정 로그

| ID      | 결정 상태 | 맥락                                                                            | 선택지                                                                               | 결정                                                                                                                                   | 근거                                                                                                                                                                                                                             | 결과·트레이드오프                                                        | 재검토 조건                                 |
| ------- | --------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| DEC-001 | Accepted  | 배포·설치 형태                                                                  | ①npm 전역(mise) ②모노레포 로컬 스크립트 ③프로필 함수 유지                            | ① npm 전역 배포, `mise use -g npm:@simplysm/cc` 로 설치                                                                                | 사용자 확정. 대상이 저장소를 clone 하지 않은 직원 PC (FIND-002 로 실현성 확인)                                                                                                                                                   | 저장소 없이 동작. 갱신은 재배포 필요                                     | —                                           |
| DEC-002 | Accepted  | 플러그인·프롬프트 경로 해결                                                     | ①로컬 저장소 경로 설정 ②`cc` 배포물에 플러그인 복사본 동봉 ③marketplace 로 각자 설치 | ② 복사본 동봉 후 `--plugin-dir` 로 지정                                                                                                | 사용자 확정("plugin 개발자인 나는 powershell cc 를 쓸거고, 직원들 쓰라고 만드는 것"). 직원은 플러그인을 수정하지 않으므로 즉시 반영 요구 없음. FIND-001 로 marketplace 설치본과의 충돌 없음 확인. FIND-005 로 복사본 자립성 확인 | `cc` 설치 한 번으로 전원 동일 버전. 플러그인 수정은 `cc` 재배포로만 반영 | 직원이 플러그인 자체를 개발하게 되면 재검토 |
| DEC-003 | Accepted  | `claude` 본체 포함 여부                                                         | ①의존성 동봉 ②PATH 호출                                                              | ② PATH 의 `claude` 호출                                                                                                                | 사용자 확정("claude 는 무조건 설치임")                                                                                                                                                                                           | 직원이 claude 를 각자 최신으로 관리                                      | —                                           |
| DEC-004 | Accepted  | 실행 옵션 구성                                                                  | ①프로필 `cc` 그대로 ②직원용으로 완화                                                 | ① 환경변수·CLI 인자 전부 그대로 (`--dangerously-skip-permissions` 포함, PowerShell 도구 전제 유지)                                     | 사용자 확정(전원 Windows, 권한 스킵 유지). `sd` 플러그인의 `check-shell`·`check-write` 훅이 위험 동작을 이미 차단                                                                                                                | 직원도 확인 프롬프트 없이 진행. 훅이 유일한 방어선                       | 직원 OS 구성 변경 시                        |
| DEC-005 | Accepted  | bin 선언 위치                                                                   | ①최상위 `bin` ②`publishConfig.bin`                                                   | ② `publishConfig.bin`                                                                                                                  | 저장소 내 유일한 CLI 선례 `sd-cli` 와 동일 (FIND-008). 빌드 전 `dist/cc.js` 부재 상태에서도 워크스페이스 설치가 깨지지 않음                                                                                                      | pnpm pack 시 최상위로 승격됨. tarball 검증 테스트 필요                   | —                                           |
| DEC-006 | Accepted  | 복사본 런타임 경로 해석                                                         | ①`import.meta.url` 기준 ②cwd 기준 ③환경변수                                          | ① `import.meta.url` 기준으로 패키지 내부 경로 해석                                                                                     | `template-paths.ts:1-8` 선례 (FIND-009). 전역 설치 후 임의 cwd 에서 실행되므로 cwd 기준은 불가                                                                                                                                   | 개발(ts)·배포(dist js) 양쪽에서 동작                                     | —                                           |
| DEC-007 | Accepted  | 복사 제외 대상                                                                  | —                                                                                    | `node_modules`(심링크), `.cache`, `__pycache__`, `*.tsbuildinfo`, `tsconfig.json`, `package.json`, `extensions`(pi 전용), `tests` 제외 | FIND-005 — Claude Code 런타임이 참조하지 않음. `node_modules` 는 CONSTRAINT-005 로 반드시 제외                                                                                                                                   | 배포물 크기 최소화, 심링크 사고 방지                                     | —                                           |
| DEC-008 | Accepted  | 런타임 사전 검사                                                                | ①`claude`·`bun` 검사 ②python 포함 검사 ③검사 없음                                    | ③ 검사 없음                                                                                                                            | 사용자 확정("회사 기본적으로 mise 에 bun python node pnpm 은 필수로 들어감. 이게 없으면 코딩 자체가 안됨")                                                                                                                       | 코드 단순. 전제 미충족 PC 에서는 원인 파악이 어려움 (ASM-001 이 깨질 때) | 사내 mise 표준이 바뀌면 재검토              |
| DEC-009 | Accepted  | 복사 기능 구현 위치                                                             | ①sd-cli 빌드 파이프라인 ②`prepack` 스크립트                                          | ① sd-cli 빌드 파이프라인에 신규 설정 필드로 추가                                                                                       | 사용자 확정("당연히 sd-cli 로 할거임"). 현행 `packages/*` 중 `prepack` 사용 패키지 없음 (FIND-003)                                                                                                                               | watch 모드에서도 일관 동작. sd-cli 공용 코드 변경이므로 회귀 위험        | —                                           |
| DEC-010 | Rejected  | 두 플러그인 `package.json` 의 `files` 에 `.claude-plugin`·`hooks`·`agents` 추가 | —                                                                                    | 기각                                                                                                                                   | DEC-002 로 복사 방식을 채택해 불필요해짐. CLAUDE.md 의 "plugins/sd/package.json 은 Pi 배포용, Claude Code 전용 폴더를 넣을 필요 없다" 방침 유지                                                                                  | Pi 배포물이 그대로 유지됨                                                | 플러그인을 npm 경유로 배포할 필요가 생기면  |

## 5. 영향도 분석

| ID         | 대상                                                                     | 영향 유형 | 영향 내용                                                                                                         | 위험도 |
| ---------- | ------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------- | ------ |
| IMPACT-001 | `packages/sd-cli/src/sd-config.types.ts` (`SdBuildPackageConfig`:73-82)  | 수정      | 외부 경로 복사 설정 필드 추가                                                                                     | Low    |
| IMPACT-002 | `packages/sd-cli/src/utils/copy-src.ts`                                  | 수정      | srcDir/distDir 하드코딩(:12-13) 파라미터화. 기존 `copySrcFiles` 호출부 동작 불변 유지                             | Medium |
| IMPACT-003 | `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts` (:312-316 인근) | 수정      | 엔진 빌드 완료 후 외부 경로 복사 단계 추가 (CONSTRAINT-003)                                                       | Medium |
| IMPACT-004 | [N/A] — watch 모드 연동은 NONSCOPE-008 로 제외                           | —         | —                                                                                                                 | —      |
| IMPACT-005 | `packages/cc/**`                                                         | 생성      | 신규 패키지 전체 (`package.json`, `src/cc.ts`, `src/invocation.ts`, `tests/`)                                             | Low    |
| IMPACT-006 | `sd.config.ts`                                                           | 수정      | `cc` 패키지 등록 + 복사 설정                                                                                      | Low    |
| IMPACT-007 | npm 레지스트리 `@simplysm/cc`                                            | 생성      | 신규 패키지 최초 배포. 루트 버전과 함께 배포됨                                                                    | Low    |
| IMPACT-008 | 직원 PC `~/.claude/sd/statusline.ts`, `~/.claude/settings.json`          | 설정      | `cc` 최초 실행 시 sd 훅이 statusline 자산을 홈에 복사하고, `statusLine` 이 미설정·레거시일 때만 설정함 (FIND-010) | Low    |

## 6. 가정 / OPEN / 리스크

### 6.1 가정

| ID      | 가정                                                                              | 근거 수준                                                                      | 틀렸을 때 영향                                                        | 확인 방법                                                | 구현 차단 여부 |
| ------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------------------- | -------------- |
| ASM-001 | 직원 PC 에 mise 로 `bun`·`python`·`node`·`pnpm` 과 `claude` 가 이미 설치되어 있음 | 확인됨 (사용자 발언)                                                           | 훅 12개 전부 실패, 원인 표시 없이 기능만 빠짐 (DEC-008 로 검사 안 함) | 직원 PC 에서 `bun --version`                             | Non-blocking   |
| ASM-002 | `--plugin-dir` 로 로드한 플러그인에도 `CLAUDE_PLUGIN_ROOT` 가 주입됨              | 확인됨 (FIND-011 — 현재 세션이 그 방식이며 env 폴백 없는 rootmap 훅이 동작 중) | statusline·wiki rootmap 훅이 조용히 비활성화                          | 배포 전 실제 `cc` 실행으로 ROOT MAP 주입 확인 (GATE-003) | Non-blocking   |
| ASM-003 | `@simplysm/cc` 패키지명이 npm 에서 사용 가능함                                    | 확인됨 — `npm view @simplysm/cc` 가 E404(미등록) 반환                          | 패키지명 변경 필요                                                    | 재확인 시 동일 명령                                      | Non-blocking   |

### 6.2 OPEN

| ID       | 질문·미정 사항                                                 | 선택지                                     | 추천안                                                               | 차단 여부                       | 해결 후 반영 위치                            |
| -------- | -------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- | ------------------------------- | -------------------------------------------- |
| OPEN-001 | watch 모드(`pnpm watch`)에서도 플러그인 복사가 동작해야 하는가 | ①불필요 — build 시에만 복사 ②watch 도 연동 | ① — `cc` 는 배포용 런처라 watch 개발 대상이 아니고, 요구 근거가 없음 | Non-blocking (현재 ①로 진행 중) | NONSCOPE-008, TASK-001 작업 내용, IMPACT-004 |

### 6.3 리스크

| ID       | 리스크                                                                                                                                           | 가능성 | 영향   | 예방·완화                                                                                              | 조기 경고 신호                               | 대응           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- | -------------- |
| RISK-001 | 빌드 복사 단계 누락·오설정으로 플러그인이 빠진 채 배포되어 직원 환경이 조용히 깨짐                                                               | Medium | High   | `pnpm pack` tarball 에 플러그인 필수 파일 존재를 검증하는 테스트 (TEST-003), 배포 전 게이트 (GATE-002) | 직원 세션에 ROOT MAP·references 주입이 안 뜸 | 재배포         |
| RISK-002 | 원본 플러그인(사용자 PowerShell `cc`)과 `cc` 복사본의 statusline 자산 버전이 다르면 `~/.claude/sd/statusline.ts` 가 세션마다 재복사됨 (FIND-010) | Medium | Low    | 사용자 본인만 해당. `settings.json` 경합은 없음. 내용이 같으면 재복사도 없음                           | statusline 표시가 세션마다 달라짐            | 한쪽만 사용    |
| RISK-003 | `copy-src.ts` 파라미터화가 기존 `copySrc` 사용 패키지의 빌드를 깨뜨림                                                                            | Low    | Medium | 기존 호출 시그니처 동작 보존 + 기존 동작 회귀 테스트 (TEST-001)                                        | 기존 패키지 dist 에 정적 파일 누락           | 롤백           |
| RISK-004 | 플러그인 수정이 `cc` 재배포 전까지 직원에게 반영되지 않아 사용자와 직원의 동작이 달라짐                                                          | High   | Low    | DEC-002 에서 수용한 트레이드오프. 루트 버전 동시 배포이므로 정기 배포로 해소                           | 직원이 최신 스킬을 못 씀                     | 배포           |
| RISK-005 | 복사 시 심링크(`typebox`)를 따라가 무관한 트리가 배포물에 포함됨                                                                                 | Low    | Medium | DEC-007 제외 목록에 `node_modules` 포함, 복사 구현에서 심링크 미추적                                   | tarball 크기 급증                            | 제외 패턴 수정 |

## 7. 작업 분해

### TASK-001: sd-cli 빌드 파이프라인에 패키지 외부 경로 복사 기능 추가

- TASK 상태: Done (2026-07-19)
- 목적: `sd.config.ts` 설정만으로 저장소 내 임의 경로를 패키지 `dist` 하위로 복사할 수 있게 함.
- 연결 근거: SCOPE-002, DEC-009, FIND-003, CONSTRAINT-002, CONSTRAINT-003
- 산출물: 복사 설정 타입, 복사 유틸, build·watch 오케스트레이터 연동, 테스트
- 변경 대상:
  - 반드시 변경: `packages/sd-cli/src/sd-config.types.ts`(`SdBuildPackageConfig`), `packages/sd-cli/src/utils/copy-src.ts`, `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts`
  - 변경 가능: `packages/sd-cli/tests/**`
  - 변경 금지: `packages/sd-cli/src/orchestrators/WatchOrchestrator.ts`(NONSCOPE-008), `packages/sd-cli/src/utils/copy-public.ts`(server/client 전용), `packages/sd-cli/src/commands/publish/**`, 기존 `copySrc` 를 쓰는 패키지들의 설정
- 현재 상태: 외부 경로 복사 기능 없음. `copySrcFiles(pkgDir, patterns)` 가 `<pkgDir>/src` → `<pkgDir>/dist` 로 고정(`copy-src.ts:11-13`).
- 작업 내용:
  - `SdBuildPackageConfig` 에 소스 경로(저장소 루트 기준)·대상 경로(dist 기준)·제외 패턴을 갖는 복사 설정 필드 추가.
  - `copy-src.ts` 의 srcDir/distDir 을 파라미터화하되 기존 `copySrcFiles`·`watchCopySrcFiles` 의 외부 동작은 불변 유지.
  - 심링크를 따라가지 않도록 복사 구현.
  - `BuildOrchestrator` 의 기존 `copySrc` 처리 지점(:312-316) 옆에 신규 복사 단계 추가 — `_cleanDist` 이후여야 함(CONSTRAINT-003).
  - watch 모드 연동은 하지 않음 (NONSCOPE-008, OPEN-001).
- 선행 작업: 없음
- 수용 기준: AC-001, AC-002
- 테스트·검증: TEST-001, GATE-001
- 원천 자료 반영: [N/A] — 입력에 spec bundle 없음
- 롤백 영향: sd-cli 공용 코드. 되돌리면 `cc` 빌드가 플러그인 없이 산출됨
- 구현 시 주의: 기존 `copySrc` 사용 패키지의 빌드 동작이 바뀌면 안 됨 (RISK-003)
- 정지 조건: 기존 `copySrc` 회귀 테스트가 깨지는데 원인이 불명확하면 중단하고 보고

### TASK-002: `packages/cc` 패키지 신설 및 런처 구현

- TASK 상태: Done (2026-07-19)
- 목적: 프로필 `cc` 함수와 동일한 환경변수·인자로 `claude` 를 실행하는 bin 엔트리를 만듦.
- 연결 근거: SCOPE-001, SCOPE-004, DEC-003, DEC-004, DEC-005, DEC-006, DEC-008
- 산출물: `packages/cc/package.json`, `packages/cc/src/cc.ts`, `packages/cc/tsconfig.json`, `packages/cc/tests/**`
- 변경 대상:
  - 반드시 변경: `packages/cc/**`(신규)
  - 변경 가능: `pnpm-lock.yaml`(워크스페이스 등록에 따른 갱신)
  - 변경 금지: `plugins/sd/**`, `plugins/sd-wiki/**`, 기존 `packages/*`
- 현재 상태: 패키지 없음. 동등 로직은 PowerShell 프로필 `cc` 함수(46-84행)에만 존재.
- 작업 내용:
  - shebang 을 가진 `src/cc.ts` 작성 — 아래 환경변수 22종을 설정하고 `claude` 를 CLI 인자와 함께 spawn, 사용자 인자를 그대로 전달, 종료코드 전파.
  - 환경변수 전수 (프로필 48-71행. 주석 처리된 `DISABLE_COST_WARNINGS` 는 제외):
    `CLAUDE_CODE_DISABLE_AGENT_VIEW=1`, `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`, `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS=1`, `DISABLE_TELEMETRY=1`, `DISABLE_ERROR_REPORTING=1`, `DISABLE_BUG_COMMAND=1`, `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1`, `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1`, `DISABLE_NON_ESSENTIAL_MODEL_CALLS=1`, `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION=0`, `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=0`, `DISABLE_AUTO_COMPACT=1`, `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1`, `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL=1`, `CLAUDE_CODE_ACCESSIBILITY=1`, `CLAUDE_CODE_DISABLE_CRON=1`, `CLAUDE_CODE_DISABLE_ARTIFACT=1`, `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, `CLAUDE_CODE_DISABLE_ATTACHMENTS=1`, `CLAUDE_CODE_NO_FLICKER=1`, `CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT=1`
  - 전달 인자 (프로필 74-83행): `--dangerously-skip-permissions`, `--tools "Agent,PowerShell,Grep,Glob,Read,Write,Edit,Skill,WebSearch,WebFetch"`, `--strict-mcp-config`, `--mcp-config '{"mcpServers":{}}'`, `--plugin-dir <sd 복사본>`, `--plugin-dir <sd-wiki 복사본>`, `--system-prompt-file <sd 복사본 output-styles/sd.md>`, `--settings '{"spinnerTipsEnabled":false,"terminalProgressBarEnabled":false}'`.
  - 플러그인·프롬프트 경로는 `import.meta.url` 기준으로 해석 (DEC-006, `template-paths.ts:1-8` 선례).
  - `package.json` — `type: module`, `publishConfig.bin` 에 `cc` → `./dist/cc.js`(DEC-005), `files` 에 복사 산출을 포함하는 `dist` 포함(CONSTRAINT-004).
- 선행 작업: 없음 (TASK-001 과 병렬 가능)
- 수용 기준: AC-003, AC-004
- 테스트·검증: TEST-002, GATE-001
- 원천 자료 반영: [N/A] — 입력에 spec bundle 없음
- 롤백 영향: 신규 패키지 삭제로 원복
- 구현 시 주의: Windows 에서 `claude` 는 `.cmd` 셰이퍼일 수 있으므로 spawn 방식이 이를 처리해야 함. 인자 전달 시 JSON 문자열이 셸에 의해 깨지지 않게 할 것
- 정지 조건: `claude` 실행 방식이 Windows 에서 인자 전달을 깨뜨리는데 우회가 불명확하면 중단하고 보고

### TASK-003: `sd.config.ts` 등록 및 배포물 검증

- TASK 상태: Done (2026-07-19)
- 목적: `cc` 를 빌드·배포 대상으로 등록하고, 배포물에 플러그인 복사본이 실제로 실린다는 것을 테스트로 고정함.
- 연결 근거: SCOPE-003, SCOPE-005, DEC-002, DEC-007, RISK-001, CONSTRAINT-004
- 산출물: `sd.config.ts` 갱신, tarball 검증 테스트
- 변경 대상:
  - 반드시 변경: `sd.config.ts`, `packages/cc/tests/**`
  - 변경 가능: `packages/cc/package.json`(`files` 조정)
  - 변경 금지: `plugins/*/package.json`(NONSCOPE-005), 다른 패키지의 `sd.config.ts` 항목
- 현재 상태: `sd.config.ts` 에 `cc` 항목 없음(4-22행).
- 작업 내용:
  - `sd.config.ts` 에 `"cc": { target: "node", publish: { type: "npm" }, <복사 설정> }` 추가. 복사 대상은 `plugins/sd`, `plugins/sd-wiki` 이고 제외는 DEC-007 목록.
  - `pnpm build -t cc` 로 실제 산출 확인.
  - `pnpm pack` tarball 검증 테스트 작성 (`publish-manifest.acc.spec.ts:47-65` 선례). 빌드 산출을 단언하므로 `pnpm build -t cc` 선행이 필요함 — 테스트 내부에서 빌드를 수행하거나 GATE-002 전용으로 분리할 것.
    - 포함 단언: 두 플러그인의 `.claude-plugin/plugin.json`, `hooks/hooks.json`, **`hooks/*.ts` 실체**, **`shared/`**, `skills/`, `agents/`(sd), `output-styles/sd.md`(sd), `references/`(sd), `rules/`·`cli/`(sd-wiki). `shared/` 누락 시 훅 14개가 전부 런타임 실패하므로 필수 단언임.
    - 제외 단언: `node_modules`, `extensions`, `__pycache__`, `.cache`, `*.tsbuildinfo` 미포함.
- 선행 작업: TASK-001, TASK-002
- 수용 기준: AC-005, AC-006
- 테스트·검증: TEST-003, GATE-002, GATE-003
- 원천 자료 반영: [N/A] — 입력에 spec bundle 없음
- 롤백 영향: `sd.config.ts` 항목 제거로 원복. 이미 npm 배포된 뒤라면 deprecate 필요
- 구현 시 주의: 복사 누락은 조용히 깨지므로 테스트는 "존재" 뿐 아니라 "제외 대상 부재" 도 함께 검증할 것 (RISK-001, RISK-005)
- 정지 조건: tarball 에 심링크 실체가 딸려오면 즉시 중단하고 제외 패턴 재검토

## 8. 실행 순서 / 의존관계

| 순서 | 작업     | 병렬 가능               | 순서 근거                                                               | 피해야 할 순서                                                     |
| ---- | -------- | ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1    | TASK-001 | 가능 (TASK-002 와 동시) | 복사 기능이 없으면 TASK-003 의 배포물 검증이 성립 불가                  | —                                                                  |
| 2    | TASK-002 | 가능 (TASK-001 과 동시) | 런처 구현은 복사 기능과 독립. 단 경로 규약은 TASK-003 에서 맞물림       | —                                                                  |
| 3    | TASK-003 | 불가                    | TASK-001 의 복사 기능과 TASK-002 의 패키지가 모두 있어야 등록·검증 가능 | TASK-001/002 완료 전 `sd.config.ts` 등록 (빌드가 깨진 상태로 남음) |

## 9. 수용 기준 / 테스트 전략 / 검증 게이트

### 9.1 수용 기준

| ID     | 연결 작업 | 조건                                                       | 관찰 가능한 결과                                                                                                                                                                                                                                  | 예외·오류 케이스                                                        |
| ------ | --------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| AC-001 | TASK-001  | `sd.config.ts` 에 외부 경로 복사 설정을 둔 패키지를 빌드함 | 지정 경로가 해당 패키지 `dist` 하위 지정 위치로 복사되고 제외 패턴이 적용됨                                                                                                                                                                       | 소스 경로가 존재하지 않으면 조용히 넘어가지 않고 오류로 실패함          |
| AC-002 | TASK-001  | 기존 `copySrc` 설정 패키지를 빌드함                        | 기존과 동일하게 `<pkgDir>/src` → `<pkgDir>/dist` 복사됨                                                                                                                                                                                           | —                                                                       |
| AC-003 | TASK-002  | 임의 디렉터리에서 `cc` 를 인자 없이 실행함                 | 프로필 `cc` 함수와 동일한 환경변수·인자로 `claude` 가 뜸                                                                                                                                                                                          | `claude` 부재 시 spawn 오류가 그대로 표면화됨(DEC-008 — 별도 검사 없음) |
| AC-004 | TASK-002  | `cc <추가인자>` 로 실행함                                  | 추가 인자가 `claude` 에 그대로 전달되고 `claude` 종료코드가 `cc` 종료코드로 전파됨                                                                                                                                                                | JSON 인자(`--mcp-config`·`--settings`)가 깨지지 않음                    |
| AC-005 | TASK-003  | `pnpm build -t cc` 실행                                    | `packages/cc/dist` 에 런처 js 와 두 플러그인 복사본이 함께 존재함                                                                                                                                                                                 | 반복 빌드 시 `_cleanDist` 이후에도 복사본이 남아 있음                   |
| AC-006 | TASK-003  | `pnpm build -t cc` 후 `pnpm pack` 으로 tarball 생성        | 두 플러그인의 `.claude-plugin/plugin.json`·`hooks/hooks.json`·`hooks/*.ts`·`shared/`·`skills/`·`agents/`(sd)·`output-styles/sd.md`(sd)·`references/`(sd)·`rules/`·`cli/`(sd-wiki) 포함, `node_modules`·`extensions`·`__pycache__`·`.cache` 미포함 | 심링크 실체가 포함되지 않음                                             |

### 9.2 테스트 전략

| ID       | 연결 작업                    | 수준           | 케이스                                                                                                           | 파일·명령                                                                                                                                                    | 통과 기준                            |
| -------- | ---------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| TEST-001 | TASK-001                     | unit           | 외부 경로 복사(제외 패턴·심링크 미추적) + 기존 `copySrc` 동작 회귀                                               | `packages/sd-cli/tests/utils/*.spec.ts`, `pnpm test --project sd-cli-server`                                                                                 | 신규·기존 케이스 전부 통과           |
| TEST-002 | TASK-002                     | unit           | 런처가 조립하는 인자 배열·환경변수가 프로필 `cc` 함수와 일치. 경로 해석이 dist/src 양쪽에서 패키지 내부를 가리킴 | `packages/cc/tests/*.spec.ts`, `pnpm test`                                                                                                                   | 인자·env 스냅샷 일치, 경로 존재 확인 |
| TEST-003 | TASK-003                     | integration    | `pnpm pack` tarball 내용물에 플러그인 필수 파일(`hooks/*.ts`·`shared/` 포함) 존재 / 제외 대상 부재               | `packages/cc/tests/*.acc.spec.ts` (`publish-manifest.acc.spec.ts` 방식). **`pnpm build -t cc` 선행 필수** — 빌드 산출을 단언하므로 클린 상태에서는 통과 불가 | 포함·제외 양방향 단언 통과           |
| TEST-004 | TASK-001, TASK-002, TASK-003 | typecheck/lint | 변경 패키지 전체                                                                                                 | `pnpm check --fix -t sd-cli -t cc`                                                                                                                           | 오류 0                               |

### 9.3 검증 게이트

| ID       | 시점                     | 검사 항목             | 명령·방법                                                                                                                                      | 통과 조건                  | 실패 시 행동           |
| -------- | ------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------- |
| GATE-001 | 각 TASK 완료 시          | 타입·린트·해당 테스트 | `pnpm check --fix -t sd-cli -t cc`, `pnpm test` (TEST-003 은 빌드 선행이 필요하므로 GATE-002 에서 검사)                                        | 전부 통과                  | 해당 TASK 로 복귀      |
| GATE-002 | TASK-003 완료 시         | 배포물 정합성         | `pnpm build -t cc` 후 `pnpm pack` tarball 검사 (TEST-003)                                                                                      | AC-006 충족                | 복사 설정·`files` 수정 |
| GATE-003 | 전체 완료 전 (배포 직전) | 실제 실행 검증        | 빌드 산출 상태에서 `cc` 를 실행해 sd·sd-wiki SessionStart 주입(ROOT MAP·references 안내)과 output-style 적용을 눈으로 확인 (ASM-002 확인 겸용) | 두 플러그인 훅이 모두 동작 | 원인 규명 후 보고      |

## 10. Rollout / Rollback

- Rollout 필요 여부: 필요
- Rollout 절차:
  1. GATE-001~003 통과.
  2. `pnpm pub` 으로 루트 버전과 함께 `@simplysm/cc` 최초 배포 (CLAUDE.md — 모든 npm 배포 패키지는 루트 버전에 맞춰 배포).
  3. 직원에게 `mise use -g npm:@simplysm/cc` 안내.
  4. 직원 1명 PC 에서 선행 확인 후 전체 안내.
- Rollback 가능 여부: 가능 (배포 전), 제한적 (배포 후)
- Rollback 절차: `sd.config.ts` 에서 `cc` 제거 + `packages/cc` 삭제 + sd-cli 변경 되돌림. 이미 배포된 버전은 `npm deprecate` 로 안내.
- Rollback 불가 지점: npm 배포 완료 이후 (동일 버전 재배포 불가)
- 관측 지표: 직원 세션에서 sd/sd-wiki 훅 주입 여부, `cc` 실행 실패 보고 건수
- 중단 조건: TASK-001 변경으로 기존 패키지 빌드가 깨지고 원인 규명이 안 될 때

## 11. Traceability 규칙

- 모든 `SCOPE` 는 최소 1개 `TASK` 와 연결함. (SCOPE-001·004·006→TASK-002, SCOPE-002→TASK-001, SCOPE-003·005→TASK-003)
- 모든 `TASK` 는 최소 1개 근거(`FIND`/`DEC`/`SCOPE`)와 연결함.
- 모든 `TASK` 는 최소 1개 `AC` 와 1개 검증 방법(`TEST` 또는 `GATE`)을 가짐.
- 연결되지 않은 작업은 삭제하거나 근거를 추가함.

## 12. 구현 전 차단 조건

| ID  | 차단 조건                                                 | 관련 OPEN/ASM/RISK | 필요한 결정 | 해결 담당 | 해결 후 갱신 위치 |
| --- | --------------------------------------------------------- | ------------------ | ----------- | --------- | ----------------- |
| —   | 없음 — Blocking `[OPEN]`·Blocking 가정 없음. 상태 `Ready` | —                  | —           | —         | —                 |
