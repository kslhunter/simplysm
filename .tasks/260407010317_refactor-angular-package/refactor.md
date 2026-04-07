# Refactoring Report: @simplysm/angular

| 항목 | 내용 |
|------|------|
| **분석 대상** | `packages/angular/src/` (136 TypeScript 소스 파일) |
| **분석 일시** | 2026-04-07 01:03 |
| **파일 수** | 136 |
| **발견 이슈** | 6건 (Critical 2, Medium 3, Low 1) |

---

## Critical

### ARCH-001

```
id: ARCH-001
severity: Critical
category: 아키텍처
location: src/core/ → src/ui/overlay/ (7개 import)
title: Infrastructure provider의 레이어 혼재 — core/가 ui/에 의존
description: |
  SdBusyProvider, SdToastProvider, SdActivatedModalProvider 3개 provider가
  ui/overlay/에 위치하지만, 실제로는 core/ 인프라에서 광범위하게 사용된다.
  이로 인해 core/ → ui/ 방향의 역방향 의존이 7건 발생한다:
    - core/providers/sd-print.provider.ts → SdBusyProvider (runtime)
    - core/providers/sd-service-client-factory.provider.ts → SdToastProvider (runtime)
    - core/provideSdAngular.ts → SdBusyProvider (runtime)
    - core/utils/setups/setupCanDeactivate.ts → SdActivatedModalProvider (runtime)
    - core/utils/setups/setupCloserWhenSingleSelectionChange.ts → ISelectModalOutputResult (type-only)
    - core/utils/useViewTitleSignal.ts → SdActivatedModalProvider (runtime)
    - core/utils/useViewTypeSignal.ts → SdActivatedModalProvider (runtime)
  
  3개 provider는 모두 providedIn:"root" 싱글톤이며(SdActivatedModalProvider 제외),
  글로벌 상태 관리(busy count), 알림(toast), 컨텍스트 감지(activated modal)라는
  인프라 역할을 수행한다. UI 컴포넌트(SdBusyContainerControl, SdToastControl 등)와
  분리 가능하다.
suggestion: |
  3개 provider를 core/providers/로 이동:
    - SdBusyProvider → core/providers/sd-busy.provider.ts
    - SdToastProvider → core/providers/sd-toast.provider.ts
    - SdActivatedModalProvider → core/providers/sd-activated-modal.provider.ts
  UI 컴포넌트(SdBusyContainerControl, SdToastControl, SdToastContainerControl)는
  ui/overlay/에 그대로 유지하고 core/의 provider를 import한다.
  ISelectModalOutputResult 타입도 core/ 쪽 타입 파일로 추출한다.
```

### DESIGN-001

```
id: DESIGN-001
severity: Critical
category: 설계
location: src/features/data-view/sd-data-sheet.control.ts (875 lines)
title: AbsSdDataSheet God Class — 14개 독립 책임을 단일 클래스에 보유
description: |
  AbsSdDataSheet 추상 클래스(lines 84-435, 약 350 lines)가 다음 14개 책임을 한 클래스에 담고 있다:
    1. 추상 계약 정의 (abstract properties/methods)
    2. 핵심 상태 관리 (12+ WritableSignal)
    3. 변경 추적 (_itemsSnapshot diff)
    4. 뷰 계산 속성 (isSelectedItemsHasDeleted 등)
    5. 선택 관리 (setupCumulateSelectedKeys, setupCloserWhenSingleSelectionChange)
    6. 필터 바인딩 및 반응적 데이터 로딩 (2 effects)
    7. 권한/상태 검증 (checkIgnoreChanges)
    8. 데이터 갱신 및 동기화 (doRefresh)
    9. 인라인 편집 (doAddItem, doSubmit, doToggleDeleteItem)
   10. 모달 편집 (doEditItem, doToggleDeleteItems)
   11. Excel 가져오기/내보내기 (doDownloadExcel, doUploadExcel)
   12. 모달 선택 출력 (doModalConfirm, doModalCancel)
   13. diff 계산 유틸 (_getDiffs)
   14. 에러 메시지 포맷 (_getOrmDataEditToastErrorMessage)

  SdDataSheetControl 프레젠테이션 컴포넌트(lines 441-875)도 318줄 템플릿에
  20+개 @if 조건과 13개 이벤트 핸들러를 포함하여 복잡도가 높다.
suggestion: |
  기존 use*/setup* 패턴을 따라 책임을 composable로 분리:
    - useDataSheetFilterManager(): 필터 바인딩, 변경 감지, 제출
    - useDataSheetInlineEditManager(): 인라인 추가/제출/삭제
    - useDataSheetModalEditManager(): 모달 편집/삭제, 확인/취소
    - useDataSheetExcelManager(): Excel 가져오기/내보내기
    - useDataSheetRefreshManager(): 데이터 갱신, 스냅샷, busy 상태
  AbsSdDataSheet는 이 composable들을 조합하는 오케스트레이터(~250줄)로 축소.
  템플릿도 toolbar/filter/tools/modal-bottom 영역을 별도 sub-component로 분리 가능.
```

---

## Medium

### DESIGN-002

```
id: DESIGN-002
severity: Medium
category: 설계
location: src/core/providers/sd-app-structure.provider.ts (449 lines)
title: SdAppStructureProvider 파일에 4개 관심사 혼재 — 유틸 클래스 20개 static 메서드
description: |
  단일 파일에 4개 관심사가 혼재:
    1. usePermsSignal() 컴포지션 훅 (lines 4-7)
    2. SdAppStructureProvider 추상 클래스 (lines 11-44)
    3. SdAppStructureUtils 정적 유틸리티 (lines 46-389, 344줄, 20개 static 메서드)
    4. 타입 정의 5개 인터페이스 (lines 391-449)

  SdAppStructureUtils만 344줄로, 트리 순회/메뉴 생성/권한 생성/모듈 검증
  4개 그룹의 순수 함수를 포함한다. Provider는 단순히 Utils를 위임 호출하는
  6개 메서드뿐이다. 파일 크기로 인해 탐색과 이해가 어렵다.
suggestion: |
  3개 파일로 분리:
    - sd-app-structure.types.ts: 5개 인터페이스/타입 (~65줄)
    - sd-app-structure.utils.ts: SdAppStructureUtils 클래스 (~270줄)
    - sd-app-structure.provider.ts: Provider + usePermsSignal (~90줄)
  Utils는 순수 함수이므로 의존성 변경 없이 분리 가능.
```

### DESIGN-003

```
id: DESIGN-003
severity: Medium
category: 설계
location: src/ui/data/sheet/sd-sheet.control.ts (773 lines)
title: SdSheetControl 잔여 추출 가능 책임 — 4개 helper 분리 후에도 비대
description: |
  이미 useSheetCellAgent, useSheetColumnFixing, useSheetDomAccessor,
  useSheetLayoutEngine 4개 helper를 분리했으나, 여전히 773줄에 다음 책임이 남아 있다:
    - 컬럼 리사이징 관리 (lines 702-769, ~70줄, mousedown/mousemove/mouseup)
    - 설정 관리 (lines 392-394, 686-700, 시스템 config + 모달)
    - 표시 아이템 파이프라인 (lines 412-472, 페이지네이션 + 정렬 + 확장 필터링)
    - 셀 스타일링/클래스 계산 (lines 500-664, ~150줄)
  22개 signal 바인딩(16 input + 4 model + 2 output)과 152줄 템플릿은
  복잡한 데이터 컴포넌트로서 적정 수준이지만, 내부 로직은 추가 분리 여지가 있다.
suggestion: |
  기존 helper 패턴을 따라 추가 추출:
    - useSheetColumnResizing(): 리사이징 상태 + 이벤트 처리
    - useSheetDisplayPipeline(): 페이지네이션/정렬/확장 필터링 computed
    - useSheetCellStyling(): 헤더/바디 셀 스타일/클래스 계산
  이를 통해 sd-sheet.control.ts를 ~400줄 수준으로 축소 가능.
```

### STRUCT-001

```
id: STRUCT-001
severity: Medium
category: 구조
location: src/ui/navigation/menu-utils.ts, src/features/shared-data/matchesSearchText.ts
title: 소비자 필요 유틸리티가 public API에서 누락
description: |
  2개 내부 유틸리티 파일이 public 컴포넌트에서 사용되지만 index.ts에서 export되지 않는다:

  1. menu-utils.ts: ISdMenu 인터페이스, getMenuRouterLinkOption(), getIsMenuSelected()
     - SdTopbarMenuControl, SdSidebarMenuControl이 사용
     - 소비 프로젝트에서 커스텀 메뉴 구현 시 ISdMenu 타입이 필요할 수 있음

  2. matchesSearchText.ts: matchesSearchText(itemText, searchQuery)
     - SdSharedDataSelectControl, SdSharedDataSelectListControl이 사용
     - 소비 프로젝트에서 동일한 검색 로직이 필요할 수 있음

  나머지 5개 비노출 파일(useSheetCellAgent, useSheetColumnFixing, useSheetDomAccessor,
  useSheetLayoutEngine, findTopOpenModalEl)은 순수 내부 구현이므로 비노출이 적절하다.
suggestion: |
  index.ts에 2개 유틸리티 export 추가:
    - export { ISdMenu, getMenuRouterLinkOption, getIsMenuSelected } from "./ui/navigation/menu-utils";
    - export { matchesSearchText } from "./features/shared-data/matchesSearchText";
  ISdMenu은 소비 프로젝트에서 SdAppStructureProvider와 연동하는 핵심 타입이다.
```

---

## Low

### ARCH-002

```
id: ARCH-002
severity: Low
category: 아키텍처
location: src/core/utils/setups/setupCloserWhenSingleSelectionChange.ts
title: Feature 전용 setup 유틸이 core/에 위치 — 레이어 배치 불일치
description: |
  setupCloserWhenSingleSelectionChange()는 "모달 단일 선택 시 자동 닫기"라는
  feature-specific 로직을 수행하며, ui/form/button의 ISelectModalOutputResult 타입에
  의존한다. 실제 사용처도 features/data-view의 AbsSdDataSheet뿐이다.
  core/utils/setups/의 다른 setup들(setupRipple, setupInvalid 등)은 범용 UI 인프라인
  반면, 이 함수는 모달 선택이라는 특정 도메인에 한정된다.
suggestion: |
  features/shared-data/ 또는 features/data-view/로 이동하여 레이어 의미를 명확히 한다.
  단, ARCH-001에서 ISelectModalOutputResult 타입을 core/로 추출하면 의존성 문제는
  해소되므로, 이동 여부는 ARCH-001 해결 후 재평가한다.
```

---

## 긍정적 발견

- **순환 의존성 없음**: 346개 내부 import 분석 결과 순환 참조 0건
- **Sheet 컴포넌트 분해 우수**: SdSheetControl은 이미 4개 helper composable로 분리 (useSheetCellAgent, useSheetColumnFixing, useSheetDomAccessor, useSheetLayoutEngine)
- **일관된 컴포넌트 패턴**: 모든 컴포넌트가 OnPush + standalone + signal input + data-sd-* host attribute 패턴을 준수
- **use*/setup* 컴포지션 패턴**: Angular의 inject 기반 composable 패턴이 잘 정립되어 있어, 추가 분리 시 동일 패턴 적용 가능
- **features → ui 방향 의존성 준수**: features/에서 ui/로의 참조는 있으나, ui/에서 features/로의 역방향 참조 0건
