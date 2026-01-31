---
title: 'SolidJS Form Field Components'
slug: 'solidjs-form-field-components'
created: '2026-01-31'
status: 'completed'
stepsCompleted: [1, 2, 3, 4, 5, 6]
completed: '2026-01-31'
tech_stack:
  - 'SolidJS'
  - 'vanilla-extract (recipe)'
  - 'TypeScript (strict mode)'
  - '@simplysm/core-common (DateOnly, DateTime, Time, NumberUtils)'
files_to_modify:
  - 'packages/solid/src/components/controls/field-base.css.ts'
  - 'packages/solid/src/components/controls/text-field.tsx'
  - 'packages/solid/src/components/controls/text-field.css.ts'
  - 'packages/solid/src/components/controls/number-field.tsx'
  - 'packages/solid/src/components/controls/number-field.css.ts'
  - 'packages/solid/src/components/controls/date-field.tsx'
  - 'packages/solid/src/components/controls/date-field.css.ts'
  - 'packages/solid/src/components/controls/time-field.tsx'
  - 'packages/solid/src/components/controls/time-field.css.ts'
  - 'packages/solid/src/components/controls/datetime-field.tsx'
  - 'packages/solid/src/components/controls/datetime-field.css.ts'
  - 'packages/solid/src/components/controls/color-field.tsx'
  - 'packages/solid/src/components/controls/color-field.css.ts'
  - 'packages/solid/src/directives/invalid.ts'
  - 'packages/solid/src/directives/invalid.css.ts'
  - 'packages/solid/src/index.ts'
code_patterns:
  - 'recipe() with variants: theme, size, inset, inline'
  - 'splitProps() for local vs rest props separation'
  - 'JSX.Directives declaration for custom directives'
  - 'content+input structure for inset mode (absolute positioning)'
  - 'createSignal for focus state tracking'
test_patterns:
  - 'vitest + @solidjs/testing-library'
  - 'render(() => <Component />) pattern'
  - 'fireEvent for user interactions'
  - 'screen.getByRole for element queries'
adversarial_review_fixes:
  - 'F1: nullable/undefined handling specified'
  - 'F2: error handling strategy defined'
  - 'F3: format pattern specification clarified'
  - 'F4: onChange timing documented'
  - 'F5: shared base CSS architecture defined'
  - 'F6: use:invalid implementation detailed'
  - 'F7: inset mode details added'
  - 'F8: accessibility specs added'
  - 'F9: i18n scope documented'
  - 'F10: mobile considerations added'
  - 'F11: test cases specified'
  - 'F12: dependencies verified'
code_review_fixes:
  - 'F1 (Critical): TimeField/DateTimeField type safety - 범위 검증 추가 (hour 0-23, minute 0-59, second 0-59, month 1-12, day 1-31)'
  - 'F2 (High): NumberField minDigits+useNumberComma 동시 사용 시 올바른 포맷 적용'
  - 'F3 (High): Invalid directive DOM cleanup 방어 코드 추가'
  - 'F5 (High): DateField month/year 타입 범위 검증 강화'
---

# Tech-Spec: SolidJS Form Field Components

**Created:** 2026-01-31

## Overview

### Problem Statement

Angular sd-textfield 컴포넌트를 SolidJS로 마이그레이션해야 한다. 기존 컴포넌트는 13가지 타입을 하나의 mega-component로 처리하여 유지보수가 어렵고, 숫자/format 입력 시 커서 점프 문제가 있다.

### Solution

타입별로 분리된 6개의 Field 컴포넌트와 1개의 유효성 검증 directive를 구현한다:
- TextField (text, password, email, format)
- NumberField (숫자, 콤마 포맷)
- DateField (date, month, year)
- TimeField (time, time-sec)
- DateTimeField (datetime, datetime-sec)
- ColorField (color)
- use:invalid directive (유효성 검증 UI)

### Scope

**In Scope:**
- 5개 에픽, 16개 스토리 구현
- 28개 Functional Requirements 충족
- 기존 solid 패키지 패턴과 일관성 유지 (vanilla-extract, recipe variants)
- 포커스 상태별 포맷 분리 (커서 점프 해결)
- content+input 구조 (inset 모드 셀 너비 자동 조절)

**Out of Scope:**
- prefix/suffix 지원 (Growth 단계)
- 커스텀 date picker (Vision 단계)
- 추가 필드 타입
- 국제화/다국어 지원 (별도 에픽으로 분리)
- RTL 레이아웃 지원

## Context for Development

### Codebase Patterns

**1. 컴포넌트 구조 (Button 참조):**
```typescript
// button.css.ts
import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { tokenVars } from "../../styles/variables/token.css";
import { themeVars } from "../../styles/variables/theme.css";

export const button = recipe({
  base: { display: "inline-flex", ... },
  variants: {
    theme: { primary: {...}, secondary: {...}, ... },
    size: { xs: {...}, sm: {...}, lg: {...}, xl: {...} },
    inset: { true: { border: "none", borderRadius: 0 } },
    link: { true: {...} },
  },
});
export type ButtonStyles = NonNullable<RecipeVariants<typeof button>>;
```

```typescript
// button.tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import { type ButtonStyles, button } from "./button.css";
import { objPick } from "@simplysm/core-common";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyles {}

export const Button: ParentComponent<ButtonProps> = (props) => {
  const [local, rest] = splitProps(props, [...button.variants(), "class", "children"]);
  return (
    <button {...rest} class={[button(objPick(local, button.variants())), local.class].filterExists().join(" ")}>
      {local.children}
    </button>
  );
};
```

**2. Directive 패턴 (ripple 참조):**
```typescript
// JSX.Directives 확장
declare module "solid-js" {
  namespace JSX {
    interface Directives {
      ripple: boolean | RippleOptions;
    }
  }
}

// directive 함수: (element, accessor) => void
export const ripple = (el: HTMLElement, value?: () => boolean | RippleOptions) => {
  // createEventListener, onCleanup 사용
};
```

**3. 타입 변환 로직 (레거시 sd-textfield 참조):**
```typescript
// 숫자 → 문자열 (표시용)
value.toLocaleString(undefined, { maximumFractionDigits: 10 })

// 문자열 → 숫자 (입력 처리)
const inputValue = value.replace(/[^0-9-.]/g, "");
NumberUtils.parseFloat(inputValue)

// format 적용 (XXX-XXXX-XXXX 패턴)
// X 위치에 값 채우기, 나머지는 포맷 문자
```

**4. inset 모드 구조:**
```html
<!-- 컨테이너: position: relative -->
<div class="field-container" style="position: relative;">
  <!-- content: 보이는 텍스트 (셀 너비 결정) -->
  <div class="_contents" style="visibility: hidden; white-space: pre;">
    {displayValue || placeholder || '\u00A0'}
  </div>
  <!-- input: 실제 입력 (absolute positioned) -->
  <input style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%;" />
</div>
```

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `packages/solid/src/components/controls/button.tsx` | 컴포넌트 구조, splitProps, variants 패턴 |
| `packages/solid/src/components/controls/button.css.ts` | recipe variants, tokenVars, themeVars |
| `packages/solid/src/directives/ripple.ts` | directive 구현, JSX.Directives 확장 |
| `packages/solid/src/directives/ripple.css.ts` | directive용 스타일 |
| `.legacy-packages/sd-angular/.../sd-textfield.control.ts` | 타입 변환 로직, inset 구조, format 처리 |
| `packages/core-common/src/types/date-only.ts` | DateOnly.parse(), toFormatString() |
| `packages/core-common/src/types/date-time.ts` | DateTime 타입 |
| `packages/core-common/src/types/time.ts` | Time 타입 |
| `packages/solid/tests/components/controls/button.spec.tsx` | 테스트 패턴 |

### Technical Decisions

1. **포커스 상태별 포맷**:
   - `createSignal<boolean>(false)` for `isFocused`
   - 포커스 중: raw 값 표시 → 커서 점프 방지
   - blur 시: 포맷 적용된 값 표시

2. **content+input 구조 (inset 모드)**:
   - 컨테이너: `position: relative`
   - content div: `visibility: hidden`, `white-space: pre`, 셀 너비 결정
   - input: `position: absolute`, `inset: 0`, 컨테이너 크기에 맞춤
   - 포커스 시 content visibility 변경 없음 (항상 hidden으로 너비만 결정)

3. **value + onChange 패턴**:
   - Controlled component only (uncontrolled 미지원)
   - `value: T | undefined`, `onChange: (value: T | undefined) => void`
   - **undefined 처리**: 빈 문자열로 표시, 입력 지우면 undefined 반환

4. **use:invalid directive**:
   - 타겟 요소에 `position: relative` 클래스 추가
   - 숨겨진 input을 타겟 요소 내부에 삽입, `setCustomValidity()` 호출
   - 빨간 점: `::before` pseudo-element (타겟 요소에 추가)
   - 폼 제출 시 브라우저 기본 동작으로 포커스 이동

5. **공통 base 스타일 (field-base.css.ts)**:
   - 모든 field가 공유하는 base recipe 정의
   - inline/inset/size/theme variants 공유
   - 각 field는 이를 확장하여 사용

6. **onChange 타이밍**:
   - **TextField/NumberField**: `onInput` 이벤트마다 호출 (실시간)
   - **format 적용 시**: raw 값으로 onChange 호출 (포맷 문자 제외)
   - **Date/Time/Color Fields**: `onChange` 이벤트 시 호출 (선택 완료 시)
   - **변환 실패 시**: onChange 호출하지 않음 (이전 값 유지)

7. **에러 핸들링**:
   - `NumberUtils.parseFloat` 결과가 NaN이면 onChange 미호출
   - `DateOnly.parse` 등 실패 시 onChange 미호출
   - 잘못된 입력은 무시하고 이전 valid 값 유지

### Format Pattern Specification

**format prop 사양:**

```typescript
// 지원 플레이스홀더
// 0: 숫자만 (0-9)
// X: 영문 대문자 + 숫자 (A-Z, 0-9)
// x: 영문 소문자 + 숫자 (a-z, 0-9)
// *: 모든 문자

// 예시
format="000-0000-0000"  // 전화번호: 010-1234-5678
format="000-00-00000"   // 주민번호: 123-45-67890
format="XXX-XXXX"       // 차량번호: 12가-3456

// 동작
// 1. 포커스 중: raw 값 표시 (01012345678)
// 2. blur 시: 포맷 적용 (010-1234-5678)
// 3. 입력이 포맷 길이 초과 시: 초과분 무시
// 4. 입력이 포맷보다 짧을 시: 입력된 만큼만 포맷 적용 (010-12)
// 5. 플레이스홀더와 맞지 않는 문자 입력 시: 해당 문자 무시
```

### Accessibility Specification

**ARIA 속성:**
```typescript
// 모든 Field 공통
aria-invalid={hasError ? "true" : undefined}
aria-disabled={disabled ? "true" : undefined}
aria-readonly={readonly ? "true" : undefined}

// use:invalid directive 적용 시
aria-describedby={errorId}  // 에러 메시지 연결용 (향후 확장)
```

**포커스 관리:**
- 모든 field는 `outline` 스타일로 포커스 링 표시
- `focus-visible` 선택자 사용 (키보드 포커스만 표시)
- 포커스 링 색상: `themeVars.control.primary.base`

**키보드 접근:**
- 모든 field는 Tab으로 접근 가능
- disabled 시 Tab 순서에서 제외 (`tabIndex={-1}` 불필요, disabled가 처리)

### Mobile Specification

**Input Mode 설정:**
```typescript
// NumberField
inputMode="decimal"  // 소수점 포함 숫자 키보드

// TextField type="email"
inputMode="email"    // 이메일 키보드 (@ 버튼 포함)

// TextField with format (숫자만)
inputMode="numeric"  // 숫자 전용 키보드
```

**터치 인터랙션:**
- 브라우저 네이티브 picker 사용 (date, time, color)
- 별도 터치 핸들링 불필요

## Implementation Plan

### Tasks

#### Phase 0: 공통 CSS 인프라

- [ ] Task 0: 공통 Field Base CSS 정의
  - File: `packages/solid/src/components/controls/field-base.css.ts`
  - Action: 모든 field가 공유하는 base recipe 정의
  - Details:
    ```typescript
    export const fieldBase = recipe({
      base: {
        display: "block",
        width: "100%",
        padding: `${tokenVars.spacing.sm} ${tokenVars.spacing.base}`,
        border: `1px solid rgb(${themeVars.border.base})`,
        borderRadius: tokenVars.radius.base,
        background: `rgb(${themeVars.surface.base})`,
        color: `rgb(${themeVars.text.base})`,
        fontSize: tokenVars.font.size.base,
        outline: "none",
        transition: `${tokenVars.duration.base} linear`,
        transitionProperty: "border-color, box-shadow",
        selectors: {
          "&:focus-visible": {
            borderColor: `rgb(${themeVars.control.primary.base})`,
            boxShadow: `0 0 0 2px rgb(${themeVars.control.primary.muted})`,
          },
          "&:disabled": {
            opacity: tokenVars.overlay.muted,
            pointerEvents: "none",
          },
          "&[readonly]": {
            background: `rgb(${themeVars.surface.elevated})`,
          },
        },
      },
      variants: {
        theme: { /* primary, secondary 등 */ },
        size: {
          sm: { padding: `${tokenVars.spacing.xs} ${tokenVars.spacing.sm}`, fontSize: tokenVars.font.size.sm },
          lg: { padding: `${tokenVars.spacing.base} ${tokenVars.spacing.lg}`, fontSize: tokenVars.font.size.lg },
        },
        inset: {
          true: { border: "none", borderRadius: 0, background: "transparent", padding: 0 },
        },
        inline: {
          true: { display: "inline-block", width: "auto" },
        },
      },
    });
    ```

#### Phase 1: 공통 인프라 (TextField 기반 구축)

- [ ] Task 1: TextField CSS 스타일 정의
  - File: `packages/solid/src/components/controls/text-field.css.ts`
  - Action: fieldBase를 확장하여 TextField 전용 스타일 정의
  - Notes: inset 모드용 컨테이너 스타일 포함

- [ ] Task 2: TextField 기본 컴포넌트 구현
  - File: `packages/solid/src/components/controls/text-field.tsx`
  - Action: TextFieldProps 인터페이스 정의, splitProps 패턴, value+onChange 구현
  - Details:
    ```typescript
    interface TextFieldProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">, TextFieldStyles {
      value: string | undefined;
      onChange: (value: string | undefined) => void;
      type?: "text" | "password" | "email";
      format?: string;
    }
    ```
  - Notes:
    - `value === undefined` → 빈 input 표시
    - 빈 문자열 입력 시 → `onChange(undefined)` 호출
    - `onInput` 이벤트로 실시간 onChange 호출
    - inputMode 자동 설정 (email → "email")

- [ ] Task 3: TextField inset 모드 구현
  - File: `packages/solid/src/components/controls/text-field.tsx`
  - Action: content+input 구조 추가, inset prop 처리
  - Details:
    ```typescript
    // inset 모드 구조
    <Show when={props.inset} fallback={<input ... />}>
      <div class={textFieldContainer()}>
        <div class="_contents">{displayValue() || props.placeholder || '\u00A0'}</div>
        <input class="_input" ... />
      </div>
    </Show>
    ```

- [ ] Task 4: TextField password/email 타입 지원
  - File: `packages/solid/src/components/controls/text-field.tsx`
  - Action: type prop 처리 (text, password, email)
  - Notes: HTML input type 직접 전달, email일 때 `inputMode="email"` 추가

- [ ] Task 5: TextField format prop 구현
  - File: `packages/solid/src/components/controls/text-field.tsx`
  - Action: format prop 처리, isFocused 상태 관리, 포커스별 표시값 분리
  - Details:
    ```typescript
    // format 처리 함수
    const applyFormat = (raw: string, format: string): string => {
      let result = "";
      let rawIndex = 0;
      for (const char of format) {
        if (rawIndex >= raw.length) break;
        if (char === "0" || char === "X" || char === "x" || char === "*") {
          result += raw[rawIndex++];
        } else {
          result += char;
        }
      }
      return result;
    };

    const extractRaw = (formatted: string, format: string): string => {
      // 포맷 문자 제거하고 raw 값만 추출
    };
    ```
  - Notes:
    - 포커스 중 raw값, blur 시 포맷 적용
    - onChange는 항상 raw 값으로 호출
    - format에 숫자만 있으면 `inputMode="numeric"` 설정

#### Phase 2: NumberField 구현

- [ ] Task 6: NumberField CSS 스타일 정의
  - File: `packages/solid/src/components/controls/number-field.css.ts`
  - Action: fieldBase를 확장, text-align: right 추가
  - Notes: 숫자 정렬용

- [ ] Task 7: NumberField 기본 구현
  - File: `packages/solid/src/components/controls/number-field.tsx`
  - Action: NumberFieldProps 정의, 숫자 변환 로직
  - Details:
    ```typescript
    interface NumberFieldProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">, NumberFieldStyles {
      value: number | undefined;
      onChange: (value: number | undefined) => void;
      useNumberComma?: boolean;
      minDigits?: number;
    }

    // 입력 처리
    const handleInput = (e: InputEvent) => {
      const input = e.currentTarget as HTMLInputElement;
      const raw = input.value.replace(/[^0-9.-]/g, "");
      if (raw === "" || raw === "-") {
        props.onChange(undefined);
        return;
      }
      const num = NumberUtils.parseFloat(raw);
      if (!Number.isNaN(num)) {
        props.onChange(num);
      }
      // NaN이면 onChange 호출 안함 (이전 값 유지)
    };
    ```
  - Notes:
    - `inputMode="decimal"` 설정
    - NaN 결과 시 onChange 미호출

- [ ] Task 8: NumberField 콤마 포맷 및 포커스 상태 구현
  - File: `packages/solid/src/components/controls/number-field.tsx`
  - Action: useNumberComma prop, isFocused 상태, toLocaleString 포맷
  - Details:
    ```typescript
    const displayValue = () => {
      if (props.value === undefined) return "";
      if (isFocused()) return String(props.value);
      if (props.useNumberComma) {
        return props.value.toLocaleString(undefined, { maximumFractionDigits: 10 });
      }
      return String(props.value);
    };
    ```

- [ ] Task 9: NumberField minDigits 구현
  - File: `packages/solid/src/components/controls/number-field.tsx`
  - Action: minDigits prop, padStart로 자릿수 맞춤
  - Notes: blur 시 표시용으로만 사용, onChange는 원본 숫자

#### Phase 3: Date/Time Fields 구현

- [ ] Task 10: DateField CSS 및 기본 구현
  - File: `packages/solid/src/components/controls/date-field.tsx`, `date-field.css.ts`
  - Action: DateFieldProps 정의
  - Details:
    ```typescript
    interface DateFieldProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "min" | "max">, DateFieldStyles {
      value: DateOnly | undefined;
      onChange: (value: DateOnly | undefined) => void;
      type?: "date" | "month" | "year";
      min?: DateOnly;
      max?: DateOnly;
    }

    // 값 변환
    const handleChange = (e: Event) => {
      const input = e.currentTarget as HTMLInputElement;
      if (!input.value) {
        props.onChange(undefined);
        return;
      }
      const parsed = DateOnly.parse(input.value);
      if (parsed) {
        props.onChange(parsed);
      }
    };

    // 표시값
    const inputValue = () => props.value?.toFormatString("yyyy-MM-dd") ?? "";
    ```

- [ ] Task 11: DateField month/year 모드 구현
  - File: `packages/solid/src/components/controls/date-field.tsx`
  - Action: type="month"|"year" 지원
  - Notes: 브라우저 네이티브 picker 활용, type="year"는 number input으로 대체 (네이티브 미지원)

- [ ] Task 12: DateField min/max 범위 구현
  - File: `packages/solid/src/components/controls/date-field.tsx`
  - Action: min, max prop → input 속성 변환
  - Notes: `min={minDate?.toFormatString("yyyy-MM-dd")}`

- [ ] Task 13: TimeField CSS 및 기본 구현
  - File: `packages/solid/src/components/controls/time-field.tsx`, `time-field.css.ts`
  - Action: TimeFieldProps 정의
  - Details:
    ```typescript
    interface TimeFieldProps extends Omit<...>, TimeFieldStyles {
      value: Time | undefined;
      onChange: (value: Time | undefined) => void;
      type?: "time" | "time-sec";
      min?: Time;
      max?: Time;
    }
    ```

- [ ] Task 14: TimeField 초 단위 지원
  - File: `packages/solid/src/components/controls/time-field.tsx`
  - Action: type="time-sec" → step="1" 설정
  - Notes: 시:분:초 표시를 위해 step 속성 활용

- [ ] Task 15: TimeField min/max 범위 구현
  - File: `packages/solid/src/components/controls/time-field.tsx`
  - Action: min, max prop → input 속성 변환
  - Notes: `min={minTime?.toFormatString("HH:mm:ss")}`

- [ ] Task 16: DateTimeField CSS 및 기본 구현
  - File: `packages/solid/src/components/controls/datetime-field.tsx`, `datetime-field.css.ts`
  - Action: DateTimeFieldProps 정의, type="datetime-local"
  - Details:
    ```typescript
    interface DateTimeFieldProps extends Omit<...>, DateTimeFieldStyles {
      value: DateTime | undefined;
      onChange: (value: DateTime | undefined) => void;
      type?: "datetime" | "datetime-sec";
      min?: DateTime;
      max?: DateTime;
    }
    ```

- [ ] Task 17: DateTimeField 초 단위 및 min/max 구현
  - File: `packages/solid/src/components/controls/datetime-field.tsx`
  - Action: type="datetime-sec" → step="1", min/max prop
  - Notes: DateTime 포맷은 "yyyy-MM-ddTHH:mm:ss"

#### Phase 4: ColorField 구현

- [ ] Task 18: ColorField CSS 및 구현
  - File: `packages/solid/src/components/controls/color-field.tsx`, `color-field.css.ts`
  - Action: ColorFieldProps 정의, type="color" input
  - Details:
    ```typescript
    interface ColorFieldProps extends Omit<...>, ColorFieldStyles {
      value: string | undefined;  // hex color (#RRGGBB)
      onChange: (value: string | undefined) => void;
    }

    // 기본값 처리 (color input은 빈 값 불가)
    const inputValue = () => props.value || "#000000";
    ```
  - Notes: hex 색상값 처리, 기본값 #000000

#### Phase 5: use:invalid Directive 구현

- [ ] Task 19: invalid directive CSS 정의
  - File: `packages/solid/src/directives/invalid.css.ts`
  - Action: 빨간 점 스타일, 컨테이너 스타일
  - Details:
    ```typescript
    export const invalidContainer = style({
      position: "relative",
    });

    export const invalidDot = style({
      selectors: {
        "&::before": {
          content: '""',
          position: "absolute",
          top: "2px",
          left: "2px",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: `rgb(${themeVars.control.danger.base})`,
        },
      },
    });
    ```

- [ ] Task 20: invalid directive 구현
  - File: `packages/solid/src/directives/invalid.ts`
  - Action: JSX.Directives 확장, 구현
  - Details:
    ```typescript
    declare module "solid-js" {
      namespace JSX {
        interface Directives {
          invalid: () => string;  // 에러 메시지 반환, 빈 문자열이면 valid
        }
      }
    }

    export const invalid = (el: HTMLElement, accessor: () => () => string) => {
      // 1. 컨테이너 클래스 추가
      el.classList.add(invalidContainer);

      // 2. 숨겨진 input 생성 및 삽입
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "hidden";
      hiddenInput.style.cssText = "position:absolute;opacity:0;width:0;height:0;";
      el.appendChild(hiddenInput);

      // 3. 검증 결과 반영
      createEffect(() => {
        const message = accessor()();
        hiddenInput.setCustomValidity(message);
        el.classList.toggle(invalidDot, message !== "");
        el.setAttribute("aria-invalid", message ? "true" : "false");
      });

      // 4. cleanup
      onCleanup(() => {
        el.removeChild(hiddenInput);
        el.classList.remove(invalidContainer, invalidDot);
      });
    };
    ```

#### Phase 6: 통합 및 Export

- [ ] Task 21: index.ts export 추가
  - File: `packages/solid/src/index.ts`
  - Action: 모든 Field 컴포넌트와 invalid directive export 추가
  - Details:
    ```typescript
    // Components
    export { TextField, type TextFieldProps } from "./components/controls/text-field";
    export { NumberField, type NumberFieldProps } from "./components/controls/number-field";
    export { DateField, type DateFieldProps } from "./components/controls/date-field";
    export { TimeField, type TimeFieldProps } from "./components/controls/time-field";
    export { DateTimeField, type DateTimeFieldProps } from "./components/controls/datetime-field";
    export { ColorField, type ColorFieldProps } from "./components/controls/color-field";

    // Directives
    export { invalid } from "./directives/invalid";
    ```

- [ ] Task 22: 테스트 작성
  - File: `packages/solid/tests/components/controls/*.spec.tsx`
  - Action: 각 컴포넌트별 테스트 케이스 작성
  - Test Cases:
    ```typescript
    // TextField Tests
    describe("TextField", () => {
      it("renders with initial value", () => { /* ... */ });
      it("calls onChange on input", () => { /* ... */ });
      it("calls onChange with undefined when cleared", () => { /* ... */ });
      it("applies size variant", () => { /* ... */ });
      it("applies inset mode with content+input structure", () => { /* ... */ });
      it("masks password input", () => { /* ... */ });
      it("applies format on blur, shows raw on focus", () => { /* ... */ });
      it("filters invalid format characters", () => { /* ... */ });
    });

    // NumberField Tests
    describe("NumberField", () => {
      it("renders with number value", () => { /* ... */ });
      it("filters non-numeric input", () => { /* ... */ });
      it("calls onChange with undefined for empty input", () => { /* ... */ });
      it("does not call onChange for NaN result", () => { /* ... */ });
      it("shows comma format on blur", () => { /* ... */ });
      it("shows raw value on focus", () => { /* ... */ });
      it("pads with zeros for minDigits", () => { /* ... */ });
    });

    // DateField Tests
    describe("DateField", () => {
      it("renders with DateOnly value", () => { /* ... */ });
      it("calls onChange with DateOnly on change", () => { /* ... */ });
      it("calls onChange with undefined when cleared", () => { /* ... */ });
      it("respects min/max constraints", () => { /* ... */ });
    });

    // use:invalid Tests
    describe("use:invalid", () => {
      it("shows red dot when validation fails", () => { /* ... */ });
      it("hides red dot when validation passes", () => { /* ... */ });
      it("sets aria-invalid attribute", () => { /* ... */ });
      it("sets custom validity on hidden input", () => { /* ... */ });
    });
    ```

### Acceptance Criteria

#### TextField (Epic 1)
- [ ] AC1: Given TextField가 import되었을 때, When `<TextField value={text()} onChange={setText} />`로 사용하면, Then 텍스트 입력이 가능하고 onInput마다 onChange가 호출된다
- [ ] AC2: Given TextField에 size prop이 전달되었을 때, When `size="sm"` 또는 `size="lg"`를 지정하면, Then 해당 크기 스타일이 적용된다
- [ ] AC3: Given TextField에 inset={true}를 지정하면, Then 테두리 없는 인라인 스타일이 적용되고 content+input 구조로 셀 너비가 조절된다
- [ ] AC4: Given TextField에 disabled/readonly/placeholder/title이 전달되면, Then 각 속성이 올바르게 동작하고 aria 속성이 설정된다
- [ ] AC5: Given TextField에 type="password"가 전달되면, Then 입력값이 마스킹된다
- [ ] AC6: Given TextField에 format prop이 전달되면, Then 포커스 중엔 raw값, blur 시 포맷값이 표시되고 onChange는 raw값으로 호출된다
- [ ] AC7: Given TextField 값을 모두 지우면, Then onChange가 undefined로 호출된다

#### NumberField (Epic 2)
- [ ] AC8: Given NumberField가 사용될 때, When 숫자를 입력하면, Then number 타입 value로 onChange가 호출된다
- [ ] AC9: Given NumberField에 useNumberComma={true}면, Then 포커스 아웃 시 천단위 콤마가 표시된다
- [ ] AC10: Given NumberField에 minDigits={3}이면, Then 값 5가 "005"로 표시된다
- [ ] AC11: Given NumberField에 "abc" 등 잘못된 입력 시, Then onChange가 호출되지 않고 이전 값이 유지된다
- [ ] AC12: Given NumberField 값을 모두 지우면, Then onChange가 undefined로 호출된다

#### DateField (Epic 3)
- [ ] AC13: Given DateField가 사용될 때, When 날짜를 선택하면, Then DateOnly 타입 value로 onChange가 호출된다
- [ ] AC14: Given DateField에 type="month"|"year"면, Then 해당 모드의 picker가 표시된다
- [ ] AC15: Given DateField에 min/max가 설정되면, Then 범위 외 날짜는 선택 불가능하다
- [ ] AC16: Given DateField 값을 지우면, Then onChange가 undefined로 호출된다

#### TimeField (Epic 3)
- [ ] AC17: Given TimeField가 사용될 때, When 시간을 선택하면, Then Time 타입 value로 onChange가 호출된다
- [ ] AC18: Given TimeField에 type="time-sec"면, Then 초 단위까지 입력 가능하다

#### DateTimeField (Epic 3)
- [ ] AC19: Given DateTimeField가 사용될 때, When 날짜+시간을 선택하면, Then DateTime 타입 value로 onChange가 호출된다

#### ColorField (Epic 4)
- [ ] AC20: Given ColorField가 사용될 때, When 색상을 선택하면, Then hex string value로 onChange가 호출된다

#### use:invalid (Epic 5)
- [ ] AC21: Given use:invalid directive가 적용되고 검증 실패 시, Then 좌상단에 빨간 점이 표시되고 aria-invalid="true"가 설정된다
- [ ] AC22: Given invalid 필드가 있을 때 폼 제출하면, Then 첫 번째 invalid 필드로 포커스가 이동한다

## Additional Context

### Dependencies

- `@simplysm/core-common`: DateOnly, DateTime, Time, NumberUtils, StringUtils, objPick (이미 설치됨)
- `@vanilla-extract/recipes`: recipe, RecipeVariants (이미 설치됨)
- `solid-js`: createSignal, splitProps, onCleanup, createEffect, JSX (이미 설치됨)

**의존성 검증 완료:**
- `@solid-primitives/event-listener` 사용하지 않음 (solid-js 기본 이벤트로 충분)

### Testing Strategy

- **Framework**: vitest + @solidjs/testing-library
- **패턴**: `render(() => <Component />)`, `fireEvent`, `screen.getByRole`
- **테스트 커버리지 목표**: 80% 이상
- **테스트 범위**:
  - 기본 렌더링
  - value/onChange 동작
  - undefined 처리
  - 에러 입력 무시
  - variants 적용 (size, theme, inset, inline)
  - disabled/readonly 상태
  - 포커스 상태별 포맷 (NumberField, TextField with format)
  - use:invalid directive 동작
  - ARIA 속성 검증

### Notes

- 기존 Button 컴포넌트와 동일한 theme, size, inset 패턴 사용
- 모든 필드는 기본 full width (`inline={false}`)
- TypeScript strict mode 호환 필수
- `@simplysm/core-common` import 시 확장 메서드 자동 활성화됨 (filterExists 등)
- 브라우저 네이티브 picker 활용으로 구현 복잡도 최소화
- 커서 점프 문제는 포커스 상태별 표시값 분리로 해결
- 모든 field의 value는 `T | undefined` 타입으로 nullable 지원

### Risk Areas (Mitigated)

| 리스크 | 완화 전략 |
|--------|----------|
| NumberField 커서 위치 | 포커스 중 raw값 표시로 해결 |
| format 패턴 파싱 | 명확한 플레이스홀더 사양 정의 (0, X, x, *) |
| use:invalid 브라우저 호환성 | setCustomValidity - 모던 브라우저 모두 지원 확인됨 |
| undefined 처리 | 모든 field에 undefined 케이스 명시 |
| onChange 타이밍 혼란 | TextField/NumberField는 onInput, Date/Time/Color는 onChange 이벤트 명시 |

