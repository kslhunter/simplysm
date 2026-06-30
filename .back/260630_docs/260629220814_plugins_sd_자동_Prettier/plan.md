# Plan: plugins/sd 자동 Prettier

## 0. 메타데이터

| 항목 | 내용 |
| ---- | ---- |
| Plan ID | PLAN-260629220814 |
| 상태 | Ready |
| 생성 시각 | 2026-06-29 22:08:14 |
| 제목 | plugins/sd 자동 Prettier |
| 대상 범위 | `plugins/sd`의 Pi extension 및 Claude Code plugin hook에 파일 작업 후 Prettier 자동 실행 추가 |
| 근거 자료 | 사용자 발언: “plugins/sd 파일.... 작업후 prettier 처리 가능?”, “plugin화 가능?”, “Pi 랑 Claude 둘다 생각”; 코드: `plugins/sd/package.json`, `plugins/sd/.claude-plugin/plugin.json`, `plugins/sd/extensions/index.ts`, `plugins/sd/extensions/hooks/register.ts`, `plugins/sd/extensions/hooks/write-hash.ts`, `plugins/sd/extensions/hooks/shell.ts`, `plugins/sd/hooks/hooks.json`, `plugins/sd/hooks/check-write.ts`, `plugins/sd/hooks/cache-read-hash.ts`, `plugins/sd/hooks/check-shell.ts`, `plugins/sd/shared/write-hash.ts`, `plugins/sd/shared/shell-guard.ts`, `plugins/sd/tsconfig.json`, `.prettierrc.yaml`, `eslint.config.ts`, 루트 `package.json`; 공식 문서: Pi `docs/extensions.md`, Pi `docs/packages.md`, Claude Code Hooks reference `https://code.claude.com/docs/en/hooks.md`, Claude Code Plugins reference `https://code.claude.com/docs/en/plugins-reference.md` |
| 작성 원칙 | 근거 없는 항목은 `[OPEN]`, 구현은 별도 지시 전까지 보류 |

## 1. 목표·문제·완료 정의

- 목표: `plugins/sd/**` 파일을 Pi 또는 Claude Code가 직접 파일 수정 도구로 변경한 뒤, 작업 종료 시점에 해당 파일들만 Prettier로 자동 정리하는 양쪽 런타임 통합 계획을 확정한다.
- 해결할 문제: 기존 답변은 Pi extension만 고려했고, 실제 `plugins/sd`는 Pi extension(`extensions/`)과 Claude Code plugin hook(`hooks/hooks.json`)을 함께 제공하므로 양쪽 진입점을 모두 설계해야 한다. (근거: 사용자 지적, `plugins/sd/package.json#pi.extensions`, `plugins/sd/.claude-plugin/plugin.json`, `plugins/sd/hooks/hooks.json`)
- 완료 정의:
  - Pi에서 `write`/`edit` 성공 파일 중 프로젝트 루트의 `plugins/sd/**`에 속하는 파일을 추적하고 `agent_end`에서 Prettier를 실행하는 계획이 있다.
  - Claude Code에서 `PostToolUse`로 파일을 수집하고 `Stop`에서 Prettier를 실행하는 계획이 있다.
  - 양쪽이 가능한 한 동일한 필터·실행 로직을 `plugins/sd/shared`에서 공유한다.
  - Prettier 실패가 silent skip 되지 않고 에이전트/사용자에게 노출되는 검증 기준이 있다.
- 성공 시 관찰 가능한 변화: 구현 후 `plugins/sd` 내 파일이 `Write`/`Edit`류 도구로 변경되면 작업 종료 시점에 변경 파일만 `.prettierrc.yaml` 기준으로 포맷된다.

## 2. 범위 / 비범위 / 제약

### 2.1 범위

| ID | 포함 항목 | 근거 |
| -- | --------- | ---- |
| SCOPE-001 | `plugins/sd/shared`에 Prettier 대상 판정·파일 목록 정규화·실행 결과 처리 공통 로직 추가 | Pi와 Claude 양쪽 모두 같은 `plugins/sd` 범위와 Prettier 명령을 써야 중복·불일치를 줄일 수 있음. 기존에도 `shared/write-hash.ts`, `shared/shell-guard.ts`를 Pi/Claude 양쪽에서 재사용함 |
| SCOPE-002 | Pi extension adapter 추가 및 `registerHooks(pi)`에 등록 | Pi extension은 `plugins/sd/package.json#pi.extensions` → `plugins/sd/extensions/index.ts` → `registerHooks(pi)` 구조로 로드됨 |
| SCOPE-003 | Claude Code hook adapter 추가 및 `plugins/sd/hooks/hooks.json`에 등록 | Claude plugin hook은 공식 문서상 plugin root의 `hooks/hooks.json`에서 로드되며, 현재 `hooks.json`이 `PreToolUse`, `PostToolUse`, `SessionStart`를 사용 중임 |
| SCOPE-004 | `plugins/sd/**` 파일만 포맷하도록 경로 필터링 | 사용자 요청 대상이 `plugins/sd` 파일로 한정됨 |
| SCOPE-005 | Prettier 실패·대상 없음·파일 소실을 명시적으로 처리하는 에러/알림 정책 | 저장소 규칙상 실패를 성공처럼 숨기면 안 되며, Claude Hooks와 Pi extension 모두 사용자/에이전트 피드백 경로가 있음 |
| SCOPE-006 | 최소 검증 절차 문서화: hook JSON 수동 입력 테스트, Pi 이벤트 흐름 확인, typecheck, prettier check | 현재 `plugins/sd`에는 별도 테스트 스크립트가 없고 `plugins/**`는 루트 ESLint ignore 대상임. 검증 명령을 계획에 고정해야 함 |

### 2.2 비범위

| ID | 제외 항목 | 제외 이유 | 후속 처리 |
| -- | --------- | --------- | --------- |
| NONSCOPE-001 | 저장소 전체 자동 포맷 | 사용자 요청은 `plugins/sd` 파일 작업 후 처리에 한정됨 | 필요 시 별도 요청으로 계획 |
| NONSCOPE-002 | Bash/PowerShell 명령이 임의로 변경한 파일까지 완전 추적 | Pi/Claude의 직접 파일 도구 입력과 달리 쉘 내부 변경 파일을 신뢰성 있게 특정하려면 git diff/file watcher 등 별도 설계가 필요함 | 필요 시 후속 확장 |
| NONSCOPE-003 | Prettier 설정 자체 변경 | 기존 `.prettierrc.yaml`이 존재하며 요청은 자동 실행 플러그인화임 | 포맷 정책 변경 요청 시 별도 처리 |
| NONSCOPE-004 | plugin 배포 체계 개편 또는 marketplace 구성 변경 | 현재 계획은 기존 plugin 구조에 hook/extension을 추가하는 범위임 | 배포 경로가 문제로 확인되면 별도 계획 |
| NONSCOPE-005 | 구현 착수, 파일 수정, 테스트 실행 | `sd-plan`은 계획 작성 후 자동 구현으로 넘어가지 않음 | 사용자 구현 지시 후 수행 |

### 2.3 제약

| ID | 제약 | 영향 | 근거 |
| -- | ---- | ---- | ---- |
| CONSTRAINT-001 | Pi extension은 TypeScript 모듈로 `ExtensionAPI` 이벤트에 등록해야 함 | Pi 쪽은 `tool_result`/`agent_end` 기반 adapter가 적합 | Pi `docs/extensions.md`, 기존 `plugins/sd/extensions/*` 구조 |
| CONSTRAINT-002 | Claude Code plugin hook은 별도 프로세스로 실행되므로 이벤트 간 상태를 파일 등에 저장해야 함 | `PostToolUse` 수집 목록을 `Stop`에서 읽도록 세션별 임시 파일 필요 | Claude Hooks reference: command hook은 stdin JSON을 받고 이벤트별로 실행됨 |
| CONSTRAINT-003 | Claude `PostToolUse`는 이미 도구가 성공한 뒤 실행되고, `Stop`은 응답 종료 시 실행됨 | Claude 쪽 자동 포맷은 변경 차단이 아니라 사후 정리이며 실패 시 Stop feedback으로 계속 작업시켜야 함 | Claude Hooks reference: `PostToolUse`, `Stop` 이벤트 설명 |
| CONSTRAINT-004 | Hook/extension 명령은 사용자의 전체 권한으로 실행됨 | 경로 필터링과 인자 배열 실행으로 범위를 제한해야 함 | Claude Hooks security considerations, Pi extension security 설명 |
| CONSTRAINT-005 | `plugins/sd`의 현재 TS 설정은 `allowImportingTsExtensions: true`, `moduleResolution: Bundler` | 새 TS 파일도 기존 import 스타일(`.ts` 확장 포함/미포함 혼재)을 주변 패턴에 맞춰야 함 | `plugins/sd/tsconfig.json`, 기존 hook/extension 파일 |
| CONSTRAINT-006 | 루트 Prettier 설정은 `.prettierrc.yaml`에 있음 | Prettier 실행 cwd는 감지된 프로젝트 루트로 두는 것이 설정 탐색에 유리함 | `.prettierrc.yaml` 확인 |
| CONSTRAINT-007 | 루트 ESLint는 `plugins/**`를 ignore함 | 검증은 ESLint보다 TS typecheck와 Prettier check 중심이 되어야 함 | `eslint.config.ts` 확인 |
| CONSTRAINT-008 | Claude Code hook handler는 병렬 실행될 수 있음 | `PostToolUse` 수집 상태는 단일 JSON 파일 read-modify-write가 아니라 동시성 안전한 marker 방식이어야 함 | Claude Hooks reference: matching hooks run in parallel, `PostToolBatch`는 batch 후 1회 실행 |
| CONSTRAINT-009 | Claude hook stdin의 `cwd`는 hook 호출 시 현재 작업 디렉터리이고 `${CLAUDE_PROJECT_DIR}`는 프로젝트 루트임 | Claude adapter는 `process.env.CLAUDE_PROJECT_DIR`를 우선 프로젝트 루트로 사용하고, 없을 때만 `cwd` 상위 탐색으로 fallback해야 함 | Claude Hooks reference “Common input fields”, “Reference scripts by path” |

## 3. 조사 요약

| ID | 조사 관점 | 확인 내용 | 근거 | plan 반영 |
| -- | --------- | --------- | ---- | --------- |
| FIND-001 | 현재 Pi 구조 | `plugins/sd/package.json`의 `pi.extensions`가 `./extensions`를 가리키고, `extensions/index.ts`에서 `registerHooks(pi)`와 도구들을 등록함 | `plugins/sd/package.json`, `plugins/sd/extensions/index.ts` | SCOPE-002, TASK-002 |
| FIND-002 | 현재 Claude 구조 | Claude plugin manifest는 `.claude-plugin/plugin.json`, hook 설정은 `hooks/hooks.json`에 있으며 기존 hook 스크립트는 `bun "${CLAUDE_PLUGIN_ROOT}/hooks/*.ts"` 형태로 실행됨 | `plugins/sd/.claude-plugin/plugin.json`, `plugins/sd/hooks/hooks.json` | SCOPE-003, TASK-003 |
| FIND-003 | 양쪽 공유 패턴 | `write-hash`와 `shell-guard`는 `shared/*`에 공통 로직을 두고 Pi/Claude adapter가 각각 호출함 | `plugins/sd/extensions/hooks/write-hash.ts`, `plugins/sd/hooks/check-write.ts`, `plugins/sd/hooks/cache-read-hash.ts`, `plugins/sd/extensions/hooks/shell.ts`, `plugins/sd/hooks/check-shell.ts` | DEC-001, TASK-001 |
| FIND-004 | Pi 이벤트 적합성 | Pi는 `tool_result`에서 결과 수정/확인이 가능하고 `agent_end`는 사용자 prompt 단위 종료 후 실행됨. 예제도 `agent_end`에서 후속 메시지를 보냄 | Pi `docs/extensions.md`, `examples/extensions/git-merge-and-resolve.ts` | DEC-002, TASK-002 |
| FIND-005 | Claude 이벤트 적합성 | Claude는 `PostToolUse`가 성공한 도구 뒤에 실행되고, `Stop`은 Claude가 응답 종료하려 할 때 실행되며 `decision: "block"` 또는 additionalContext로 계속 작업시킬 수 있음 | Claude Hooks reference `PostToolUse`, `Stop` | DEC-003, TASK-003 |
| FIND-006 | Hook command path 안전 | Claude 공식 문서는 `${CLAUDE_PLUGIN_ROOT}`를 참조하는 hook은 exec form(`command`+`args`)을 권장함 | Claude Hooks reference “Exec form and shell form”, “Reference scripts by path” | DEC-004, TASK-003 |
| FIND-007 | 포맷 설정 | 루트 `.prettierrc.yaml`이 존재하고 Prettier가 루트 `devDependencies`에 있음 | `.prettierrc.yaml`, 루트 `package.json` | DEC-005, TASK-001 |
| FIND-008 | 테스트·린트 현황 | `plugins/**`는 루트 ESLint ignore이고, `plugins/sd/tsconfig.json`에는 noEmit TS 설정이 있음 | `eslint.config.ts`, `plugins/sd/tsconfig.json` | TEST-003, GATE-002 |
| FIND-009 | Claude tool path 입력 | 공식 Hook 문서상 `Write`/`Edit`의 `tool_input.file_path`는 절대 경로임 | Claude Hooks reference `PreToolUse input`, `PostToolUse input` | TASK-003 |
| FIND-010 | Pi tool path 입력 | 현재 Pi built-in `write`/`edit` 도구는 입력의 `path`를 사용함 | 현재 세션 tool schema, Pi extension docs의 tool_call 예시 | TASK-002 |
| FIND-011 | Claude hook 검증 | Claude plugin reference는 `claude plugin validate`가 `plugin.json`, `hooks/hooks.json`의 syntax/schema 오류를 검증한다고 설명함 | Claude Code Plugins reference “Debugging and development tools” | GATE-001 |
| FIND-012 | 프로젝트 루트 산정 | Claude 문서는 hook input `cwd`와 `${CLAUDE_PROJECT_DIR}`를 구분하며, plugin 경로 참조에는 `${CLAUDE_PLUGIN_ROOT}`, 프로젝트 루트 참조에는 `${CLAUDE_PROJECT_DIR}`를 사용한다고 설명함 | Claude Hooks reference “Common input fields”, “Reference scripts by path”; Claude Plugins reference “Environment variables” | DEC-006, TASK-001, TASK-003 |

## 4. 대안·결정 로그

| ID | 상태 | 맥락 | 선택지 | 결정 | 근거 | 결과·트레이드오프 | 재검토 조건 |
| -- | ---- | ---- | ------ | ---- | ---- | ----------------- | ------------ |
| DEC-001 | Accepted | Pi와 Claude 양쪽 구현 중복 방지 | A. 각 adapter에 별도 구현 / B. `shared/prettier.ts` 공통화 | B 채택 | 기존 `shared` 재사용 패턴(FIND-003) | 경로·명령·오류 처리 일관성 확보. 단, adapter별 이벤트 상태 관리는 별도 필요 | 공통 로직이 런타임별 API에 과도하게 의존하면 분리 |
| DEC-002 | Accepted | Pi에서 “작업 후” 실행 시점 | A. `tool_result`마다 즉시 실행 / B. `tool_result`에서 수집 후 `agent_end`에서 일괄 실행 | B 채택 | Pi `agent_end` 이벤트와 예제(FIND-004) | 한 턴에서 여러 파일 수정 시 Prettier 1회. 중간 포맷으로 edit 충돌 가능성 감소 | 사용자가 파일마다 즉시 포맷을 원하면 재검토 |
| DEC-003 | Accepted | Claude에서 “작업 후” 실행 시점 | A. `PostToolUse`마다 즉시 실행 / B. `PostToolUse` 수집 후 `Stop`에서 일괄 실행 / C. `PostToolBatch`에서 실행 | B 채택 | `Stop`이 응답 종료 시점이며 block/feedback 가능(FIND-005) | 사용자 응답 직전 포맷 가능. 단, Stop hook 반복 방지 설계 필요 | 긴 턴 중 다음 모델 요청 전에 반드시 포맷해야 하면 `PostToolBatch` 보조 검토 |
| DEC-004 | Accepted | Claude hook command 방식 | A. 기존 shell form 유지 / B. exec form으로 `command: "bun", args: ["${CLAUDE_PLUGIN_ROOT}/hooks/..."]` 사용 | B 채택 | 공식 문서가 path placeholder 사용 시 exec form 권장(FIND-006) | 경로 공백·특수문자 안전성 향상. 기존 hooks와 스타일 차이는 있으나 새 hook부터 안전 패턴 적용 | Bun 실행 파일 탐색 문제가 확인되면 shell form fallback 검토 |
| DEC-005 | Accepted | Prettier 실행 방법 | A. 직접 prettier API import / B. `bun x prettier --write --ignore-unknown <files>` 실행 | B 채택 | 루트 devDependency에 Prettier 존재(FIND-007), hook/extension은 이미 Bun 기준 | 의존성 API 결합 없이 단순. 단, 실행 환경에 `bun`/프로젝트 Prettier 필요 | plugin을 `simplysm` 외 프로젝트에서 범용 사용해야 하면 dependency 번들 여부 재검토 |
| DEC-006 | Accepted | 대상 파일 범위와 루트 산정 | A. plugin 설치 루트 기준 / B. hook input `cwd/plugins/sd` 기준 / C. 프로젝트 루트(`CLAUDE_PROJECT_DIR` 우선, 없으면 cwd 상위에서 `plugins/sd/package.json` 탐색) 기준 | C 채택 | 사용자 요청은 현재 코드베이스 `plugins/sd` 파일이고, Claude는 `cwd`와 프로젝트 루트를 구분함(FIND-012) | 하위 디렉터리에서 실행돼도 `plugins/sd` 감지 가능. 전역 설치된 plugin 자체를 의도치 않게 포맷하지 않음 | 루트 탐색 실패 또는 다중 workspace 구조가 확인되면 재검토 |
| DEC-007 | Accepted | Claude `MultiEdit` 대응 | A. 공식 문서 근거가 있는 `Write|Edit`만 기본 매칭 / B. `MultiEdit`까지 포함 | A 채택, B는 OPEN-001 확인 후 추가 | fetched 공식 입력 표에는 `Write`/`Edit`만 명시됨(FIND-009) | 근거 없는 matcher를 기본 구현에 넣지 않음. MultiEdit이 실제 필요하면 후속으로 확장 | 현재 Claude 버전에서 `MultiEdit` 존재와 `file_path` schema가 확인됨 |
| DEC-008 | Accepted | Prettier 실패 처리 | A. 경고만 출력하고 종료 / B. 실패 시 Pi는 follow-up, Claude는 Stop block으로 에이전트가 수정 계속 | B 채택 | 실패 silent skip 금지, Pi `sendUserMessage` 예제, Claude Stop decision control | 포맷 실패를 사용자/에이전트가 인지하고 고칠 수 있음. 반복 실패 루프 방지 메시지 필요 | Stop hook이 과도하게 반복되면 block 대신 사용자 경고 후 stop 허용으로 완화 |
| DEC-009 | Accepted | Claude `PostToolUse` 수집 상태 저장 | A. 세션 JSON 파일 read-modify-write / B. 파일별·이벤트별 marker 파일 생성 후 flush에서 de-dupe / C. `PostToolBatch`로 대체 | B 채택 | Claude hook handler 병렬 실행 제약(CONSTRAINT-008) | lock 없이 동시 수집 손실을 줄임. temp marker cleanup이 필요 | marker 누적 또는 파일시스템 비용이 문제가 되면 PostToolBatch 재검토 |
| DEC-010 | Accepted | Claude Stop 반복 실패 처리 | A. 실패할 때마다 block / B. 최초 실패는 block, `stop_hook_active=true`에서는 사용자 경고를 남기고 추가 block하지 않음 | B 채택 | Claude Stop 입력의 `stop_hook_active`는 반복 block 방지 판단에 사용해야 함 | 한 번은 에이전트가 고칠 기회를 받고, 반복 루프는 피함. 실패는 사용자에게 노출됨 | 사용자가 실패 시 항상 block을 원하면 정책 재검토 |

## 5. 영향도 분석

| ID | 대상 | 영향 유형 | 변경 필요성 | 공개 계약 영향 | 데이터 영향 | 테스트 영향 | 위험도 |
| -- | ---- | --------- | ----------- | -------------- | --------- | --------- | ------ |
| IMPACT-001 | `plugins/sd/shared/prettier.ts` | 생성 | 공통 경로 필터·Prettier 실행 로직 필요 | 없음 | 임시 파일/대상 파일 포맷 변경 | 단위성 수동 테스트 가능 | Medium |
| IMPACT-002 | `plugins/sd/extensions/hooks/prettier.ts` | 생성 | Pi adapter 필요 | Pi extension 런타임 동작 추가 | `plugins/sd` 파일 내용이 자동 포맷됨 | Pi 이벤트 흐름 수동 검증 필요 | Medium |
| IMPACT-003 | `plugins/sd/extensions/hooks/register.ts` | 수정 | Pi hook 등록 필요 | Pi extension 활성 동작 추가 | 없음 | typecheck 필요 | Low |
| IMPACT-004 | `plugins/sd/hooks/prettier-collect.ts` | 생성 | Claude `PostToolUse` 수집 필요 | Claude plugin hook 동작 추가 | 세션별 임시 수집 파일 생성 | stdin fixture 테스트 필요 | Medium |
| IMPACT-005 | `plugins/sd/hooks/prettier-flush.ts` | 생성 | Claude `Stop` 실행 필요 | Claude plugin hook 동작 추가 | `plugins/sd` 파일 내용이 자동 포맷됨, 수집 파일 cleanup | stdin fixture 테스트 필요 | Medium |
| IMPACT-006 | `plugins/sd/hooks/hooks.json` | 수정 | Claude hook 등록 필요 | Claude plugin이 새 hook을 자동 실행 | 없음 | JSON 유효성 확인 필요 | Medium |
| IMPACT-007 | `.prettierrc.yaml` | 수정 없음 | 기존 설정을 사용 | 없음 | 없음 | Prettier check 기준 | Low |
| IMPACT-008 | `plugins/sd/package.json` | 수정 없음(기본안) | Pi npm package는 `shared`를 이미 포함함. Claude hook 배포 방식이 npm이 아님을 전제로 변경 없음 | 없음 | 없음 | 필요 시 배포 검증 | Low |

## 6. 가정 / OPEN / 리스크

### 6.1 가정

| ID | 가정 | 근거 수준 | 틀렸을 때 영향 | 확인 방법 | 구현 차단 여부 |
| -- | ---- | --------- | -------------- | --------- | -------------- |
| ASM-001 | 자동 포맷 대상은 감지된 프로젝트 루트 기준 `plugins/sd/**`이다 | 확인됨 | 하위 디렉터리 실행 시 대상 누락 또는 plugin 설치 캐시 오포맷 가능 | 사용자 발언, 현재 cwd, Claude `${CLAUDE_PROJECT_DIR}` 문서 확인 | Non-blocking |
| ASM-002 | 구현 시 `bun` 명령을 hook/extension 프로세스에서 사용할 수 있다 | 확인됨 | Prettier 실행 실패 | 기존 Claude hooks가 `bun`으로 실행되고 프로젝트 지침도 Bun 기준이라고 명시 | Non-blocking |
| ASM-003 | Prettier 설정은 프로젝트 루트 `.prettierrc.yaml`을 사용한다 | 확인됨 | 다른 포맷 결과 | 파일 확인 | Non-blocking |
| ASM-004 | `plugins/sd` 변경 파일은 대부분 `Write`/`Edit`류 직접 파일 도구에서 발생한다 | 미확인 | Bash가 만든 파일은 자동 포맷 대상에서 누락 | 구현 후 실제 사용 로그 또는 필요 시 git diff 기반 확장 | Non-blocking |

### 6.2 OPEN

| ID | 질문·미정 사항 | 선택지 | 추천안 | 차단 여부 | 해결 후 반영 위치 |
| -- | -------------- | ------ | ------ | --------- | ----------------- |
| OPEN-001 | Claude Code 현재 사용 버전에서 `MultiEdit` matcher가 실제로 필요한가 | A. 제외 / B. 포함하되 no-op 안전 처리 | A. 기본 구현에서는 제외하고, `MultiEdit` 존재와 `file_path` schema 확인 후 B 적용 | Non-blocking | DEC-007, TASK-003 |
| OPEN-002 | Claude plugin이 향후 npm package 산출물만으로 배포되는가 | A. 현재처럼 plugin root 기반 / B. npm 산출물에도 `.claude-plugin`/`hooks` 포함 필요 | A. 현재 계획에서는 변경하지 않음 | Non-blocking | IMPACT-008, 후속 배포 계획 |

### 6.3 리스크

| ID | 리스크 | 가능성 | 영향 | 예방·완화 | 조기 경고 신호 | 대응 |
| -- | ------ | ------ | ---- | --------- | -------------- | ---- |
| RISK-001 | Prettier가 hook 종료 시 파일 내용을 바꿔 에이전트가 마지막으로 작성한 내용과 달라짐 | Medium | Medium | 작업 종료 시점 일괄 실행, 성공/실패 피드백 명시 | 포맷 후 후속 edit가 같은 old text를 못 찾음 | 에이전트에게 포맷 완료 파일 목록 전달 또는 필요 시 read 재수행 안내 |
| RISK-002 | Claude Stop hook이 Prettier 실패로 반복 block됨 | Low | Medium | 최초 실패만 block하고, `stop_hook_active=true`에서는 사용자 경고를 남긴 뒤 추가 block하지 않음 | `stop_hook_active`가 true인 입력에서 같은 실패 반복 | pending marker는 유지하되 stop은 허용하고 사용자에게 실패를 명시 보고 |
| RISK-003 | `bun x prettier`가 프로젝트 의존성을 찾지 못하거나 네트워크 설치를 시도함 | Low | Medium | cwd를 프로젝트 루트로 설정, stderr를 그대로 노출 | “prettier not found” 또는 설치 로그 | `node_modules/.bin/prettier`/`bun run prettier` 탐색 fallback 또는 dependency 추가 별도 검토 |
| RISK-004 | 경로 필터 버그로 `plugins/sd` 밖 파일이 포맷됨 | Low | High | `resolve`/`relative` 기반 하위 경로 판정, path traversal 금지 | 포맷 결과에 외부 경로 표시 | 즉시 hook 비활성화 후 필터 수정 |
| RISK-005 | Claude hook 상태 파일이 세션 종료 후 남음 | Medium | Low | Stop 성공 시 cleanup, 파일명에 session_id 사용 | temp 디렉터리 누적 | TTL cleanup 추가 |
| RISK-006 | 루트 ESLint ignore 때문에 구현 품질 문제가 검증에서 빠짐 | Medium | Medium | `tsc -p plugins/sd/tsconfig.json --noEmit`와 수동 hook fixture 테스트를 게이트로 둠 | type-only 오류 또는 런타임 오류 | 테스트 보강 또는 plugin 전용 lint 후속 계획 |

## 7. 작업 분해

### TASK-001: 공통 Prettier 유틸 설계·구현

- 상태: Todo
- 목적: Pi extension과 Claude hook이 동일한 방식으로 `plugins/sd` 대상 파일을 판정하고 Prettier를 실행하게 한다.
- 연결 근거: FIND-003 / FIND-007 / DEC-001 / DEC-005 / SCOPE-001
- 산출물:
  - `plugins/sd/shared/prettier.ts`
- 변경 대상:
  - 반드시 변경:
    - `plugins/sd/shared/prettier.ts` 생성
  - 변경 가능:
    - `plugins/sd/shared` 내 타입 보조 함수
  - 변경 금지:
    - `.prettierrc.yaml`
    - `package.json` dependency 목록(별도 결정 전)
- 현재 상태: Prettier 관련 shared 유틸 없음.
- 작업 내용:
  - `resolveWorkspaceRoot({ cwd, projectDir? }): string | undefined` 또는 동등 함수 구현. `projectDir`가 있으면 우선 사용하고, 없으면 `cwd`에서 상위로 올라가며 `plugins/sd/package.json`을 찾음.
  - `resolvePluginsSdRoot(workspaceRoot): string` 또는 동등 함수로 `workspaceRoot/plugins/sd` 절대 경로 계산.
  - `isUnderPluginsSd(filePath, workspaceRoot): boolean` 구현. `path.resolve`, `path.relative` 사용, `..`/절대 외부 경로 제외.
  - 입력 경로 배열을 중복 제거하고, 존재하는 일반 파일만 남기는 함수 구현.
  - `runPrettier(workspaceRoot, files)` 구현: `bun x prettier --write --ignore-unknown ...files`를 프로젝트 루트 cwd 기준으로 실행.
  - stdout/stderr/code/files를 포함한 구조화 결과 반환.
  - 파일 없음은 성공 no-op으로 처리하되 “포맷함”으로 보고하지 않음.
- 선행 작업: 없음
- 후속 작업: TASK-002, TASK-003
- 수용 기준:
  - AC-001
  - AC-002
- 테스트·검증:
  - TEST-001
  - TEST-003
  - GATE-002
- 롤백 영향: 새 파일 삭제로 롤백 가능.
- 구현 시 주의:
  - 경로 필터는 문자열 prefix 비교만 쓰지 말고 `relative` 기반으로 구현.
  - `plugins/sd` 밖 파일은 함수 수준에서 제외.
  - Prettier 출력이 너무 길면 adapter에서 요약/절단 가능하도록 결과 구조를 유지.
- 정지 조건:
  - `bun x prettier` 실행 방식이 현재 환경에서 불가능하다고 확인되면 대체 실행 방식을 결정하기 전 구현 중지.

### TASK-002: Pi extension adapter 추가

- 상태: Todo
- 목적: Pi에서 `write`/`edit` 성공 후 `plugins/sd` 파일을 수집하고 `agent_end`에서 일괄 Prettier 실행한다.
- 연결 근거: FIND-001 / FIND-004 / FIND-010 / DEC-002 / DEC-008 / SCOPE-002
- 산출물:
  - `plugins/sd/extensions/hooks/prettier.ts`
  - `plugins/sd/extensions/hooks/register.ts` 수정
- 변경 대상:
  - 반드시 변경:
    - `plugins/sd/extensions/hooks/prettier.ts`
    - `plugins/sd/extensions/hooks/register.ts`
  - 변경 가능:
    - 없음
  - 변경 금지:
    - 기존 `write-hash`/`shell` hook 동작
    - `plugins/sd/extensions/index.ts` 구조(필요 없는 경우)
- 현재 상태: Pi hooks는 shell guard, write hash, references, claude skills만 등록.
- 작업 내용:
  - `registerPrettierHook(pi)` 함수 추가.
  - `pi.on("tool_result")`에서 `event.toolName`이 `write` 또는 `edit`이고 `event.isError`가 아니면 `event.input.path` 추출.
  - 공통 root resolver로 `ctx.cwd`의 상위에서 프로젝트 루트를 찾고, 추출한 경로가 `workspaceRoot/plugins/sd/**`이면 in-memory `Set`에 추가.
  - `pi.on("agent_end")`에서 Set이 비어 있지 않으면 공통 `runPrettier(workspaceRoot, files)` 실행.
  - 성공 시 Set cleanup. 실패 시 Set 유지 또는 실패 파일 재추적 후 `ctx.ui.notify`와 `pi.sendUserMessage(..., { deliverAs: "followUp" })`로 실패 원인 전달.
  - `registerHooks(pi)`에 `registerPrettierHook(pi)` 등록. 등록 순서는 write-hash/shell 뒤여도 되며, 파일 변경 사후 작업이므로 기존 차단 hook보다 뒤에 둔다.
- 선행 작업: TASK-001
- 후속 작업: TASK-004
- 수용 기준:
  - AC-003
  - AC-004
- 테스트·검증:
  - TEST-002
  - TEST-003
  - GATE-002
- 롤백 영향: `registerPrettierHook` 등록 제거 및 파일 삭제로 원복 가능.
- 구현 시 주의:
  - `agent_end`에서 실패를 성공 알림으로 처리하지 않음.
  - formatting 대상이 없으면 no-op.
  - `ctx.hasUI` 확인 후 notify 사용.
  - 같은 턴 여러 파일은 한 번만 실행.
- 정지 조건:
  - Pi `tool_result` event에서 built-in `write`/`edit` 입력 경로 확인이 불가능하면 `tool_execution_end` 등 대체 event 근거를 확인하기 전 구현 중지.

### TASK-003: Claude Code hook adapter 추가

- 상태: Todo
- 목적: Claude Code에서 `PostToolUse`로 `plugins/sd` 변경 파일을 세션별로 수집하고 `Stop`에서 Prettier를 일괄 실행한다.
- 연결 근거: FIND-002 / FIND-005 / FIND-006 / FIND-009 / CONSTRAINT-008 / DEC-003 / DEC-004 / DEC-007 / DEC-008 / DEC-009 / DEC-010 / SCOPE-003
- 산출물:
  - `plugins/sd/hooks/prettier-collect.ts`
  - `plugins/sd/hooks/prettier-flush.ts`
  - `plugins/sd/hooks/hooks.json` 수정
- 변경 대상:
  - 반드시 변경:
    - `plugins/sd/hooks/prettier-collect.ts`
    - `plugins/sd/hooks/prettier-flush.ts`
    - `plugins/sd/hooks/hooks.json`
  - 변경 가능:
    - `plugins/sd/shared/prettier.ts` 보조 함수
  - 변경 금지:
    - 기존 `check-write`, `check-shell`, `cache-read-hash`, `SessionStart` hook 의미
- 현재 상태: Claude hooks는 `Write` 사전 hash 검사, `Read` 후 hash cache, shell guard, SessionStart context injection만 있음.
- 작업 내용:
  - `prettier-collect.ts`:
    - stdin JSON 파싱.
    - `session_id`, `cwd`, `tool_name`, `tool_use_id`, `tool_input.file_path` 추출.
    - `process.env.CLAUDE_PROJECT_DIR`를 프로젝트 루트로 우선 사용하고, 없으면 input `cwd`에서 상위 탐색 fallback.
    - 기본 구현은 `Write|Edit` 중 `file_path`가 있는 경우만 처리. `MultiEdit`는 OPEN-001 확인 전 포함하지 않음.
    - 공통 필터로 `workspaceRoot/plugins/sd/**` 파일만 세션별 temp marker 디렉터리에 추가.
    - 단일 JSON 목록 파일을 read-modify-write하지 말고, `pathHash + tool_use_id 또는 random` 기반 marker 파일을 생성해 병렬 `PostToolUse` 손실을 피함.
    - 수집 실패는 stderr + non-zero로 노출하되, 도구 결과 자체를 차단하지 않도록 신중히 처리.
  - `prettier-flush.ts`:
    - Stop stdin JSON에서 `session_id`, `cwd`, `stop_hook_active` 추출 후 collect와 동일한 방식으로 프로젝트 루트 산정.
    - 세션별 marker들을 읽어 파일 경로를 de-dupe.
    - 존재하는 대상 파일만 공통 `runPrettier`로 실행.
    - 성공 시 marker cleanup, stdout은 필요하면 JSON `systemMessage` 또는 조용한 성공으로 처리.
    - 실패 시 `stop_hook_active=false`이면 JSON `{ "decision": "block", "reason": "..." }`로 Claude가 한 번 수정하게 함.
    - 실패 시 `stop_hook_active=true`이면 반복 block하지 않고 JSON `systemMessage`로 사용자에게 실패를 명시한 뒤 marker는 유지함.
  - `hooks/hooks.json`:
    - `PostToolUse`에 matcher `Write|Edit` 추가. `MultiEdit`는 OPEN-001 해결 후 추가.
    - `Stop` hook 추가. Stop은 matcher를 지원하지 않으므로 matcher 생략 또는 무의미한 matcher 사용 금지.
    - path placeholder는 exec form 권장에 맞춰 `command: "bun", args: ["${CLAUDE_PLUGIN_ROOT}/hooks/prettier-collect.ts"]` 형식 사용.
- 선행 작업: TASK-001
- 후속 작업: TASK-004
- 수용 기준:
  - AC-005
  - AC-006
  - AC-007
- 테스트·검증:
  - TEST-004
  - TEST-005
  - GATE-001
  - GATE-002
- 롤백 영향: `hooks.json` 등록 제거 및 두 script 삭제로 원복 가능. temp 파일은 cleanup 또는 무시 가능.
- 구현 시 주의:
  - plugin root에 상태 파일을 쓰지 말 것. 세션별 temp 또는 `CLAUDE_PLUGIN_DATA` 중 temp를 기본으로 사용.
  - Stop hook은 matcher 미지원이므로 모든 Stop에서 빠른 no-op 가능해야 함.
  - JSON stdout은 유효한 단일 JSON만 출력해야 함.
  - `MultiEdit`는 공식/현재 버전 근거 확인 전 기본 구현에 넣지 않음.
- 정지 조건:
  - Claude hook에서 `Stop`이 사용 환경에서 지원되지 않거나 plugin hook JSON schema가 실패하면 대체 event(`PostToolBatch`)를 검토하기 전 구현 중지.

### TASK-004: 등록·상호작용 검증

- 상태: Todo
- 목적: 새 자동 포맷이 기존 hooks와 충돌하지 않고, 양쪽 런타임에서 대상 파일만 처리되는지 검증한다.
- 연결 근거: FIND-001 / FIND-002 / FIND-008 / SCOPE-006
- 산출물:
  - 검증 명령 결과
  - 필요 시 구현 중 발견된 문제 수정
- 변경 대상:
  - 반드시 변경:
    - 없음
  - 변경 가능:
    - TASK-001~003 산출물의 오류 수정
  - 변경 금지:
    - 테스트 기대값·snapshot·lockfile 갱신(별도 사용자 요청 전)
- 현재 상태: 전용 테스트 없음.
- 작업 내용:
  - `bun x tsc -p plugins/sd/tsconfig.json --noEmit` 실행.
  - `bun x prettier --check plugins/sd/extensions plugins/sd/hooks plugins/sd/shared` 실행.
  - Claude collect/flush scripts를 fixture stdin으로 직접 실행해 `plugins/sd` 내부 파일만 수집·포맷되는지 확인.
  - `plugins/sd` 밖 임시 파일 경로 fixture가 수집되지 않는지 확인.
  - Prettier parse 실패 fixture 또는 존재하지 않는 파일 fixture 처리 확인.
  - Pi 쪽은 가능하면 작은 harness 또는 실제 Pi reload 후 수동 파일 변경으로 확인. 자동화가 없으면 수동 검증 절차를 보고서에 남김.
- 선행 작업: TASK-001, TASK-002, TASK-003
- 후속 작업: 없음
- 수용 기준:
  - AC-008
  - AC-009
- 테스트·검증:
  - TEST-003
  - TEST-004
  - TEST-005
  - GATE-002
  - GATE-003
- 롤백 영향: 검증 중 자동 포맷된 파일은 git diff로 확인 후 필요 시 되돌릴 수 있음.
- 구현 시 주의:
  - 검증용 파일이 필요하면 `plugins/sd` 내부 임시 fixture 생성 여부를 사용자에게 별도 확인하거나, 기존 파일을 훼손하지 않는 방식으로 수행.
  - 검증 명령 실패는 완료로 보고하지 않음.
- 정지 조건:
  - typecheck 또는 hook JSON 검증이 실패하고 원인 수정이 계획 범위를 넘어가면 사용자에게 보고 후 중지.

## 8. 실행 순서 / 의존관계

| 순서 | 작업 | 선행 | 병렬 가능 | 순서 근거 | 피해야 할 순서 |
| ---- | ---- | ---- | --------- | --------- | -------------- |
| 1 | TASK-001 | - | 불가 | Pi/Claude adapter가 공통 로직에 의존 | adapter별로 먼저 구현해 중복 로직 생성 |
| 2 | TASK-002 | TASK-001 | TASK-003과 병렬 가능 | Pi 등록은 공통 유틸 이후 독립 구현 가능 | `registerHooks`만 먼저 수정해 import 대상 없는 상태 만들기 |
| 3 | TASK-003 | TASK-001 | TASK-002와 병렬 가능 | Claude hook도 공통 유틸 이후 독립 구현 가능 | `hooks.json`만 먼저 수정해 script 없는 상태 만들기 |
| 4 | TASK-004 | TASK-001~003 | 불가 | 모든 등록과 script가 있어야 통합 검증 가능 | 검증 전 완료 보고 |

## 9. 수용 기준 / 테스트 전략 / 검증 게이트

### 9.1 수용 기준

| ID | 연결 작업 | 조건 | 관찰 가능한 결과 | 예외·오류 케이스 |
| -- | --------- | ---- | ---------------- | ---------------- |
| AC-001 | TASK-001 | `plugins/sd` 내부 경로만 accepted | 외부 경로, `../` 탈출 경로, 중복 경로가 제외/정리됨 | Windows 경로 구분자에서도 동작 |
| AC-002 | TASK-001 | Prettier 실행 결과가 구조화됨 | 성공/실패, stdout/stderr, 대상 파일 목록을 adapter가 사용할 수 있음 | 대상 파일 0개는 no-op success |
| AC-003 | TASK-002 | Pi `write`/`edit` 성공 파일 수집 | 한 agent turn에서 여러 `plugins/sd` 파일이 Set에 쌓이고 `agent_end`에서 1회 실행 | tool error면 수집하지 않음 |
| AC-004 | TASK-002 | Pi Prettier 실패 노출 | 실패 시 사용자 notify와 follow-up 메시지가 발생하고 정상 완료처럼 숨기지 않음 | UI 없는 모드에서는 follow-up 또는 error 결과만 사용 |
| AC-005 | TASK-003 | Claude `PostToolUse` 수집 | `Write`/`Edit` 입력의 `file_path`가 세션 temp marker로 기록됨 | `file_path` 없음, 외부 경로는 no-op |
| AC-006 | TASK-003 | Claude `Stop` flush | pending marker가 있으면 Prettier 1회 실행 후 marker cleanup | Prettier 실패 시 최초 Stop에서는 block reason 출력 |
| AC-007 | TASK-003 | Hook JSON 유효 | 기존 hooks 유지 + 새 PostToolUse/Stop 등록이 Claude plugin schema상 유효 | Stop에 matcher 의존하지 않음 |
| AC-010 | TASK-003 | Claude 수집 동시성 | 같은 세션에서 collect가 병렬 실행되어도 marker 손상 없이 flush에서 파일 경로가 de-dupe됨 | 같은 파일 중복 marker는 Prettier 1회 대상으로 축약 |
| AC-011 | TASK-003 | Claude 반복 실패 방지 | `stop_hook_active=true`인 Stop에서 같은 Prettier 실패가 추가 block으로 이어지지 않고 사용자 경고로 노출됨 | pending marker는 유지되어 후속 수정 뒤 재시도 가능 |
| AC-012 | TASK-001, TASK-003 | 프로젝트 루트 산정 | Claude adapter는 `CLAUDE_PROJECT_DIR`가 있으면 이를 기준으로 `plugins/sd`를 판단하고, 없으면 cwd 상위 탐색을 사용함 | 하위 디렉터리 cwd fixture에서도 repo root의 `plugins/sd` 파일이 수집됨 |
| AC-008 | TASK-004 | TypeScript 검증 통과 | `bun x tsc -p plugins/sd/tsconfig.json --noEmit` 성공 | 실패 시 수정 전 완료 금지 |
| AC-009 | TASK-004 | 대상 범위 검증 통과 | `plugins/sd` 내부 파일만 포맷되고 외부 파일은 변경되지 않음 | Bash로 만든 파일 추적 누락은 비범위로 보고 |

### 9.2 테스트 전략

| ID | 연결 작업 | 수준 | 케이스 | 파일·명령 | 통과 기준 |
| -- | --------- | ---- | ------ | --------- | --------- |
| TEST-001 | TASK-001 | unit/manual | 경로 필터 함수에 내부/외부/중복/존재하지 않는 파일 입력 | 작은 Bun one-off script 또는 hook fixture | 내부 파일만 결과에 남음 |
| TEST-002 | TASK-002 | manual/integration | Pi에서 `plugins/sd` 파일 edit/write 후 agent_end 포맷 | 실제 Pi `/reload` 후 수동 시나리오 또는 extension harness | Prettier 실행 및 실패 피드백 확인 |
| TEST-003 | TASK-001~004 | typecheck | plugin TS 전체 타입 검사 | `bun x tsc -p plugins/sd/tsconfig.json --noEmit` | exit code 0 |
| TEST-004 | TASK-003 | integration/manual | Claude collect hook stdin fixture | `printf '<PostToolUse JSON>' | bun plugins/sd/hooks/prettier-collect.ts` | temp marker에 내부 파일만 기록 |
| TEST-005 | TASK-003 | integration/manual | Claude flush hook stdin fixture | `printf '<Stop JSON>' | bun plugins/sd/hooks/prettier-flush.ts` | Prettier 성공 시 cleanup, 최초 실패 시 JSON block |
| TEST-006 | TASK-004 | formatting | 포맷 검사 | `bun x prettier --check plugins/sd/extensions plugins/sd/hooks plugins/sd/shared` | exit code 0 |
| TEST-007 | TASK-003 | integration/manual | Claude collect 동시 실행 | 같은 `session_id`로 collect fixture 여러 개를 병렬 실행 | marker 손상 없음, flush에서 경로 de-dupe |
| TEST-008 | TASK-003 | integration/manual | Claude Stop 반복 실패 | `stop_hook_active=false` 실패 후 `stop_hook_active=true` 실패 fixture 실행 | 첫 번째는 block, 두 번째는 사용자 경고 후 추가 block 없음 |
| TEST-009 | TASK-001, TASK-003 | integration/manual | Claude 하위 cwd 루트 산정 | `cwd`를 하위 디렉터리로, `CLAUDE_PROJECT_DIR`를 repo root로 둔 collect fixture 실행 | repo root의 `plugins/sd` 파일이 수집되고 `cwd/plugins/sd` 오판 없음 |

### 9.3 검증 게이트

| ID | 시점 | 검사 항목 | 명령·방법 | 통과 조건 | 실패 시 행동 |
| -- | ---- | --------- | --------- | --------- | ------------ |
| GATE-001 | 구현 중간 | Claude hook JSON 문법·schema | `bun -e 'JSON.parse(await Bun.file("plugins/sd/hooks/hooks.json").text())'` 및 `claude plugin validate plugins/sd` | JSON parse 성공 및 Claude plugin validation 통과 | JSON 또는 hook schema 수정. `claude` CLI 사용 불가 시 BLOCK-005로 중지 |
| GATE-002 | 완료 전 | TS typecheck | `bun x tsc -p plugins/sd/tsconfig.json --noEmit` | exit code 0 | 오류 수정 |
| GATE-003 | 완료 전 | Prettier check | `bun x prettier --check plugins/sd/extensions plugins/sd/hooks plugins/sd/shared` | exit code 0 | `bun x prettier --write ...` 또는 코드 수정 |
| GATE-004 | 완료 전 | 범위 안전성 | 외부 경로 fixture를 collect/flush에 넣어 확인 | 외부 파일 미수집·미변경 | 경로 필터 수정 |
| GATE-005 | 완료 전 | 실패 노출 | Prettier 실패를 유발하는 fixture 또는 mock 실행 | Pi/Claude가 실패를 사용자/에이전트에 노출 | 실패 처리 수정 |
| GATE-006 | 완료 전 | Claude 수집 동시성 | 같은 `session_id` collect fixture를 병렬 실행 후 flush | marker 손상 없음, 파일 경로 de-dupe | marker 저장 방식 수정 |
| GATE-007 | 완료 전 | Claude Stop 반복 방지 | `stop_hook_active` false/true 실패 fixture 순차 실행 | 최초 실패만 block, 반복 실패는 사용자 경고 | Stop 실패 정책 수정 |
| GATE-008 | 완료 전 | 프로젝트 루트 산정 | `CLAUDE_PROJECT_DIR`와 하위 `cwd` fixture로 collect/flush 실행 | 프로젝트 루트 기준 `plugins/sd`만 대상 | root resolver 수정 |

## 10. Rollout / Rollback

- Rollout 필요 여부: 필요
- Rollout 절차:
  - Pi: 구현 후 Pi에서 `/reload`하거나 새 세션 시작으로 extension 재로드.
  - Claude Code: 구현 후 `/reload-plugins` 또는 세션 재시작으로 plugin hooks 재로드. (근거: Claude plugin reference에서 plugin hook 변경은 reload/restart 필요)
  - 이후 작은 `plugins/sd` 파일 변경으로 자동 Prettier 동작 확인.
- Rollback 가능 여부: 가능
- Rollback 절차:
  - Pi: `registerPrettierHook(pi)` 등록 제거 및 `extensions/hooks/prettier.ts` 삭제.
  - Claude: `hooks/hooks.json`에서 prettier collect/flush hook 제거 및 hook script 삭제.
  - `shared/prettier.ts`가 더 이상 참조되지 않으면 삭제.
- Rollback 불가 지점: `[N/A]` 데이터 마이그레이션이나 외부 배포 상태 변경 없음.
- 관측 지표:
  - Prettier 실행 성공/실패 알림.
  - hook stderr/debug log.
  - `git diff`에서 포맷 외 변경 여부.
- 중단 조건:
  - `plugins/sd` 밖 파일이 포맷되는 증거 발생.
  - Prettier 실패가 반복되어 Claude/Pi 작업 루프를 방해.
  - hook 등록 후 기본 파일 작업이 느려지거나 실패.

## 11. Traceability Matrix

| Scope | Finding | Decision | Task | AC | Test | Gate |
| ----- | ------- | -------- | ---- | -- | ---- | ---- |
| SCOPE-001 | FIND-003, FIND-007 | DEC-001, DEC-005 | TASK-001 | AC-001, AC-002 | TEST-001, TEST-003 | GATE-002, GATE-003, GATE-004 |
| SCOPE-002 | FIND-001, FIND-004, FIND-010 | DEC-002, DEC-008 | TASK-002 | AC-003, AC-004 | TEST-002, TEST-003 | GATE-002, GATE-005 |
| SCOPE-003 | FIND-002, FIND-005, FIND-006, FIND-009, FIND-011, FIND-012 | DEC-003, DEC-004, DEC-007, DEC-008, DEC-009, DEC-010 | TASK-003 | AC-005, AC-006, AC-007, AC-010, AC-011, AC-012 | TEST-004, TEST-005, TEST-007, TEST-008, TEST-009 | GATE-001, GATE-004, GATE-005, GATE-006, GATE-007, GATE-008 |
| SCOPE-004 | FIND-009, FIND-010, FIND-012 | DEC-006 | TASK-001, TASK-002, TASK-003 | AC-001, AC-005, AC-009, AC-012 | TEST-001, TEST-004, TEST-005, TEST-009 | GATE-004, GATE-008 |
| SCOPE-005 | FIND-004, FIND-005 | DEC-008, DEC-010 | TASK-002, TASK-003 | AC-004, AC-006, AC-011 | TEST-002, TEST-005, TEST-008 | GATE-005, GATE-007 |
| SCOPE-006 | FIND-008 | DEC-005 | TASK-004 | AC-008, AC-009 | TEST-003, TEST-006 | GATE-002, GATE-003 |

## 12. 구현 전 차단 조건

| ID | 차단 조건 | 관련 OPEN/RISK | 필요한 결정 | 해결 담당 | 해결 후 갱신 위치 |
| -- | --------- | -------------- | ----------- | --------- | ----------------- |
| BLOCK-001 | `bun x prettier`가 현재 hook/extension 실행 환경에서 동작하지 않음 | RISK-003 | 실행 방식 fallback 또는 dependency 추가 여부 | 구현자/사용자 | DEC-005, TASK-001 |
| BLOCK-002 | Claude plugin hook reload 후 `Stop`/`PostToolUse` hook이 로드되지 않음 | RISK-002 | hook schema/Claude 버전 대응 방식 | 구현자 | TASK-003, GATE-001 |
| BLOCK-004 | Claude marker 저장이 병렬 collect에서 손상되거나 누락됨 | RISK-005 / CONSTRAINT-008 | marker 파일 전략 또는 PostToolBatch 전환 여부 | 구현자 | TASK-003, GATE-006 |
| BLOCK-005 | `claude plugin validate plugins/sd`를 실행할 수 없어 Claude hook schema를 확인하지 못함 | FIND-011 | Claude CLI 사용 가능 환경 확보 또는 사용자 검증 요청 | 구현자/사용자 | GATE-001 |
| BLOCK-003 | 경로 필터가 `plugins/sd` 밖 파일을 포함함 | RISK-004 | 필터 수정 전 진행 금지 | 구현자 | TASK-001, GATE-004 |
| BLOCK-006 | 프로젝트 루트를 찾지 못해 `plugins/sd` 기준 경로를 산정할 수 없음 | FIND-012 / RISK-004 | `CLAUDE_PROJECT_DIR` 제공 또는 root 탐색 조건 보강 | 구현자/사용자 | DEC-006, TASK-001, GATE-008 |

## 13. 변경 로그

- 2026-06-29 22:08:14: 최초 작성.
- 2026-06-29 22:08:14: 독립 검증 결과를 반영해 Claude hook 동시성, schema 검증, MultiEdit 근거, Stop 반복 실패 정책을 보강.
- 2026-06-29 22:08:14: 재검증 결과를 반영해 Claude plugin schema 검증을 필수 게이트로 고정하고 근거 자료 목록을 보강.
- 2026-06-29 22:08:14: 최종 재검증 결과를 반영해 Claude `${CLAUDE_PROJECT_DIR}` 우선 루트 산정과 하위 cwd 검증을 추가.
