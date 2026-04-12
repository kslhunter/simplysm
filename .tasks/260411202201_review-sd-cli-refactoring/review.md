# sd-cli 리팩토링 구현 리뷰

| 항목 | 내용 |
|------|------|
| 분석 대상 | `.tasks/260411174744_refactor-sd-cli/` Feature 구현 결과 (packages/sd-cli/src/) |
| 분석 일시 | 2026-04-11 |
| Feature 수 | 7개 (1.1, 1.2, 1.3, 2.1, 3.1, 4.1, 5.1) |
| 신규 파일 | 10개 |
| 수정 파일 | ~20개 |
| 발견 이슈 | 4건 (Critical 0, Medium 2, Low 2) |

---

## Feature별 구현 적합성 요약

| Feature | 적합성 | 비고 |
|---------|--------|------|
| 1.1 Worker 초기화 보일러플레이트 추출 | 적합 | `shared-worker-lifecycle.ts` 구현 완료, 4개 워커 적용 확인 |
| 1.2 Worker 감시 경로/변경 필터링 공통화 | 적합 | `build-watch-paths.ts`, `build-change-filter.ts` 구현, 3개 워커 적용 |
| 1.3 server-build.worker.ts 모듈 분리 | 적합 | `server-esbuild-context.ts`, `server-watch-manager.ts` 추출, LOGIC-001 캡슐화 |
| 2.1 Orchestrator 중복 패턴 추출 | 적합 | `formatDiagnosticsOutput` 추출, `_baseEnv` Base 이동, `_initializeMode` 시그니처 정리 |
| 3.1 publish 페이즈 분리 | 적합 | `git-phase.ts`, `deployment-phase.ts`, `post-publish-phase.ts` 추출, index.ts 축소 |
| 4.1 Capacitor 관심사 분리 | 적합 | `capacitor-npm-config.ts`, `capacitor-config-writer.ts` 추출, 387줄 파사드로 축소 |
| 5.1 deps/ 디렉토리 분리 | 적합 | `replace-deps/`, `server-externals/` 서브디렉토리 이동 완료, 소비자 import 모두 업데이트 |

---

## Medium

### DESIGN-001: ServerWatchLoopConfig.info 타입 중복

```
id: DESIGN-001
severity: Medium
category: 설계
location: packages/sd-cli/src/workers/server-watch-manager.ts:19-26
title: ServerWatchLoopConfig.info가 ServerWatchInfo 필드를 인라인으로 재정의
```

**description**: `ServerWatchLoopConfig`의 `info` 프로퍼티가 `ServerWatchInfo` 타입을 참조하지 않고, 동일한 필드(`name`, `cwd`, `pkgDir`, `output`, `env`, `externals`)를 인라인으로 재정의한다. `ServerWatchInfo`에 필드가 추가되면 `ServerWatchLoopConfig.info`도 별도로 업데이트해야 하므로, 두 타입이 불일치할 위험이 있다. 실제로 `server-build.worker.ts`에서 `startServerWatchLoop({ info, ... })`를 호출할 때 `info`는 `ServerWatchInfo` 타입이므로, 인라인 타입이 `ServerWatchInfo`의 서브셋일 때만 컴파일이 성공한다.

**suggestion**: `ServerWatchLoopConfig.info`를 `Pick<ServerWatchInfo, "name" | "cwd" | "pkgDir" | "output" | "env" | "externals">` 또는 `ServerWatchInfo` 직접 참조로 변경한다.

---

### DESIGN-002: client.worker.ts의 guardStartWatch 미사용

```
id: DESIGN-002
severity: Medium
category: 설계
location: packages/sd-cli/src/workers/client.worker.ts:67
title: guardStartWatch가 반환되지만 사용되지 않아 startWatch 중복 호출 방어 없음
```

**description**: `setupWorkerLifecycle("client", ...)` 호출 시 `const { logger } = ...`로 `guardStartWatch`를 구조분해에서 생략한다. WBS D1 결정("client는 구조분해 시 생략")에 따른 의도적 설계이나, 다른 3개 워커(library-build, ngtsc-build, server-build)는 모두 `guardStartWatch()`를 `startWatch` 진입 시 호출하여 중복 호출을 방지한다. client.worker.ts에서 `startWatch`가 2회 호출되면 HTTP dev server와 esbuild watch가 중복 생성된다. Orchestrator가 워커 생명주기를 제어하므로 런타임에 발생 가능성은 낮지만, 방어 코드의 일관성이 깨진다.

**suggestion**: 다른 워커와 일관되게 `const { logger, guardStartWatch } = setupWorkerLifecycle("client", ...)`로 받고, `startWatch` 함수 진입 시 `guardStartWatch()`를 호출한다.

---

## Low

### CONSIST-001: deployment-phase 스킵된 패키지 "실패" 보고

```
id: CONSIST-001
severity: Low
category: 일관성
location: packages/sd-cli/src/commands/publish/deployment-phase.ts:100-110
title: 이전 레벨 실패로 시도되지 않은 패키지가 "배포 실패"로 보고됨
```

**description**: `runDeployment()`에서 이전 레벨 배포 실패 시 `publishFailed = true`로 이후 레벨을 건너뛴다. 그러나 최종 결과 보고에서 `allPkgNames`에서 `publishedPackages`를 빼 `failedPkgNames`를 산출하므로, 시도조차 하지 않은 패키지도 "배포 실패"로 보고된다. 사용자에게 "실패"와 "미시도"의 구분이 없어 혼란을 줄 수 있다. 단, 이 로직은 원본 `publish.ts`에서 그대로 이동된 것으로 리팩토링이 도입한 문제는 아니다.

**suggestion**: 실패한 패키지와 건너뛴 패키지를 구분하여 보고한다.

---

### CONSIST-002: _changedFiles 변수명 언더스코어 접두사

```
id: CONSIST-002
severity: Low
category: 일관성
location: packages/sd-cli/src/commands/publish/index.ts:191
title: 사용되는 변수에 미사용 관례의 _ 접두사 사용
```

**description**: `const _changedFiles = upgradeResult.changedFiles;`로 선언된 변수가 line 232에서 `commitTagAndPush(hasGit, version, _changedFiles, logger, dryRun)`으로 실제 사용된다. `_` 접두사는 TypeScript/ESLint에서 "의도적으로 미사용" 관례이므로 코드 가독성을 저해한다. 원본 `publish.ts`에서 이미 같은 네이밍이었으므로 리팩토링이 도입한 문제는 아니다.

**suggestion**: `_changedFiles` → `changedFiles`로 변경한다.

---

## 거짓양성 제외 사항

| 후보 이슈 | 제외 사유 |
|-----------|----------|
| `buildWatchPaths`의 `extraDirs`가 workspace deps에도 적용 | 원본 ngtsc-build.worker.ts도 동일하게 workspace deps의 scss/ 감시. 동작 보존이 정확함 (git diff 확인) |
| `capacitor-npm-config.ts` volta 참조 비교 | 원본 `capacitor.ts:385`에서 동일한 `!==` 비교 사용. 리팩토링이 아닌 기존 이슈 |
| 초기 빌드 시 `buildStart` 미발행 (library-build, ngtsc-build, client) | 4개 워커 모두 원본에서 초기 빌드 시 `buildStart`를 발행하지 않음. 리팩토링이 변경한 것 아님 |
| `server-esbuild-context.ts` 모듈 스코프 싱글턴 | Worker Thread 격리 환경에서 정상 동작. 테스트에서 `dispose()` 호출로 정리 가능 |
| `server-watch-manager.ts`에서 `shouldSkipRebuild` 미사용 | WBS D2 결정("server-build는 감시 경로 수집만 공통 함수 사용, 변경 필터링은 기존 유지")에 따른 의도적 설계 |
| `TypecheckOrchestrator` 에러 카운트 불일치 (errors.length=0 && success=false 시) | 원본 코드의 기존 이슈. 리팩토링 범위 외 |

---

## 종합 평가

7개 Feature 모두 WBS와 각 Feature 문서의 요구명세·설계 결정에 충실하게 구현되었다. 동작 변경 없이 내부 구조만 개선한다는 리팩토링 원칙이 잘 지켜졌으며, 원본 코드의 동작을 정확히 보존하고 있다 (git diff로 확인).

발견된 4건 중 2건(CONSIST-001, CONSIST-002)은 원본 코드에서 그대로 이동된 기존 이슈이고, 2건(DESIGN-001, DESIGN-002)이 리팩토링 과정에서 도입된 설계 이슈이다. Critical 이슈는 없다.
