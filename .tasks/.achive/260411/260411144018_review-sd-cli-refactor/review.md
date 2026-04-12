# 코드 리뷰: sd-cli 리팩토링 (260411131750_sd-cli-refactor)

| 항목 | 내용 |
|------|------|
| 분석 대상 | `.tasks/260411131750_sd-cli-refactor` WBS 기반 리팩토링 전체 |
| 일시 | 2026-04-11 |
| 분석 파일 수 | ~40개 (src 25+, tests 10+, 문서 5+) |
| 발견 이슈 | 8건 (Critical: 0, Medium: 3, Low: 5) |

---

## 이슈 목록

### Medium

---

#### CONSIST-001
- **severity:** Medium
- **category:** 일관성
- **location:** `packages/sd-cli/CLAUDE.md:22,175,218,239`
- **title:** CLAUDE.md가 리팩토링 결과를 반영하지 않음
- **description:** CLAUDE.md는 LLM 기반 개발의 핵심 참조 문서인데, 리팩토링으로 생긴 구조 변경이 거의 반영되지 않았다. 구체적으로:
  - Architecture 섹션 (line 22): `DevWatchOrchestrator.ts`가 여전히 표기됨. 실제로는 삭제되고 `BaseOrchestrator.ts`, `WatchOrchestrator.ts`, `DevOrchestrator.ts`, `ServerRuntimeManager.ts`로 대체됨
  - Orchestrator 생명주기 예시 (line 175): `DevWatchOrchestrator` 사용 코드가 그대로 남아있음
  - Testing 섹션 (line 218): orchestrators 설명이 `BuildOrchestrator, DevWatchOrchestrator`로 남아있음
  - 자주하는 실수 (line 239): `DevWatchOrchestrator` 언급 유지
  - utils/ 섹션: 새로 생긴 파일 미기재 (`package-classify.ts`, `collect-deps.ts`, `replace-deps-resolve.ts`, `engine-watch-events.ts`)
  - `package-utils.ts` 설명 (line 64): "패키지 분류.필터링"이라고 표기되어 있으나 분류 함수는 `package-classify.ts`로 이동됨
  - engines/ 섹션: `createTypecheckEngine` 팩토리 미언급
  - capacitor/ 섹션: `capacitor-build.ts`, `capacitor-icon.ts` 미기재
- **suggestion:** CLAUDE.md의 Architecture, Key Patterns, Testing 섹션을 리팩토링 결과에 맞게 업데이트. Feature 4.2 문서에서 "CLAUDE.md 디렉토리 구조 설명 업데이트"를 명시했으나 `infra/`->`runtime/` 변경만 반영되고 나머지는 누락됨.

---

#### CONSIST-002
- **severity:** Medium
- **category:** 일관성
- **location:** 아래 5개 파일
- **title:** 삭제된 `DevWatchOrchestrator`를 참조하는 stale 코멘트 (src 3개, tests 2개)
- **description:** `DevWatchOrchestrator`가 삭제되었으나, 여러 소스/테스트 파일의 JSDoc/주석에서 여전히 참조하고 있다:
  - `src/orchestrators/TypecheckOrchestrator.ts:75` - "BuildOrchestrator/DevWatchOrchestrator와 동일한 ... 생명주기를 따른다"
  - `src/utils/orchestrator-utils.ts:7,9` - "DevWatchOrchestrator.initialize()에서 호출한다", "DevWatchOrchestrator는 ..."
  - `src/utils/package-classify.ts:81,122` - "DevWatchOrchestrator._classifyWatchPackages에서 추출한", "DevWatchOrchestrator._classifyDevPackages에서 추출한"
  - `tests/utils/orchestrator-utils.spec.ts:49-50` - 'DevWatchOrchestrator가 공유 초기화 유틸을 사용한다', `it("works with dev:true for DevWatchOrchestrator", ...)`
- **suggestion:** 코멘트를 실제 구조에 맞게 업데이트. 예: `TypecheckOrchestrator.ts:75`는 "BuildOrchestrator/WatchOrchestrator/DevOrchestrator와 동일한 ...", `package-classify.ts:81`은 "WatchOrchestrator에서 사용하는 standalone 함수" 등.

---

#### DESIGN-001
- **severity:** Medium
- **category:** 설계
- **location:** `packages/sd-cli/src/utils/orchestrator-utils.ts:17`
- **title:** `loadAndValidateConfig`의 `packagesForValidation` 파라미터가 dead code
- **description:** `loadAndValidateConfig` 함수의 `packagesForValidation` 옵션 파라미터는 원래 `DevWatchOrchestrator`가 tests/ 패키지를 merge한 결과로 검증하기 위해 사용했다. 리팩토링 후 `DevWatchOrchestrator`가 삭제되고 `BaseOrchestrator`가 `loadSdConfig` + `validateTargets`를 직접 호출하게 되면서, 유일한 사용처인 `BuildOrchestrator`는 이 파라미터를 전달하지 않는다. 결과적으로 `packagesForValidation` 파라미터는 어떤 호출자도 사용하지 않는 dead code이다.
- **suggestion:** `packagesForValidation` 파라미터를 제거하고 함수를 단순화하거나, `BuildOrchestrator`가 `BaseOrchestrator`와 동일하게 `loadSdConfig` + `validateTargets`를 직접 호출하도록 변경하여 `loadAndValidateConfig` 자체를 제거할 수 있다.

---

### Low

---

#### CONSIST-003
- **severity:** Low
- **category:** 일관성
- **location:** `packages/sd-cli/src/orchestrators/BuildOrchestrator.ts` vs `BaseOrchestrator.ts`
- **title:** BuildOrchestrator와 BaseOrchestrator의 초기화 패턴 불일치
- **description:** `BaseOrchestrator`는 `loadSdConfig` + `validateTargets`를 직접 호출하고, `BuildOrchestrator`는 `loadAndValidateConfig` 래퍼를 사용한다. 동일한 역할(config 로드 + 타겟 검증)을 두 가지 방식으로 수행한다. 이는 의도된 설계(BuildOrchestrator는 BaseOrchestrator를 상속하지 않음)이지만, 유지보수 시 혼동을 줄 수 있다.
- **suggestion:** 두 경로를 통일하거나, 최소한 `orchestrator-utils.ts`의 JSDoc을 현재 사용 패턴에 맞게 업데이트.

---

#### CONSIST-004
- **severity:** Low
- **category:** 일관성
- **location:** `packages/sd-cli/tests/orchestrators/dist-delete-watcher.verify.md:5`, `tests/utils/replace-deps-watch.verify.md:7`
- **title:** verify.md 문서 내 stale DevWatchOrchestrator 참조
- **description:** 검증 문서(verify.md)에서 `DevWatchOrchestrator.ts` 파일 경로를 참조하고 있다. 이 문서들은 과거 검증 기록이므로 기능적 영향은 없으나, 향후 참조 시 혼동을 줄 수 있다.
- **suggestion:** verify.md는 과거 검증 기록이므로 수정하지 않아도 무방. 단, 새로운 리팩토링 검증 문서에서는 현재 구조를 반영해야 한다.

---

#### DESIGN-002
- **severity:** Low
- **category:** 설계
- **location:** `packages/sd-cli/src/utils/engine-watch-events.ts:62,83`
- **title:** build/error 이벤트 핸들러에서 `data` 파라미터의 타입이 `unknown`
- **description:** `setupWatchEvents` 함수가 `worker.on("build", (data: unknown) => ...)` 형태로 이벤트를 구독하고, `normalizeBuild` 콜백을 통해 데이터를 정규화한다. error 이벤트는 `data as { message: string }` 캐스팅을 사용한다. 이는 `EventSubscribable` 인터페이스가 `(...args: any[])` 시그니처를 사용하기 때문인데, `engine-stop.ts`의 `StoppableWorker` 인터페이스와 동일한 최소 인터페이스 패턴이므로 코드베이스 관례에 부합한다.
- **suggestion:** 현행 유지. 타입 안전성 개선이 필요하다면 이벤트별 제네릭 타입 파라미터를 추가할 수 있으나, 현재 구조에서는 과도한 추상화이다.

---

#### DESIGN-003
- **severity:** Low
- **category:** 설계
- **location:** `packages/sd-cli/src/engines/EsbuildClientEngine.ts:104-110`
- **title:** `setupWatchEvents` 반환값 중 `waitForInitialBuild`가 미사용
- **description:** EsbuildClientEngine은 `setupWatchEvents()`를 호출하지만 반환된 `waitForInitialBuild`를 사용하지 않고 `await worker.startWatch()`로 완료를 감지한다 (line 111 주석에 설명됨). 이는 의도된 설계이지만, 주석만으로는 "왜" 다른 방식을 사용하는지 명확하지 않다.
- **suggestion:** 주석에 이유를 보강. 예: "// Vite dev server는 startWatch()가 서버 시작 완료 시 resolve되므로 waitForInitialBuild 불필요"

---

#### DESIGN-004
- **severity:** Low
- **category:** 설계
- **location:** `packages/sd-cli/src/engines/index.ts:74-79`
- **title:** `createTypecheckEngine`에서 client target 변환 시 config 필드 손실 가능
- **description:** client target을 browser로 재매핑할 때 `{ ...pkg, config: { target: "browser" as const } }`로 스프레드하여 원본 `SdClientPackageConfig`의 기타 필드(예: `server`, `env`, `configs`, `pwa` 등)가 모두 유실된다. 타입체크에서는 이 필드들이 불필요하므로 실제 동작에 영향은 없으나, `createBuildEngine`에 전달되는 pkg 객체가 의미적으로 불완전하다.
- **suggestion:** 현행 유지. 타입체크 엔진(TscEngine/NgtscEngine)은 `config.target`만 참조하므로 다른 필드의 부재가 문제가 되지 않는다. 단, 향후 엔진이 config의 다른 필드를 참조하게 된다면 주의가 필요하다.

---

#### DESIGN-005
- **severity:** Low
- **category:** 설계
- **location:** `packages/sd-cli/src/utils/collect-deps.ts:44` vs `packages/sd-cli/src/utils/replace-deps-resolve.ts:23-29`
- **title:** glob 패턴 정규식 변환 로직의 불일치
- **description:** `collect-deps.ts`는 `pattern.replace(/[.+]/g, ...).replace(/\*/g, "[^/]+")`를 사용하고, `replace-deps-resolve.ts`는 `pattern.replace(/[\\/.+*]/g, ...)`로 `\`, `/`까지 처리하며 `*`를 `(.*)`로 변환한다. `collect-deps.ts`의 `*`는 `[^/]+`(단일 경로 세그먼트)로 매칭하고, `replace-deps-resolve.ts`의 `*`는 `(.*)`(다중 세그먼트 포함)로 매칭한다. 이는 용도가 다르기 때문(의존성 수집 vs 심링크 해석)에 의도된 차이일 수 있으나, 같은 `replaceDeps` 패턴을 다르게 해석할 수 있다.
- **suggestion:** 두 함수가 동일한 `replaceDeps` 설정을 처리하는 경우, 패턴 해석 동작의 일관성을 확인. 단순 패턴(`@scope/*`)에서는 동일하게 동작하므로 현실적 문제는 없으나, 중첩 패턴 사용 시 차이가 발생할 수 있다.

---

## 양호 사항

1. **오케스트레이터 분리 (Feature 1.1)**: `DevWatchOrchestrator`(595줄)가 `BaseOrchestrator`(110줄) + `WatchOrchestrator`(203줄) + `DevOrchestrator`(321줄) + `ServerRuntimeManager`(86줄)로 깔끔하게 분리됨. 상속 구조, 리소스 정리, 에러 처리 모두 양호.

2. **start() 메서드 분해 (Feature 1.2)**: `BuildOrchestrator.start()`가 `_cleanDist`, `_buildAllPackages`, `_addBuildPackageTasks`/`_addServerPackageTasks`/`_addClientPackageTasks`, `_printBuildResults`로 적절히 분해됨. `TypecheckOrchestrator.start()`도 `_executePackageTypechecks`, `_executeNonPackageTypecheck`, `_aggregateTypecheckResults`로 분해.

3. **createTypecheckEngine (Feature 1.3)**: client -> browser 재매핑이 팩토리에 올바르게 위치. TypecheckOrchestrator에서 target 변환 로직이 제거되어 책임 경계가 명확.

4. **이벤트 중복 제거 (Feature 2.1)**: `setupWatchEvents()` 헬퍼가 `normalizeBuild` 콜백 패턴으로 두 엔진의 이벤트 구조 차이를 자연스럽게 추상화. `waitForInitialBuild`/`resolveInitialBuild` 반환으로 초기 빌드 감지도 캡슐화.

5. **publish.ts 분할 (Feature 3.1)**: 852줄 -> index.ts(639줄) + npm-publisher.ts(31줄) + storage-publisher.ts(209줄) + local-publisher.ts(24줄). import 경로 `"./commands/publish"` 유지로 진입점 호환성 보장.

6. **replace-deps/package-utils 분할 (Feature 3.2, 3.3)**: 해석/실행 분리와 분류/수집/유틸 분리가 barrel export 금지 규칙을 준수하며 구현됨.

7. **Capacitor 분할 (Feature 4.1)**: 796줄 -> 618줄 + capacitor-build.ts(142줄) + capacitor-icon.ts(75줄). standalone 함수 패턴이 기존 `capacitor-android.ts`와 일관.

8. **infra -> runtime 이동 (Feature 4.2)**: 모든 import 경로가 `runtime/`으로 업데이트되었고, `infra/` 참조가 0건.

9. **리소스 관리**: 모든 오케스트레이터에서 Worker, FsWatcher, ChildProcess, Timer가 shutdown()에서 정리됨. 메모리 릭 패턴 없음.

10. **외부 API 보존**: `src/index.ts`의 public export (`sdAngularPlugin`, `SdAngularPluginOptions`, 설정 타입들)가 변경 없이 유지됨.
