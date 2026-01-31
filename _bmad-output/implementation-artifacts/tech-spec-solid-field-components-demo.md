---
title: 'Solid Field Components Demo Page'
slug: 'solid-field-components-demo'
created: '2026-01-31'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - SolidJS
  - TypeScript
  - vanilla-extract
  - '@solidjs/router'
files_to_modify:
  - packages/solid/src/components/controls/text-field.tsx (value/onChange optional)
  - packages/solid/src/components/controls/number-field.tsx (value/onChange optional)
  - packages/solid/src/components/controls/date-field.tsx (value/onChange optional)
  - packages/solid/src/components/controls/time-field.tsx (value/onChange optional)
  - packages/solid/src/components/controls/datetime-field.tsx (value/onChange optional)
  - packages/solid/src/components/controls/color-field.tsx (value/onChange optional)
  - packages/solid-demo/src/pages/home/FieldPage.tsx (신규)
  - packages/solid-demo/src/pages/home/FieldPage.css.ts (신규)
  - packages/solid-demo/src/pages/Home.tsx (메뉴 추가)
  - packages/solid-demo/src/main.tsx (라우트 추가)
code_patterns:
  - TopbarContainer + Topbar 레이아웃
  - createSignal로 상태 관리
  - atoms 유틸리티로 스타일링
  - vanilla-extract style() + globalStyle() for CSS
  - themeVars for 테마 변수 접근
  - lazy() import로 코드 스플리팅
test_patterns:
  - 수동 UI 테스트 (데모 페이지 특성상)
---

# Tech-Spec: Solid Field Components Demo Page

**Created:** 2026-01-31

## Overview

### Problem Statement

`@simplysm/solid` 패키지의 6개 필드 컴포넌트(TextField, NumberField, DateField, TimeField, DateTimeField, ColorField)에 대한 데모가 solid-demo 앱에 없어서 컴포넌트 사용법과 변형을 확인할 수 없음.

### Solution

solid-demo 패키지에 `/field` 경로로 FieldPage를 추가하여 모든 필드 컴포넌트의 전체 props/변형을 시연하는 통합 데모 페이지 생성.

### Scope

**In Scope:**
- `FieldPage.tsx` 생성 (모든 필드 통합)
- TextField: type(text/password/email), format + **공통 props 전체 시연**(size, inset, inline, disabled, readOnly, placeholder, invalid)
- NumberField: useNumberComma, minDigits *(고유 props만)*
- DateField: type(date/month/year), min/max *(고유 props만)*
- TimeField: type(time/time-sec), min/max *(고유 props만)*
- DateTimeField: type(datetime/datetime-sec), min/max *(고유 props만)*
- ColorField: 기본 색상 선택 *(고유 props 없음, placeholder 미지원)*
- `DateOnly`, `Time`, `DateTime` 타입 사용 예시
- 사이드바 메뉴에 "Field" 항목 추가
- 라우팅 설정 (`/field`)
- **필드 컴포넌트 `value`/`onChange` optional로 수정** (uncontrolled mode 지원)

**Out of Scope:**
- 다른 데모 페이지 변경
- 테스트 코드 작성

## Context for Development

### Codebase Patterns

- 데모 페이지는 `TopbarContainer` > `Topbar` > 콘텐츠 구조 사용
- 각 섹션은 `<section>`, `<h3>` 제목으로 구분
- `atoms()` 유틸리티로 flex, gap, padding 등 스타일 적용
- `createSignal`로 컴포넌트 상태 관리
- `@simplysm/core-common`에서 `DateOnly`, `Time`, `DateTime` 타입 import

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/solid-demo/src/pages/home/ButtonPage.tsx` | 데모 페이지 구조, section/h3 패턴 |
| `packages/solid-demo/src/pages/home/ButtonPage.css.ts` | inset용 테이블 스타일 (demoTable) |
| `packages/solid-demo/src/pages/home/DropdownPage.tsx` | createSignal 상태 관리 패턴 |
| `packages/solid-demo/src/pages/Home.tsx` | SidebarMenuItem 메뉴 구조 |
| `packages/solid-demo/src/main.tsx` | lazy import + Route 설정 |
| `packages/solid/src/components/controls/text-field.tsx` | TextField: type, format, size, inset, inline |
| `packages/solid/src/components/controls/number-field.tsx` | NumberField: useNumberComma, minDigits, size, inset |
| `packages/solid/src/components/controls/date-field.tsx` | DateField: type(date/month/year), min, max |
| `packages/solid/src/components/controls/time-field.tsx` | TimeField: type(time/time-sec), min, max |
| `packages/solid/src/components/controls/datetime-field.tsx` | DateTimeField: type(datetime/datetime-sec), min, max |
| `packages/solid/src/components/controls/color-field.tsx` | ColorField: size, inset, inline |

### Technical Decisions

- 모든 필드를 하나의 페이지에 통합 (사용자 요청)
- 각 필드별 섹션으로 구분하여 가독성 확보
- 모든 props/변형 시연 (사용자 요청)
- DateOnly, Time, DateTime 커스텀 타입 사용 예시 포함 (사용자 요청)
- **Task 순서**: 라우팅/메뉴 먼저 설정 → CSS → 기본 구조 → 필드 섹션 순서 (개발 중 실시간 테스트 가능)
- **섹션 제목 계층**: `<h2>필드명</h2>` → `<section><h3>변형명</h3>...</section>` (ButtonPage 패턴과 일치)
- **Inset 테이블 구조**: 여러 행 2열 (라벨 | 필드) 형태로 구성
- **현재 값 표시**: 기본은 uncontrolled, 각 필드별 하나씩 controlled 예시로 값 변경 확인
- **Invalid 상태**: 각 필드별 `use:invalid` directive 적용 예시 포함
- **공통 props 데모**: TextField에서만 공통 props(size, inset, inline, disabled, readOnly, placeholder, invalid) 전체 시연, 나머지 필드는 고유 props만
- **모바일 반응형**: 데스크톱 전용 (520px 미만 별도 대응 안 함)

## Implementation Plan

### Tasks

- [x] Task 1: 필드 컴포넌트 value/onChange optional로 수정
  - Files:
    - `packages/solid/src/components/controls/text-field.tsx`
    - `packages/solid/src/components/controls/number-field.tsx`
    - `packages/solid/src/components/controls/date-field.tsx`
    - `packages/solid/src/components/controls/time-field.tsx`
    - `packages/solid/src/components/controls/datetime-field.tsx`
    - `packages/solid/src/components/controls/color-field.tsx`
  - Action: 각 필드의 Props 인터페이스에서 `value`와 `onChange`를 optional로 변경
  - Notes:
    - `value?: T` (기존: `value: T | undefined`)
    - `onChange?: (value: T | undefined) => void`
    - 컴포넌트 내부에서 `local.onChange?.(...)` 로 optional chaining 적용
    - **Uncontrolled mode 구현**:
      - 컴포넌트 내부에 `const [internalValue, setInternalValue] = createSignal<T | undefined>(undefined)` 추가
      - `const isControlled = () => props.value !== undefined` 로 controlled 여부 판단
      - 실제 사용 값: `const currentValue = () => isControlled() ? props.value : internalValue()`
      - handleChange에서: `setInternalValue(newValue); props.onChange?.(newValue);`

- [x] Task 2: 라우팅 설정
  - File: `packages/solid-demo/src/main.tsx`
  - Action:
    1. `const FieldPage = lazy(() => import("./pages/home/FieldPage"));` 추가
    2. Home Route 내에 `<Route path="/field" component={FieldPage} />` 추가
  - Notes: ButtonPage 패턴 참조. 빈 페이지라도 라우팅 먼저 설정하여 개발 중 실시간 테스트 가능하게 함.

- [x] Task 3: 사이드바 메뉴에 Field 항목 추가
  - File: `packages/solid-demo/src/pages/Home.tsx`
  - Action: menus 배열의 "컴포넌트" children에 `{ title: "Field", path: "/field" }` 추가
  - Notes: Button 다음 위치에 추가

- [x] Task 4: FieldPage.css.ts 생성
  - File: `packages/solid-demo/src/pages/home/FieldPage.css.ts`
  - Action: inset 데모용 테이블 스타일 생성 (ButtonPage.css.ts 패턴 참조)
  - Notes: `demoTable` 스타일 export, themeVars.border.base 사용

- [x] Task 5: FieldPage.tsx 생성 - 기본 구조
  - File: `packages/solid-demo/src/pages/home/FieldPage.tsx`
  - Action: TopbarContainer + Topbar 레이아웃 구성, 필요한 import 추가
  - Notes:
    - `@simplysm/solid`에서 필드 컴포넌트, Topbar, TopbarContainer import
    - `@simplysm/solid/styles`에서 atoms import
    - `@simplysm/solid/directives`에서 invalid import (use:invalid용)
    - `@simplysm/core-common`에서 DateOnly, Time, DateTime import
    - 기본은 uncontrolled mode (Signal 없이 사용)

- [x] Task 6: TextField 데모 섹션 추가
  - File: `packages/solid-demo/src/pages/home/FieldPage.tsx`
  - Action: TextField의 **공통 props 전체** + 고유 props 데모 (다른 필드들의 공통 props 대표 시연)
  - Notes:
    - **[고유]** Type: text, password, email
    - **[고유]** Format: 전화번호 형식 "000-0000-0000"
    - **[공통]** Size: sm, default, lg
    - **[공통]** Inset: 2열 테이블 (라벨 | 필드)
    - **[공통]** Inline: inline-block 표시
    - **[공통]** Disabled/ReadOnly: 비활성화 상태
    - **[공통]** Placeholder: 플레이스홀더 텍스트
    - **[공통]** Invalid: `use:invalid` directive로 에러 스타일 표시
    - **Controlled 예시**: 컴포넌트 상단에 `const [textValue, setTextValue] = createSignal<string | undefined>(undefined)` 정의 후 값 표시

- [x] Task 7: NumberField 데모 섹션 추가
  - File: `packages/solid-demo/src/pages/home/FieldPage.tsx`
  - Action: NumberField의 **고유 props만** 데모 (공통 props는 TextField에서 시연, inset 포함 안 함)
  - Notes:
    - Default: 기본 숫자 입력 (uncontrolled)
    - useNumberComma: 천단위 콤마 표시 (예: 1234567 → 1,234,567)
    - minDigits: 최소 자릿수 (예: 123 → 00123 with minDigits=5)
    - **Controlled 예시**: `const [numValue, setNumValue] = createSignal<number | undefined>(undefined)` 정의 후 값 표시

- [x] Task 8: DateField 데모 섹션 추가
  - File: `packages/solid-demo/src/pages/home/FieldPage.tsx`
  - Action: DateField의 **고유 props만** 데모 (공통 props는 TextField에서 시연, inset 포함 안 함)
  - Notes:
    - Default: DateOnly 타입 사용 (uncontrolled)
    - Type: date (기본), month, year
    - Min/Max: DateOnly로 범위 제한 (예: min={new DateOnly(2024, 1, 1)})
    - **Controlled 예시**: `const [dateValue, setDateValue] = createSignal<DateOnly | undefined>(undefined)` 정의 후 값 표시 (2026-01-31 형식)

- [x] Task 9: TimeField 데모 섹션 추가
  - File: `packages/solid-demo/src/pages/home/FieldPage.tsx`
  - Action: TimeField의 **고유 props만** 데모 (공통 props는 TextField에서 시연, inset 포함 안 함)
  - Notes:
    - Default: Time 타입 사용 (uncontrolled)
    - Type: time (시:분), time-sec (시:분:초)
    - Min/Max: Time으로 범위 제한 (예: min={new Time(9, 0, 0)})
    - **Controlled 예시**: `const [timeValue, setTimeValue] = createSignal<Time | undefined>(undefined)` 정의 후 값 표시 (10:30 형식)

- [x] Task 10: DateTimeField 데모 섹션 추가
  - File: `packages/solid-demo/src/pages/home/FieldPage.tsx`
  - Action: DateTimeField의 **고유 props만** 데모 (공통 props는 TextField에서 시연, inset 포함 안 함)
  - Notes:
    - Default: DateTime 타입 사용 (uncontrolled)
    - Type: datetime (날짜+시:분), datetime-sec (날짜+시:분:초)
    - Min/Max: DateTime으로 범위 제한 (예: min={new DateTime()})
    - **Controlled 예시**: `const [dtValue, setDtValue] = createSignal<DateTime | undefined>(undefined)` 정의 후 값 표시 (2026-01-31 10:30 형식)

- [x] Task 11: ColorField 데모 섹션 추가
  - File: `packages/solid-demo/src/pages/home/FieldPage.tsx`
  - Action: ColorField 기본 데모 (고유 props 없음, 공통 props는 TextField에서 시연, inset 포함 안 함)
  - Notes:
    - Default: 기본 색상 선택 (uncontrolled)
    - **Controlled 예시**: `const [colorValue, setColorValue] = createSignal<string | undefined>("#ff0000")` 정의 후 값 표시 (#ff0000 형식)

### Acceptance Criteria

- [ ] AC 1: Given 사이드바가 표시될 때, when "컴포넌트" 메뉴를 열면, then "Field" 메뉴 항목이 보여야 한다
- [ ] AC 2: Given "Field" 메뉴를 클릭했을 때, when 페이지가 로드되면, then `/field` 경로로 FieldPage가 렌더링되어야 한다
- [ ] AC 3: Given FieldPage가 렌더링될 때, when 페이지를 스크롤하면, then TextField, NumberField, DateField, TimeField, DateTimeField, ColorField 6개 섹션(h2)이 모두 보여야 한다
- [ ] AC 4: Given TextField 섹션에서, when 각 변형을 확인하면, then type(text/password/email), format, size(sm/lg), inset, inline, disabled, readOnly, placeholder, invalid가 모두 시연되어야 한다
- [ ] AC 5: Given NumberField controlled 예시에서, when 값을 입력하면, then useNumberComma 필드에 1234567 입력 시 "1,234,567"로 표시되고, minDigits=5 필드에 123 입력 시 "00123"으로 앞에 0이 채워져야 한다
- [ ] AC 6: Given DateField controlled 예시에서, when 날짜를 선택하면, then "현재 값: 2026-01-31" 형식으로 DateOnly 값이 표시되어야 한다
- [ ] AC 7: Given TimeField controlled 예시에서, when 시간을 선택하면, then "현재 값: 10:30" 또는 "10:30:00"(time-sec) 형식으로 Time 값이 표시되어야 한다
- [ ] AC 8: Given DateTimeField controlled 예시에서, when 날짜/시간을 선택하면, then "현재 값: 2026-01-31 10:30" 형식으로 DateTime 값이 표시되어야 한다
- [ ] AC 9: Given ColorField controlled 예시에서, when 색상을 선택하면, then "현재 값: #ff0000" 형식으로 hex 값이 표시되어야 한다
- [ ] AC 10: Given TextField의 inset 변형에서, when 2열 테이블(라벨|필드) 내에 렌더링되면, then 테두리 없이 셀에 맞게 표시되어야 한다 (공통 props 대표 시연)
- [ ] AC 11: Given 필드 컴포넌트에서, when value/onChange 없이 사용하면, then uncontrolled mode로 정상 동작해야 한다
- [ ] AC 12: Given 각 필드에 `use:invalid` directive 적용 시, when 렌더링되면, then 붉은 테두리 등 에러 스타일이 표시되어야 한다

## Additional Context

### Dependencies

- `@simplysm/solid`: TextField, NumberField, DateField, TimeField, DateTimeField, ColorField, Topbar, TopbarContainer
- `@simplysm/solid/styles`: atoms, themeVars
- `@simplysm/solid/directives`: invalid (use:invalid directive)
- `@simplysm/core-common`: DateOnly, Time, DateTime
- `solid-js`: createSignal
- `@vanilla-extract/css`: style, globalStyle

### Testing Strategy

- **수동 UI 테스트**:
  - 각 필드 컴포넌트의 모든 변형이 올바르게 렌더링되는지 확인
  - size(sm/lg), inset, inline 스타일이 올바르게 적용되는지 확인
  - disabled, readOnly 상태에서 입력이 불가능한지 확인
- **인터랙션 테스트**:
  - 값 입력 시 createSignal 상태가 업데이트되는지 확인
  - format(TextField), useNumberComma/minDigits(NumberField)가 올바르게 동작하는지 확인
  - DateOnly, Time, DateTime 타입 변환이 올바른지 확인

### Notes

- ButtonPage.tsx의 구조를 참고하여 일관된 스타일 유지
- inset 변형은 TextField에서만 테이블 내에서 시연 (공통 props 대표)
- **기본은 Uncontrolled mode**: 대부분 Signal 없이 간단하게 데모
- **Controlled 데모**: 각 필드별로 하나씩 controlled 예시 추가 (FieldPage 컴포넌트 상단에 createSignal 정의)
- **Signal 정의 위치**: FieldPage 함수 시작 부분에 각 필드별 signal 정의
  - `textValue`, `numValue`, `dateValue`, `timeValue`, `dtValue`, `colorValue`

## Review Notes

- Adversarial review 완료
- Findings: 4개 total, 3개 fixed, 1개 skipped (noise)
- Resolution approach: walk-through
- 수정 사항:
  - F1: NumberField displayValue 버그 수정 (uncontrolled mode 지원)
  - F2: Disabled/ReadOnly 데모를 uncontrolled mode로 변경
  - F4: demoTable 스타일을 common.css.ts로 추출 (중복 제거)
