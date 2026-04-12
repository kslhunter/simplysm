# 리팩토링 분석 리포트: @simplysm/angular

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/angular/src/` |
| 분석 일시 | 2026-04-11 |
| 파일 수 | 147개 (.ts) |
| 총 라인 수 | 16,855 |
| 발견 이슈 | 9건 (Critical: 2, Medium: 5, Low: 2) |

---

## Critical

### ARCH-001

```
id: ARCH-001
severity: Critical
category: 아키텍처
location: src/core/providers/sd-busy.provider.ts:11, src/core/providers/sd-toast.provider.ts:17-18, src/core/providers/sd-activated-modal.provider.ts:2
title: core 레이어가 ui 레이어를 직접 참조 — 의존 방향 역전
description: |
  core/providers/ 3개 파일이 ui/ 레이어의 컴포넌트를 직접 import한다.
  - sd-busy.provider.ts → ui/overlay/busy/sd-busy-container (SdBusyContainer)
  - sd-toast.provider.ts → ui/overlay/toast/sd-toast, sd-toast-container (SdToast, SdToastContainer)
  - sd-activated-modal.provider.ts → ui/overlay/modal/sd-modal.provider (SdModalContentDef 타입)
  
  이는 의존 방향(core ← features ← ui)을 위반한다.
  ui 컴포넌트 변경 시 core 레이어까지 영향이 파급되며, core의 독립성이 훼손된다.
  원인은 provider가 createComponent()로 UI 컴포넌트를 동적 생성하기 때문이다.
suggestion: |
  1. SdToastProvider, SdBusyProvider에서 UI 생성 로직을 분리하여 ui/ 레이어에 renderer 클래스를 두고,
     core provider는 추상 인터페이스만 정의한다 (DI로 구현체 주입).
  2. SdActivatedModalProvider의 SdModalContentDef 타입 참조는 core에 공통 타입을 정의하거나
     import type으로 전환하여 런타임 의존을 제거한다.
```

### DESIGN-001

```
id: DESIGN-001
severity: Critical
category: 설계
location: src/core/utils/mark.ts:1-24
title: Angular 비공개 signal 내부 API 직접 사용 — 유지보수 위험
description: |
  mark() 함수가 @angular/core/primitives/signals에서 producerIncrementEpoch,
  producerNotifyConsumers, producerUpdatesAllowed, runPostSignalSetFn, SIGNAL을
  직접 import하여 사용한다.
  이 API들은 Angular의 SemVer 보장 대상이 아니며, Angular 버전 업그레이드 시
  예고 없이 변경될 수 있다.
  
  사용처:
  - features/data-view/injectDataSheetInlineEditManager.ts:85
  - features/data-view/sd-data-sheet.base.ts:244
suggestion: |
  1. clone 파라미터(shallow copy + update())로 대체 가능한 사용처를 먼저 전환한다.
  2. Angular에 공식 markDirty() API 또는 signal mutation notification API에 대한
     feature request를 제출한다.
  3. 대체 불가능한 경우, Angular 버전 업그레이드 시 호환성 검증 테스트를 필수로 추가한다.
```

---

## Medium

### DESIGN-002

```
id: DESIGN-002
severity: Medium
category: 설계
location: src/features/data-view/sd-data-sheet.base.ts, sd-data-detail.base.ts, sd-data-select-button.base.ts
title: 상속 기반 추상 클래스 — 구성(Composition) 전환 가능
description: |
  SdDataSheetBase(305줄), SdDataDetailBase(183줄), SdDataSelectButtonBase(104줄)가
  @Directive로 선언된 추상 클래스이며, 각각 SdDataSheet, SdDataDetail, SdDataSelectButton이
  이를 상속한다.
  
  내부적으로 이미 composable 함수들(injectDataSheetRefreshManager, injectDataSheetExcelManager 등)로
  기능을 위임하고 있으나, 자식 컴포넌트가 injectParent()로 부모 Base 인스턴스를 참조하여
  상속 체인에 강하게 결합되어 있다.
  
  상속은 1단계뿐이지만, Base 클래스의 필드/메서드 변경이 자식과 injectParent 소비자 모두에
  파급된다.
suggestion: |
  Base 클래스의 상태와 메서드를 inject 가능한 서비스로 추출하고, 자식 컴포넌트가
  해당 서비스를 주입받아 사용하도록 전환한다. injectParent() 호출을 제거하고
  명시적 DI로 대체한다.
```

### DESIGN-003

```
id: DESIGN-003
severity: Medium
category: 설계
location: src/core/providers/sd-toast.provider.ts (321줄), src/core/providers/sd-print.provider.ts (197줄)
title: Provider가 서비스 로직과 DOM/UI 렌더링을 혼합
description: |
  SdToastProvider:
  - 서비스 로직: info/success/warning/danger, try(), notify() 메서드
  - DOM/UI 렌더링: document.body.appendChild (57-67줄), createComponent (103-124줄),
    CSS 트랜지션 타이밍 (231-271줄)
  
  SdPrintProvider:
  - 서비스 API: printAsync(), getPdfBufferAsync()
  - DOM 조작: createElement, appendChild, style 주입 (59-90줄)
  
  한 클래스가 "무엇을 보여줄지"와 "어떻게 보여줄지"를 모두 담당하여 단일 책임 원칙을 위반한다.
suggestion: |
  DOM 생성/조작 로직을 별도의 내부 렌더러 유틸리티로 추출한다.
  Provider는 비즈니스 의도(toast 표시, 인쇄 요청)만 담당하고,
  렌더러가 DOM 조작을 수행하도록 분리한다.
```

### STRUCT-001

```
id: STRUCT-001
severity: Medium
category: 구조
location: src/ui/overlay/modal/sd-modal.ts (617줄), src/ui/data/sheet/sd-sheet.ts (585줄), src/ui/form/editor/sd-tiptap-editor.ts (513줄)
title: 대형 컴포넌트 파일 — 내부 로직 분할 가능
description: |
  500줄 이상의 컴포넌트가 3개 존재한다.
  
  sd-sheet.ts (585줄): 이미 useSheetLayoutEngine, useSheetCellAgent, useSheetCellStyling 등
  composable을 추출했으나, 22개 import와 41개 메서드/프로퍼티가 남아 있다.
  SdModalProvider를 직접 주입하여 설정 모달을 여는 것은 UI 컴포넌트의 책임을 넘는다.
  
  sd-modal.ts (617줄): 다이얼로그 생명주기, 포커스 트랩, 키보드 네비게이션, 백드롭,
  드래그를 모두 한 파일에서 처리한다.
  
  sd-tiptap-editor.ts (513줄): 에디터 초기화 + 46개 포매팅 커맨드/상태 메서드가 한 파일에
  공존한다.
suggestion: |
  - sd-sheet.ts: 설정 모달 열기를 callback input으로 전환하여 SdModalProvider 의존 제거.
  - sd-modal.ts: 포커스 트랩, 드래그 로직을 별도 setup 함수로 추출.
  - sd-tiptap-editor.ts: 툴바 포매팅 커맨드를 별도 유틸리티로 추출.
```

### STRUCT-002

```
id: STRUCT-002
severity: Medium
category: 구조
location: src/ui/form/button/sd-modal-select-button.ts, src/ui/form/choice/sd-state-preset.ts
title: UI 컴포넌트가 Provider를 직접 주입 — 재사용성 저하
description: |
  sd-modal-select-button.ts: SdModalProvider를 직접 주입하여 선택 모달을 연다.
  sd-state-preset.ts: SdModalProvider + SdToastProvider를 직접 주입한다.
  
  순수 UI 컴포넌트가 특정 provider에 의존하면 다른 컨텍스트에서 재사용이 어렵고,
  provider 인터페이스 변경 시 UI 레이어까지 파급된다.
suggestion: |
  모달/토스트 호출을 output 이벤트나 callback input으로 전환하여
  소비측(features 레이어)에서 provider를 호출하도록 위임한다.
  단, SdBusyContainer→SdBusyProvider, SdThemeSelector→SdThemeProvider는
  본질적으로 해당 provider의 시각적 표현이므로 현행 유지가 적절하다.
```

### ARCH-002

```
id: ARCH-002
severity: Medium
category: 아키텍처
location: src/core/utils/injectParent.ts, src/features/ 내 4개 사용처
title: injectParent()가 Angular 내부 _lView[8]에 의존 — 프레임워크 결합
description: |
  injectParent()는 ViewContainerRef의 injector chain을 순회하며
  Angular 내부 _lView[8] (CONTEXT slot)을 직접 접근하여 부모 컴포넌트를 찾는다.
  
  사용처 4곳:
  - features/base/sd-base-container.ts:85
  - features/data-view/sd-data-detail.ts:188
  - features/data-view/sd-data-sheet.ts:380
  - features/data-view/sd-data-select-button.ts:84
  
  Angular의 내부 구조가 변경되면 런타임 오류가 발생할 수 있다.
suggestion: |
  Angular의 공식 host directive 또는 DI 토큰(InjectionToken + provide)을 활용하여
  부모-자식 간 통신을 공식 API로 전환한다.
  당장 전환이 어려우면, Angular 버전 업그레이드 시 호환성 검증 테스트를 필수로 추가한다.
```

---

## Low

### STRUCT-003

```
id: STRUCT-003
severity: Low
category: 구조
location: src/core/plugins/commands/sd-save-command-event.plugin.ts, sd-refresh-command-event.plugin.ts, sd-insert-command-event.plugin.ts
title: 커맨드 플러그인 3개의 모달 체크 로직 중복
description: |
  3개 커맨드 플러그인(save, refresh, insert)이 각각 동일한 패턴으로
  findTopOpenModalEl()을 호출하고 모달 내부 이벤트 필터링을 수행한다.
  각 파일의 24-31줄 범위에서 동일 로직이 반복된다.
suggestion: |
  공통 모달 체크 로직을 findTopOpenModalEl.ts에 shouldProcessCommandEvent() 같은
  헬퍼 함수로 추출하고, 각 플러그인에서 호출하도록 단순화한다.
```

### DESIGN-004

```
id: DESIGN-004
severity: Low
category: 설계
location: src/core/providers/sd-app-structure.types.ts
title: 외부 패키지 타입 re-export와 로컬 타입 혼합
description: |
  sd-app-structure.types.ts에서 @simplysm/service-common의 AppStructureItem을
  re-export하면서 동시에 SdMenu, SdFlatMenu, SdPermission 등 로컬 파생 타입을 정의한다.
  re-export와 로컬 정의가 혼재하여 타입의 출처가 불명확하다.
suggestion: |
  re-export를 제거하고, 소비측에서 @simplysm/service-common을 직접 import하도록 전환한다.
  또는 index.ts에서 export 경로를 명확히 구분하여 출처를 드러낸다.
```

---

## 요약

| Severity | 건수 | 주요 영역 |
|----------|------|-----------|
| Critical | 2 | 의존 방향 역전 (core→ui), Angular 비공개 API 사용 |
| Medium | 5 | 상속 남용, Provider 책임 혼합, 대형 파일, UI-Provider 결합, injectParent 내부 API |
| Low | 2 | 커맨드 플러그인 중복, 타입 re-export 혼합 |

가장 높은 우선순위의 개선은 **core 레이어의 ui 역참조 해소(ARCH-001)**와 **Angular 내부 API 의존 관리(DESIGN-001, ARCH-002)**이다.
