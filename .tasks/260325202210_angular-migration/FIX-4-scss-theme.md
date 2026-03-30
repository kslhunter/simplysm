# Feature FIX-4 SCSS/Theme Issues

## 참조 자료

### 대상 파일

- SCSS 변수: `packages/angular/scss/commons/_variables.scss` (라이트 테마 + 공통 변수)
- 다크 테마: `packages/angular/scss/themes/_variables-dark.scss`
- 테이블: `packages/angular/scss/controls/_table.scss`
- 그리드: `packages/angular/scss/controls/_grid.scss`
- topbar: `packages/angular/src/ui/navigation/topbar/sd-topbar.control.ts`
- dropdown-popup: `packages/angular/src/ui/overlay/dropdown/sd-dropdown-popup.control.ts`
- dropdown: `packages/angular/src/ui/overlay/dropdown/sd-dropdown.control.ts`
- dock: `packages/angular/src/ui/layout/dock/sd-dock.control.ts`
- tiptap-editor: `packages/angular/src/ui/form/editor/sd-tiptap-editor.control.ts`
- toast: `packages/angular/src/ui/overlay/toast/sd-toast.control.ts`
- toast-container: `packages/angular/src/ui/overlay/toast/sd-toast-container.control.ts`
- label: `packages/angular/src/ui/visual/sd-label.control.ts`
- button: `packages/angular/src/ui/form/button/sd-button.control.ts`
- checkbox: `packages/angular/src/ui/form/checkbox/sd-checkbox.control.ts`
- sidebar: `packages/angular/src/ui/navigation/sidebar/sd-sidebar.control.ts`
- sidebar-container: `packages/angular/src/ui/navigation/sidebar/sd-sidebar-container.control.ts`
- global-error-handler: `packages/angular/src/core/plugins/sd-global-error-handler.plugin.ts`

### SCSS 단위 규칙

- rem/em만 허용, px는 border/outline 전용
- 1rem = 16px 기준 변환

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | CONSIST-003: primary=secondary 동일 색상 | 현행 유지 | 라이트/다크 테마 모두 동일하게 blue로 설정. 코드베이스 전체에서 primary와 secondary를 의미적으로 구분하여 사용 중(primary=강조/포커스, secondary=배경/비활성). 색상을 분리하면 기존 UI 의도가 깨질 수 있으므로 의도적 설계로 판단 |
| D2 | 다크 테마 trans-lightest 값 | rgba(255, 255, 255, 0.05) | 라이트 테마의 lightest=0.03에 대응. 다크 테마는 흰색 기반이므로 약간 높은 0.05가 시각적으로 동등 |
| D3 | table dark border-color | var(--border-color-default) | light=lighter, dark=default로 차등. 현재 둘 다 lighter로 동일한 것은 복사-붙여넣기 오류 |
| D4 | tiptap-editor px 값 중 color-swatch 20px, font-size 10px | rem 변환 | 20px=1.25rem, 10px=0.625rem. color-indicator height 2px, border-radius 2px, gap 1px/2px는 border/장식 요소이므로 px 유지 |
| D5 | dropdown-popup 300px 높이 제한 | 18.75rem 변환 | JS에서 직접 설정하는 maxHeight도 rem으로 통일 |
| D6 | breakpoint 변수화 | SCSS 변수로 _variables.scss에 정의 | 520px, 800px, 1024px, 1280px를 $breakpoint-* 변수로 관리. 단, TS 코드의 matchMedia에서는 SCSS 변수 참조 불가이므로 px 하드코딩 유지하되 주석으로 breakpoint 변수명 표기 |
| D7 | 다크 테마 미대응 rgba/color 하드코딩 | CSS 변수 치환 | rgba(0,0,0,0.1)→var(--trans-light), rgba(0,0,0,0.2)→var(--trans-default), rgba(0,0,0,0.3)→var(--trans-dark), color:white→var(--text-trans-rev-default). dropdown backdrop은 JS 인라인 스타일이므로 var(--busy-overlay-bg) 사용 |

## 요구명세

```gherkin
Feature: FIX-4 SCSS/Theme Issues

  Background:
    Given @simplysm/angular 패키지의 SCSS/테마 시스템이 존재한다

  Rule: 다크 테마에 trans-lightest CSS 변수가 정의되어야 한다 (SCSS-001)

    Scenario: 다크 테마에서 --trans-lightest 변수가 존재한다
      Given 다크 테마(_variables-dark.scss)의 trans 맵이 있다
      When SCSS를 컴파일한다
      Then --trans-lightest CSS 변수가 rgba(255, 255, 255, 0.05) 값으로 생성된다

    Scenario: sd-topbar-menu, sd-sidebar-menu, sd-sidebar-user가 다크 테마에서 정상 렌더링된다
      Given 다크 테마가 활성화되어 있다
      When var(--trans-lightest)를 사용하는 컴포넌트가 렌더링된다
      Then 해당 CSS 변수가 유효한 값으로 해석된다

  Rule: table SCSS의 border-color-dark이 border-color-light와 다른 값이어야 한다 (SCSS-002)

    Scenario: table 외곽 border와 내부 border가 구분된다
      Given _table.scss의 $border-color-light와 $border-color-dark이 정의되어 있다
      When SCSS를 컴파일한다
      Then $border-color-dark는 var(--border-color-default)이고 $border-color-light는 var(--theme-gray-lighter)이다

  Rule: topbar 스크롤바 스타일이 CSS 변수를 사용해야 한다 (CONSIST-002)

    Scenario: topbar 스크롤바가 다크 테마에서 적절히 표시된다
      Given sd-topbar.control.ts의 스크롤바 스타일이 있다
      When 다크 테마가 활성화된다
      Then 스크롤바 트랙은 var(--trans-light), thumb는 var(--trans-default)를 사용한다

  Rule: px 단위가 border/outline 외에서 사용되지 않아야 한다 (CONSIST-004)

    Scenario: dropdown-popup의 translateY, min-width가 rem 단위를 사용한다
      Given sd-dropdown-popup.control.ts의 스타일이 있다
      When SCSS를 검사한다
      Then translateY(-0.625rem), min-width: 7.5rem이다

    Scenario: dropdown-popup onResize의 maxHeight가 rem 단위를 사용한다
      Given sd-dropdown-popup.control.ts의 onResize 메서드가 있다
      When 높이 제한 로직을 검사한다
      Then 300 비교 및 "18.75rem" 설정을 사용한다

    Scenario: dock resize-bar의 width/height가 px을 사용한다
      Given sd-dock.control.ts의 resize-bar 스타일이 있다
      When SCSS를 검사한다
      Then width: 2px, height: 2px는 border 성격이므로 px 유지한다

    Scenario: tiptap-editor의 non-border px 값이 rem 단위로 변환된다
      Given sd-tiptap-editor.control.ts의 스타일이 있다
      When SCSS를 검사한다
      Then color-swatch는 1.25rem, font-size는 0.625rem, min-height는 6.25rem이다

    Scenario: toast max-width가 rem 단위를 사용한다
      Given sd-toast.control.ts의 스타일이 있다
      When SCSS를 검사한다
      Then max-width: 32.5rem이다

  Rule: 다크 테마 미대응 rgba/color 하드코딩이 CSS 변수로 대체되어야 한다 (CONSIST-008)

    Scenario: label의 color: white가 CSS 변수를 사용한다
      Given sd-label.control.ts의 스타일이 있다
      When SCSS를 검사한다
      Then color: var(--text-trans-rev-default)를 사용한다

    Scenario: button 테마별 color: white가 CSS 변수를 사용한다
      Given sd-button.control.ts의 테마별 스타일이 있다
      When SCSS를 검사한다
      Then color: var(--text-trans-rev-default)를 사용한다

    Scenario: checkbox의 color: white가 CSS 변수를 사용한다
      Given sd-checkbox.control.ts의 indicator 스타일이 있다
      When SCSS를 검사한다
      Then color: var(--text-trans-rev-default)를 사용한다

    Scenario: tiptap-editor의 color: white가 CSS 변수를 사용한다
      Given sd-tiptap-editor.control.ts의 active 버튼 스타일이 있다
      When SCSS를 검사한다
      Then color: var(--text-trans-rev-default)를 사용한다

    Scenario: dropdown backdrop의 rgba가 CSS 변수를 사용한다
      Given sd-dropdown.control.ts의 backdrop 인라인 스타일이 있다
      When JS 코드를 검사한다
      Then background: var(--busy-overlay-bg)를 사용한다

  Rule: 미디어 쿼리 breakpoint가 SCSS 변수로 관리되어야 한다 (CONSIST-009)

    Scenario: _variables.scss에 breakpoint 변수가 정의된다
      Given _variables.scss 파일이 있다
      When breakpoint 정의를 검사한다
      Then $breakpoint-mobile: 520px, $breakpoint-xxs: 800px, $breakpoint-xs: 1024px, $breakpoint-sm: 1280px이 정의되어 있다

    Scenario: grid SCSS가 breakpoint 변수를 참조한다
      Given _grid.scss 파일이 있다
      When 미디어 쿼리를 검사한다
      Then $breakpoint-sm, $breakpoint-xs, $breakpoint-xxs 변수를 사용한다

    Scenario: 컴포넌트 인라인 SCSS가 breakpoint 변수를 참조한다
      Given dropdown-popup, toast, toast-container, sidebar, sidebar-container의 스타일이 있다
      When 미디어 쿼리를 검사한다
      Then variables.$breakpoint-mobile 변수를 사용한다
```

## 구현계획

### 배경

@simplysm/angular의 SCSS/테마 시스템에서 발견된 7건의 이슈를 수정한다. 다크 테마 변수 누락, 복사-붙여넣기 오류, rgba/color 하드코딩, px 단위 비일관성, breakpoint 분산 하드코딩 등이 대상이다.

### 목표

- 다크 테마에서 --trans-lightest 변수 누락 해결
- table SCSS의 border-color 복사-붙여넣기 오류 수정
- 다크 테마 미대응 rgba/color 하드코딩을 CSS 변수로 치환
- border/outline 외 px 단위를 rem으로 변환
- breakpoint를 SCSS 변수로 중앙 관리

### 비목표

- primary/secondary 색상 분리 (D1: 현행 유지)
- TS 코드의 matchMedia 문자열 내 px 값 변환 (SCSS 변수 참조 불가)
- sd-global-error-handler의 rgba (런타임 에러 오버레이, 테마 시스템과 독립)
- tiptap-editor의 border 성격 px 값 (gap: 1px, 2px, border-radius: 2px, height: 2px 등)
- dock resize-bar의 2px (border 성격의 resize handle)

### 설계

#### SCSS-001: 다크 테마 trans-lightest 추가

`_variables-dark.scss`의 trans 맵에 `lightest: rgba(255, 255, 255, 0.05)` 추가. lighter(0.03)와 light(0.1) 사이에 위치.

#### SCSS-002: table border-color-dark 수정

`_table.scss`의 `$border-color-dark`를 `var(--border-color-default)`로 변경.

#### CONSIST-002: topbar 스크롤바 CSS 변수화

`sd-topbar.control.ts`의 scrollbar 스타일에서:
- `rgba(0, 0, 0, 0.1)` → `var(--trans-light)`
- `rgba(0, 0, 0, 0)` → `transparent`
- `rgba(0, 0, 0, 0.2)` → `var(--trans-default)`

#### CONSIST-004: px→rem 변환

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| sd-dropdown-popup (SCSS) | translateY(-10px) | translateY(-0.625rem) |
| sd-dropdown-popup (SCSS) | min-width: 120px | min-width: 7.5rem |
| sd-dropdown-popup (JS) | 300 / "300px" | 300 / "18.75rem" (비교는 px 기반 clientHeight이므로 300 유지, 설정값만 rem) |
| sd-tiptap-editor | width: 20px | width: 1.25rem |
| sd-tiptap-editor | height: 20px | height: 1.25rem |
| sd-tiptap-editor | font-size: 10px | font-size: 0.625rem |
| sd-tiptap-editor | min-height: 100px | min-height: 6.25rem |
| sd-toast | max-width: 520px | max-width: 32.5rem |

참고: dropdown-popup onResize의 `clientHeight > 300` 비교는 px 기반 DOM API이므로 300 유지. `el.style.height = "300px"` → `"18.75rem"`.

#### CONSIST-008: rgba/color 하드코딩 → CSS 변수

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| sd-topbar (scrollbar) | rgba(0,0,0,0.1/0.2) | var(--trans-light/default) (CONSIST-002와 통합) |
| sd-label | color: white | color: var(--text-trans-rev-default) |
| sd-button (theme별) | color: white | color: var(--text-trans-rev-default) |
| sd-checkbox (indicator) | color: white | color: var(--text-trans-rev-default) |
| sd-tiptap-editor (_active) | color: white | color: var(--text-trans-rev-default) |
| sd-tiptap-editor (_no-color) | background: white | background: var(--control-color) |
| sd-dropdown (backdrop) | rgba(0,0,0,0.3) | var(--busy-overlay-bg) |

#### CONSIST-009: breakpoint 변수 정의

`_variables.scss`에 SCSS 변수 추가 (CSS custom property가 아닌 SCSS `$` 변수, 미디어 쿼리에서 CSS custom property 사용 불가):

```scss
$breakpoint-mobile: 520px;
$breakpoint-xxs: 800px;
$breakpoint-xs: 1024px;
$breakpoint-sm: 1280px;
```

참조하는 파일들에서 하드코딩된 px 값을 변수로 교체. 단, TS 코드의 `window.matchMedia("(max-width: 520px)")`는 SCSS 변수 참조 불가이므로 주석만 추가.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| breakpoint를 CSS custom property로 | 미채택 | 미디어 쿼리에서 CSS custom property 사용 불가 (CSS 스펙 제한) |
| primary/secondary 색상 분리 | 미채택 (D1) | 의도적 설계로 판단 |
| dropdown backdrop에 별도 CSS 변수 신설 | 미채택 | 기존 --busy-overlay-bg가 동일한 용도 (반투명 오버레이) |
| tiptap color-swatch 크기를 CSS 변수화 | 미채택 | 단순 rem 변환으로 충분, 별도 변수는 과설계 |

### Vertical Slices

#### Slice 1: Critical SCSS 변수 수정 (SCSS-001, SCSS-002)
- [x] **구현 내용:** 다크 테마 trans-lightest 추가, table border-color-dark 수정
- **Scenarios:**
  - Scenario: 다크 테마에서 --trans-lightest 변수가 존재한다
  - Scenario: sd-topbar-menu, sd-sidebar-menu, sd-sidebar-user가 다크 테마에서 정상 렌더링된다
  - Scenario: table 외곽 border와 내부 border가 구분된다

#### Slice 2: topbar rgba + px 단위 변환 (CONSIST-002, CONSIST-004)
- [x] **구현 내용:** topbar scrollbar CSS 변수화, dropdown-popup/tiptap-editor/toast의 px→rem 변환
- **의존:** Slice 1 (trans 변수 존재 필요)
- **Scenarios:**
  - Scenario: topbar 스크롤바가 다크 테마에서 적절히 표시된다
  - Scenario: dropdown-popup의 translateY, min-width가 rem 단위를 사용한다
  - Scenario: dropdown-popup onResize의 maxHeight가 rem 단위를 사용한다
  - Scenario: dock resize-bar의 width/height가 px을 사용한다
  - Scenario: tiptap-editor의 non-border px 값이 rem 단위로 변환된다
  - Scenario: toast max-width가 rem 단위를 사용한다

#### Slice 3: Dark theme rgba/color + breakpoint 변수 (CONSIST-008, CONSIST-009)
- [x] **구현 내용:** rgba/color 하드코딩을 CSS 변수로 치환, breakpoint SCSS 변수 정의 및 적용
- **의존:** Slice 1
- **Scenarios:**
  - Scenario: label의 color: white가 CSS 변수를 사용한다
  - Scenario: button 테마별 color: white가 CSS 변수를 사용한다
  - Scenario: checkbox의 color: white가 CSS 변수를 사용한다
  - Scenario: tiptap-editor의 color: white가 CSS 변수를 사용한다
  - Scenario: dropdown backdrop의 rgba가 CSS 변수를 사용한다
  - Scenario: _variables.scss에 breakpoint 변수가 정의된다
  - Scenario: grid SCSS가 breakpoint 변수를 참조한다
  - Scenario: 컴포넌트 인라인 SCSS가 breakpoint 변수를 참조한다
