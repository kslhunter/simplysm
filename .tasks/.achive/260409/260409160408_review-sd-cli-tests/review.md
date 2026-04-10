# Code Review: packages/sd-cli/tests

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/sd-cli/tests/` (30개 spec 파일) |
| 일시 | 2026-04-09 |
| 파일 수 | 30 |
| 발견 이슈 | 6건 (Critical: 0, Medium: 1, Low: 5) |

---

## Medium

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/sd-cli/tests/utils/output-utils.spec.ts:56, :84
title: 동일 describe 내 동일 이름 테스트 중복
description: |
  `describe("printErrors", ...)` 블록 내에 "uses target as label for build type errors"라는
  동일한 이름의 테스트가 두 개 존재한다.
  - 56행: `{ name: "core", target: "node" }` → `expect(callArg).toContain("node")`
  - 84행 (Feature 2.1 Slice 3): `{ name: "core-common", target: "node" }` → `expect(callArg).toContain("core-common (node)")`
  Vitest는 둘 다 실행하지만, 테스트 리포트에서 동일 이름으로 표시되어 어떤 테스트가 실패했는지
  식별이 어렵다. 84행의 테스트가 56행보다 더 구체적인 assertion을 하므로, 56행은 Feature 2.1
  작업 시 제거하지 않고 남긴 잔존 코드로 보인다.
suggestion: |
  56행의 테스트를 제거하거나, 두 테스트의 이름을 구분되게 변경한다.
```

---

## Low

```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/sd-cli/tests/utils/generate-pwa-icons.spec.ts:2-3
title: 동일 파일 내 import 경로 스타일 혼재 ("node:fs" vs "path")
description: |
  `generate-pwa-icons.spec.ts`에서 `import path from "path"`와 `import fs from "node:fs"`를
  한 파일 내에서 혼용하고 있다. 파일 간에도 불일치가 존재한다:
  - `angular-build.spec.ts`: `"node:fs"`, `"node:path"` (node: 접두어 사용)
  - `scss-disk-cache.spec.ts`, `package-utils.spec.ts`, `ngtsc-build-core-write-emit.spec.ts`: `"fs"`, `"path"` (접두어 없음)
  - `generate-pwa-icons.spec.ts`: `"node:fs"` + `"path"` (혼재)
suggestion: |
  파일 간 통일은 점진적으로 진행하더라도, 최소한 한 파일 내에서는 스타일을 통일한다.
  프로젝트 전체 컨벤션으로 하나를 선택하여 적용하는 것이 이상적이다.
```

```
id: CONSIST-002
severity: Low
category: 일관성
location: 다수 파일 (orchestrator 및 worker 테스트)
title: consola 모킹 패턴이 파일마다 다른 구조로 작성됨
description: |
  동일한 목적(consola logger 모킹)인데 파일마다 3-4가지 다른 구조를 사용한다:
  - `build-orchestrator.spec.ts`: 외부 `mockLogger` 객체 + `withTag` 반환
  - `dev-watch-orchestrator.spec.ts`: 인라인 객체 리터럴 + `withTag` 반환
  - `lint-with-program.spec.ts`: `vi.hoisted`로 별도 `mockLintLogger` 객체 생성
  - `worker 테스트들`: `mockConsolaLogger` 객체 + `withTag.mockReturnValue(mockConsolaLogger)` 자기참조
  모두 동작하지만, 새 테스트 작성 시 어떤 패턴을 따라야 하는지 혼동을 준다.
suggestion: |
  공통 consola mock 헬퍼 함수를 `tests/` 루트에 만들거나,
  가장 자주 사용되는 패턴 하나로 통일한다.
```

```
id: CONSIST-003
severity: Low
category: 일관성
location: packages/sd-cli/tests/orchestrators/ (3개 파일)
title: orchestrator 테스트 간 setupDefaults 헬퍼 시그니처 불일치
description: |
  세 orchestrator 테스트 파일의 `setupDefaults` 헬퍼가 서로 다른 시그니처를 가진다:
  - `build-orchestrator.spec.ts`: `setupDefaults(config: Partial<SdConfig>)` — loadSdConfig + getVersion
  - `dev-watch-orchestrator.spec.ts`: `setupDefaults(config: SdConfig)` — loadSdConfig + buildPathMapFromConfig + filterPackagesByTargets + watchReplaceDeps + getVersion
  - `typecheck-orchestrator.spec.ts`: `setupDefaults(packages: Record<string, any>)` — loadSdConfig + createBuildEngine + typecheckNonPackageFiles + discoverWorkspacePackages + mergeTestsPackagesIntoConfig
  같은 이름이지만 하는 일이 크게 달라 기존 패턴을 참고할 때 오해할 수 있다.
suggestion: |
  각 orchestrator의 초기화 로직이 다르므로 완전한 통일은 어렵지만,
  최소한 이름에 차이를 반영하거나(예: `setupBuildDefaults`, `setupDevDefaults`),
  공통 부분(loadSdConfig + getVersion)을 기반 헬퍼로 분리할 수 있다.
```

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/sd-cli/tests/infra/result-collector.spec.ts:47
title: DESIGN-004 테스트가 런타임 불변성을 실제로 검증하지 않음
description: |
  테스트 이름은 "toMap returns a map that does not allow external mutation of internal state"이지만,
  실제로 외부에서 Map을 변경하는 시도를 하지 않는다. `toMap()`의 구현을 보면 내부 Map을
  직접 반환하므로(`return this._results`), 런타임에서 `(map as Map).delete(key)` 등으로
  내부 상태를 변경할 수 있다. TypeScript의 `ReadonlyMap` 타입은 컴파일 타임 보호만 제공한다.
  현재 테스트는 `map.size === 1` 확인만 하므로, 불변성 보장 여부를 검증하지 못한다.
suggestion: |
  두 가지 선택지가 있다:
  1. 테스트에서 `(map as Map).delete()` 후 `collector.get()`이 영향받지 않는지 검증 →
     이 경우 `toMap()`이 `new Map(this._results)`를 반환하도록 구현 변경 필요
  2. 컴파일 타임 보호로 충분하다고 판단하면, 테스트 이름/주석을 수정하여
     "compile-time ReadonlyMap 타입이 적용됨"으로 변경
```

```
id: PERF-001
severity: Low
category: 성능
location: packages/sd-cli/tests/utils/engine-stop.spec.ts:47
title: timeout 테스트가 실제 시간(3초+)을 대기하여 테스트 실행 지연
description: |
  "terminates even if stopWatch hangs (timeout)" 테스트가 실제 `SHUTDOWN_TIMEOUT`(3초)을
  기다린 후 `vi.waitFor`(5초 timeout)로 검증한다. 테스트 자체의 timeout도 10초로 설정되어 있다.
  `stopEngineWorker` 내부의 `setTimeout`을 `vi.useFakeTimers()`로 제어하면
  3초 대기 없이 즉시 검증할 수 있다.
suggestion: |
  `vi.useFakeTimers()`와 `vi.advanceTimersByTime(3000)`을 사용하여
  테스트 실행 시간을 3초+ → 즉시(ms 단위)로 단축한다.
```
