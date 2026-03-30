# Feature FIX-1 Core Infra 이슈 수정

## 참조 자료

- [wbs.md](./wbs.md)
- [review.md](../.tasks/260329202656_review-angular-migration/review.md)

### 대상 파일

| 파일 | 관련 이슈 |
|------|----------|
| `src/core/utils/setups/setupModelHook.ts` | LOGIC-001 |
| `src/core/plugins/events/sd-resize-event.plugin.ts` | LOGIC-002 |
| `src/core/plugins/sd-global-error-handler.plugin.ts` | LOGIC-004, LOGIC-018 |
| `src/core/provideSdAngular.ts` | LOGIC-005 |
| `src/core/providers/sd-theme-provider.ts` | LOGIC-006 |
| `src/core/providers/sd-navigate-window.provider.ts` | LOGIC-007, LOGIC-016 |
| `src/core/plugins/events/sd-intersection-event.plugin.ts` | DESIGN-001 |
| `src/core/utils/setups/setupCanDeactivate.ts` | DESIGN-002 |
| `src/core/providers/sd-shared-data.provider.ts` | DESIGN-006 |
| `src/core/providers/sd-service-client-factory.provider.ts` | LOGIC-017 |
| `src/core/utils/useExpandingManager.ts` | PERF-001 |
| `src/core/utils/useSelectionManager.ts` | PERF-002 |

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | CONSIST-006 ResizeObserver Chrome 61 호환 | 현행 유지 (Chrome 64+) | 실제 사용 환경이 Chrome 64 이상이며 폴리필 불가능한 API |

## 요구명세

```gherkin
Feature: FIX-1 Core Infra 이슈 수정

  Background:
    Given @simplysm/angular 패키지의 core 모듈이 로드되어 있다

  Rule: setupModelHook은 canFn의 비동기 결과를 존중해야 한다

    Scenario: canFn이 Promise<false>를 반환하면 값이 변경되지 않는다
      Given canFn이 Promise.resolve(false)를 반환하도록 설정되어 있다
      When model signal에 새 값을 set한다
      Then orgSet이 호출되지 않는다
      And model signal의 값이 이전 값으로 유지된다

    Scenario: canFn의 Promise가 reject되면 에러가 처리된다
      Given canFn이 Promise.reject(error)를 반환하도록 설정되어 있다
      When model signal에 새 값을 set한다
      Then orgSet이 호출되지 않는다
      And unhandled rejection이 발생하지 않는다

  Rule: SdResizeEventPlugin은 상태 경합 없이 초기 크기를 감지해야 한다

    Scenario: 요소 크기 변경 시 sdResize 이벤트가 발생한다
      Given sdResize 이벤트가 바인딩된 요소가 있다
      When 요소의 크기가 변경된다
      Then sdResize 이벤트가 올바른 크기 정보와 함께 발생한다

    Scenario: IntersectionObserver와 ResizeObserver 간 상태 경합이 없다
      Given sdResize 이벤트가 바인딩된 요소가 있다
      When ResizeObserver 콜백이 IntersectionObserver보다 먼저 실행된다
      Then 초기 크기 이벤트가 정확하게 발생한다

  Rule: 에러 핸들러는 모든 에러 타입을 처리해야 한다

    Scenario: 문자열 에러가 처리된다
      Given 전역 에러 핸들러가 등록되어 있다
      When 문자열 타입의 에러가 throw된다
      Then 에러 메시지가 표시된다
      And 시스템 로그에 기록된다

    Scenario: 에러 메시지에 HTML이 포함되어도 XSS가 발생하지 않는다
      Given 전역 에러 핸들러가 등록되어 있다
      When <script> 태그가 포함된 에러가 발생한다
      Then HTML이 이스케이프되어 텍스트로 표시된다

  Rule: SW 업데이트 폴링은 앱 생명주기를 따라야 한다

    Scenario: 앱이 destroy되면 폴링이 중단된다
      Given SW 업데이트 폴링이 실행 중이다
      When 앱이 destroy된다
      Then setTimeout이 clearTimeout으로 정리된다

    Scenario: checkForUpdate가 실패해도 폴링이 재개된다
      Given SW 업데이트 폴링이 실행 중이다
      When swUpdate.checkForUpdate()가 reject된다
      Then 다음 폴링 주기가 정상적으로 스케줄된다

  Rule: 테마 전환은 기존 body 클래스를 보존해야 한다

    Scenario: 다크 모드 전환 시 기존 body 클래스가 유지된다
      Given document.body에 "my-app" 클래스가 있다
      When 다크 모드가 활성화된다
      Then "sd-theme-dark" 클래스가 추가된다
      And "my-app" 클래스가 유지된다

  Rule: SdNavigateWindowProvider의 window.open 파라미터가 정확해야 한다

    Scenario: features 파라미터가 올바르게 전달된다
      Given features가 "width=800,height=600"으로 지정되었다
      When open()을 호출한다
      Then window.open의 세 번째 인수로 features가 전달된다

    Scenario: open()을 여러 번 호출해도 리스너가 누적되지 않는다
      Given open()이 이미 한 번 호출되었다
      When open()을 다시 호출한다
      Then beforeunload 리스너가 1개만 등록되어 있다

  Rule: 모든 이벤트 플러그인이 provideSdAngular에 등록되어야 한다

    Scenario: SdIntersectionEventPlugin이 등록되어 사용 가능하다
      Given provideSdAngular()가 호출되었다
      When (sdIntersection) 이벤트를 바인딩한다
      Then 플러그인이 이벤트를 처리한다

  Rule: setupCanDeactivate는 기존 가드를 보존해야 한다

    Scenario: 기존 canDeactivate 가드가 유지된다
      Given 라우트에 기존 canDeactivate 가드가 있다
      When setupCanDeactivate()를 호출한다
      Then 기존 가드와 새 가드가 모두 등록된다

  Rule: 비동기 작업의 에러가 소실되지 않아야 한다

    Scenario: SharedData getter가 실패하면 에러가 보고된다
      Given SharedData에 getter가 등록되어 있다
      When getter의 Promise가 reject된다
      Then 에러가 ErrorHandler로 전달된다

    Scenario: totalSize가 0일 때 progress가 안전하게 처리된다
      Given 파일 업로드가 진행 중이다
      When totalSize가 0이다
      Then progress가 NaN/Infinity가 아닌 안전한 값(0)으로 설정된다

  Rule: 매니저 유틸은 대량 데이터에서도 효율적으로 동작해야 한다

    Scenario: isAllExpanded가 O(n) 시간복잡도로 동작한다
      Given expanded에 1000개 항목이 있다
      When isAllExpanded()를 호출한다
      Then Set.has()를 사용하여 O(n)으로 비교한다

    Scenario: isAllSelected가 O(n) 시간복잡도로 동작한다
      Given selected에 1000개 항목이 있다
      When isAllSelected()를 호출한다
      Then Set.has()를 사용하여 O(n)으로 비교한다
```

## 구현계획

### 배경

@simplysm/angular 패키지의 core 모듈(plugins, providers, utils)에서 코드 리뷰를 통해 발견된 15건의 이슈를 수정한다. 모두 기존 코드의 로직 버그, 설계 결함, 성능 비효율에 해당하며 새로운 기능 추가는 없다.

### 목표

- Critical 2건: setupModelHook Promise 결과 무시, ResizeObserver/IntersectionObserver 상태 경합 해소
- Medium 9건: 에러 핸들러 보강, SW 폴링 정리, 테마 전환, window.open 파라미터, 플러그인 등록, canDeactivate 보존, SharedData 에러, progress division by zero
- Low 4건: XSS 방지, beforeunload 누적, 매니저 성능

### 비목표

- CONSIST-006 (ResizeObserver Chrome 61 호환) — 설계 결정 D1에 따라 현행 유지
- UI/SCSS 영역 이슈 — FIX-2, FIX-3, FIX-4에서 처리

### 설계

각 이슈는 기존 코드의 수정이므로 새로운 API나 패턴 도입이 없다. 핵심 변경:

- **setupModelHook**: `.then((allowed) => { if (allowed !== false) orgSet(value); })` + `.catch()` 추가
- **SdResizeEventPlugin**: IntersectionObserver 제거, ResizeObserver만으로 통합 (첫 콜백이 초기 크기 역할)
- **SdGlobalErrorHandlerPlugin**: else 분기에서 String(event) 처리 + innerHTML 대신 textContent 사용
- **provideSdAngular**: SW 폴링에 clearTimeout 정리 + try-finally + SdIntersectionEventPlugin 등록
- **SdThemeProvider**: classList.toggle 사용
- **SdNavigateWindowProvider**: features 분기 조건 수정 + AbortController로 리스너 관리
- **setupCanDeactivate**: 기존 배열에 push
- **SdSharedDataProvider**: .catch에서 ErrorHandler 전달
- **SdServiceClientFactoryProvider**: totalSize === 0 가드
- **useExpandingManager/useSelectionManager**: Set 변환 후 has()

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| ResizeObserver만 사용 (IntersectionObserver 제거) | 채택 | ResizeObserver의 첫 콜백이 초기 크기를 보고하므로 IntersectionObserver가 불필요 |
| IntersectionObserver 유지하되 별도 상태 관리 | 미채택 | 복잡성 증가 대비 이점 없음 |
| _displayErrorMessage에서 HTML sanitize 라이브러리 사용 | 미채택 | textContent로 충분하며 의존성 추가 불필요 |

### Vertical Slices

#### Slice 1: Critical 로직 수정
- [x] **구현 내용:** setupModelHook의 Promise 결과 확인 + catch 추가, SdResizeEventPlugin에서 IntersectionObserver 제거
- **Scenarios:**
  - Scenario: canFn이 Promise<false>를 반환하면 값이 변경되지 않는다
  - Scenario: canFn의 Promise가 reject되면 에러가 처리된다
  - Scenario: 요소 크기 변경 시 sdResize 이벤트가 발생한다
  - Scenario: IntersectionObserver와 ResizeObserver 간 상태 경합이 없다

#### Slice 2: 에러 핸들러 강화
- [x] **구현 내용:** handleError에 else 분기 추가, _displayErrorMessage에서 innerHTML→textContent 전환
- **의존:** 없음
- **Scenarios:**
  - Scenario: 문자열 에러가 처리된다
  - Scenario: 에러 메시지에 HTML이 포함되어도 XSS가 발생하지 않는다

#### Slice 3: provideSdAngular 수정
- [x] **구현 내용:** SW 폴링에 DestroyRef cleanup + try-finally 추가, SdIntersectionEventPlugin 등록
- **의존:** 없음
- **Scenarios:**
  - Scenario: 앱이 destroy되면 폴링이 중단된다
  - Scenario: checkForUpdate가 실패해도 폴링이 재개된다
  - Scenario: SdIntersectionEventPlugin이 등록되어 사용 가능하다

#### Slice 4: Provider 수정
- [x] **구현 내용:** SdThemeProvider classList.toggle, SdNavigateWindowProvider 파라미터/리스너 수정, setupCanDeactivate push, SharedData .catch, ServiceClient totalSize 가드
- **의존:** 없음
- **Scenarios:**
  - Scenario: 다크 모드 전환 시 기존 body 클래스가 유지된다
  - Scenario: features 파라미터가 올바르게 전달된다
  - Scenario: open()을 여러 번 호출해도 리스너가 누적되지 않는다
  - Scenario: 기존 canDeactivate 가드가 유지된다
  - Scenario: SharedData getter가 실패하면 에러가 보고된다
  - Scenario: totalSize가 0일 때 progress가 안전하게 처리된다

#### Slice 5: 성능 개선
- [x] **구현 내용:** useExpandingManager/useSelectionManager에서 Set 기반 비교로 전환
- **의존:** 없음
- **Scenarios:**
  - Scenario: isAllExpanded가 O(n) 시간복잡도로 동작한다
  - Scenario: isAllSelected가 O(n) 시간복잡도로 동작한다
