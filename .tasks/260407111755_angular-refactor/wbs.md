# WBS: @simplysm/angular 패키지 리팩토링

## 프로젝트 개요

- **배경:** angular 패키지 구조 분석(sd-refactor) 결과, 아키텍처 레이어 위반 7건, God Class 1건, 파일 비대화 2건, public API 누락 2건 등 총 6건의 리팩토링 이슈가 발견됨
- **환경:** `@simplysm/angular` 패키지 (Angular 21, signal-based, standalone, 136 소스 파일). 모노레포 내 `packages/angular/`에 위치
- **전제조건:** 기존 137개 테스트 통과 상태 유지. 기존 public API(index.ts export) 호환성 유지
- **기술적 제약:** barrel export 금지 (src/ 루트 index.ts 제외), ViewEncapsulation.None, OnPush 필수, use*/setup* composable 패턴 준수
- **참조 자료:**
  - `.tasks/260407010317_refactor-angular-package/refactor.md` — 리팩토링 분석 리포트 (6건 이슈 상세)
  - `packages/angular/CLAUDE.md` — 패키지 아키텍처, 패턴, 테스트 가이드

## Impact Mapping

- **Goal:** angular 패키지의 레이어 간 의존 방향 위반 0건 달성 및 주요 파일의 단일 책임 준수
  - **Actor:** 패키지 개발자 (simplysm 모노레포 기여자)
    - **Impact:** 파일 수정 시 영향 범위를 레이어 경계로 예측할 수 있다
      - **Deliverable:** Infrastructure provider 레이어 분리 (ARCH-001)
      - **Deliverable:** Feature 전용 setup 유틸 레이어 이동 (ARCH-002)
    - **Impact:** 파일을 열었을 때 단일 관심사만 보여 이해 시간이 단축된다
      - **Deliverable:** AbsSdDataSheet God Class 분해 (DESIGN-001)
      - **Deliverable:** SdAppStructureProvider 파일 3분할 (DESIGN-002)
      - **Deliverable:** SdSheetControl 추가 helper 추출 (DESIGN-003)
  - **Actor:** 소비 프로젝트 개발자
    - **Impact:** 필요한 유틸리티를 정식 API로 import할 수 있다
      - **Deliverable:** menu-utils, matchesSearchText public export 추가 (STRUCT-001)

## Feature Breakdown

### Epic 1. 아키텍처 레이어 정리

#### [x] Feature 1.1 Infrastructure provider를 core/로 이동

**의존성:** 없음

**범위:**

- SdBusyProvider를 `ui/overlay/busy/` → `core/providers/sd-busy.provider.ts`로 이동
- SdToastProvider를 `ui/overlay/toast/` → `core/providers/sd-toast.provider.ts`로 이동
- SdActivatedModalProvider를 `ui/overlay/modal/` → `core/providers/sd-activated-modal.provider.ts`로 이동
- ISelectModalOutputResult 타입을 `ui/form/button/` → `core/types/select-modal-output-result.ts`로 추출 (D1 결정)
- 이동 후 기존 import 경로를 사용하는 모든 파일의 import문 갱신 (core/ 내 7건 + ui/ 내 해당 컴포넌트)
- index.ts export 경로 갱신

**경계:**

- UI 컴포넌트(SdBusyContainerControl, SdToastControl, SdToastContainerControl, SdModalControl)는 ui/에 그대로 유지
- Provider 내부 로직 변경 없음 (파일 이동만)

**근거:**

- refactor.md ARCH-001: core/ → ui/ 역방향 의존 7건 발생 원인

#### [x] Feature 1.2 setupCloserWhenSingleSelectionChange 레이어 이동

**의존성:** Feature 1.1 (ISelectModalOutputResult 타입 추출 후 진행)

**범위:**

- `core/utils/setups/setupCloserWhenSingleSelectionChange.ts`를 `features/data-view/` 하위로 이동 (D1: 유일한 사용처가 해당 디렉토리에 위치)
- 이동 후 import문 갱신 (AbsSdDataSheet 등 사용처)
- index.ts export 경로 갱신

**경계:**

- 함수 시그니처/로직 변경 없음 (파일 이동만)

**근거:**

- refactor.md ARCH-002: feature-specific 로직이 core/에 위치하는 레이어 배치 불일치

### Epic 2. 파일 구조 개선

#### [x] Feature 2.1 SdAppStructureProvider 파일 3분할

**의존성:** 없음

**범위:**

- `sd-app-structure.provider.ts` (449줄)을 3개 파일로 분할:
  - `sd-app-structure.types.ts`: TSdAppStructureItem, ISdAppStructureGroupItem, ISdAppStructureLeafItem, ISdAppStructureSubPermission, ISdMenu, ISdFlatMenu, ISdPermission, ISdFlatPermission
  - `sd-app-structure.utils.ts`: SdAppStructureUtils 클래스 (20개 static 메서드)
  - `sd-app-structure.provider.ts`: SdAppStructureProvider + usePermsSignal()
- 분할 후 import 경로 갱신
- index.ts export 경로 갱신

**경계:**

- 타입/유틸/provider의 public API 변경 없음 (파일 분할만)
- Utils 내부 로직 리팩토링 없음

**근거:**

- refactor.md DESIGN-002: 단일 파일에 4개 관심사 혼재, SdAppStructureUtils만 344줄

#### [x] Feature 2.2 Public API 유틸리티 export 추가

**의존성:** 없음

**범위:**

- ISdMenu 타입 통합: `sd-app-structure.types.ts`의 ISdMenu에서 modules/TModule 제거(죽은 프로퍼티), url 추가. `menu-utils.ts`의 ISdMenu 정의 제거하고 sd-app-structure.types에서 import/re-export (D1)
- ISdAppStructureLeafItem에 url?: string 추가 (D1)
- SdAppStructureUtils.getMenus()에서 modules 제거, url 복사 (D1)
- getMenuRouterLinkOption, getIsMenuSelected, matchesSearchText를 index.ts에서 export

**경계:**

- ISdFlatMenu 타입은 변경하지 않음
- UI 컴포넌트 로직 변경 없음
- sidebar/topbar controls의 import 경로는 menu-utils re-export로 유지

**근거:**

- refactor.md STRUCT-001: public 컴포넌트가 사용하는 유틸리티가 소비자에게 미노출
- D1: ISdMenu 이름 충돌 분석 → modules는 죽은 프로퍼티, url은 TSdAppStructureLeafItem부터 지원

### Epic 3. 컴포넌트 설계 개선

#### [x] Feature 3.1 SdSheetControl 추가 helper 추출

**의존성:** 없음
**Feature 문서:** [3.1-sd-sheet-control-helper-extraction.md](./3.1-sd-sheet-control-helper-extraction.md)

**범위:**

- `sd-sheet.control.ts` (773줄)에서 다음 책임을 별도 composable로 추출:
  - `useSheetColumnResizing()`: 리사이징 상태 + mousedown/mousemove/mouseup 이벤트 처리 (~77줄)
  - `useSheetDisplayPipeline()`: 페이지네이션/정렬/확장 필터링 computed chain (~61줄, useExpandingManager 포함 — D1)
  - `useSheetCellStyling()`: 헤더/바디 셀 스타일/클래스 계산 (~165줄)
- 추출된 composable은 `src/ui/data/sheet/` 디렉토리에 배치 (기존 use*.ts 패턴과 동일)
- SdSheetControl에서 추출된 composable을 호출하도록 리팩토링
- composable 반환값을 기존 property명으로 재할당하여 템플릿 변경 0건 달성 (D2)

**경계:**

- SdSheetControl의 public API(input/output/model) 변경 없음
- 기존 4개 helper(useSheetCellAgent, useSheetColumnFixing, useSheetDomAccessor, useSheetLayoutEngine) 변경 없음
- 템플릿 변경 없음 (재할당 방식으로 해결)

**설계 결정 요약:** D1: pipeline에 expanding 포함, D2: property 재할당으로 템플릿 무변경, D3: lastResizeEndTimeStamp signal 변환, D4: configResource는 control이 소유

**근거:**

- refactor.md DESIGN-003: 4개 helper 분리 후에도 773줄 잔여, 추가 분리 가능 영역 식별

#### [x] Feature 3.2 AbsSdDataSheet God Class 분해

**의존성:** Feature 1.1 (provider import 경로 정리 후 진행 권장), Feature 1.2 (setupCloserWhenSingleSelectionChange 이동 후 진행 권장)
**Feature 문서:** [3.2-abs-sd-data-sheet-god-class-decomposition.md](./3.2-abs-sd-data-sheet-god-class-decomposition.md)

**범위:**

- `AbsSdDataSheet` 추상 클래스(~350줄, 14개 책임)에서 다음 composable 추출:
  - `useDataSheetFilterManager()`: 필터 바인딩, lastFilter computed, doFilterSubmit()
  - `useDataSheetRefreshManager()`: 데이터 갱신, 스냅샷 관리
  - `useDataSheetInlineEditManager()`: doAddItem, doSubmit, doToggleDeleteItem
  - `useDataSheetModalEditManager()`: doEditItem, doToggleDeleteItems, doModalConfirm, doModalCancel
  - `useDataSheetExcelManager()`: doDownloadExcel, doUploadExcel
- 추출된 composable은 `src/features/data-view/` 디렉토리에 배치
- AbsSdDataSheet는 composable 조합 오케스트레이터로 축소 (~250줄 목표)
- SdDataSheetControl 프레젠테이션 컴포넌트는 parent 참조 방식 유지

**경계:**

- AbsSdDataSheet의 abstract 메서드/프로퍼티 시그니처 변경 없음 (소비 프로젝트 호환성)
- SdDataSheetControl 템플릿 분할(sub-component화)은 이 Feature에서 다루지 않음
- 기존 setup(setupCumulateSelectedKeys, setupCloserWhenSingleSelectionChange) 함수 자체는 변경하지 않음

**설계 결정 요약:** D1: busyCount/initialized는 AbsSdDataSheet 소유 (composable에 전달), D2: checkIgnoreChanges/doRefresh는 AbsSdDataSheet 소유 (getDiffs는 refresh manager 반환, 커스터마이징 가능성), optional 메서드는 lazy getter로 접근 (super() 시점 class field 미설정 대응)

**근거:**

- refactor.md DESIGN-001: 14개 독립 책임, 12+ WritableSignal, 15+ public 메서드

## 제외 사항

- **SdDataSheetControl 템플릿 sub-component 분할** — God Class 분해와 별도 작업이며, 현재 범위를 넘어서는 추가 아키텍처 결정 필요 (refactor.md suggestion에 언급되었으나 별도 Feature로 분리)
- **SdSheetControl 템플릿 분할** — 동일 사유
- **sd-modal.control.ts (610줄) 리팩토링** — refactor.md에서 이슈로 보고되지 않음 (추가 분석 필요 시 별도 진행)
- **sd-tiptap-editor.control.ts (513줄) 리팩토링** — 외부 라이브러리(TipTap) 통합 특성상 분할 효과 제한적, refactor.md에서 보고되지 않음
