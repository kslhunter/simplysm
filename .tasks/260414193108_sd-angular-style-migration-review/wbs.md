# WBS: sd-angular v12 → v14 스타일 마이그레이션 검토 및 복원

## 프로젝트 개요

- **배경:** v12(`packages/sd-angular`) → v14(`packages/angular`) 마이그레이션 과정에서 컴포넌트 스타일이 누락되거나 의도치 않게 변경된 부분이 다수 발견됨. 특히 sd-select 계열에서 search icon 표시 이상 등 시각적 퇴행이 확인됨.
- **환경:** simplysm pnpm 모노레포, Angular 21, TypeScript 5.9
- **전제조건:** v12 소스(`D:\workspaces-12\simplysm\packages\sd-angular`)를 참조 기준으로 사용
- **기술적 제약:** v14에서 도입된 의도적 개선(rem 단위, @layer, CSS 변수화 등)은 유지하면서, 누락된 스타일만 복원
- **참조 자료:**
  - v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\` — 스타일 복원 기준
  - v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\` — 수정 대상

## Impact Mapping

- **Goal:** v14 UI 품질을 v12 수준으로 복원하여 사용자 경험 퇴행 0건 달성
  - **Actor:** 엔드유저 (프론트엔드 사용자)
    - **Impact:** 셀렉트 박스, 리스트, 오버레이 등 UI 요소가 v12와 동일한 시각적 피드백을 제공함
      - **Deliverable:** sd-select 계열 스타일 복원
      - **Deliverable:** 기타 컴포넌트 스타일 복원
  - **Actor:** 프론트엔드 개발자
    - **Impact:** v14 패키지 사용 시 v12 대비 스타일 누락을 별도 보정할 필요 없음
      - **Deliverable:** sd-select 계열 스타일 복원
      - **Deliverable:** 기타 컴포넌트 스타일 복원

## 전체 분석 결과 요약

v12와 v14의 전체 컴포넌트(약 60개) + SCSS 글로벌 파일(5개)을 비교한 결과:

### 의도적 개선 (복원 불필요)

아래는 v14에서 의도적으로 변경된 사항으로 복원 대상이 아님:

- **단위 변환**: px → rem (font-size, gap, elevation-size 등) — 반응형 디자인 개선
- **@layer 도입**: base, theme-variant, utilities — CSS 캐스케이드 제어
- **CSS 변수화**: `white` → `var(--text-trans-rev-default)` (SdButton, SdCheckbox, SdLabel, SdToast) — 다크모드 지원
- **SCSS 변수**: 하드코딩 `520px` → `variables.$breakpoint-mobile` — 유지보수성
- **테마 축소**: mobile, kiosk 테마 제거 → dark 테마만 유지
- **코드 정리**: 주석 제거, 미사용 import 제거, 클래스명 단순화
- **구조 개선**: SdCollapse/SdCollapseIcon transition을 component logic으로 이동
- **모바일 지원 강화**: SdDropdownPopup에 bottom sheet 모드 추가
- **SdBusyContainer**: 완전 재설계 (flexbox 중앙 정렬, 새 애니메이션)
- **SdModal**: 구조 단순화 (resize handle 통합, data 속성 선택자 간소화)
- **SdStatePreset**: 마크업 구조 개선에 따른 SCSS 재구성

### 스타일 퇴행 (복원 필요) — Feature 대상

차이가 없는 컴포넌트: SdTextfield, SdTextarea, SdNumpad, SdForm, SdGap, SdPagination, SdTabItem, SdDockContainer, SdDock, SdSidebarUser, SdTopbarUser, SdBaseContainer, SdSheet, SdSheetConfigModal, SdKanbanBoard, SdKanbanLane, SdDataSheet, SdDataDetail, SdDataSelectButton, SdPermissionTable, SdSharedDataSelectButton, SdSharedDataSelectList, SdBarcode, SdEcharts, SdCalendar, SdThemeSelector, SdSwitch, SdCheckboxGroup, SdCheckboxGroupItem, SdAdditionalButton

## Feature Breakdown

### Epic 1. sd-select 계열 스타일 복원

#### [x] Feature 1.1 sd-select 메인 컴포넌트 스타일 복원

**의존성:** 없음

**범위:**

v14(`packages/angular/src/controls/select/sd-select.ts:98-174`)에서 v12(`packages/sd-angular/src/ui/form/select/sd-select.control.ts:143-280`) 대비 누락/변경된 스타일 복원:

- 루트 `width: 100%; min-width: 10em` 복원
- `> sd-dropdown`에 `display: flex; overflow: hidden` 복원
- border/border-radius/background를 `> sd-dropdown`으로 복원 (현재 `._sd-select-control`에 위치)
- focus 색상 `--theme-primary-default` 복원 (현재 `--theme-secondary-default`)
- `._sd-select-control`에 `gap: var(--gap-default)` 복원 (현재 margin-left만)
- icon hover/focus/active 시 `opacity: 1` 효과 복원
- `> sd-select-button` 스타일 복원 (padding, border-left, border-radius)
- disabled 배경 `--theme-gray-lightest` 복원 (현재 `--trans-lighter`)
- disabled 텍스트색 `color: var(--text-trans-light)` 복원
- inline에 `vertical-align: top` 복원
- size sm/lg에서 gap 설정 복원 (`gap: var(--gap-sm)` / `gap: var(--gap-lg)`)
- size sm/lg에서 sd-select-button padding 복원
- inset 모드 전체 스타일 복원 (min-width: auto, sd-dropdown border/radius 제거, sd-select-button border-radius: 0, focus outline-offset: -1px, disabled 별도 처리)

**경계:**

- `@include mixins.form-control-base()` 사용은 v14 개선사항이므로 유지
- `text-overflow: ellipsis` 추가는 v14 개선사항이므로 유지
- `align-items: center` 추가는 v14 개선사항이므로 유지

**근거:**

- v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\select\sd-select.control.ts:143-280`
- v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\controls\select\sd-select.ts:98-174`
- 사용자 보고: search icon 표시 이상 (sd-shared-data-select에서 확인)

---

#### [x] Feature 1.2 sd-select-button 스타일 복원

**의존성:** Feature 1.1 (sd-select 부모 스타일이 버튼 레이아웃에 영향)

**범위:**

v14(`packages/angular/src/controls/select/sd-select-button.ts:18-33`)에서 v12(`packages/sd-angular/src/ui/form/select/sd-select-button.control.ts:11-28`) 대비 누락/변경된 스타일 복원:

- `background: var(--control-color)` 기본 배경 복원
- `font-weight: bold; color: var(--theme-primary-default)` 복원 — **search icon 문제의 직접 원인**
- `transition: background 0.1s linear` 복원
- hover 시 `color: var(--theme-primary-darker); background: var(--theme-gray-lightest)` 복원

**경계:**

- v14에서 `display: inline-flex; align-items: center; justify-content: center` 변경은 유지 (v12의 `display: block`보다 아이콘 정렬에 유리)
- v14에서 추가된 `position: relative; overflow: hidden` (ripple 효과용)은 유지

**근거:**

- v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\select\sd-select-button.control.ts:11-28`
- v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\controls\select\sd-select-button.ts:18-33`
- 사용자 보고: search icon이 이상하게 보임 → color/font-weight 누락이 원인
- Feature 문서: `1.2-sd-select-button-style-restoration.md`

---

#### [x] Feature 1.3 sd-select-item 스타일 복원

**의존성:** 없음

**범위:**

v14(`packages/angular/src/controls/select/sd-select-item.ts:35-72`)에서 v12(`packages/sd-angular/src/ui/form/select/sd-select-item.control.ts:45-82`) 대비 누락된 스타일 복원:

- `background: var(--control-color)` 기본 배경 복원
- `transition: background 0.1s ease-in/ease-out` 복원
- selected 상태에서 `color: var(--theme-primary-default)` 텍스트색 복원
- disabled 상태에서 `background: var(--theme-gray-default)` 복원

**경계:**

- v14의 구조 변경 (`> ._content` 자식 요소 기반)은 유지 — template 구조와 일치해야 함
- hover/focus에서 `rgba(0,0,0,0.07)` → `var(--trans-lighter)` 변경은 유지 (CSS 변수 사용이 더 적절)
- v14에서 추가된 `pointer-events: none` (disabled)은 유지

**근거:**

- v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\form\select\sd-select-item.control.ts:45-82`
- v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\controls\select\sd-select-item.ts:35-72`

---

#### [x] Feature 1.4 sd-shared-data-select "미지정" 옵션 스타일 복원

**의존성:** Feature 1.3 (sd-select-item 스타일이 기준)

**범위:**

v14(`packages/angular/src/data/shared-data/sd-shared-data-select.ts:96-109`)에서 "미지정" 옵션이 `<sd-select-item>` 대신 자체 `<div>` 사용으로 변경되어 아이템 스타일(padding, cursor, hover 효과)이 미적용됨:

- `._sd-shared-data-select-undefined` div에 sd-select-item과 동일한 패딩/커서/hover 스타일 적용, 또는 v12처럼 `<sd-select-item>`으로 복원

**경계:**

- sd-shared-data-select의 검색, 모달, 트리 구조 등 기능 로직은 변경하지 않음

**설계 결정:** D1 — div에 스타일 추가 방식 선택 (SdSelectItem.value가 required이므로 sd-select-item 복원 불가)

**범위 외 발견:** v12에서 `<sd-select-item>` 클릭 시 `selectItem()` → 드롭다운 자동 닫기(single mode). v14의 `onUndefinedClick()`은 value만 설정하고 드롭다운 미닫기. 기능적 차이이므로 스타일 복원 범위 밖.

**근거:**

- v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\features\shared-data\sd-shared-data-select.control.ts:88-95` — `<sd-select-item>` 사용
- v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\data\shared-data\sd-shared-data-select.ts:96-109` — `<div class="_sd-shared-data-select-undefined">` 사용
- Feature 문서: `1.4-sd-shared-data-select-undefined-option-style.md`

---

### Epic 2. 기타 컴포넌트 스타일 검증

#### [x] Feature 2.1 sd-list-item 스타일 검증

**의존성:** 없음

**범위:**

v14(`packages/angular/src/controls/list/sd-list-item.ts`)에서 v12(`packages/sd-angular/src/ui/data/list/sd-list-item.control.ts`) 대비 구조적 변경 확인:

- v12: accordion/flat/selected/mobile 등 복잡한 layout별 조건부 스타일
- v14: flex layout 기반으로 단순화, `._label`/`._tool` 구조 추가, 모바일 구분 제거
- ~~`selected-icon` 모드에서의 `color: var(--text-trans-default)` + hover 효과 누락 여부 확인~~ → **누락 확인됨, 복원 대상** (host 속성 `data-sd-has-selected-icon` 바인딩도 함께 누락)
- ~~accordion layout의 `> ._child > ._content > sd-list { padding: var(--gap-xs) 0; }` 누락 여부 확인~~ → **누락 확인됨, 복원 대상** (v14 선택자: `> sd-collapse > ._content > sd-list`)
- ~~`.sd-theme-mobile` hover 투명 처리 제거가 의도적인지 확인~~ → **의도적 제거 확인 (WBS "의도적 개선" 테마 축소), 비복원**
- **[추가 발견]** flat 레이아웃 dimmed 스타일 범위 변경: v12는 `[data-sd-has-children="true"]` 조건 있었으나 v14에서 제거됨 → **v12 동작 복원 (D1)**

**경계:**

- sd-list-item의 flex 구조화 자체는 v14 개선사항으로 유지
- v14에서 추가된 `gap: var(--gap-sm)` (._content)은 유지

**설계 결정:** D1 — flat dimmed 스타일을 `[data-sd-has-children="true"]`로 제한 복원 (v12 호환성·의미적 정합성 우선)

**근거:**

- v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\data\list\sd-list-item.control.ts`
- v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\controls\list\sd-list-item.ts`
- Feature 문서: `2.1-sd-list-item-style-verification.md`

---

#### [x] Feature 2.2 sd-topbar min-height 복원

**의존성:** 없음

**범위:**

v14(`packages/angular/src/layout/topbar/sd-topbar.ts`)에서 v12 대비 변경 확인:

- `min-height: var(--topbar-height)` → `height: var(--topbar-height)` 변경 — 콘텐츠가 높이를 초과할 경우 잘림 발생 가능. `min-height`로 복원 필요 여부 확인

**경계:**

- scrollbar 색상 변수화(`rgba` → `var()`)는 v14 개선사항이므로 유지

**근거:**

- v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\navigation\topbar\sd-topbar.control.ts`
- v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\layout\topbar\sd-topbar.ts`

---

#### [x] Feature 2.3 sd-topbar-menu 선택자 검증

**의존성:** 없음

**범위:**

v14에서 더 구체적인 선택자로 변경됨 확인:

- v12: `sd-list sd-list { background: ... }`
- v14: `sd-dropdown-popup { sd-list[data-sd-inset="true"] { sd-list { background: ... } } }`
- 실제 렌더링 시 중첩 리스트의 배경색이 정상 적용되는지 검증

**경계:**

- 선택자 구체화 자체가 문제가 아닌 경우 수정 불필요

**근거:**

- v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\navigation\topbar\sd-topbar-menu.control.ts`
- v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\layout\topbar\sd-topbar-menu.ts`

---

#### [x] Feature 2.4 sd-progress position 검증

**의존성:** 없음

**범위:**

v14에서 progress bar의 위치 기준 변경:

- v12: `._progress { position: absolute; top: 0; right: 0; }` — 오른쪽에서 왼쪽으로 채워짐
- v14: `._progress { position: absolute; top: 0; left: 0; }` — 왼쪽에서 오른쪽으로 채워짐
- width 계산 로직과 일치하는지 확인 (v12에서 right 기준이면 width와 방향이 반대)

**검증 결과:** v14의 `left: 0`은 표준 LTR progress bar 관행에 부합하는 의도적 개선. **코드 변경 불필요.** ([2.4-sd-progress-position-verification.md](./2.4-sd-progress-position-verification.md))

**경계:**

- 의도적 변경인 경우 유지

**근거:**

- v12 원본: `D:\workspaces-12\simplysm\packages\sd-angular\src\ui\visual\sd-progress.control.ts`
- v14 대상: `D:\workspaces-14\simplysm\packages\angular\src\features\visual\sd-progress.ts`

## 제외 사항

- **의도적 개선 사항**: rem 단위 변환, @layer 도입, CSS 변수화(`white` → `var(--text-trans-rev-default)`), SCSS 변수 breakpoint, 테마 축소(mobile/kiosk 제거), SdBusyContainer 재설계, SdModal 구조 개선, SdStatePreset 마크업 재구성, SdCollapse transition 로직 이동, SdDropdownPopup 모바일 강화 — 사유: v14 설계 의도에 따른 개선
- **코드 정리**: 주석 제거, 미사용 import 정리, 클래스명 단순화 — 사유: 유지보수성 개선
- **SCSS 글로벌 변경**: _variables.scss, _mixins.scss, _styles.scss, _theme-variables.scss의 구조적 변경 — 사유: 의도적 아키텍처 개선
