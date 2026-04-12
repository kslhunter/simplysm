# WBS: @simplysm/angular 패키지 리팩토링

## 프로젝트 개요

- **배경:** 리팩토링 분석(`.tasks/260411151054_refactor-angular/refactor.md`)에서 9건의 이슈가 발견되었으나, 검토 결과 ARCH-001(레이어 의존 방향), DESIGN-003(서비스/렌더링 혼합), STRUCT-002(UI-Provider 결합)는 거짓양성으로 판정되었다. 실제 문제는 디렉토리 구조가 업계 표준(기능 단위 플랫 구조)을 따르지 않아 파일 배치가 비일관적인 것이며, Angular 내부 API 의존과 코드 구조 개선은 유효하다.
- **환경:** pnpm 모노레포, Angular 21, TypeScript 5.9, Zoneless + Signal 기반 컴포넌트 라이브러리. 147개 소스 파일, 16,855줄.
- **전제조건:** 기존 테스트(139개 spec 파일)가 통과하는 상태에서 시작한다.
- **기술적 제약:** 공개 API(index.ts 통해 export)를 변경하면 소비 프로젝트에 파급된다. 가능한 한 비파괴적(non-breaking) 변경을 우선한다.
- **참조 자료:**
  - `.tasks/260411151054_refactor-angular/refactor.md` — 리팩토링 분석 리포트 (이슈 상세, ARCH-001/DESIGN-003/STRUCT-002는 거짓양성)
  - `packages/angular/CLAUDE.md` — 패키지 아키텍처 및 컨벤션
  - 업계 표준 조사: Angular Material, NG-ZORRO, PrimeNG, Spartan UI 모두 기능 단위 플랫 구조 + provider/component 동거 패턴 채택

## Impact Mapping

- **Goal:** @simplysm/angular 패키지의 디렉토리 구조를 업계 표준(기능 단위)으로 전환하고, Angular 내부 API 의존을 격리하여 유지보수성을 향상한다
  - **Actor:** 라이브러리 메인테이너 (패키지 개발자)
    - **Impact:** 기능 단위로 파일이 모여있어 관련 코드를 한 곳에서 파악·수정할 수 있다
      - **Deliverable:** 기능 단위 플랫 구조 전환, provider/component 동거
    - **Impact:** Angular 버전 업그레이드 시 비공개 API 호환성 검증 범위가 명확해진다
      - **Deliverable:** mark()/injectParent() 내부 API 격리 및 호환성 테스트
    - **Impact:** 대형 파일 분할로 개별 기능 파악과 수정이 용이해진다
      - **Deliverable:** 대형 컴포넌트 로직 분할, 코드 중복 제거

## Feature Breakdown

### Epic 1. 디렉토리 구조 재배치

#### [x] Feature 1.1 Provider/Component 동거 및 overlay 재배치

**의존성:** 없음

**범위:**

- 비일관적으로 배치된 overlay provider를 해당 component 폴더로 이동하여 동거:
  - `core/providers/sd-busy.provider.ts` → `busy/` (sd-busy-container.ts와 합류)
  - `core/providers/sd-toast.provider.ts` → `toast/` (sd-toast.ts, sd-toast-container.ts와 합류)
  - `core/providers/sd-activated-modal.provider.ts` → `modal/` (sd-modal.provider.ts와 합류)
  - `core/providers/sd-print.provider.ts` → `ui/print/` (독립 기능 폴더, D1)
  - `core/providers/sd-theme-provider.ts` → `theme/` (sd-theme-selector.ts와 합류)
- `provideSdAngular.ts` → src/ 루트로 이동 (composition root, 레이어에 속하지 않음)
- 이동된 파일의 내부 import 경로 업데이트
- index.ts export 경로 업데이트
- 기존 테스트 import 경로 업데이트
- 기존 테스트가 모두 통과하도록 유지
- CLAUDE.md 아키텍처 섹션 업데이트

**경계:**

- 공개 API(index.ts export 이름/타입)는 변경하지 않음 — 내부 경로만 변경
- 파일 내용(로직, 타입, 시그니처)은 변경하지 않음 — 순수 파일 이동 + import 경로 업데이트
- core/providers/에 잔류하는 범용 서비스(config, log, localStorage, systemConfig, fileDialog, navigateWindow, serviceClientFactory, sharedData, appStructure)는 이동하지 않음

**근거:**

- SdModalProvider는 이미 ui/overlay/modal/에 있으나, 같은 역할의 SdBusyProvider/SdToastProvider/SdActivatedModalProvider는 core/providers/에 있는 비일관적 배치
- 업계 표준(Angular Material `dialog/`, NG-ZORRO `modal/`, `notification/`)에서 service와 component는 같은 기능 폴더에 동거
- ARCH-001, DESIGN-003은 거짓양성 — provider가 component를 생성하는 것은 정상이며(SdModalProvider가 이미 그러함), 파일 위치만 잘못되어 있었음

- **설계 결정 (Feature 1.1 plan에서 확정):**

- D1: sd-print.provider.ts 독립 폴더 위치 → `ui/print/` (UI 출력 생성 기능이므로 ui/ 레이어 적합, Feature 1.2에서 src/print/로 플랫화)

#### [x] Feature 1.2 3-layer 폐지 및 플랫 구조 전환

**의존성:** Feature 1.1

**범위:**

- ui/ 하위 폴더를 src/ 플랫으로 올림:
  - ui/overlay/busy/ → busy/
  - ui/overlay/dropdown/ → dropdown/
  - ui/overlay/modal/ → modal/
  - ui/overlay/toast/ → toast/
  - ui/print/ → print/
  - ui/theme/ → theme/
  - ui/form/button/ → button/
  - ui/form/checkbox/ → checkbox/
  - ui/form/select/ → select/
  - ui/form/input/ → input/
  - ui/form/choice/ → state-preset/
  - ui/form/editor/ → editor/
  - ui/form/sd-form.ts → form/
  - ui/data/list/ → list/
  - ui/data/sheet/ → sheet/
  - ui/layout/dock/ → dock/
  - ui/layout/kanban/ → kanban/
  - ui/layout/sd-gap.ts → gap/
  - ui/navigation/collapse/ → collapse/
  - ui/navigation/tab/ → tab/
  - ui/navigation/pagination/ → pagination/
  - ui/navigation/sidebar/ → sidebar/
  - ui/navigation/topbar/ → topbar/
  - ui/navigation/menu-utils.ts → navigation/ (공유 유틸)
  - ui/visual/ → visual/
- features/ 하위 폴더를 src/ 플랫으로 올림:
  - features/address/ → address/
  - features/base/ → base-container/
  - features/data-view/ → data-sheet/, data-detail/, data-select-button/ (관련 파일 분배)
  - features/permission-table/ → permission-table/
  - features/shared-data/ → shared-data/
- core/는 범용 인프라만 잔류 (directives, pipes, plugins, utils, types, commons, 범용 providers)
- 이동된 파일의 내부 import 경로 업데이트
- index.ts export 경로 업데이트
- 기존 테스트 디렉토리를 새 구조에 맞춰 미러링 이동 + import 경로 업데이트
- core/ 테스트 중 소스가 core/ 밖으로 이동된 파일(print, theme, provideSdAngular)의 테스트도 재배치
- 기존 테스트가 모두 통과하도록 유지
- CLAUDE.md 아키텍처 섹션 업데이트

**경계:**

- 공개 API(index.ts export 이름/타입)는 변경하지 않음 — 내부 경로만 변경
- 파일 내용(로직, 타입, 시그니처)은 변경하지 않음 — 순수 파일 이동 + import 경로 업데이트
- 최종 폴더명은 구현 시점에 확정 (위 목록은 방향 제시)

- **설계 결정 (Feature 1.2 plan에서 확정):**

- D1: 테스트 디렉토리도 새 플랫 구조를 미러링하여 이동 (CLAUDE.md "테스트 디렉토리가 src 구조를 미러링" 관행 유지)
- D2: data-view 분배 — setupCloserWhenSingleSelectionChange, injectDataSheet*, useDataSheetFilterManager, sd-data-sheet.types.ts 모두 data-sheet/에 배치 (코드 의존관계 분석: sd-data-sheet.base.ts만 참조)

**근거:**

- 업계 표준: Angular Material, NG-ZORRO, PrimeNG, Spartan UI 모두 기능 단위 플랫 구조. 종류별 그룹핑(providers/, components/ 분리)은 어떤 라이브러리도 채택하지 않음
- 현재 3-layer(core/features/ui) 구조는 provider 배치 혼란을 유발하며, 기능별 관련 파일이 흩어져 있어 파악이 어려움

### Epic 2. Angular 내부 API 의존 관리

#### [x] Feature 2.1 mark() 함수 안전성 확보

**의존성:** 없음

**범위:**

- mark() 함수의 사용처 2곳 분석 완료 → 두 곳 모두 clone 기반으로 대체 가능
- mark() 함수에서 Angular 비공개 API 경로(clone=false) 제거, 항상 shallow copy로 동작하도록 단순화 (D1)
- clone 파라미터 제거, 시그니처: `mark(sig: WritableSignal<any>): void`
- 호출부 변경 불필요 (기존에 clone 파라미터 없이 호출 중)
- 테스트 적응 (clone 파라미터 관련 테스트 수정)

**경계:**

- mark() 함수의 공개 API(export)는 유지
- 동작 변경: mark() 호출 시 값 참조가 변경됨 (shallow copy). 기존에는 참조 불변이었으나, 컴포넌트 렌더링 결과는 동일

**근거:**

- DESIGN-001: mark.ts가 @angular/core/primitives/signals에서 비공개 API를 직접 import
- D1: 성능 영향 무시 가능 (사용자 인터랙션당 1회 호출, 10,000행 ~80KB/0.01ms, 2GB 저사양 장치 문제 없음)

### Epic 3. 컴포넌트 구조 개선

#### [x] Feature 3.1 대형 컴포넌트 로직 분할

**의존성:** Feature 1.2 (디렉토리 재배치 완료 후 파일 경로가 확정되어야 함)

**범위:**

- sd-modal.ts(617줄): 포커스 트랩 로직을 injectFocusTrap() composable로 추출, 드래그+리사이즈 로직을 injectDragResize() composable로 추출 (D2, D3)
- sd-tiptap-editor.ts(513줄): 툴바 포매팅 커맨드/상태 메서드를 useTiptapToolbar() composable로 추출 (D3)
- 추출된 함수는 해당 컴포넌트 기능 폴더에 co-locate

**경계:**

- 컴포넌트의 공개 API(selector, inputs, outputs)는 변경하지 않음
- 내부 로직 분할만 수행, 새로운 컴포넌트 생성은 하지 않음
- sd-sheet.ts는 범위에서 제외 (D1)

**근거:**

- STRUCT-001: 500줄 이상 컴포넌트 3개 (sd-modal 617줄, sd-sheet 585줄, sd-tiptap-editor 513줄)

- **설계 결정 (Feature 3.1 plan에서 확정):**

- D1: sd-sheet.ts 범위 제외 — 이미 10개 composable로 분해됨. 남은 클래스 로직 ~248줄은 thin event handler
- D2: sd-modal.ts의 drag + resize 함께 추출 — document-level mousemove/mouseup 핸들러를 공유하므로 분리 추출이 비합리적
- D3: composable 네이밍을 WBS의 setup*에서 inject*/use*로 변경 — 코드베이스 컨벤션: setup*은 void 반환 전용, 핸들러 반환은 inject* 패턴

### Epic 4. 코드 정리

#### [x] Feature 4.1 커맨드 플러그인 중복 제거

**의존성:** 없음

**범위:**

- 3개 커맨드 플러그인(sd-save-command-event.plugin.ts, sd-refresh-command-event.plugin.ts, sd-insert-command-event.plugin.ts)의 공통 모달 체크 로직(각 24-31줄)을 findTopOpenModalEl.ts에 shouldProcessCommandEvent() 헬퍼 함수로 추출
- 각 플러그인에서 추출된 헬퍼를 호출하도록 단순화

**경계:**

- 플러그인의 외부 동작은 변경하지 않음
- 새로운 export는 추가하지 않음 (내부 헬퍼)

**근거:**

- STRUCT-003: 3개 커맨드 플러그인의 24-31줄 범위에서 동일 로직 반복

#### [x] Feature 4.2 타입 re-export 정리

**의존성:** 없음

**범위:**

- sd-app-structure.types.ts에서 @simplysm/service-common의 AppStructureItem re-export를 제거
- index.ts에서 AppStructureItem의 export를 제거하거나 소스 패키지 직접 참조로 안내
- 소비 프로젝트에서 AppStructureItem을 @simplysm/angular 대신 @simplysm/service-common에서 import하도록 변경

**경계:**

- **파괴적 변경(Breaking Change):** @simplysm/angular에서 AppStructureItem을 import하던 소비 코드가 영향받음
- SdMenu, SdFlatMenu, SdPermission 등 로컬 파생 타입은 그대로 유지

**근거:**

- DESIGN-004: sd-app-structure.types.ts에서 외부 패키지 타입 re-export와 로컬 타입이 혼재

## 제외 사항

- **ARCH-001 (core→ui 의존 방향 역전)**: 거짓양성. provider가 component를 createComponent()로 생성하는 것은 Angular의 정상 패턴이며(SdModalProvider가 이미 그러함), 실제 문제는 파일 위치 불일치였음. Feature 1.1에서 파일 재배치로 해소
- **DESIGN-003 (Provider 서비스/렌더링 혼합)**: 거짓양성. overlay provider의 단일 책임은 "프로그래밍 방식 오버레이 관리"이며, 서비스 API와 렌더링은 그 책임의 두 측면. ARCH-001이 폐기되면 분리 근거 소멸
- **STRUCT-002 (UI 컴포넌트의 Provider 직접 주입)**: 거짓양성. sd-modal-select-button은 모달을 여는 것이 핵심 기능이므로 SdModalProvider 주입은 설계 의도. sd-state-preset도 동일. 기능 단위 구조에서 cross-feature 의존은 정상
- **DOM 유틸리티 서비스 추출**: 여러 파일에서 DOM 조작 패턴이 반복되나, 각 사용처의 맥락이 다르고 추상화 시 과도한 복잡성이 발생할 수 있어 제외 (Goal 미연결 — 유지보수성 향상 효과 불확실)
- **setupCloserWhenSingleSelectionChange + setupCumulateSelectedKeys 통합**: 유사 패턴이나 책임이 다르고 통합 시 인터페이스 복잡도가 증가하여 제외 (범위 초과)
- **injectViewType*/injectViewTitle* 통합**: 각 함수가 단일 책임을 가지며 통합 필요성이 낮아 제외 (범위 초과)
