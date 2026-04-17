# 코드 리뷰: build-output-dedup

## LOGIC-001 [Medium] EsbuildClientEngine 초기 빌드 시 warnings 유실

- **위치:** packages/sd-cli/src/workers/client.worker.ts:303-312, packages/sd-cli/src/engines/EsbuildClientEngine.ts:129-138

client.worker.ts의 `createDevBuildEndHandler()`에서 초기 빌드 완료 시 `initialBuildResolve`에 `warnings`를 포함하지 않는다. 후속 빌드(line 288-299)와 프로덕션 빌드(line 170-174)는 모두 `warnings`를 전달하지만, 초기 빌드만 누락되어 있다.

또한 EsbuildClientEngine.startWatch()(line 129-138)는 `result.success`만 검사하고 `result.warnings`를 처리하지 않는다. 따라서 초기 빌드에서 발생한 esbuild 경고가 ResultCollector에 저장되지 않아 printErrors()에서 출력되지 않는다.

참고: 초기 빌드는 `build` 이벤트를 발행하지 않으므로(`!isInitialBuild` 조건) setupWatchEvents 경로로도 경고가 전달되지 않는다. BaseEngine 계열 엔진은 워커가 모든 빌드에 `build` 이벤트를 발행하므로 이 문제가 없다.

**개선 방향:**
1. client.worker.ts의 `initialBuildResolve` 콜에 `warnings` 필드를 추가한다.
2. EsbuildClientEngine.startWatch()에서 초기 빌드 성공 시에도 `result.warnings`가 있으면 ResultCollector에 저장하는 로직을 추가한다.

---

## DESIGN-001 [Low] printErrors() 함수명이 실제 동작과 불일치

- **위치:** packages/sd-cli/src/utils/output-utils.ts:31

Feature 1.1에서 경고 출력 기능이 추가되었으나 함수명은 여전히 `printErrors()`이다. JSDoc은 "에러와 경고를 출력한다"로 업데이트되었지만, 함수명만 보면 에러만 출력하는 것으로 오해할 수 있다.

호출처: DevOrchestrator.ts(line 220, 262), WatchOrchestrator.ts(line 79, 139) 총 4곳.

**개선 방향:** `printBuildDiagnostics()` 등으로 함수명을 변경하여 에러+경고를 모두 출력한다는 의도를 명확히 한다.

---
