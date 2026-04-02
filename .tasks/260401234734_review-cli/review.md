# sd-cli 코드 리뷰 리포트

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/sd-cli/src/` |
| 일시 | 2026-04-01 |
| 분석 파일 수 | 61개 |
| 발견 이슈 | 5건 (Critical: 1, Medium: 2, Low: 2) |

## Critical

### LOGIC-001: ViteEngine 초기 빌드 결과 덮어쓰기

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/sd-cli/src/engines/ViteEngine.ts:108-184
title: 초기 Angular 컴파일 결과가 startWatch 반환값으로 덮어쓰여 에러 유실
description: |
  ViteEngine.startWatch()에서 초기 빌드 결과가 두 경로로 ResultCollector에 보고된다:
  
  1. line 108-138: Worker의 "build" 이벤트 핸들러 — Angular 플러그인의 buildStart 완료 시
     sender.send("build", { success, errors, warnings })를 통해 상세 컴파일 결과 전달
  2. line 177-184: startWatch() 반환값 — Worker의 startWatch가 { success: true }를 반환
  
  client.worker.ts line 266에서 startWatch는 항상 { success: true }를 반환한다
  (Vite 서버 시작 성공 = Angular 컴파일 성공이 아님).
  
  MessagePort FIFO 특성상 "build" 이벤트가 먼저 도착하여 ResultCollector에 기록되지만,
  직후 startWatch 반환값이 같은 키({name}:build)로 덮어쓴다.
  
  결과: Angular 초기 컴파일에 에러가 있어도 ResultCollector에는 success로 기록되어
  에러가 유실된다.
suggestion: |
  line 177-184의 초기 결과 보고를 제거하고, "build" 이벤트 핸들러에서만 보고하도록 통일한다.
  또는 client.worker.ts의 startWatch 반환값에 Angular 컴파일 결과를 포함시킨다.
```

## Medium

### DESIGN-001: BaseEngine watch 모드에서 미해제 resolver

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/sd-cli/src/engines/BaseEngine.ts:133-172
title: buildStart 이벤트 후 build 이벤트가 발생하지 않으면 RebuildManager resolver가 영구 대기
description: |
  startWatch()의 "buildStart" 핸들러(line 133)에서 rebuildManager.registerBuild()로
  resolver를 등록하고, "build" 핸들러(line 171)에서 resolver()를 호출하여 배치를 완료한다.
  
  만약 Worker가 "buildStart"를 발행한 후 크래시하거나 "build" 이벤트를 발행하지 않으면,
  resolver는 호출되지 않고 RebuildManager의 해당 배치는 영원히 완료되지 않는다.
  결과적으로 batchComplete 이벤트가 발행되지 않아 DevWatchOrchestrator의 후속 처리
  (서버 재시작, 결과 출력 등)가 멈춘다.
suggestion: |
  registerBuild()에 타임아웃을 추가하여 일정 시간 내 resolve되지 않으면
  에러 상태로 자동 완료되도록 한다. 또는 "error" 이벤트 핸들러(line 181)에서도
  resolver?.()를 호출하여 에러 경로에서 배치가 완료되도록 한다.
```

### CONSIST-001: typecheck과 lint 커맨드의 비일관적 에러 처리

```
id: CONSIST-001
severity: Medium
category: 일관성
location: packages/sd-cli/src/commands/typecheck.ts:85-90 vs packages/sd-cli/src/commands/lint.ts:76-79
title: sd.config.ts 누락 시 typecheck는 빈 config로 계속 진행하지만 lint는 throw
description: |
  executeTypecheck()는 sd.config.ts 로드 실패 시 catch하여 빈 packages로 계속 진행한다.
  executeLint()는 ESLint config 누락 시 즉시 throw한다.
  
  "pnpm check" 실행 시 typecheck은 성공하지만 lint는 실패하는 비일관적 동작이 발생한다.
  사용자 입장에서 같은 명령어(check)의 하위 작업들이 config 부재에 대해 다른 반응을
  보이는 것은 혼란스럽다.
suggestion: |
  두 커맨드의 에러 처리 정책을 통일한다. 권장: 둘 다 config 부재 시 경고 로그를 남기고
  가용한 범위에서 실행을 계속하는 방식(graceful fallback).
```

## Low

### DESIGN-002: server-runtime.worker.ts 예외 핸들러의 불충분한 대기 시간

```
id: DESIGN-002
severity: Low
category: 설계
location: packages/sd-cli/src/workers/server-runtime.worker.ts:65-81
title: uncaughtException 핸들러가 100ms만 대기 후 process.exit하여 에러 메시지 유실 가능
description: |
  uncaughtException/unhandledRejection 핸들러에서 sender.send("error", ...)로
  에러를 부모 프로세스에 전달한 뒤 100ms setTimeout으로 process.exit(1)을 호출한다.
  
  Worker MessagePort를 통한 메시지 전달이 100ms 내에 완료되지 않으면
  부모 프로세스는 에러 메시지를 수신하지 못한다.
  또한 registerCleanupHandlers()로 등록된 정리 로직이 실행되기 전에
  프로세스가 종료될 수 있다.
suggestion: |
  process.exit 대신 적절한 정리 로직 완료 후 종료하거나,
  최소한 타임아웃을 500ms 이상으로 늘려 메시지 전달 신뢰성을 높인다.
```

### DESIGN-003: vite-angular-plugin configureServer close 핸들러의 비대칭 정리

```
id: DESIGN-003
severity: Low
category: 설계
location: packages/sd-cli/src/angular/vite-angular-plugin.ts:369-384
title: close 핸들러에서 disposal 실패 시 참조 미정리, 성공 시만 정리
description: |
  configureServer의 httpServer "close" 이벤트 핸들러에서:
  - .then(): jsTransformer, compiler, emittedFiles를 정리
  - .catch(): 에러만 로깅하고 참조는 그대로 유지
  
  disposal이 실패하면 stale 참조가 남는다. 서버가 닫히는 시점이므로
  실제 문제가 될 가능성은 낮지만, 설계상 .finally()로 참조를 항상 정리하는 것이 깔끔하다.
suggestion: |
  .then()의 정리 로직을 .finally()로 이동하여 성공/실패 무관하게 참조를 정리한다.
```
