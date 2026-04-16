# WBS: Angular 패키지 v12→v14 마이그레이션 템플릿/스타일 복원

## 프로젝트 개요

- **배경:** `packages/angular`는 `D:\workspaces-12\simplysm\packages\sd-angular`를 v14로 마이그레이션한 것인데, 마이그레이션 과정에서 컴포넌트의 템플릿(HTML)과 스타일(CSS/SCSS)이 원본과 다르게 변경되거나 누락된 부분이 다수 발견됨. Angular API 전환(signal, booleanAttribute 등)에 따른 **올바른 개선**을 제외한, 기능·시각적 동작이 달라지는 **변경/누락** 64건을 복원해야 함.
- **환경:** pnpm 모노레포, Angular 21, TypeScript 5.9. `packages/angular/src/` 하위 약 60개 컴포넌트.
- **전제조건:** v12 원본(`D:\workspaces-12\simplysm\packages\sd-angular`)이 기준. v14 API 패턴(signal, computed, booleanAttribute 등)은 유지하면서 시각적·기능적 동작만 v12에 맞춤.
- **기술적 제약:**
  - v14의 Angular 21 API 패턴은 유지 (signal, computed, booleanAttribute, event plugin 등)
  - v12의 커스텀 유틸($signal, $computed, $effect, filterExists, findParent 등)로 되돌리지 않음
  - SCSS 경로(../../ → ../../../)는 v14 디렉토리 구조에 맞게 유지
  - `color: white` → `var(--text-trans-rev-default)` 변경은 의도적 개선으로 확인 완료 (복원 불필요)
  - `sd-progress` 방향 `right:0` → `left:0`은 의도적 수정으로 확인 완료 (복원 불필요)
- **참조 자료:**
  - v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\` (각 Feature별 비교 기준)
  - v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\` (수정 대상)

## Impact Mapping

- **Goal:** v14 마이그레이션 후에도 v12와 동일한 시각적·기능적 UI 동작을 100% 보장한다
  - **Actor:** simplysm 라이브러리를 사용하는 Angular 앱 개발자
    - **Impact:** 마이그레이션 후에도 기존 UI/UX가 그대로 유지되어 추가 수정 없이 앱을 운영한다
      - **Deliverable:** 변경/누락된 64건의 템플릿/스타일 복원

## Feature Breakdown

### Epic 1. 기본 컨트롤 복원

#### [x] Feature 1.1 sd-button / sd-modal-select-button 복원

**의존성:** 없음

**범위:**

- sd-button: link 테마의 `background: transparent` — 검토 완료, v14 유지 결정 (link-* 변형과의 일관성 개선)
- sd-modal-select-button: `sd-additional-button` 래퍼 제거로 인한 `width: 100%`, `min-width: 3em` 누락 복원
- sd-modal-select-button: search 버튼 click 핸들러에서 `$event` 전달 복원 (preventDefault/stopPropagation)

**경계:**

- sd-button의 ripple 셀렉터 변경(`sd-ripple` → `sdRipple`)은 v14 개선이므로 복원하지 않음
- sd-additional-button은 차이 없음

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\button\sd-button.control.ts` (link 테마 스타일)
- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\button\sd-modal-select-button.control.ts` (래퍼 구조, 이벤트 전달)
- v14: `packages/angular/src/controls/button/sd-button.ts`
- v14: `packages/angular/src/controls/button/sd-modal-select-button.ts`

---

#### [x] Feature 1.2 sd-collapse-icon 기본 아이콘 복원

**의존성:** 없음

**범위:**

- 기본 아이콘을 `tablerChevronRight` → `tablerChevronDown`으로 복원 (v12 기본값)

**경계:**

- transition 방식 변경(CSS → 인라인 style 바인딩)은 v14 개선이므로 유지
- `numberAttribute` transform 추가도 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\navigation\collapse\sd-collapse-icon.control.ts` (기본 아이콘 `tablerChevronDown`)
- v14: `packages/angular/src/controls/collapse/sd-collapse-icon.ts` (기본 아이콘 `tablerChevronRight`로 변경됨)

---

#### [x] Feature 1.3 sd-textfield 표시 로직 복원

**의존성:** 없음

**범위:**

- `controlValueText` 표시 로직 복원: v14의 `controlValueText() ?? controlValue()` 폴백을 v12의 `controlValueText() ? controlValueText() : " "` 동작으로 복원
- `data-sd-type` 바인딩: `controlType()` → `type()` 복원 (CSS 셀렉터 매칭 기준이 달라짐)

**경계:**

- `_contents` class 바인딩 방식 변경(filterExists → 삼항연산자)은 개선이므로 유지
- SCSS 경로 변경, 주석 정리는 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\input\sd-textfield.control.ts` (controlValueText 표시, data-sd-type 바인딩)
- v14: `packages/angular/src/controls/input/sd-textfield.ts`

---

### Epic 2. 리스트/선택 컨트롤 복원

#### [x] Feature 2.1 sd-list / sd-list-item 복원

**의존성:** Feature 1.2 (sd-collapse-icon — sd-list-item이 collapse-icon 사용)

**범위:**

- sd-list: `display: block` → `display: flex; flex-direction: column` 복원 (v12의 `flex-column` 클래스 동작)
- sd-list-item: gap `var(--gap-sm)` → `var(--gap-xs)` 복원
- sd-list-item: `align-items: center` 제거 (v12는 기본 stretch)
- sd-list-item: `sd-collapse-icon` 위치를 첫 번째 → 마지막으로 복원
- sd-list-item: `_label`의 `flex: 1` → `flex: 1 1 auto; overflow: auto` 복원 (flex-fill 완전 복원 — 설계 결정 D1)
- sd-list-item: hover 스타일 범위를 전역 → accordion 전용으로 복원
- sd-list-item: `data-sd-open` 호스트 속성 바인딩 복원
- sd-list-item: flat 레이아웃의 `font-size: 0.85em` → `var(--font-size-sm)`, `display: block` 복원
- sd-list-item: 모바일 테마 hover 투명화 스타일(`.sd-theme-mobile > sd-list-item`) 복원

**경계:**

- `setupRipple()` 함수 전환, `keydown.enter` 접근성 추가는 v14 개선이므로 유지
- `_tool` 클래스 추가, `display: block` 추가(호스트 기본 display)는 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\data\list\sd-list.control.ts`
- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\data\list\sd-list-item.control.ts`
- v14: `packages/angular/src/controls/list/sd-list.ts`
- v14: `packages/angular/src/controls/list/sd-list-item.ts`

---

#### [x] Feature 2.2 sd-select / sd-select-button / sd-select-item 복원

**의존성:** Feature 2.1 (sd-list — sd-select의 드롭다운 내부에서 사용)

**범위:**

- sd-select: placeholder 클래스 `tx-trans-lighter` → `sd-text-color-gray-default` 복원
- sd-select: multi 선택 vertical 시 구분자 `<br>` → `<div class='p-sm-0'>` + `<span style="display: inline">` 래핑 복원
- sd-select: `open` signal을 외부 양방향 바인딩 가능한 model로 복원
- sd-select-button: `display: inline-flex` → `display: block` 복원
- sd-select-button: 자체 padding/border-left 제거 (부모 sd-select CSS와 중복)
- sd-select-item: 템플릿 구조 복원 — tabindex/click/keydown를 `_content` div에서 호스트로 이동
- sd-select-item: `data-sd-select-mode` 호스트 속성 복원
- sd-select-item: hover/focus/selected 배경색 `var(--trans-lighter)` → `rgba(0,0,0,0.07)` 복원

**경계:**

- sd-select의 signal/computed 기반 innerHTML 관리, tabbable 라이브러리 사용은 v14 개선이므로 유지
- sd-select-item의 MutationObserver 방식 contentHTML 갱신은 개선이므로 유지
- sd-select-item의 disabled `cursor: default; pointer-events: none` 추가는 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\select\sd-select.control.ts`
- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\select\sd-select-button.control.ts`
- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\select\sd-select-item.control.ts`
- v14: `packages/angular/src/controls/select/sd-select.ts`
- v14: `packages/angular/src/controls/select/sd-select-button.ts`
- v14: `packages/angular/src/controls/select/sd-select-item.ts`

---

#### [x] Feature 2.3 sd-state-preset 복원

**의존성:** 없음

**범위:**

- host display: `block` → `inline-block; vertical-align: top` 복원
- star 아이콘 `tx-theme-warning-default` 클래스 복원
- 프리셋 아이템 스타일 복원: `background: var(--theme-gray-lightest)`, `border-radius: var(--border-radius-lg)`, `border: 1px solid transparent`, hover 효과(`background: var(--theme-gray-lighter)`)
- ng-icon `[size]="'1em'"` 바인딩 복원
- 프리셋 이름 앵커에 `tx-trans-default` 클래스 복원
- 사이즈별(sm/lg) padding을 v12 값으로 복원

**경계:**

- `<sd-gap>` → CSS gap 전환, flex 레이아웃 전환은 v14 개선이므로 유지 (단, 시각적 결과가 v12와 동일해야 함)
- delete 버튼의 `[theme]="'danger'"` 추가는 v14 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\choice\sd-state-preset.control.ts`
- v14: `packages/angular/src/data/state-preset/sd-state-preset.ts`

---

### Epic 3. 오버레이 컴포넌트 복원

#### [x] Feature 3.1 sd-dropdown-popup 높이 제한 복원

**의존성:** 없음

**범위:**

- popup 최대 높이 300px 고정 제한 로직 복원 (v12의 `onResize()` — `divEl.clientHeight > 300`이면 `el.style.height = "300px"`)

**경계:**

- keydown 이벤트 호스트 바인딩, CSS 단위 변경(px→rem), 모바일 bottom sheet 스타일, SCSS 변수 참조 등은 v14 개선이므로 유지
- v14의 sd-dropdown에서 maxHeight 계산이 추가되었으나, v12의 300px 고정 제한과 동작이 다름
- **설계 결정 D1:** v14의 maxHeight/maxWidth/overflow를 제거하고 v12의 300px 고정 제한을 sd-dropdown-popup에 복원 (v12 완전 복원 방식 선택)

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\overlay\dropdown\sd-dropdown-popup.control.ts` (onResize 300px 제한)
- v14: `packages/angular/src/controls/dropdown/sd-dropdown-popup.ts`

---

#### [x] Feature 3.2 sd-busy-container 복원

**의존성:** 없음

**범위:**

- `overflow: auto` 복원
- `position: relative; top: 0; left: 0` 복원
- opacity 페이드 트랜지션 복원 (즉시 나타남/사라짐 → 부드러운 페이드인/아웃)
- `._screen` 배경색 제거 (v12에는 없었음, v14에서 `var(--busy-overlay-bg)` 추가 → 제거하기로 결정 [D2])
- spinner 타입: v12의 `translateY(-100%)` 슬라이드 인, 6px border 스피너, box-shadow, 메시지 위치/색상/text-shadow 복원
- bar 타입: v12의 `::before`/`::after` 2개 레이어 scaleX 애니메이션 복원
- cube 타입: v12의 `rotateZ(45deg)` + 4개 div `perspective rotateX/Y` 3D 플립 애니메이션 복원
- `._progress` 위치: `._rect` 내부(v14) → `._screen` 직접 자식(v12, 화면 상단 가로 바), `transform: scaleX()` 방식 복원
- `._message` 스타일: type별 다른 위치/색상/text-shadow, `<pre>` 태그 래핑 복원

**경계:**

- `@switch` 조건부 렌더링(type별 전용 마크업)은 v14 패턴이므로 유지 가능 (단 각 type의 마크업 내용은 v12 기준)
- `data-sd-busy` 속성 `|| undefined` 패턴은 v14 개선이므로 유지
- keydown capture 방식(host 바인딩 → addEventListener)은 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\overlay\busy\sd-busy-container.control.ts`
- v14: `packages/angular/src/core/busy/sd-busy-container.ts`

---

#### [x] Feature 3.3 sd-modal 복원

**의존성:** 없음

**범위:**

- `._title` 태그: `<span>` → `<h5>` 복원
- 닫기 버튼: `<button>` → `<sd-anchor [theme]="'gray'">`로 복원
- backdrop 이벤트: `mousedown` → `click` 복원
- ~~dialog tabindex: `-1` → `0` 복원~~ → 제외 (D4: 포커스 트랩과 함께 도입된 의도적 변경)
- `(sdResize)` 이벤트 기반 자동 maxHeight/maxWidth 조정 로직 복원
- `(window:resize)` 핸들러 복원 (dialog 뷰포트 이탈 방지) — 설계 결정 D1

**경계:**

- `._dialog`의 `display: flex; flex-direction: column` 직접 적용(래퍼 div 제거)은 v14 개선이므로 유지
- `._content { flex: 1; overflow: auto; }` 명시적 스타일은 개선이므로 유지
- `@if as` 구문, resize-handle 공통 클래스, `|| undefined` 패턴은 개선이므로 유지
- 포커스 트랩(keydown에서 Tab 처리)은 v14 개선이므로 유지
- `movable` 기본값은 v14(false) 유지 — 설계 결정 D2
- `useCloseByBackdrop` 기본값은 v14(true) 유지 — 설계 결정 D3

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\overlay\modal\sd-modal.control.ts`
- v14: `packages/angular/src/core/modal/sd-modal.ts`

---

#### [x] Feature 3.4 sd-toast / sd-toast-container 복원

**의존성:** 없음

**범위:**

- sd-toast: message/ng-content 배치를 v12 방식으로 복원 (둘 중 하나만 표시, `@if/@else`). `_sd-toast-message` 래퍼가 항상 존재하도록 복원
- sd-toast: 내부 클래스명 `_*` → `_sd-toast-*` 복원 (외부 CSS 의존성 방지)
- sd-toast-container: template `<ng-content />` → `""` 복원
- 기존 테스트 파일의 DOM 셀렉터 업데이트 (`._message` → `._sd-toast-message`, `._progress-bar` → `._sd-toast-progress-bar`)

**경계:**

- sd-toast의 `word-break: break-all; white-space: pre-wrap` 추가, ARIA 속성, SCSS 변수 참조 등은 v14 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\overlay\toast\sd-toast.control.ts`
- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\overlay\toast\sd-toast-container.control.ts`
- v14: `packages/angular/src/core/toast/sd-toast.ts`
- v14: `packages/angular/src/core/toast/sd-toast-container.ts`
- v14 테스트: `packages/angular/tests/core/toast/toast-control.spec.ts`, `toast-provider.spec.ts`, `toast-custom-try.spec.ts`

---

### Epic 4. 데이터 테이블 복원

#### [x] Feature 4.1 sd-sheet 복원

**의존성:** 없음

**범위:**

- 헤더/바디 `data-c`, `data-r` 속성 복원 (DOM 조회에 필요)
- feature-cell `(sdResize)` 이벤트 복원 (column fixing width 등록)
- 전체선택 체크박스: `hasSelectable()` 가드 복원
- 헤더/바디 체크박스: `[theme]="'white'"` 복원
- 전체선택/멀티선택 체크박스: `(valueChange)` 이벤트 복원 (`(click)` → `(valueChange)`)
- 멀티 선택 체크박스: `[disabled]` 바인딩 복원 (`_selectable !== true` 시 disabled)
- 싱글 선택: `canChangeFn` 가드 조건 복원
- 싱글 선택: `(pointerdown)` 이벤트 복원 (`(click)` → `(pointerdown)`)
- 싱글 선택: `[attr.title]="_selectable"` 복원
- 정렬 아이콘: desc 비교를 `=== false` / `=== true` 명시적 비교로 복원
- trackByFn 기본값: `undefined`(index 추적) → `(item) => item`(객체 추적) 복원
- feature-cell td의 `[style.left.px]` 고정 위치 복원

**경계:**

- tbody tr `(click)="onRowClick(item)"` 추가는 v14 개선이므로 유지
- `(dblclick)` 호스트 위임, `onCellKeydown` 메서드 추출은 개선이므로 유지
- signal 기반 resize-indicator, colspan/rowspan 1일 때 null 처리는 개선이므로 유지
- `bordser-right` → `border-right` 오타 수정은 개선이므로 유지
- `useSheetColumnFixing` composable은 data column 전용으로 유지, feature cell fixing은 컴포넌트 내 별도 signal로 구현
- `hasSelectable()` 가드는 v14에서 `selectMode() != null`로 정의되어 논리적 중복이나, 템플릿 parity를 위해 복원

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\data\sheet\sd-sheet.control.ts`
- v14: `packages/angular/src/data/sheet/sd-sheet.ts`

---

#### [x] Feature 4.2 sd-sheet-config-modal 복원

**의존성:** Feature 4.1 (sd-sheet — 설정 모달이 sd-sheet에서 사용)

**범위:**

- 버튼 `[buttonStyle]="'min-width: 60px;'"` 복원 (Reset, OK, Cancel 3개 버튼)
- ~~Reset 버튼 `[inline]="true"` 복원~~ → v14에 이미 존재 (line 153), 복원 불필요

**경계:**

- `$signal` → `signal`, 배열 메서드 표준화, 정렬 방식 변경 등은 v14 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\data\sheet\sd-sheet-config.modal.ts`
- v14: `packages/angular/src/data/sheet/sd-sheet-config.modal.ts`

---

#### [x] Feature 4.3 sd-data-sheet / sd-data-detail 복원

**의존성:** Feature 4.1 (sd-sheet — sd-data-sheet이 sd-sheet 기반)

**범위:**

- sd-data-sheet: isDeleted 컬럼의 `#headerTpl` (삭제 아이콘 헤더) 복원
- sd-data-detail: `modalActionTpl`을 `@if (parent.canEdit()) { }` 블록 안으로 이동 복원

**경계:**

- 아이콘 객체화, `(formSubmit)` 이벤트명, `let-item="item"` 명시적 바인딩, non-null assertion은 v14 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\features\data-view\sd-data-sheet.control.ts` (isDeleted headerTpl)
- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\features\data-view\sd-data-detail.control.ts` (modalActionTpl 위치)
- v14: `packages/angular/src/data/data-sheet/sd-data-sheet.ts`
- v14: `packages/angular/src/data/data-detail/sd-data-detail.ts`

---

#### [x] Feature 4.4 sd-permission-table 복원

**의존성:** Feature 1.2 (sd-collapse-icon)

**범위:**

- `sd-collapse-icon`의 `[open]` 값 논리 복원: `!getIsPermCollapsed(item)` → `getIsPermCollapsed(item)` (v12 기준)

**경계:**

- `[icon]` prop 생략(기본값이 동일)은 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\features\permission-table\sd-permission-table.control.ts` (open=getIsPermCollapsed)
- v14: `packages/angular/src/data/permission-table/sd-permission-table.ts` (open=!getIsPermCollapsed)

---

#### [x] Feature 4.5 sd-shared-data-select 복원

**의존성:** Feature 2.2 (sd-select — sd-shared-data-select이 sd-select 사용)

**범위:**

- `[trackByFn]` 바인딩 복원 (sd-select에 trackByFn 전달)
- sd-select에 `trackByFn` input 추가 (Feature 2.2에서 누락된 항목 — `sd-sheet.ts:561`에 동일 패턴 존재)

**경계:**

- value 바인딩 방식, open 상태 관리 방식의 signal 전환은 v14 개선이므로 유지
- sd-select의 `_flatItems` 래퍼 구조는 v14 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\features\shared-data\sd-shared-data-select.control.ts`
- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\select\sd-select.control.ts` (trackByFn input: line 299)
- v14: `packages/angular/src/data/shared-data/sd-shared-data-select.ts`
- v14: `packages/angular/src/controls/select/sd-select.ts` (trackByFn 누락 확인)
- v14 참고: `packages/angular/src/data/sheet/sd-sheet.ts:561` (동일 패턴)

---

### Epic 5. 레이아웃/내비게이션 복원

#### [x] Feature 5.1 sd-sidebar-container 복원

**의존성:** 없음

**범위:**

- backdrop 이벤트: `(mousedown)` → `(click)` 복원
- backdrop 클릭 동작: `set(false)` → `update((v) => !v)` 복원

**경계:**

- SCSS 변수 참조, `<ng-content />` self-closing 등은 v14 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\navigation\sidebar\sd-sidebar-container.control.ts`
- v14: `packages/angular/src/layout/sidebar/sd-sidebar-container.ts`

---

#### [x] Feature 5.2 sd-topbar-menu 복원

**의존성:** Feature 2.1 (sd-list — sd-topbar-menu가 sd-list 사용)

**범위:**

- 중첩 리스트 배경색 스타일 복원: `sd-topbar-menu { sd-list sd-list { background: var(--trans-lightest); } }`
- `[layout]="'flat'"` 복원 (`[open]="true"` → `[layout]="'flat'"`)

**경계:**

- viewChildren 방식, $index 활용, children 없는 단일 메뉴 처리 개선, sdRouterLink 셀렉터 변경은 v14 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\navigation\topbar\sd-topbar-menu.control.ts`
- v14: `packages/angular/src/layout/topbar/sd-topbar-menu.ts`

---

#### [x] Feature 5.3 sd-kanban 복원 — 복원 불필요 확정

**의존성:** 없음

**범위:** 전체 범위가 의도적 변경으로 확인되어 복원 불필요

- ~~`<div class="card">` → `<sd-card>` 디렉티브 복원~~ → **의도적 변경**: `SdCardDirective`를 제거하고 `.card` CSS 유틸리티 클래스를 직접 사용하도록 의도적으로 변경함
- ~~CSS 셀렉터 `> .card` → `> sd-card` 복원~~ → 위 변경에 종속
- ~~imports에 `SdCardDirective` 추가 복원~~ → 위 변경에 종속

**경계:**

- `thisRef` 패턴, mixin import 정리 등은 v14 개선이므로 유지

**근거:**

- v12: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\layout\kanban\sd-kanban.control.ts`
- v14: `packages/angular/src/data/kanban/sd-kanban.ts`
- 사용자 확인 (2026-04-14): "card 클래스만 쓰기로 한건, 의도적인 변경"

## 제외 사항

- **Angular API 전환에 따른 개선**: signal, computed, booleanAttribute, event plugin, `|| undefined` 패턴, `<ng-content />` self-closing 등 — v14 API 전환의 올바른 적용이므로 복원 대상 아님
- **SCSS 경로 변경**: v14 디렉토리 구조에 맞는 경로(`../../../scss/`)이므로 복원 대상 아님
- **`color: white` → `var(--text-trans-rev-default)`**: 사용자 확인으로 의도적 개선 확정 (4개 컴포넌트)
- **`sd-progress` 방향 `right:0` → `left:0`**: 사용자 확인으로 의도적 수정 확정
- **커스텀 유틸 → 표준 API**: `$signal`→`signal`, `$computed`→`computed`, `filterExists`→`filter`, `findParent`→`contains` 등 — 표준 API 전환이므로 복원 대상 아님
- **주석 정리**: 미사용 import, 주석 처리된 코드 제거 — 정리이므로 복원 대상 아님
- **sd-kanban `SdCardDirective` → `.card` CSS 클래스**: 사용자 확인으로 의도적 변경 확정 — `<sd-card>` 디렉티브 대신 `<div class="card">` 직접 사용
- **v12에만 존재하고 v14에 대응 없는 컴포넌트**: sd-tabview, sd-tabview-item, sd-view, sd-view-item, sd-flex, sd-grid 등 — 마이그레이션 범위 밖이므로 이 WBS에서 다루지 않음 (별도 검토 필요 시 사유: 해당 컴포넌트 존재 여부 자체가 별도 결정사항)
