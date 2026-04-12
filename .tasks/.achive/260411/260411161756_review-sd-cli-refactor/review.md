# sd-cli 리팩토링 구현 리뷰

| 항목 | 값 |
|---|---|
| 분석 대상 | `.tasks/260411152807_sd-cli-refactor/*.md` (WBS + Feature 5건) |
| 분석 일시 | 2026-04-11 |
| 분석 파일 수 | Feature 문서 6건 + 구현 소스 12건 |
| 발견 이슈 | 1건 (Low) |

## 분석 범위

| Feature | 상태 | 요약 |
|---|---|---|
| 1.1 worker-events dead code 제거 | 정상 | `registerWorkerEventHandlers` 및 관련 타입/테스트 삭제 완료 |
| 2.1 Orchestrator 생명주기 인터페이스 | 정상 | `OrchestratorLifecycle<T>` 인터페이스 정의 및 4개 Orchestrator 적용 완료 |
| 3.1 BuildOrchestrator 중복 제거 | 정상 | `_runEngineTask` 공통 메서드 추출 완료 |
| 3.2 publish 책임 분리 | 정상 | `version-upgrade.ts`, `env-utils.ts` 분리 완료 |
| 3.3 Angular HMR dead code 제거 | 정상 | `enableHmr`, `collectHmrCandidates`, `templateUpdates` 등 AngularCompiler/Pipeline에서 제거 완료 |

## Feature별 검증 결과

### Feature 1.1 worker-events dead code 제거

- `worker-events.ts`: `BuildEventData`, `ErrorEventData`, `ServerReadyEventData`, `ServerBuildEventData` 4개 이벤트 데이터 타입만 남아 있음 (VERIFIED)
- `registerWorkerEventHandlers`, `BaseWorkerInfo`, `WorkerEventHandlerOptions`: 삭제됨 (VERIFIED)
- `worker-events.spec.ts`: 파일 삭제됨 (VERIFIED)
- 미사용 import (`consola`, `BuildResult` 등): 모두 제거됨 (VERIFIED)

### Feature 2.1 Orchestrator 생명주기 인터페이스

- `orchestrators/types.ts`: `OrchestratorLifecycle<TStartResult = void>` 인터페이스 정의 (VERIFIED)
- `BuildOrchestrator`: `implements OrchestratorLifecycle<boolean>` (VERIFIED)
- `TypecheckOrchestrator`: `implements OrchestratorLifecycle<TypecheckResult>` (VERIFIED)
- `WatchOrchestrator`: `extends BaseOrchestrator implements OrchestratorLifecycle` (VERIFIED)
- `DevOrchestrator`: `extends BaseOrchestrator implements OrchestratorLifecycle` (VERIFIED)
- `BaseOrchestrator`: `implements` 미적용 — D3 설계 결정에 따름 (`initialize(params)` 시그니처 비호환) (VERIFIED)
- `TypecheckOrchestrator.initialize()`: `loadAndValidateConfig({ targets: [] })` 사용 (VERIFIED)

### Feature 3.1 BuildOrchestrator 중복 제거

- `_runEngineTask` private 메서드: 엔진 생성 -> run -> diagnostics 역직렬화 -> BuildStepResult 반환 -> finally에서 engine.stop() (VERIFIED)
- `_addBuildPackageTasks`: `_runEngineTask` 호출 + copySrc 후처리 (VERIFIED)
- `_addServerPackageTasks`: env 병합 + `_runEngineTask` 호출 (VERIFIED)
- `_addClientPackageTasks`: env 병합 + outDir/base 설정 + `_runEngineTask` 호출 + 네이티브 빌드 후처리 (VERIFIED)
- `_runEngineTask`는 `BuildStepResult`를 반환하고, 호출측에서 `results.push()` — D2 결정 준수 (VERIFIED)

### Feature 3.2 publish 책임 분리

- `version-upgrade.ts`: `upgradeVersion()`, `computePublishLevels()`, `PackageJson` export (VERIFIED)
- `env-utils.ts`: `replaceEnvVariables()`, `waitWithCountdown()` export (VERIFIED)
- `publish/index.ts`: 두 파일에서 import하여 사용, `runPublish`/`PublishOptions`만 export (VERIFIED)
- 함수 시그니처: 변경 없음 (VERIFIED)

### Feature 3.3 Angular HMR dead code 제거

- `angular-compiler.ts`: `enableHmr`, `HMR_MODIFIED_FILE_LIMIT`, `collectHmrCandidates`, `templateUpdates` 관련 코드 없음 (VERIFIED)
- `angular-build-pipeline.ts`: `enableHmr`, `templateUpdates` 관련 코드 없음 (VERIFIED)
- `vite-angular-plugin.ts`: `enableHmr` 관련 코드 없음 (VERIFIED)
- `hmr-candidates.ts`: 파일 삭제됨 (VERIFIED)
- `angular-compiler-hmr.spec.ts`, `hmr-candidates.spec.ts`: 파일 삭제됨 (VERIFIED)
- client HMR 인프라 (`client.worker.ts`, `esbuild-client-config.ts`, `hmr-service.ts`)의 `templateUpdates`: 유지됨 — WBS 경계 준수 (VERIFIED)

## 이슈 목록

### Low

```
id: CONSIST-001
severity: Low
category: 일관성
location: .tasks/260411152807_sd-cli-refactor/2.1-orchestrator-lifecycle-interface.md:112
title: Feature 2.1 문서 내 설계 테이블과 D3 결정의 불일치
description: |
  구현계획의 "인터페이스 적용" 테이블(line 108-113)에서 BaseOrchestrator에
  `implements OrchestratorLifecycle` 추가로 명시되어 있으나, 같은 문서의
  설계 결정 D3(line 24)에서는 "BaseOrchestrator 대신 WatchOrchestrator/DevOrchestrator에
  직접 implements"로 변경했다. 실제 구현은 D3를 정확히 따르고 있으나,
  문서 내 테이블이 D3 이전의 계획을 반영하고 있어 불일치가 존재한다.
suggestion: |
  설계 테이블의 BaseOrchestrator 행을 D3 결정에 맞게 수정하거나,
  "D3에 의해 변경됨" 주석을 추가한다.
```
