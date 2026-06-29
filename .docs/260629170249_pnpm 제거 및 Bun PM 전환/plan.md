# Plan: pnpm 제거 및 Bun PM 전환

## 0. 메타데이터

| 항목 | 내용 |
| ---- | ---- |
| Plan ID | PLAN-260629170249 |
| 상태 | Implemented |
| 생성 시각 | 2026-06-29 17:02:49 |
| 제목 | pnpm 제거 및 Bun PM 전환 |
| 대상 범위 | simplysm 모노레포 루트 패키지 매니저 설정, `packages/sd-cli`의 pnpm 전용 로직, 관련 테스트·문서 |
| 근거 자료 | 사용자 발언: “pnpm 은 완전히 걷어내고 bun 으로 PM을 갈아치울까”, “실행기를 bun으로 바꾼다고 한 적 없음”, “sd-cli 안에서 pnpm 관련 로직들도 다 bun 용으로 변환”, “pnpm-workspaces 같은건 안쓰고 bun에 맞춰서 환경 구성”; 코드: `package.json`, `pnpm-workspace.yaml`, `mise.toml`, `packages/sd-cli/src/**`, `packages/sd-cli/tests/**`; 공식 문서: Bun Workspaces, bun install/update, Lockfile, Lifecycle scripts, bun pm, bun publish, Isolated installs |
| 작성 원칙 | 근거 없는 항목은 `[OPEN]`, 구현은 별도 지시 전까지 보류 |

## 1. 목표·문제·완료 정의

- 목표: pnpm과 `pnpm-workspace.yaml` 기반 구성을 제거하고, Bun package manager 기준(`package.json#workspaces`, `bun.lock`, Bun install/exec/publish/trust 흐름)으로 모노레포와 `sd-cli`를 전환한다.
- 해결할 문제: 현재 루트 스크립트, lockfile 해석, workspace 탐색, reinstall/build-script 승인, publish, Capacitor/Electron 내부 프로젝트 초기화가 pnpm에 직접 결합되어 있어 `pnpm` 제거 시 기능이 깨진다.
- 완료 정의:
  - 저장소의 실행·설정·코드·테스트·문서에서 의도적 pnpm 의존이 제거된다.
  - 루트 workspace 기준이 `package.json#workspaces`로 동작한다.
  - lockfile 기준이 `bun.lock`으로 동작한다.
  - `sd-cli`의 install/exec/publish/reinstall/capacitor/electron/init 흐름이 Bun PM 기준으로 동작한다.
  - 검증 명령이 Bun PM 기준으로 통과한다.
- 성공 시 관찰 가능한 변화:
  - `rg "\bpnpm\b|pnpm-lock|pnpm-workspace|allowBuilds|approve-builds"` 결과가 과거 검증 문서 등 보존 대상 외에는 남지 않는다.
  - 최초 전환은 `bun install`로 `bun.lock`을 생성하고, 이후 재현성 검증은 `bun ci`로 통과한다.
  - `bun run sd-cli ...` 계열 루트 명령이 기존 `pnpm ...` 명령 역할을 대체한다.

## 2. 범위 / 비범위 / 제약

### 2.1 범위

| ID | 포함 항목 | 근거 |
| -- | --------- | ---- |
| SCOPE-001 | 루트 PM 설정 전환: `package.json` scripts/workspaces, `pnpm-workspace.yaml` 제거, `pnpm-lock.yaml` → `bun.lock`, `mise.toml`의 pnpm 도구 제거 | 사용자 전환 요구, `package.json` scripts의 `pnpm sd-cli ...`, `pnpm-workspace.yaml`, `mise.toml: pnpm = "11"` |
| SCOPE-002 | Bun workspace 기준 공통 유틸 작성·적용: `package.json#workspaces`에서 workspace root 수집 | Bun 공식 Workspaces 문서: workspace는 root `package.json`의 `workspaces` 사용; 현재 `replace-deps`, publish, capacitor가 `pnpm-workspace.yaml` 의존 |
| SCOPE-003 | `bun.lock` 기반 locked dependency version resolver 작성·적용 | `server-production-files.ts`가 `pnpm-lock.yaml` 파싱으로 dist dependencies 버전을 생성 |
| SCOPE-004 | `sd-cli reinstall`을 Bun PM의 lock/install/trust 흐름으로 재설계 | `reinstall.ts`가 `pnpm-lock.yaml`, `allowBuilds`, `pnpm install`, `pnpm approve-builds`에 결합 |
| SCOPE-005 | `sd-cli`의 install/update/exec/publish 명령 호출을 Bun PM 기준으로 변경 | `init`, `init-client`, `capacitor`, `electron`, `npm-publisher`가 `shellSpawn("pnpm", ...)`를 사용하고, `init.ts`가 `pnpm up -r`을 실행 |
| SCOPE-006 | init 템플릿을 Bun PM 기준으로 변경 | `generators/root.ts`가 `pnpm-workspace.yaml` 복사, `workspace-root/mise.toml.hbs`가 pnpm 설치 |
| SCOPE-007 | 관련 테스트를 Bun PM 기준으로 갱신·보강 | `packages/sd-cli/tests/**`에 pnpm install/exec/workspace 기대값 존재 |
| SCOPE-008 | simplysm references와 작업 지침의 pnpm 명령 표기를 Bun PM 기준으로 갱신 | `CLAUDE.md`, `plugins/sd/references/simplysm14/**`에 pnpm 명령·pnpm-workspace 설명 존재 |

### 2.2 비범위

| ID | 제외 항목 | 제외 이유 | 후속 처리 |
| -- | --------- | --------- | --------- |
| NONSCOPE-001 | Bun 런타임으로 CLI/빌드 실행기 전환 | 사용자가 “실행기를 bun으로 바꾼다고 한 적 없음”이라고 명시 | 필요 시 별도 계획 |
| NONSCOPE-002 | `sd-cli.ts` production 실행의 `node` spawn, shebang `#!/usr/bin/env node` 변경 | 런타임 선택 문제이며 PM 전환과 별개 | 변경 금지 |
| NONSCOPE-003 | npm registry 배포 개념 제거 | `publish: { type: "npm" }`은 package manager가 아니라 배포 대상 레지스트리 의미 | 유지 |
| NONSCOPE-004 | `workspace:*` dependency protocol 제거 | Bun 공식 Workspaces 문서가 `workspace:*` 지원 및 publish 시 버전 치환을 명시 | 유지하되 publish dry-run으로 검증 |
| NONSCOPE-005 | `.back/`, `.git`, `node_modules`, `dist`, `coverage` 조사·수정 | 프로젝트/에이전트 지침상 사용자 명시 없이 제외 | 건드리지 않음 |

### 2.3 제약

| ID | 제약 | 영향 | 근거 |
| -- | ---- | ---- | ---- |
| CONSTRAINT-001 | pnpm 관련 로직은 `sd-cli` 내부까지 Bun PM 기준으로 변환해야 한다 | 호환 레이어를 만들더라도 pnpm fallback은 두지 않는다 | 사용자 발언: “sd-cli 안에서 pnpm 관련된 로직들도 다 bun 용으로 변환” |
| CONSTRAINT-002 | `pnpm-workspace.yaml`은 사용하지 않는다 | workspace root 탐색은 `package.json#workspaces`로 바뀐다 | 사용자 발언: “pnpm-workspaces 같은건 안쓰고 bun에 맞춰서 환경 구성” |
| CONSTRAINT-003 | pnpm lock migration은 `pnpm-lock.yaml`이 남아 있고 `bun.lock`이 없는 상태에서 먼저 수행해야 한다 | 파일 삭제 순서를 잘못 잡으면 기존 해상도 보존 근거가 사라진다 | Bun install 문서: `pnpm-lock.yaml` 감지 시 `bun.lock` 자동 migration, migration 후 pnpm 파일 제거 가능 |
| CONSTRAINT-004 | Bun `trustedDependencies`를 명시하면 기본 trusted list를 대체한다 | pnpm `allowBuilds` 목록만 그대로 넣으면 Bun 기본 trusted dependency가 빠질 수 있다 | Bun Lifecycle scripts 문서: `trustedDependencies` defined list replaces default list |
| CONSTRAINT-005 | Bun workspace migration은 workspace monorepo에서 isolated linker 기본값을 사용할 수 있다 | flat `node_modules`를 가정하는 코드·테스트는 검증 필요 | Bun Isolated installs 문서: pnpm migration은 configVersion=1, workspaces 기본 isolated |
| CONSTRAINT-006 | 기존 lock/manifest 조사는 `node_modules`가 아니라 lock 파일과 package manifest 기준으로 수행한다 | node_modules 구조를 사실 근거로 삼지 않는다 | 프로젝트 지침 |

## 3. 조사 요약

| ID | 조사 관점 | 확인 내용 | 근거 | plan 반영 |
| -- | --------- | --------- | ---- | --------- |
| FIND-001 | 요구·자료 | 사용자는 Bun 런타임 전환이 아니라 pnpm 제거와 Bun package manager 전환을 요구한다 | 사용자 발언 | NONSCOPE-001, NONSCOPE-002, DEC-001 |
| FIND-002 | 루트 설정 | 루트 scripts가 `pnpm sd-cli ...`를 사용하고, 루트 `package.json`에는 `workspaces`가 없다 | `package.json` | TASK-001 |
| FIND-003 | 루트 설정 | `pnpm-workspace.yaml`이 workspace packages, `allowBuilds`, `minimumReleaseAge`를 보관한다 | `pnpm-workspace.yaml` | TASK-001, TASK-004 |
| FIND-004 | 도구 설정 | `mise.toml`이 `pnpm = "11"`을 설치한다 | `mise.toml` | TASK-001 |
| FIND-005 | Bun 공식 | Bun workspaces는 `package.json#workspaces`를 기준으로 하며 `workspace:*`를 지원한다 | https://bun.com/docs/pm/workspaces | DEC-002, TASK-002 |
| FIND-006 | Bun 공식 | Bun은 `bun.lock`을 생성·커밋 대상으로 보며, pnpm lockfile 자동 migration을 지원한다 | https://bun.com/docs/pm/lockfile, https://bun.com/docs/pm/cli/install | DEC-003, TASK-001 |
| FIND-007 | Bun 공식 | dependency lifecycle scripts는 기본 차단되고 `trustedDependencies`/`bun pm trust`로 허용한다 | https://bun.com/docs/pm/lifecycle, https://bun.com/docs/pm/cli/pm | DEC-004, TASK-004 |
| FIND-008 | Bun 공식 | `bun publish`는 `--access`, `--tag`, `--dry-run`을 지원하고 workspace/catalog protocol을 publish 시 치환한다 | https://bun.com/docs/pm/cli/publish, https://bun.com/docs/pm/workspaces | TASK-005, TEST-010 |
| FIND-009 | Lockfile 코드 | `parseLockfileVersions()`가 `pnpm-lock.yaml` YAML `packages` 키를 파싱한다 | `packages/sd-cli/src/deps/server-externals/server-production-files.ts` | TASK-003 |
| FIND-010 | Workspace 코드 | `parseWorkspaceGlobs()`/`collectSearchRoots()`가 `pnpm-workspace.yaml`을 직접 읽는다 | `packages/sd-cli/src/deps/replace-deps/replace-deps-resolve.ts` | TASK-002 |
| FIND-011 | Reinstall 코드 | `runReinstall()`이 `pnpm-lock.yaml` 삭제, `allowBuilds` 삭제, `pnpm install`, `pnpm approve-builds --all`을 수행한다 | `packages/sd-cli/src/commands/reinstall.ts` | TASK-004 |
| FIND-012 | Publish 코드 | `runPublish()`가 `pnpm-workspace.yaml`에서 패키지 경로를 수집하고 `publishNpm()`이 `pnpm publish`를 실행한다 | `packages/sd-cli/src/commands/publish/publish-command.ts`, `npm-publisher.ts` | TASK-002, TASK-005 |
| FIND-013 | Native 내부 프로젝트 | Capacitor/Electron 초기화가 빈 `pnpm-workspace.yaml`, `pnpm install`, `pnpm exec ...`를 사용한다 | `packages/sd-cli/src/capacitor/**`, `packages/sd-cli/src/electron/electron.ts` | TASK-005 |
| FIND-014 | Init 템플릿 | 새 워크스페이스 템플릿이 `pnpm-workspace.yaml`과 `pnpm = "11"`을 생성한다 | `packages/sd-cli/src/commands/init/generators/root.ts`, `templates/workspace-root/**` | TASK-006 |
| FIND-015 | 테스트 | sd-cli 테스트가 pnpm install/exec/pnpm-workspace 기대값을 검증한다 | `packages/sd-cli/tests/**` rg 결과 | TASK-007 |
| FIND-016 | 문서 | 프로젝트 지침·references가 pnpm 명령과 `pnpm-workspace.yaml`을 안내한다 | `CLAUDE.md`, `plugins/sd/references/simplysm14/**` | TASK-008 |
| FIND-017 | Init 명령 | `runInit()`은 설치 후 `pnpm up -r`을 실행한다 | `packages/sd-cli/src/commands/init/init.ts` | DEC-009, TASK-005, TASK-006 |
| FIND-018 | Bun lock schema | 현재 저장소에는 `bun.lock`이 없고, 공식 Lockfile 문서는 생성·커밋·migration 중심이라 세부 schema를 구현 근거로 확정하기 부족하다 | 현재 파일 목록, Bun Lockfile 문서 | ASM-003, TASK-003 |
| FIND-019 | Workspace 코드 | `discoverWorkspacePackages()`가 `packages`, `tests` 디렉터리를 하드코딩해 workspace package를 수집한다 | `packages/sd-cli/src/utils/package-utils.ts` | DEC-010, TASK-002 |
| FIND-020 | 사용자 노출 문자열 | `device.ts`가 dev 서버 안내에 `pnpm dev`를 노출한다 | `packages/sd-cli/src/commands/device.ts` | TASK-005 |
/new
## 4. 대안·결정 로그

| ID | 상태 | 맥락 | 선택지 | 결정 | 근거 | 결과·트레이드오프 | 재검토 조건 |
| -- | ---- | ---- | ------ | ---- | ---- | ----------------- | ------------ |
| DEC-001 | Accepted | 전환 범위 | A. Bun runtime까지 전환 / B. Bun PM만 전환하고 runtime은 유지 | B | 사용자 명시: 실행기를 Bun으로 바꾸는 것이 아님 | `node`, `tsx`, shebang은 유지한다 | 사용자가 런타임 전환을 별도 요청할 때 |
| DEC-002 | Accepted | Workspace 기준 | A. `pnpm-workspace.yaml` 유지 / B. `package.json#workspaces`로 전환 | B | 사용자 명시와 Bun Workspaces 공식 문서 | workspace 탐색 유틸 전면 교체 필요 | Bun 공식 workspace 기준이 바뀔 때 |
| DEC-003 | Accepted | Lockfile 전환 | A. `pnpm-lock.yaml` 삭제 후 새 install / B. `pnpm-lock.yaml`에서 `bun.lock` migration 후 제거 | B | Bun install 문서의 pnpm migration 지원 | 기존 해상도 보존 가능성이 높다. migration 검증 단계 필요 | migration 실패 또는 lock diff가 과도할 때 |
| DEC-004 | Proposed | Lifecycle script 승인 | A. `trustedDependencies` 명시 리스트 관리 / B. `bun pm trust --all`로 자동 수집 / C. trusted 미설정 후 Bun 기본값만 사용 | A를 기본, B는 `reinstall` 보조 절차로 검토 | pnpm `allowBuilds`는 Bun migration 대상이 아니고, Bun 문서상 `trustedDependencies`는 명시 허용 방식 | 명시 리스트는 안전하지만 기본 trusted 대체 함정이 있어 검증 필요 | `bun pm untrusted` 결과 또는 native 패키지 설치 실패 시 |
| DEC-005 | Accepted | `workspace:*` 처리 | A. 제거하고 버전 고정 / B. 유지 | B | Bun Workspaces 문서가 `workspace:*` 지원과 publish 시 버전 치환을 명시 | package manifest 변경 최소화 | `bun publish --dry-run`에서 치환 실패 시 |
| DEC-006 | Accepted | Publish 실행 도구 | A. `pnpm publish` 유지 / B. `bun publish`로 전환 / C. `npm publish`로 전환 | B | pnpm 완전 제거 요구와 Bun publish 공식 지원 | `--no-git-checks`, `publishConfig.bin` 차이는 검증·수정 필요 | Bun publish가 필수 npm publish 기능을 지원하지 못할 때 |
| DEC-007 | Proposed | Linker | A. Bun 기본값 사용 / B. `bunfig.toml`에 `linker = "isolated"` 명시 / C. `hoisted` 명시 | B | Bun Isolated installs 문서: pnpm migration/workspaces 기본 isolated, pnpm과 개념상 유사 | 환경별 기본값 차이를 줄임. node_modules 직접 탐색 코드는 검증 필요 | 특정 도구가 isolated 구조에서 실패할 때 `hoisted` 재검토 |
| DEC-008 | Proposed | `publishConfig.bin` | A. 유지 / B. pack/dry-run으로 확인 후 필요 시 top-level `bin`으로 이동 | B를 검증 후 적용 | 현재 `packages/sd-cli/package.json`은 `publishConfig.bin`만 가지며, Bun publish 공식 문서는 `publishConfig.bin` 승격을 명시하지 않는다 | 공개 배포 manifest 변경이므로 확인 전 확정 구현 금지. dry-run에서 `bin` 누락이 확인되면 top-level `bin` 보정 | Bun publish/pack이 `publishConfig.bin`을 top-level `bin`으로 보장함을 공식 확인할 때 |
| DEC-009 | Accepted | `pnpm up -r` 대응 | A. `bun update --recursive` 후보 검증 / B. init 흐름에서 update 단계 제거 / C. 별도 수동 안내 | A | Bun 1.3.14 help와 현재 워크스페이스 dry-run fixture에서 recursive update가 전 워크스페이스 대상으로 성공함을 확인했다 | init 직후 dependency update 동작을 유지한다 | Bun update recursive 동작이 바뀌거나 fixture가 실패할 때 |
| DEC-010 | Accepted | PM workspace와 sd-cli check 대상 구분 | A. 모든 Bun workspace를 check 대상으로 확장 / B. PM workspace 전체 수집과 check 대상 필터를 분리 | B | 현재 `CLAUDE.md`는 check/typecheck/lint 대상을 `packages/*` 또는 `tests/*`로 설명하고, root workspace에는 `plugins/*`도 포함된다 | Bun PM workspace에는 `plugins/*`를 포함하되, sd-cli check 기본 대상은 기존 계약대로 packages/tests에 한정한다 | plugins까지 check 대상으로 포함하라는 별도 요구가 생길 때 |

## 5. 영향도 분석

| ID | 대상 | 영향 유형 | 변경 필요성 | 공개 계약 영향 | 데이터 영향 | 테스트 영향 | 위험도 |
| -- | ---- | --------- | ----------- | -------------- | --------- | --------- | ------ |
| IMPACT-001 | 루트 `package.json`, `mise.toml`, lock/workspace 파일 | 수정/삭제/생성 | Bun PM 기준 전환 | 없음 | lockfile 교체 있음 | 전체 install/check/test | High |
| IMPACT-002 | `packages/sd-cli/src/deps/replace-deps/*` | 수정/테스트 | workspace root 탐색 기준 교체 | 없음 | 없음 | replace-deps unit/acc | Medium |
| IMPACT-003 | `server-production-files.ts` | 수정/테스트 | `bun.lock` resolver 필요 | 서버 dist package.json 내용 영향 있음 | 없음 | server externals tests/build | High |
| IMPACT-004 | `commands/reinstall.ts` | 수정/테스트 | Bun install/trust 흐름 필요 | CLI 동작 영향 있음 | node_modules/lock 삭제 작업 | reinstall manual/integration | High |
| IMPACT-005 | `commands/publish/*` | 수정/테스트 | Bun publish와 workspace 수집 필요 | npm 배포물 영향 있음 | 없음 | dry-run/pack 검증 | High |
| IMPACT-006 | `capacitor/**`, `electron/electron.ts` | 수정/테스트 | nested project install/exec 전환 | 생성 산출물 영향 있음 | 내부 `.capacitor`, `.electron` 재생성 | unit/acc/manual native | High |
| IMPACT-007 | init templates | 수정/테스트 | 신규 프로젝트가 Bun PM 기준이어야 함 | 생성 프로젝트 계약 영향 있음 | 없음 | render/recover/init tests | Medium |
| IMPACT-008 | docs/references/CLAUDE | 수정 | 사용 명령 갱신 | 에이전트/사용자 지침 영향 있음 | 없음 | 문서 grep/manual | Low |

## 6. 가정 / OPEN / 리스크

### 6.1 가정

| ID | 가정 | 근거 수준 | 틀렸을 때 영향 | 확인 방법 | 구현 차단 여부 |
| -- | ---- | --------- | -------------- | --------- | -------------- |
| ASM-001 | 계획은 Bun 1.3.x 공식 문서 기준이며, 구현 전 실제 로컬/CI Bun 버전을 확인해야 한다 | 미확인 | mise pin/명령 옵션이 달라질 수 있음 | `bun --version`, 공식 문서 재확인 | Non-blocking |
| ASM-002 | `workspace:*` 의존성은 Bun PM에서 유지 가능하다 | 확인됨 | package manifest를 대량 수정해야 함 | `bun install`, `bun publish --dry-run` | Non-blocking |
| ASM-003 | `bun.lock` 텍스트 포맷은 계획 시점 기준 JSONC 유사 구조로 보이나, 세부 schema는 구현 전 fixture로 확인해야 한다 | 미확인 | lock parser 구현 변경 필요 | 전환 브랜치에서 생성한 `bun.lock` fixture와 parser unit test | Non-blocking |
| ASM-004 | nested `.capacitor`/`.electron/src` 프로젝트는 별도 `package.json` + `bun install`로 상위 workspace 영향을 받지 않게 만들 수 있다 | 미확인 | native 초기화 실패 가능 | dedicated temp project acceptance test | Non-blocking |

### 6.2 OPEN

| ID | 질문·미정 사항 | 선택지 | 추천안 | 차단 여부 | 해결 후 반영 위치 |
| -- | -------------- | ------ | ------ | --------- | ----------------- |
| OPEN-001 | `trustedDependencies` 최종 목록을 어떻게 확정할지 | A. 기존 `allowBuilds` + Bun default trusted 중 필요한 항목 명시 / B. `bun pm untrusted` 결과만 반영 / C. trust 미설정 | A 후 `bun pm untrusted`로 보정 | Non-blocking | TASK-001, TASK-004 |
| OPEN-002 | `postinstall`의 `npx -y skills ...`를 Bun PM 순수성 범위에 포함할지 | A. pnpm 제거와 무관하므로 유지 / B. `bunx` 호환 확인 후 변경 | B를 별도 검증 후 가능하면 반영, 실패 시 pnpm 제거와 분리 | Non-blocking | TASK-001, TASK-008 |
| OPEN-003 | `bun publish`가 실제 npm 2FA/auth/registry 흐름에서 현재 배포 정책을 모두 충족하는지 | A. `bun publish` 사용 / B. npm registry 배포만 `npm publish` 유지 | A를 목표로 dry-run/auth 검증 | Non-blocking | TASK-005 |
| OPEN-004 | [해결] `pnpm up -r`를 Bun에서 어떻게 대체할지 | A. `bun update --recursive` 후보 검증 / B. update 단계 제거 / C. 수동 안내 | A 선택: 현재 워크스페이스 dry-run fixture 통과 | Non-blocking | TASK-005, TASK-006 |
| OPEN-005 | `publishConfig.bin`이 Bun publish 산출물에서 CLI bin으로 반영되는지 | A. 유지 / B. top-level `bin` 보정 | pack/dry-run에서 누락 확인 시 B | Non-blocking | TASK-005 |
| OPEN-006 | `bun.lock` parser가 의존해도 되는 schema 범위는 무엇인지 | A. 생성 fixture 기반 내부 parser / B. Bun CLI 출력 기반 resolver | A를 우선 검증, schema 불안정 시 B 검토 | Non-blocking | TASK-003 |

### 6.3 리스크

| ID | 리스크 | 가능성 | 영향 | 예방·완화 | 조기 경고 신호 | 대응 |
| -- | ------ | ------ | ---- | --------- | -------------- | ---- |
| RISK-001 | `bun.lock` parser가 peer suffix/alias/optional 구조를 잘못 해석해 서버 dist dependency 버전을 틀리게 생성 | Medium | High | lock fixture unit test, 실제 server build 검증 | `resolveLockedVersions` 누락/오버매칭 | parser 보강 또는 공식 근거가 확인된 Bun CLI 출력 기반 대안 검토 |
| RISK-002 | `trustedDependencies` 누락으로 native dependency postinstall이 실행되지 않음 | Medium | High | `bun pm untrusted`, native 패키지 import smoke test | esbuild/sharp/lmdb/electron-rebuild 실패 | trust 목록 보정 후 reinstall |
| RISK-003 | Bun isolated node_modules 구조에서 replace-deps/watch/native tool 경로 탐색이 누락됨 | Medium | Medium | isolated 기준 acceptance test | replace-deps 매칭 0건, watch 미반응 | workspace/node_modules 탐색 보강 또는 linker 재검토 |
| RISK-004 | `bun publish` tarball manifest가 기존 pnpm publish와 달라 CLI bin 또는 workspace dependency가 깨짐 | Medium | High | `bun publish --dry-run`, `bun pm pack` tarball 검사 | packed package.json에 `bin` 누락 또는 `workspace:*` 잔존 | top-level `bin` 이동, publish flow 보정 |
| RISK-005 | Capacitor/Electron 내부 프로젝트에서 Bun install/exec가 기존 pnpm exec와 다르게 동작 | Medium | High | 해당 테스트와 수동 smoke test 분리 | cap/electron-builder/electron-rebuild 실행 실패 | 명령 방식 `bun run <bin>`/`bunx`/직접 bin 호출 중 검증된 방식으로 고정 |
| RISK-006 | 과거 verify 문서의 pnpm 문자열까지 일괄 수정해 검증 이력을 훼손 | Low | Medium | 변경 대상 문서 범위 제한 | verify 문서 diff 발생 | 과거 verify 문서는 보존 또는 별도 정책 결정 |

## 7. 작업 분해

### TASK-001: 루트 Bun PM 설정 전환

- 상태: Done
- 목적: 모노레포의 package manager 기준을 pnpm에서 Bun으로 바꾼다.
- 연결 근거: SCOPE-001 / FIND-002 / FIND-003 / FIND-004 / FIND-006 / DEC-003 / DEC-007
- 산출물:
  - `package.json` scripts/workspaces/trustedDependencies 반영
  - `bun.lock` 생성
  - `bunfig.toml` 생성 또는 명시적 미생성 결정
  - `pnpm-lock.yaml`, `pnpm-workspace.yaml` 제거
  - `mise.toml` Bun 도구 반영 및 pnpm 제거
- 변경 대상:
  - 반드시 변경: `package.json`, `mise.toml`, lock/workspace 파일
  - 변경 가능: `bunfig.toml`, `.npmrc`(Bun 공식 지원 옵션이 필요한 경우만)
  - 변경 금지: Node 런타임 설정 제거, `sd.config.ts`의 npm registry publish 타입 의미 변경
- 현재 상태:
  - 루트 scripts는 `pnpm sd-cli ...`를 호출한다.
  - workspace 목록은 `pnpm-workspace.yaml`에만 있다.
  - `bun.lock`이 없다.
- 작업 내용:
  1. `package.json#workspaces`에 `packages/*`, `tests/*`, `plugins/*`를 추가한다.
  2. 루트 scripts에서 `pnpm` 호출을 Bun PM 기준으로 바꾼다. `sd-cli` script는 기존처럼 `tsx packages/sd-cli/src/sd-cli.ts`를 유지하고, 상위 scripts는 `bun run sd-cli ...` 또는 동등한 Bun script 실행으로 연결한다.
  3. `pnpm-workspace.yaml#allowBuilds`와 `minimumReleaseAge`를 먼저 읽어 전환 초안(`trustedDependencies` seed, `bunfig.toml [install].minimumReleaseAge`)에 반영한다.
  4. `pnpm-lock.yaml`이 있는 상태에서 `bun.lock`을 생성·검증한다.
  5. `allowBuilds`/`minimumReleaseAge` 반영과 `bun.lock` 생성이 끝난 뒤에만 pnpm lock/workspace 파일을 제거한다.
  6. `trustedDependencies` 최종 보정은 TASK-004에서 `bun pm untrusted` 결과로 확인한다.
  7. `mise.toml`에서 `pnpm`을 제거하고 Bun을 pin한다.
- 선행 작업: 없음
- 후속 작업: TASK-002, TASK-003, TASK-004, TASK-005, TASK-006
- 수용 기준:
  - AC-001
- 테스트·검증:
  - TEST-001
  - GATE-001
- 롤백 영향: lock/workspace 설정 변경이므로 기존 pnpm 파일 복원으로 되돌릴 수 있다.
- 구현 시 주의: `pnpm-lock.yaml`은 `bun.lock` migration 전 삭제하지 않고, `pnpm-workspace.yaml`은 `allowBuilds`/`minimumReleaseAge` 반영 전 삭제하지 않는다.
- 정지 조건: `bun.lock` 생성 실패 또는 install 결과가 package manifest와 불일치하면 중단한다.

### TASK-002: Bun workspace resolver 공통화

- 상태: Done
- 목적: `pnpm-workspace.yaml` 파싱 로직을 제거하고 `package.json#workspaces` 기반으로 workspace root를 수집한다.
- 연결 근거: SCOPE-002 / FIND-005 / FIND-010 / FIND-012 / DEC-002
- 산출물:
  - `package.json#workspaces` 배열 및 Bun migration 형태 객체를 읽는 공통 유틸
  - PM workspace 전체 수집과 caller별 필터(packages/tests/plugins)를 분리하는 API
  - `replace-deps`, publish, capacitor root 탐색, package-utils workspace discovery 적용
- 변경 대상:
  - 반드시 변경: `packages/sd-cli/src/deps/replace-deps/replace-deps-resolve.ts`, `packages/sd-cli/src/commands/publish/publish-command.ts`, `packages/sd-cli/src/capacitor/capacitor-npm-config.ts`, `packages/sd-cli/src/utils/package-utils.ts`
  - 변경 가능: 새 workspace utility 파일
  - 변경 금지: `pnpm-workspace.yaml` fallback 유지
- 현재 상태: `parseWorkspaceGlobs()`가 `pnpm-workspace.yaml`의 `packages:`만 간단 파싱하고, `discoverWorkspacePackages()`는 `packages`, `tests` 디렉터리를 하드코딩한다.
- 작업 내용:
  1. workspace root package.json을 찾아 `workspaces`를 읽는다.
  2. `workspaces`가 배열인 경우와 `{ packages: [...] }` 객체인 경우를 지원한다.
  3. negative glob은 Bun 공식 지원이 있으므로 필요 시 제외 패턴을 처리한다.
  4. `collectSearchRoots()`와 publish 대상 패키지 수집을 새 유틸로 교체한다.
  5. `discoverWorkspacePackages()`도 하드코딩 대신 새 workspace resolver를 사용하되, check/typecheck/lint 대상은 기존 계약대로 `packages/*`, `tests/*`만 포함하도록 필터링한다.
  6. `findWorkspaceRoot()`는 `pnpm-workspace.yaml`이 아니라 Bun workspace root 기준으로 교체한다.
- 선행 작업: TASK-001
- 후속 작업: TASK-005, TASK-007
- 수용 기준:
  - AC-002
- 테스트·검증:
  - TEST-002
  - GATE-002
- 롤백 영향: workspace 탐색 실패 시 replace-deps/publish/capacitor에 영향. 기존 파서 복원으로 롤백 가능하나 pnpm 제거 목표와 충돌한다.
- 구현 시 주의: package.json 없는 glob 결과는 제외한다.
- 정지 조건: workspace root 탐색이 모호하거나 중첩 workspace에서 잘못된 루트를 잡으면 중단한다.

### TASK-003: `bun.lock` locked version resolver 구현

- 상태: Done
- 목적: 서버 build 산출물의 external dependency 버전을 `bun.lock`에서 확인한다.
- 연결 근거: SCOPE-003 / FIND-009 / FIND-006 / RISK-001
- 산출물:
  - `parseLockfileVersions()`의 Bun lock 대응 구현 또는 새 함수
  - bun.lock fixture unit tests
- 변경 대상:
  - 반드시 변경: `packages/sd-cli/src/deps/server-externals/server-production-files.ts`
  - 변경 가능: lock parser utility/test fixture
  - 변경 금지: `pnpm-lock.yaml` fallback
- 현재 상태: YAML 파서로 pnpm lock `packages` 키를 파싱한다.
- 작업 내용:
  1. `bun.lock` 존재 확인과 오류 메시지를 Bun 기준으로 바꾼다.
  2. 전환 브랜치에서 실제 `bun.lock` fixture를 생성하고, package entry 구조를 테스트 근거로 고정한다.
  3. Bun lock의 `packages` 엔트리에서 package name과 resolved version을 추출하는 parser를 구현한다.
  4. scoped package, peer suffix, alias, optional dependency fixture를 만든다.
  5. `resolveLockedVersions()`가 externals 누락 시 명확히 throw하도록 유지한다.
  6. schema 확인이 불충분하면 parser 구현을 중단하고 Bun CLI 출력 기반 resolver 대안을 검토한다.
- 선행 작업: TASK-001
- 후속 작업: TASK-007
- 수용 기준:
  - AC-003
- 테스트·검증:
  - TEST-003
  - TEST-004
  - GATE-003
- 롤백 영향: 서버 배포물 dependency 버전 생성에 직접 영향.
- 구현 시 주의: `any`로 lock 구조를 흘려 소비자 타입을 약화하지 않는다. 내부 parser 타입은 고정해도 된다.
- 정지 조건: Bun lock 구조에서 동일 package의 복수 version 선택 기준을 확정할 수 없으면 중단하고 `[OPEN]` 추가한다.

### TASK-004: `reinstall` Bun install/trust 흐름 재설계

- 상태: Done
- 목적: pnpm approve-builds/allowBuilds 기반 재설치를 Bun PM 기준으로 바꾼다.
- 연결 근거: SCOPE-004 / FIND-007 / FIND-011 / DEC-004 / RISK-002
- 산출물:
  - `packages/sd-cli/src/commands/reinstall.ts` Bun 기준 구현
  - trusted dependency 처리 정책 및 테스트/수동 검증 절차
- 변경 대상:
  - 반드시 변경: `reinstall.ts`, 관련 CLI 설명/테스트
  - 변경 가능: trustedDependencies helper
  - 변경 금지: pnpm approve-builds fallback
- 현재 상태: lock/node_modules/dist/.cache 삭제 후 `pnpm install --config.strict-dep-builds=false`, `pnpm approve-builds --all` 수행.
- 작업 내용:
  1. 삭제 대상 lockfile을 `bun.lock`으로 바꾼다.
  2. `node_modules`, `dist`, `.cache` 삭제 대상 수집은 TASK-002의 workspace resolver를 사용한다.
  3. `allowBuilds` 초기화 코드를 제거한다.
  4. `bun install` 실행 후 `bun pm untrusted`/`bun pm trust` 흐름을 어떻게 자동화할지 구현한다.
  5. 자동 trust가 package.json을 변경한다면 변경 사실을 명확히 로그하고, 실패 시 throw한다.
- 선행 작업: TASK-001, TASK-002
- 후속 작업: TASK-007
- 수용 기준:
  - AC-004
- 테스트·검증:
  - TEST-005
  - GATE-004
- 롤백 영향: lock/node_modules 삭제 작업이 있으므로 실패 시 사용자는 재설치를 다시 수행해야 한다.
- 구현 시 주의: 일부 성공 후 정상 종료하지 않는다. install/trust 중 실패하면 throw한다.
- 정지 조건: Bun CLI가 untrusted 목록을 기계적으로 안정 파싱할 수 없고 자동화 정책도 확정할 수 없으면 중단한다.

### TASK-005: `sd-cli` install/update/exec/publish 호출 Bun PM 전환

- 상태: Done
- 목적: `sd-cli` 내부의 `pnpm install`, `pnpm up -r`, `pnpm exec`, `pnpm publish` 호출을 제거한다.
- 연결 근거: SCOPE-005 / FIND-008 / FIND-012 / FIND-013 / DEC-006 / DEC-008 / RISK-004 / RISK-005
- 산출물:
  - init/init-client install 및 update 호출 Bun 전환
  - Capacitor/Electron install/exec 호출 Bun 전환
  - publishNpm Bun publish 전환
  - `@simplysm/sd-cli` CLI bin manifest 보정
- 변경 대상:
  - 반드시 변경: `packages/sd-cli/src/commands/init/init.ts`, `init-client.ts`, `commands/publish/npm-publisher.ts`, `commands/publish/publish-command.ts`, `commands/device.ts`, `capacitor/**`, `electron/electron.ts`, `packages/sd-cli/package.json`
  - 변경 가능: 공통 package-manager command helper
  - 변경 금지: runtime spawn `node`, `tsx` 실행 방식을 Bun runtime으로 바꾸는 변경
- 현재 상태: 여러 파일에서 `shellSpawn("pnpm", ...)` 또는 `cpx.spawn("pnpm", ...)` 사용.
- 작업 내용:
  1. `bun install` 명령 인자와 로그를 반영한다.
  1-1. `pnpm up -r`은 fixture 검증 후 `bun update --recursive`로 대체한다. 현재 워크스페이스 dry-run에서 전 워크스페이스 대상 실행이 성공함을 확인했다.
  2. CLI binary 실행은 `bun run <bin>`/`bunx`/직접 `node_modules/.bin` 중 실제 테스트로 확인된 하나의 방식으로 고정한다.
  3. `.capacitor`/`.electron/src`에서 상위 workspace 탐색을 차단하던 빈 `pnpm-workspace.yaml` 생성 코드를 제거하고 Bun에서 필요한 격리 방식을 검증·적용한다.
  4. `publishNpm()`은 `bun publish --access public`과 prerelease tag/dry-run을 사용한다.
  5. `--no-git-checks`는 Bun publish 공식 옵션에 없으므로 제거한다.
  6. `packages/sd-cli/package.json`의 CLI bin은 먼저 tarball/manifest를 검사하고, `bin` 누락이 확인될 때만 top-level `bin`으로 보정한다.
  7. npm auth 확인은 `bun pm whoami` 또는 Bun 공식 auth 흐름으로 바꾼다.
  8. `device.ts`의 사용자 안내 문자열에서 `pnpm dev`를 새 Bun PM 명령으로 바꾼다.
- 선행 작업: TASK-001, TASK-002
- 후속 작업: TASK-007
- 수용 기준:
  - AC-005
- 테스트·검증:
  - TEST-006
  - TEST-007
  - TEST-010
  - GATE-004
  - GATE-005
- 롤백 영향: native app/electron build 경로에 영향. 실패 시 기존 pnpm 호출 복원은 가능하지만 전환 목표와 충돌한다.
- 구현 시 주의: Bun PM 전환이지 Bun runtime 전환이 아니므로 source runner는 기존 방식을 유지한다.
- 정지 조건: Bun publish dry-run 산출물이 기존 npm 배포 계약을 만족하지 않으면 중단한다.

### TASK-006: init 템플릿 Bun PM 전환

- 상태: Done
- 목적: `sd-cli init`으로 생성되는 새 워크스페이스가 처음부터 Bun PM 기준을 사용하게 한다.
- 연결 근거: SCOPE-006 / FIND-014
- 산출물:
  - workspace-root 템플릿에서 pnpm 파일 제거
  - 생성 package.json/mise/bunfig 반영
  - render/recover tests 갱신
- 변경 대상:
  - 반드시 변경: `packages/sd-cli/src/commands/init/generators/root.ts`, `templates/workspace-root/*`, init render tests
  - 변경 가능: `bunfig.toml.hbs`
  - 변경 금지: `workspace:*` dependency template 제거
- 현재 상태: root generator가 `pnpm-workspace.yaml`을 고정 복사하고 mise 템플릿이 pnpm을 설치한다.
- 작업 내용:
  1. `pnpm-workspace.yaml` 템플릿 복사를 제거한다.
  2. generated root `package.json`에 Bun workspace/trusted/packageManager 정책을 반영한다.
  3. generated mise에 Bun 도구를 반영한다.
  4. init 후 install/update 명령을 TASK-005의 Bun PM 호출 방식과 맞춘다.
- 선행 작업: TASK-001, TASK-004, TASK-005
- 후속 작업: TASK-007
- 수용 기준:
  - AC-006
- 테스트·검증:
  - TEST-008
  - GATE-006
- 롤백 영향: 신규 프로젝트 생성 결과에만 영향.
- 구현 시 주의: 기존 생성 프로젝트의 public API보다 생성 산출물 계약이 바뀌므로 snapshot성 테스트를 정확히 갱신한다.
- 정지 조건: init 생성 후 `bun install`이 실패하면 중단한다.

### TASK-007: 테스트 갱신·보강

- 상태: Done
- 목적: pnpm 기준 테스트를 Bun PM 기준으로 바꾸고 주요 위험을 검증한다.
- 연결 근거: SCOPE-007 / FIND-015 / RISK-001~RISK-005
- 산출물:
  - sd-cli unit/acceptance test 갱신
  - Bun lock/workspace/trust/publish/native 관련 신규 테스트
- 변경 대상:
  - 반드시 변경: `packages/sd-cli/tests/**` 중 pnpm 기대값 테스트
  - 변경 가능: test fixtures
  - 변경 금지: 의미 없는 텍스트 존재 테스트 추가
- 현재 상태: electron/capacitor/replace-deps/init tests가 pnpm 명령과 pnpm-workspace 파일을 기대한다.
- 작업 내용:
  1. pnpm command expectation을 Bun command expectation으로 바꾼다.
  2. workspace resolver unit/acceptance tests를 추가한다.
  3. bun.lock parser fixture tests를 추가한다.
  4. publish dry-run/tarball manifest 검사 테스트를 추가한다.
  5. native command는 실제 외부 도구를 실행하지 않는 mocking test와 필요한 manual gate를 분리한다.
- 선행 작업: TASK-002~TASK-006
- 후속 작업: TASK-008
- 수용 기준:
  - AC-007
- 테스트·검증:
  - TEST-009
  - GATE-007
- 롤백 영향: 테스트만 되돌릴 수 있으나 구현 변경과 함께 움직여야 한다.
- 구현 시 주의: 과거 verify markdown의 역사적 pnpm 명령은 테스트 대상이 아니면 무리하게 수정하지 않는다.
- 정지 조건: 테스트가 실제 동작이 아니라 문자열 치환만 검증하게 되면 중단하고 케이스를 재설계한다.

### TASK-008: 문서·references·작업 지침 갱신

- 상태: Done
- 목적: 사용자/에이전트가 더 이상 pnpm 명령을 안내받지 않게 한다.
- 연결 근거: SCOPE-008 / FIND-016
- 산출물:
  - `CLAUDE.md` 명령 표 갱신
  - `plugins/sd/references/simplysm14/**` 관련 문서 갱신
  - 필요 시 API docs의 packageManager 설명 갱신
- 변경 대상:
  - 반드시 변경: 현재 명령 안내 문서
  - 변경 가능: references API docs
  - 변경 금지: 과거 검증 로그/verify 문서의 역사적 명령을 사실 기록 없이 바꾸는 것
- 현재 상태: 기본 명령이 `pnpm check --fix`, `pnpm test` 등으로 안내된다.
- 작업 내용:
  1. 루트 명령을 Bun PM 기준으로 갱신한다.
  2. 테스트 패키지 추가 안내에서 `pnpm-workspace.yaml` 언급을 `package.json#workspaces` 기준으로 바꾼다.
  3. device 에러 메시지의 `pnpm dev`를 새 명령으로 바꾼다.
  4. references가 실제 코드와 일치하는지 `rg pnpm`으로 확인한다.
- 선행 작업: TASK-001, TASK-005, TASK-007
- 후속 작업: 없음
- 수용 기준:
  - AC-008
- 테스트·검증:
  - TEST-011
  - GATE-008
- 롤백 영향: 문서만 되돌릴 수 있다.
- 구현 시 주의: npm registry와 npm package라는 용어는 package manager pnpm과 구분해 유지한다.
- 정지 조건: 실제 새 명령이 확정되지 않았으면 문서 갱신을 중단한다.

## 8. 실행 순서 / 의존관계

| 순서 | 작업 | 선행 | 병렬 가능 | 순서 근거 | 피해야 할 순서 |
| ---- | ---- | ---- | --------- | --------- | -------------- |
| 1 | TASK-001 | - | 불가 | lock/workspace 기준이 먼저 확정되어야 함 | `pnpm-lock.yaml` 선삭제 |
| 2 | TASK-002 | TASK-001 | 일부 가능 | pnpm-workspace 제거 후 모든 탐색이 공통 resolver를 써야 함 | 각 기능별로 중복 resolver 구현 |
| 3 | TASK-003 | TASK-001 | TASK-002와 병렬 가능 | lock 전환 후 server externals가 깨지지 않아야 함 | build 통과만 보고 dist dependency 검증 생략 |
| 4 | TASK-004 | TASK-001, TASK-002 | TASK-003과 병렬 가능 | reinstall은 workspace resolver와 trust 정책 필요 | pnpm approve-builds fallback 유지 |
| 5 | TASK-005 | TASK-001, TASK-002 | 일부 가능 | install/exec/publish 호출 전환은 workspace와 command 정책 필요 | Bun runtime 전환 섞기 |
| 6 | TASK-006 | TASK-001, TASK-004, TASK-005 | 불가 | init 템플릿은 확정된 install/trust 명령을 반영해야 함 | 템플릿만 먼저 바꾸고 실제 init 미검증 |
| 7 | TASK-007 | TASK-002~006 | 불가 | 구현 변경 후 전체 테스트 기대값 정합성 확보 | 문자열 치환성 테스트만 남기기 |
| 8 | TASK-008 | TASK-001, TASK-005, TASK-007 | 일부 가능 | 실제 명령·동작 확정 후 문서화 | 코드보다 문서 먼저 확정 |

## 9. 수용 기준 / 테스트 전략 / 검증 게이트

### 9.1 수용 기준

| ID | 연결 작업 | 조건 | 관찰 가능한 결과 | 예외·오류 케이스 |
| -- | --------- | ---- | ---------------- | ---------------- |
| AC-001 | TASK-001 | 루트가 Bun PM 기준으로 설치 가능 | `bun.lock` 존재, `pnpm-lock.yaml`/`pnpm-workspace.yaml` 제거, `package.json#workspaces` 존재 | migration 실패 시 중단 |
| AC-002 | TASK-002 | 모든 workspace 수집 코드가 `package.json#workspaces`를 사용하고, check 대상 필터는 packages/tests로 유지 | `pnpm-workspace` 직접 참조와 `packages`/`tests` 하드코딩 workspace discovery가 source에서 제거되며, plugins가 check 기본 대상에 섞이지 않음 | 과거 verify 문서는 제외 가능 |
| AC-003 | TASK-003 | server externals locked version이 bun.lock에서 해석됨 | dist package.json dependencies가 정확한 semver를 가진다 | lock에 없는 external은 throw |
| AC-004 | TASK-004 | reinstall이 Bun install/trust 흐름으로 끝까지 성공/실패를 명확히 반환 | pnpm 명령 없이 재설치 가능 | 일부 trust 실패 후 정상 종료 금지 |
| AC-005 | TASK-005 | init/capacitor/electron/publish/device source에서 pnpm install/update/exec/publish 호출·안내 없음 | 관련 tests에서 Bun command expectation 통과 | Bun publish dry-run 또는 update 대응 검증 실패 시 중단 |
| AC-006 | TASK-006 | init 생성 프로젝트가 Bun PM 설정을 가진다 | 생성물에 `pnpm-workspace.yaml` 없음, Bun workspace 설정 존재 | workspace:*는 유지 |
| AC-007 | TASK-007 | pnpm 제거와 주요 리스크를 테스트가 커버 | sd-cli 관련 tests 통과 | native 수동 필요 항목은 명시 |
| AC-008 | TASK-008 | 문서·references가 새 명령을 안내 | 명령 문서에 pnpm 기본 안내 없음 | 과거 검증 기록은 보존 가능 |

### 9.2 테스트 전략

| ID | 연결 작업 | 수준 | 케이스 | 파일·명령 | 통과 기준 |
| -- | --------- | ---- | ------ | --------- | --------- |
| TEST-001 | TASK-001 | integration | pnpm lock migration 후 최초 Bun install, 이후 frozen 재현성 확인 | 1차 `bun install`, 2차 `bun ci` | 1차에서 `bun.lock` 생성·최신화, 2차에서 lock 변경 없이 exit code 0 |
| TEST-002 | TASK-002 | unit/integration | package.json workspaces 배열/객체/negative glob 처리 | sd-cli workspace resolver tests | 예상 workspace root 목록 일치 |
| TEST-003 | TASK-003 | unit | bun.lock parser fixture: scoped, unscoped, peer suffix, optional | 신규/수정 lock parser spec | version map 정확 |
| TEST-004 | TASK-003 | integration | server build dist package.json dependency 생성 | `bun run sd-cli build -t <server-target>` 또는 해당 test | external dependency 버전 존재 |
| TEST-005 | TASK-004 | manual/integration | reinstall clean install/trust | `bun run sd-cli reinstall` | 성공 시 node_modules와 bun.lock 재생성, 실패 시 throw |
| TEST-006 | TASK-005 | unit | init/capacitor/electron command spawn | 기존 sd-cli tests 갱신 | `bun` command 호출 검증 |
| TEST-007 | TASK-005 | acceptance/manual | Capacitor/Electron 내부 프로젝트 초기화 | 관련 acc spec + 필요 시 manual | install/exec 흐름 성공 |
| TEST-008 | TASK-006 | unit | init template render | `packages/sd-cli/tests/init/render.spec.ts` | Bun 설정 포함, pnpm-workspace 미포함 |
| TEST-009 | TASK-007 | typecheck/lint/test | sd-cli 패키지 검증 | 새 루트 명령 기준 `bun run check -t sd-cli` 등 | type/lint/test 통과 |
| TEST-010 | TASK-005 | manual/integration | npm package dry-run/tarball manifest | `bun publish --dry-run` 또는 `bun pm pack` 검사 | `bin`, dependencies, workspace 치환 정상 |
| TEST-011 | TASK-008 | manual/static | pnpm 문자열 잔존 확인 | `rg "\bpnpm\b|pnpm-lock|pnpm-workspace|allowBuilds|approve-builds"` | 보존 대상 외 잔존 없음 |

### 9.3 검증 게이트

| ID | 시점 | 검사 항목 | 명령·방법 | 통과 조건 | 실패 시 행동 |
| -- | ---- | --------- | --------- | --------- | ------------ |
| GATE-001 | 구현 중간 | Bun lock/workspace 전환 | migration 단계 `bun install`, 재현성 단계 `bun ci`, manifest 확인 | `bun.lock` 생성 후 `bun ci`가 lock 변경 없이 성공 | pnpm 파일 삭제 전 상태로 되돌림 |
| GATE-002 | 구현 중간 | pnpm-workspace 의존 및 workspace 디렉터리 하드코딩 제거 | `rg "pnpm-workspace|\[\"packages\", \"tests\"\]" packages/sd-cli/src` | 의도적 잔존 없음 | workspace resolver 누락 수정 |
| GATE-003 | 구현 중간 | pnpm lock 의존 제거 | `rg "pnpm-lock" packages/sd-cli/src` | 의도적 잔존 없음 | lock resolver 누락 수정 |
| GATE-004 | 구현 중간 | pnpm command 호출 제거 | `rg "shellSpawn\(\"pnpm\"|cpx\.spawn\(\"pnpm\"|\bpnpm (install|up|exec|publish)\b" packages/sd-cli/src` | 잔존 없음 | 호출부 수정 |
| GATE-005 | 완료 전 | publish 산출물 계약 | pack/dry-run tarball package.json 검사 | CLI bin과 deps 정상 | publish 구현 보정 |
| GATE-006 | 완료 전 | init 생성물 계약 | init render/recover tests | pnpm 파일 미생성 | 템플릿 보정 |
| GATE-007 | 완료 전 | 전체 sd-cli 검증 | Bun PM 기준 check/test 명령 | 통과 | 실패 원인별 작업으로 회귀 |
| GATE-008 | 완료 전 | 문서 정합성 | `rg`와 주요 문서 수동 확인 | 새 명령과 코드 일치 | 문서 보정 |

## 10. Rollout / Rollback

- Rollout 필요 여부: 필요. package manager 전환은 저장소 전체 개발·배포 절차에 영향을 준다.
- Rollout 절차:
  1. 별도 브랜치에서 lock/workspace 전환을 먼저 수행한다.
  2. Bun install/check/test를 통과시킨다.
  3. `sd-cli` 기능별 전환을 순서대로 적용한다.
  4. publish dry-run과 native 내부 프로젝트 smoke test를 별도 게이트로 확인한다.
  5. 문서와 references를 마지막에 갱신한다.
- Rollback 가능 여부: 가능. 단 `bun.lock` 도입 후 dependency resolution이 바뀌므로 rollback은 파일 단위가 아니라 브랜치 revert가 안전하다.
- Rollback 절차:
  1. `package.json`, `mise.toml`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `bun.lock`, `bunfig.toml`을 전환 전 상태로 되돌린다.
  2. `packages/sd-cli/src/**`, `tests/**`, 문서 변경을 revert한다.
  3. pnpm install/check 기준으로 재검증한다.
- Rollback 불가 지점: npm registry에 잘못 publish된 패키지는 일반 파일 rollback으로 되돌릴 수 없다. publish 전 dry-run과 실제 publish 직전 clean gate가 필요하다.
- 관측 지표:
  - install 소요/성공 여부
  - sd-cli build/check/test 성공 여부
  - native package postinstall/trust 실패 여부
  - publish dry-run manifest 차이
- 중단 조건:
  - `bun.lock` migration 실패
  - server external 버전 해석 불가
  - native dependency build script 누락
  - publish tarball에서 CLI bin/dependency 계약 손상

## 11. Traceability Matrix

| Scope | Finding | Decision | Task | AC | Test | Gate |
| ----- | ------- | -------- | ---- | -- | ---- | ---- |
| SCOPE-001 | FIND-002,FIND-003,FIND-004,FIND-006 | DEC-003,DEC-007 | TASK-001 | AC-001 | TEST-001 | GATE-001 |
| SCOPE-002 | FIND-005,FIND-010,FIND-012,FIND-019 | DEC-002,DEC-010 | TASK-002 | AC-002 | TEST-002 | GATE-002 |
| SCOPE-003 | FIND-006,FIND-009,FIND-018 | DEC-003 | TASK-003 | AC-003 | TEST-003,TEST-004 | GATE-003 |
| SCOPE-004 | FIND-007,FIND-011 | DEC-004 | TASK-004 | AC-004 | TEST-005 | GATE-004 |
| SCOPE-005 | FIND-008,FIND-012,FIND-013,FIND-017,FIND-020 | DEC-006,DEC-008,DEC-009 | TASK-005 | AC-005 | TEST-006,TEST-007,TEST-010 | GATE-004,GATE-005 |
| SCOPE-006 | FIND-014 | DEC-002,DEC-004 | TASK-006 | AC-006 | TEST-008 | GATE-006 |
| SCOPE-007 | FIND-015 | DEC-001~DEC-010 | TASK-007 | AC-007 | TEST-009 | GATE-007 |
| SCOPE-008 | FIND-016 | DEC-001 | TASK-008 | AC-008 | TEST-011 | GATE-008 |

## 12. 구현 전 차단 조건

| ID | 차단 조건 | 관련 OPEN/RISK | 필요한 결정 | 해결 담당 | 해결 후 갱신 위치 |
| -- | --------- | -------------- | ----------- | --------- | ----------------- |
| BLOCK-001 | `[N/A]` 현재 계획 수준에서 구현 착수 자체를 막는 Blocking OPEN 없음 | OPEN-001~006은 Non-blocking 검증 항목 | 구현 중 검증 결과에 따라 보정 | 구현자 | 관련 TASK의 정지 조건 |

## 13. 변경 로그

- 2026-06-29 17:02:49: 최초 작성.
- 2026-06-29 17:02:49: 독립 검증 피드백 반영 — `pnpm up -r`, 초기 `bun ci` 순서, `publishConfig.bin`, `bun.lock` schema, TASK-005 게이트 참조 보정.
- 2026-06-29 17:02:49: 재검증 피드백 반영 — `bun update --recursive` 확정 표현 제거, `discoverWorkspacePackages()` 하드코딩 수집 포함, Bun 버전 가정 근거 수준 보정.
- 2026-06-29 17:02:49: 2차 재검증 피드백 반영 — `allowBuilds`/`minimumReleaseAge` 삭제 전 반영 순서, PM workspace와 check 대상 분리, `device.ts` 안내 문자열, 미확인 후보 표현 보정.
- 2026-06-29 18:20:00: 구현 완료 — Bun workspace/lock/install/trust/publish/native/init/test/docs 전환 반영.
- 2026-06-29 18:29:00: 독립 대조 피드백 반영 — recursive update 결정 근거 기록, publish manifest pack 검사 테스트 추가.
