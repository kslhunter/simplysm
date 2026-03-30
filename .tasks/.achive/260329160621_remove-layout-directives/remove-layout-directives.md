# Feature 레이아웃 directive 전체 제거

## 참조 자료

### 배경

scss-side-effect-import WBS(`.tasks/260328214817_scss-side-effect-import/wbs.md`)의 Epic 2 "Attribute Selector 기반 SCSS 전환"을 검토한 결과, directive의 host class에서 attribute selector로 전환하면 다른 컴포넌트의 `host: { class: "flex-row" }` 등이 깨지는 문제가 확인되었다. directive 자체가 불필요한 추상화로 판단하여 Epic 2를 취소하고, layout directive를 전체 제거하기로 결정.

### 대상 directive (9개)

| Directive | 파일 | selector | host 설정 |
|-----------|------|----------|-----------|
| SdCardDirective | src/ui/layout/sd-card.directive.ts | `sd-card,[sd-card]` | `class: "card"` |
| SdFlexDirective | src/ui/layout/flex/sd-flex.directive.ts | `sd-flex,[sd-flex]` | `[class]: clazz()` (vertical, inline input) |
| SdFlexGrowDirective | src/ui/layout/flex/sd-flex-grow.directive.ts | `[sd-flex-grow]` | `[class]: clazz()` (grow input: auto/fill/min) |
| SdFormBoxDirective | src/ui/layout/form/sd-form-box.directive.ts | `sd-form-box,[sd-form-box]` | `[class]: clazz()` (inline input) |
| SdFormBoxItemDirective | src/ui/layout/form/sd-form-box-item.directive.ts | `sd-form-box-item,[sd-form-box-item]` | `class: "form-box-item"` |
| SdFormTableDirective | src/ui/layout/form/sd-form-table.directive.ts | `sd-form-table,[sd-form-table]` | `class: "form-table"`, `[style.display]: "'table'"` |
| SdGridDirective | src/ui/layout/grid/sd-grid.directive.ts | `sd-grid,[sd-grid]` | `class: "grid"` |
| SdGridItemDirective | src/ui/layout/grid/sd-grid-item.directive.ts | `sd-grid-item,[sd-grid-item]` | `[class]: clazz()` (colSpan, colSpanSm, colSpanXs, colSpanXxs) |
| SdTableDirective | src/ui/layout/sd-table.directive.ts | `sd-table,[sd-table]` | `class: "table"`, `[style.display]: "'table'"` |

### 패키지 내부 사용 현황

9개 모두 패키지 내부(packages/angular/src/)에서 다른 컴포넌트/directive에 의해 참조되지 않음. barrel export(index.ts lines 66-78)로만 외부 노출.

### inline style → SCSS 이전 대상

SdFormTableDirective와 SdTableDirective가 host에서 `[style.display]: "'table'"`을 설정하지만, 대응 SCSS 파일(`_form-table.scss`, `_table.scss`)에는 `display` 속성이 없음. directive 삭제 시 SCSS에 `display: table` 추가 필요.

### 참조 파일

- `packages/angular/src/index.ts` — barrel export (lines 66-78에 9개 directive export)
- `packages/angular/src/ui/layout/` — directive 파일 위치
- `packages/angular/scss/controls/` — 대응 SCSS 파일 (변경: form-table, table만)
- `packages/angular/scss/styles.scss` — global styles (변경 없음)

## 요구명세

```gherkin
Feature: 레이아웃 directive 전체 제거

  Background:
    Given @simplysm/angular 패키지에 9개 레이아웃 directive가 있다
    And 대응 SCSS가 global styles.scss에서 로드되고 있다
    And 패키지 내부에서 이 directive를 사용하는 곳이 없다

  Rule: 9개 레이아웃 directive 파일이 삭제된다

    Scenario: directive 파일 삭제 및 빈 디렉토리 정리
      Given layout 디렉토리에 9개 directive 파일이 있다
      When 파일을 삭제한다
      Then 9개 파일이 삭제된다
      And 빈 디렉토리(flex/, form/, grid/)가 정리된다
      And layout/ 디렉토리에는 sd-gap.control.ts, sd-pane.directive.ts, dock/, view/만 남는다

  Rule: barrel export에서 삭제된 directive가 제거된다

    Scenario: index.ts에서 export 제거
      Given index.ts에 9개 directive export가 있다 (lines 66-78)
      When 해당 export를 제거한다
      Then layout 관련 export는 SdDockContainerControl, SdDockControl, SdPaneDirective, SdGapControl, SdViewControl, SdViewItemControl만 남는다

  Rule: directive가 설정하던 inline style이 SCSS로 이전된다

    Scenario: _form-table.scss에 display: table 추가
      Given SdFormTableDirective가 host에 [style.display]: "'table'"을 설정했다
      And _form-table.scss에 display 속성이 없다
      When directive를 삭제한다
      Then _form-table.scss의 .form-table selector에 display: table이 추가된다

    Scenario: _table.scss에 display: table 추가
      Given SdTableDirective가 host에 [style.display]: "'table'"을 설정했다
      And _table.scss에 display 속성이 없다
      When directive를 삭제한다
      Then _table.scss의 .table selector에 display: table이 추가된다
```

## 구현계획

### 배경

@simplysm/angular 패키지의 layout directive 9개는 host에 CSS class를 설정하는 thin wrapper다. SCSS가 global styles.scss에서 이미 로드되므로, directive 없이도 `class="flex-row"` 등으로 동일한 스타일을 적용할 수 있다. 패키지 내부 사용처가 없으므로 삭제 시 패키지 내부 영향은 없다.

### 목표

- 9개 layout directive 파일 삭제
- barrel export 정리
- directive가 설정하던 inline style(`display: table`)을 SCSS로 이전

### 비목표

- 소비자(외부 프로젝트) 코드 마이그레이션
- SCSS 파일 구조 변경 (위치, selector 등)
- layout 외 다른 directive 변경

### 설계

#### 삭제 대상 파일 (9개)

- `src/ui/layout/sd-card.directive.ts`
- `src/ui/layout/flex/sd-flex.directive.ts`
- `src/ui/layout/flex/sd-flex-grow.directive.ts`
- `src/ui/layout/form/sd-form-box.directive.ts`
- `src/ui/layout/form/sd-form-box-item.directive.ts`
- `src/ui/layout/form/sd-form-table.directive.ts`
- `src/ui/layout/grid/sd-grid.directive.ts`
- `src/ui/layout/grid/sd-grid-item.directive.ts`
- `src/ui/layout/sd-table.directive.ts`

#### 정리 대상 디렉토리

- `src/ui/layout/flex/` — 빈 디렉토리 삭제
- `src/ui/layout/form/` — 빈 디렉토리 삭제
- `src/ui/layout/grid/` — 빈 디렉토리 삭제

#### SCSS 변경 (2개 파일)

- `scss/controls/_form-table.scss`: `.form-table` 블록에 `display: table` 추가
- `scss/controls/_table.scss`: `.table` 블록에 `display: table` 추가

### 대안 검토

없음. 단순 삭제.

### Vertical Slices

- [x] Slice 1: directive 삭제 + export 정리 + SCSS display 이전

#### Slice 1: directive 삭제 + export 정리 + SCSS display 이전
- **구현 내용:**
  - 9개 directive 파일 삭제
  - 빈 디렉토리(flex/, form/, grid/) 삭제
  - index.ts에서 9개 export 제거
  - `_form-table.scss`, `_table.scss`에 `display: table` 추가
- **Scenarios:**
  - Scenario: directive 파일 삭제 및 빈 디렉토리 정리
  - Scenario: index.ts에서 export 제거
  - Scenario: _form-table.scss에 display: table 추가
  - Scenario: _table.scss에 display: table 추가
