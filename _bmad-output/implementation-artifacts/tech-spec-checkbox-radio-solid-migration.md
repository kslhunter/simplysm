---
title: 'Checkbox/Radio 컴포넌트 Solid 마이그레이션'
slug: 'checkbox-radio-solid-migration'
created: '2026-01-31'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - SolidJS
  - vanilla-extract (recipe)
  - TypeScript
  - vitest
  - '@solidjs/testing-library'
files_to_modify:
  - packages/solid/src/components/controls/checkbox.css.ts (신규)
  - packages/solid/src/components/controls/checkbox.tsx (신규)
  - packages/solid/src/components/controls/radio.css.ts (신규)
  - packages/solid/src/components/controls/radio.tsx (신규)
  - packages/solid/src/index.ts (export 추가)
  - packages/solid/tests/components/controls/checkbox.spec.tsx (신규)
  - packages/solid/tests/components/controls/radio.spec.tsx (신규)
code_patterns:
  - vanilla-extract recipe 함수로 variants 정의
  - splitProps로 local/rest 분리
  - objPick으로 variant props 추출
  - use:ripple 디렉티브
  - icon은 Component 타입으로 전달받아 icon({}) 형태로 렌더링
test_patterns:
  - vitest + @solidjs/testing-library
  - describe/it 구조
  - render, screen, fireEvent 사용
  - vi.fn()으로 mock 함수
---

# Tech-Spec: Checkbox/Radio 컴포넌트 Solid 마이그레이션

**Created:** 2026-01-31

## Overview

### Problem Statement

Angular 레거시의 `sd-checkbox` 컴포넌트를 SolidJS로 마이그레이션하여 새로운 Solid UI 패키지에서 사용 가능하게 한다.

### Solution

기존 Button 컴포넌트 패턴(vanilla-extract recipe, ripple 디렉티브)을 따라 Checkbox와 Radio 컴포넌트를 각각 별도 파일로 구현한다.

### Scope

**In Scope:**
- `Checkbox` 컴포넌트 (체크박스, indeterminate 지원)
- `Radio` 컴포넌트 (라디오 버튼, 별도 파일)
- theme, size(xs/sm/lg/xl), inline, inset, disabled 옵션
- ripple 효과, transition 애니메이션
- native input 포함 (required, :invalid 지원)
- vanilla-extract 기반 스타일링

**Out of Scope:**
- CheckboxGroup / CheckboxGroupItem (추후 작업)
- RadioGroup (추후 작업)
- canChangeFn (비동기 변경 가드)
- name/value prop (rest props로 전달 가능)

## Architecture Decision Records

| # | 항목 | 결정 | 근거 |
|---|------|------|------|
| 1 | native input | 포함 | required, :invalid 브라우저 validation 지원 |
| 2 | onChange 시그니처 | `(checked: boolean) => void` | Kobalte 등 모던 SolidJS 라이브러리 표준 |
| 3 | icon prop | 선택적, 기본 아이콘 제공 | Angular 원본과 동일, 편의성 |
| 4 | indeterminate | 지원 | 트리 구조 체크박스 필요 |
| 5 | focus 스타일 | box-shadow ring | Tailwind 스타일, 모던한 UX |
| 6 | size variants | xs, sm, lg, xl | Button과 일관성 |
| 7 | checked 기본값 | false | 직관적 기본 동작 |
| 8 | transition | 200ms | tokenVars.duration.base 사용 |
| 9 | aria 속성 | native input 위임 | 브라우저 기본 접근성 활용 |
| 10 | children 없을 때 | 자동 숨김 | Angular 원본과 동일 |
| 11 | name/value | 미포함 | SPA에서 불필요, rest props로 전달 가능 |
| 12 | 기본 아이콘 | tabler-icons 사용 | IconCheck, IconMinus import하여 기본값 |
| 13 | required | rest props로 전달 | HTML 표준 속성, 별도 명시 불필요 |
| 14 | invalid 스타일 | `use:invalid` directive 사용 | 기존 directive 패턴 활용, 일관성 |
| 15 | tabler-icons 의존성 | 이미 설치됨 (v3.31.0) | 추가 작업 불필요 |
| 16 | innerDot 위치 | recipe 내부에 정의 | 응집도 높음 |
| 17 | 아이콘 크기 | CSS로 조절 | `width/height: 100%`로 indicator에 맞춤 |

## Context for Development

### Codebase Patterns

**컴포넌트 구조:**
- `*.tsx` (컴포넌트) + `*.css.ts` (vanilla-extract 스타일)
- `splitProps`로 local props와 rest props 분리
- `objPick(local, recipe.variants())`로 variant props만 추출
- `use:ripple` 디렉티브로 클릭 리플 효과 적용

**스타일링 패턴:**
- `recipe()` 함수로 base 스타일 + variants 정의
- `themeVars.control.*` 로 테마별 컬러 접근 (primary, secondary, success, warning, danger, info, gray, slate)
- `tokenVars.*` 로 spacing, radius, font, duration 등 토큰 접근
- `compoundVariants`로 theme + checked 조합 스타일

**아이콘 처리:**
- `Component` 타입으로 아이콘 컴포넌트 전달
- `icon({})` 형태로 렌더링
- 기본 체크 아이콘 제공

**Export 패턴:**
- `packages/solid/src/index.ts`에서 re-export

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/solid/src/components/controls/button.tsx` | 컴포넌트 구조, props 패턴 참조 |
| `packages/solid/src/components/controls/button.css.ts` | recipe 스타일 패턴 참조 |
| `packages/solid/src/styles/variables/theme.css.ts` | themeVars 구조 (control 테마 색상) |
| `packages/solid/src/styles/variables/token.css.ts` | tokenVars 구조 (spacing, radius, duration 등) |
| `packages/solid/src/directives/ripple.ts` | ripple 디렉티브 사용법 |
| `packages/solid/src/components/navigator/collapse-icon.tsx` | 아이콘 prop 전달 패턴 |
| `.legacy-packages/sd-angular/src/ui/form/choice/sd-checkbox.control.ts` | 원본 Angular 컴포넌트 |
| `packages/solid/tests/components/controls/button.spec.tsx` | 테스트 패턴 참조 |
| `packages/solid/src/directives/invalid.ts` | invalid directive 사용법 참조 |

### Technical Decisions

1. **Checkbox와 Radio 분리**: Angular는 하나의 컴포넌트에서 `radio` prop으로 구분했으나, Solid 버전은 명확한 역할 분리를 위해 별도 컴포넌트로 구현
2. **native input 포함**: form validation(required, :invalid) 지원을 위해 hidden native input 포함
3. **onChange(boolean)**: Kobalte 등 모던 SolidJS 라이브러리 표준 패턴 채택
4. **indeterminate 지원**: 트리 구조 체크박스에서 부분 선택 표시 필요
5. **size 4단계**: Button과 일관성 유지 (xs, sm, lg, xl)

## Implementation Plan

### Tasks

- [x] **Task 1: Checkbox 스타일 파일 생성**
  - File: `packages/solid/src/components/controls/checkbox.css.ts`
  - Action: vanilla-extract recipe로 checkbox 스타일 정의
  - Notes:
    - base 스타일: inline-flex, cursor pointer, gap, transition(200ms)
    - indicator 스타일: 체크박스 박스 영역 (border, background)
    - indicator 내 icon 컨테이너: flex 중앙 정렬, svg { width: 100%, height: 100% }
    - checked variant: indicator 배경색 변경, 아이콘 opacity 1
    - indeterminate variant: 별도 스타일 (− 아이콘용)
    - theme variants: themeVars.control 색상 매핑
    - compoundVariants: theme + checked 조합별 스타일
    - size variants: xs, sm, lg, xl
    - inline variant: padding/border 제거
    - inset variant: border 제거, 중앙 정렬
    - disabled variant: opacity 0.5, pointer-events none
    - focus-visible: box-shadow ring 효과
    - children 없을 때: contents 영역 display none (`:empty` 선택자)

- [x] **Task 2: Checkbox 컴포넌트 생성**
  - File: `packages/solid/src/components/controls/checkbox.tsx`
  - Action: Checkbox 컴포넌트 구현
  - Notes:
    - **기본 아이콘 import:**
      ```typescript
      import { IconCheck, IconMinus } from "@tabler/icons-solidjs";
      ```
    - **Props 인터페이스:**
      ```typescript
      interface CheckboxProps extends Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, 'onChange'>, CheckboxStyles {
        checked?: boolean;           // 기본값 false
        indeterminate?: boolean;     // 기본값 false
        onChange?: (checked: boolean) => void;
        icon?: Component;            // 기본값: IconCheck
        indeterminateIcon?: Component; // 기본값: IconMinus
        disabled?: boolean;
        // theme, size, inline, inset은 CheckboxStyles에서
      }
      ```
    - **구조:**
      ```tsx
      <label use:ripple class={checkbox(...)}>
        <input
          type="checkbox"
          checked={props.checked}
          disabled={props.disabled}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          onChange={(e) => props.onChange?.(!props.checked)}
        />
        <span class={indicator}>
          <Show when={props.checked && !props.indeterminate}>
            {props.icon?.({})}
          </Show>
          <Show when={props.indeterminate}>
            {props.indeterminateIcon?.({})}
          </Show>
        </span>
        <span class={contents}>{props.children}</span>
      </label>
      ```
    - onClick: native input이 처리
    - 키보드: native input이 Space 키 처리

- [x] **Task 3: Radio 스타일 파일 생성**
  - File: `packages/solid/src/components/controls/radio.css.ts`
  - Action: vanilla-extract recipe로 radio 스타일 정의
  - Notes:
    - Checkbox와 유사하나 indicator가 원형 (border-radius: 100%)
    - **innerDot 스타일** (recipe 내부에 별도 style로 정의):
      - 내부 원 크기: indicator의 50% 정도
      - checked 시 scale(1) + opacity(1), 미체크 시 scale(0) + opacity(0)
      - transition: 200ms
    - theme, size, inline, inset, disabled variants 동일
    - focus-visible: box-shadow ring 효과

- [x] **Task 4: Radio 컴포넌트 생성**
  - File: `packages/solid/src/components/controls/radio.tsx`
  - Action: Radio 컴포넌트 구현
  - Notes:
    - **Props 인터페이스:**
      ```typescript
      interface RadioProps extends Omit<JSX.LabelHTMLAttributes<HTMLLabelElement>, 'onChange'>, RadioStyles {
        checked?: boolean;           // 기본값 false
        onChange?: (checked: boolean) => void;
        disabled?: boolean;
        // theme, size, inline, inset은 RadioStyles에서
      }
      ```
    - **구조:**
      ```tsx
      <label use:ripple class={radio(...)}>
        <input
          type="radio"
          checked={props.checked}
          disabled={props.disabled}
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          onChange={() => props.onChange?.(true)}
        />
        <span class={indicator}>
          <span class={innerDot} /> <!-- CSS로 checked 시 표시 -->
        </span>
        <span class={contents}>{props.children}</span>
      </label>
      ```
    - Radio는 항상 true로만 변경 (그룹에서 다른 Radio가 false로)
    - icon prop 불필요 (내부 원으로 표시)

- [x] **Task 5: index.ts에 export 추가**
  - File: `packages/solid/src/index.ts`
  - Action: Checkbox, Radio 컴포넌트 export 추가
  - Notes:
    ```typescript
    export * from "./components/controls/checkbox";
    export * from "./components/controls/radio";
    ```

- [x] **Task 6: Checkbox 테스트 작성**
  - File: `packages/solid/tests/components/controls/checkbox.spec.tsx`
  - Action: Checkbox 컴포넌트 테스트 작성
  - Notes:
    - 클릭 시 onChange 호출 테스트
    - disabled 시 onChange 미호출 테스트
    - checked 상태 렌더링 테스트
    - indeterminate 상태 렌더링 테스트
    - children 렌더링 테스트
    - 키보드(Space) 동작 테스트

- [x] **Task 7: Radio 테스트 작성**
  - File: `packages/solid/tests/components/controls/radio.spec.tsx`
  - Action: Radio 컴포넌트 테스트 작성
  - Notes:
    - 클릭 시 onChange(true) 호출 테스트
    - disabled 시 onChange 미호출 테스트
    - checked 상태 렌더링 테스트
    - 키보드(Space) 동작 테스트

### Acceptance Criteria

**Checkbox:**
- [ ] AC 1: Given Checkbox가 렌더링되었을 때, when 클릭하면, then onChange가 반대 값(boolean)으로 호출된다
- [ ] AC 2: Given Checkbox가 checked=true일 때, when 렌더링되면, then 체크 아이콘이 표시된다
- [ ] AC 3: Given Checkbox가 indeterminate=true일 때, when 렌더링되면, then − 아이콘이 표시된다
- [ ] AC 4: Given Checkbox가 disabled=true일 때, when 클릭하면, then onChange가 호출되지 않는다
- [ ] AC 5: Given Checkbox에 포커스가 있을 때, when Space 키를 누르면, then onChange가 호출된다
- [ ] AC 6: Given Checkbox에 theme="primary"일 때, when checked=true면, then primary 색상 배경이 적용된다
- [ ] AC 7: Given Checkbox에 focus가 있을 때, when 렌더링되면, then box-shadow ring이 표시된다
- [ ] AC 8: Given Checkbox에 children이 없을 때, when 렌더링되면, then contents 영역이 숨겨진다

**Radio:**
- [ ] AC 9: Given Radio가 렌더링되었을 때, when 클릭하면, then onChange(true)가 호출된다
- [ ] AC 10: Given Radio가 checked=true일 때, when 렌더링되면, then 원형 indicator 내부에 작은 원이 표시된다
- [ ] AC 11: Given Radio가 disabled=true일 때, when 클릭하면, then onChange가 호출되지 않는다

**공통:**
- [ ] AC 12: Given size="xs"일 때, when 렌더링되면, then 가장 작은 크기로 표시된다
- [ ] AC 13: Given inline=true일 때, when 렌더링되면, then 인라인 스타일이 적용된다
- [ ] AC 14: Given checked 상태가 변경될 때, when transition이 적용되면, then 200ms 동안 애니메이션된다

## Additional Context

### Dependencies

- `@vanilla-extract/recipes` (기존 사용 중)
- `solid-js` (기존 사용 중, Show 컴포넌트)
- `@simplysm/core-common` (objPick, filterExists)
- `@tabler/icons-solidjs` (IconCheck, IconMinus) - 기본 아이콘용 (이미 설치됨 v3.31.0)

### Testing Strategy

**Unit Tests:**
- checkbox.spec.tsx: 클릭 동작, disabled 상태, checked/indeterminate 렌더링, 키보드 동작
- radio.spec.tsx: 클릭 동작, disabled 상태, checked 렌더링, 키보드 동작

**Manual Testing:**
- solid-demo 앱에서 다양한 옵션 조합 확인
- 키보드 접근성 확인 (Tab, Space)
- 다크/라이트 테마에서 시각적 확인
- form validation (required, :invalid) 확인

### Notes

- Angular 원본의 `contentStyle` prop은 제외 (필요 시 추후 추가)
- native input은 시각적으로 숨기되 접근성을 위해 DOM에 존재
- ripple 효과는 label 전체 영역에 적용
- 기본 아이콘: `@tabler/icons-solidjs`의 `IconCheck`, `IconMinus` 사용
- **유효성 검증**: Checkbox 자체에 invalid 스타일 없음. 필요 시 `use:invalid` directive로 감싸서 사용:
  ```tsx
  const errorMessage = () => !checked() ? "필수 항목입니다" : "";

  <div use:invalid={errorMessage}>
    <Checkbox checked={checked()} onChange={setChecked} />
  </div>
  ```
