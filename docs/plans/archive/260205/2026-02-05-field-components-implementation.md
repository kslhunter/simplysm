# Field 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Angular sd-textfield를 SolidJS로 이전하여 타입별 Field 컴포넌트 6개 구현

**Architecture:** value 타입별로 컴포넌트 분리 (TextField, NumberField, DateField, DateTimeField, TimeField, ColorField). 각 컴포넌트는 공통 스타일과 controlled/uncontrolled 패턴을 공유하며, 타입별 값 변환 로직을 내부에서 처리한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, clsx, tailwind-merge, Vitest

**참고 문서:** `docs/plans/2026-02-05-field-components-design.md`

---

## Task 1: TextField 컴포넌트

**Files:**

- Create: `packages/solid/src/components/form-control/text-field/TextField.tsx`
- Test: `packages/solid/tests/components/form-control/text-field/TextField.spec.tsx`
- Modify: `packages/solid/src/index.ts`

### Step 1: 테스트 파일 생성 - 기본 렌더링

```tsx
// packages/solid/tests/components/form-control/text-field/TextField.spec.tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { TextField } from "../../../../src/components/form-control/text-field/TextField";

describe("TextField 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("input이 렌더링된다", () => {
      const { getByRole } = render(() => <TextField />);
      expect(getByRole("textbox")).not.toBeNull();
    });

    it("placeholder가 표시된다", () => {
      const { getByPlaceholderText } = render(() => <TextField placeholder="이름을 입력하세요" />);
      expect(getByPlaceholderText("이름을 입력하세요")).not.toBeNull();
    });

    it("type=password일 때 input type이 password이다", () => {
      const { container } = render(() => <TextField type="password" />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("type")).toBe("password");
    });

    it("type=email일 때 input type이 email이다", () => {
      const { container } = render(() => <TextField type="email" />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("type")).toBe("email");
    });
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/text-field/TextField.spec.tsx --project=solid --run`
Expected: FAIL - TextField 모듈을 찾을 수 없음

### Step 3: TextField 기본 구현

```tsx
// packages/solid/src/components/form-control/text-field/TextField.tsx
import { type JSX, Show, splitProps, createSignal, createEffect } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

type TextFieldType = "text" | "password" | "email";
type TextFieldSize = "sm" | "lg";

// 스타일 정의
const containerClass = clsx("relative");

const inputBaseClass = clsx(
  "w-full",
  "border border-neutral-300 dark:border-neutral-600",
  "rounded",
  "bg-white dark:bg-neutral-950",
  "text-neutral-900 dark:text-neutral-100",
  "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
  "focus:outline-none focus:border-primary-500",
);

const contentBaseClass = clsx("whitespace-pre", "text-neutral-900 dark:text-neutral-100");

const sizeClasses = {
  sm: "px-1.5 py-0.5",
  default: "px-2 py-1",
  lg: "px-3 py-2",
};

const disabledClass = "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-default";
const errorClass = "border-danger-500 focus:border-danger-500";
const insetClass = "border-none rounded-none bg-transparent";

export interface TextFieldProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  type?: TextFieldType;
  disabled?: boolean;
  readonly?: boolean;
  error?: string;
  size?: TextFieldSize;
  inset?: boolean;
  placeholder?: string;
  title?: string;
  format?: string;
  autocomplete?: string;
  class?: string;
  style?: JSX.CSSProperties;
}

export const TextField = (props: TextFieldProps) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onChange",
    "type",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "placeholder",
    "title",
    "format",
    "autocomplete",
    "class",
    "style",
  ]);

  void rest;

  // controlled/uncontrolled 패턴
  const [internalValue, setInternalValueRaw] = createSignal<string | undefined>(undefined);

  createEffect(() => {
    setInternalValueRaw(() => local.value);
  });

  const isControlled = () => local.onChange !== undefined;
  const getValue = () => (isControlled() ? local.value : internalValue());
  const setValue = (newValue: string | undefined) => {
    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalValueRaw(() => newValue);
    }
  };

  // 입력 처리
  const handleInput = (e: InputEvent) => {
    const input = e.target as HTMLInputElement;
    const newValue = input.value === "" ? undefined : input.value;
    setValue(newValue);
  };

  // format 적용된 표시 값
  const displayValue = () => {
    const v = getValue();
    if (v == null) return "";

    if (local.format && local.type !== "password") {
      return applyFormat(v, local.format);
    }
    return v;
  };

  // input에 표시할 값 (format 적용)
  const controlValue = () => {
    const v = getValue();
    if (v == null) return "";

    if (local.format && local.type !== "password") {
      return applyFormat(v, local.format);
    }
    return v;
  };

  // 스타일 계산
  const getInputClassName = () =>
    twMerge(
      inputBaseClass,
      sizeClasses[local.size ?? "default"],
      local.disabled && disabledClass,
      local.error && errorClass,
      local.inset && insetClass,
    );

  const getContentClassName = () =>
    twMerge(
      contentBaseClass,
      sizeClasses[local.size ?? "default"],
      local.disabled && disabledClass,
      local.inset && insetClass,
    );

  const isEditable = () => !local.readonly && !local.disabled;

  return (
    <div class={twMerge(containerClass, local.class)} style={local.style}>
      {/* 내용 표시 div - inset이거나 readonly/disabled일 때 표시 */}
      <div
        class={getContentClassName()}
        style={{
          visibility: isEditable() && local.inset ? "hidden" : undefined,
          display: !local.inset && isEditable() ? "none" : undefined,
        }}
        title={local.title ?? local.placeholder}
      >
        {local.type === "password" ? (
          <span class="text-neutral-400">****</span>
        ) : displayValue() ? (
          displayValue()
        ) : local.placeholder ? (
          <span class="text-neutral-400">{local.placeholder}</span>
        ) : (
          "\u00A0"
        )}
      </div>

      {/* input - 편집 가능할 때만 표시 */}
      <Show when={isEditable()}>
        <input
          type={local.type ?? "text"}
          class={twMerge(getInputClassName(), local.inset && "absolute inset-0")}
          value={controlValue()}
          placeholder={local.placeholder}
          title={local.title ?? local.placeholder}
          autocomplete={local.autocomplete}
          onInput={handleInput}
        />
      </Show>
    </div>
  );
};

// format 적용 유틸리티
function applyFormat(value: string, format: string): string {
  const formatItems = format.split("|");

  for (const formatItem of formatItems) {
    const fullLength = (formatItem.match(/X/g) ?? []).length;
    if (fullLength === value.length) {
      let result = "";
      let valCur = 0;
      for (const char of formatItem) {
        if (char === "X") {
          result += value[valCur];
          valCur++;
        } else {
          result += char;
        }
      }
      return result;
    }
  }

  return value;
}

// format에서 비포맷 문자 제거
function removeFormatChars(value: string, format: string): string {
  const nonFormatChars = format.match(/[^X|]/g)?.filter((v, i, a) => a.indexOf(v) === i);
  if (nonFormatChars && nonFormatChars.length > 0) {
    const regex = new RegExp(`[${nonFormatChars.map((c) => "\\" + c).join("")}]`, "g");
    return value.replace(regex, "");
  }
  return value;
}
```

### Step 4: 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/text-field/TextField.spec.tsx --project=solid --run`
Expected: PASS

### Step 5: 추가 테스트 - controlled/uncontrolled, disabled, readonly, error

```tsx
// TextField.spec.tsx에 추가

describe("controlled/uncontrolled", () => {
  it("controlled: value와 onChange로 값을 제어한다", () => {
    const [value, setValue] = createSignal<string | undefined>("초기값");
    const { getByRole } = render(() => <TextField value={value()} onChange={setValue} />);

    const input = getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("초기값");

    fireEvent.input(input, { target: { value: "새 값" } });
    expect(value()).toBe("새 값");
  });

  it("uncontrolled: 내부 상태로 값을 관리한다", () => {
    const { getByRole } = render(() => <TextField />);

    const input = getByRole("textbox") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "입력값" } });
    expect(input.value).toBe("입력값");
  });
});

describe("disabled 상태", () => {
  it("disabled일 때 input이 렌더링되지 않는다", () => {
    const { container } = render(() => <TextField disabled value="값" />);
    expect(container.querySelector("input")).toBeNull();
  });

  it("disabled일 때 값이 div에 표시된다", () => {
    const { getByText } = render(() => <TextField disabled value="표시값" />);
    expect(getByText("표시값")).not.toBeNull();
  });
});

describe("readonly 상태", () => {
  it("readonly일 때 input이 렌더링되지 않는다", () => {
    const { container } = render(() => <TextField readonly value="값" />);
    expect(container.querySelector("input")).toBeNull();
  });

  it("readonly일 때 값이 div에 표시된다", () => {
    const { getByText } = render(() => <TextField readonly value="읽기전용" />);
    expect(getByText("읽기전용")).not.toBeNull();
  });
});

describe("error 상태", () => {
  it("error가 있을 때 에러 스타일이 적용된다", () => {
    const { container } = render(() => <TextField error="에러 메시지" />);
    const input = container.querySelector("input");
    expect(input?.classList.contains("border-danger-500")).toBe(true);
  });
});

describe("format", () => {
  it("format이 적용되면 표시 값이 포맷팅된다", () => {
    const { getByRole } = render(() => <TextField value="01012345678" format="XXX-XXXX-XXXX" />);
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("010-1234-5678");
  });
});

describe("size", () => {
  it("size=sm일 때 작은 padding이 적용된다", () => {
    const { container } = render(() => <TextField size="sm" />);
    const input = container.querySelector("input");
    expect(input?.classList.contains("py-0.5")).toBe(true);
    expect(input?.classList.contains("px-1.5")).toBe(true);
  });

  it("size=lg일 때 큰 padding이 적용된다", () => {
    const { container } = render(() => <TextField size="lg" />);
    const input = container.querySelector("input");
    expect(input?.classList.contains("py-2")).toBe(true);
    expect(input?.classList.contains("px-3")).toBe(true);
  });
});

describe("inset", () => {
  it("inset일 때 테두리가 없다", () => {
    const { container } = render(() => <TextField inset />);
    const input = container.querySelector("input");
    expect(input?.classList.contains("border-none")).toBe(true);
    expect(input?.classList.contains("rounded-none")).toBe(true);
  });
});
```

### Step 6: 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/text-field/TextField.spec.tsx --project=solid --run`
Expected: PASS

### Step 7: index.ts에 export 추가

```typescript
// packages/solid/src/index.ts에 추가
export { TextField, type TextFieldProps } from "./components/form-control/text-field/TextField";
```

### Step 8: 커밋

```bash
git add packages/solid/src/components/form-control/text-field/TextField.tsx \
        packages/solid/tests/components/form-control/text-field/TextField.spec.tsx \
        packages/solid/src/index.ts
git commit -m "feat(solid): TextField 컴포넌트 추가

- text, password, email 타입 지원
- format 옵션으로 입력 포맷팅 지원
- controlled/uncontrolled 패턴 지원
- disabled, readonly, error, size, inset 스타일 옵션

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: NumberField 컴포넌트

**Files:**

- Create: `packages/solid/src/components/form-control/number-field/NumberField.tsx`
- Test: `packages/solid/tests/components/form-control/number-field/NumberField.spec.tsx`
- Modify: `packages/solid/src/index.ts`

### Step 1: 테스트 파일 생성

```tsx
// packages/solid/tests/components/form-control/number-field/NumberField.spec.tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { NumberField } from "../../../../src/components/form-control/number-field/NumberField";

describe("NumberField 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("input이 렌더링된다", () => {
      const { getByRole } = render(() => <NumberField />);
      expect(getByRole("textbox")).not.toBeNull();
    });

    it("inputmode=numeric이 설정된다", () => {
      const { container } = render(() => <NumberField />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("inputmode")).toBe("numeric");
    });
  });

  describe("값 변환", () => {
    it("숫자를 입력하면 number 타입으로 변환된다", () => {
      const [value, setValue] = createSignal<number | undefined>();
      const { getByRole } = render(() => <NumberField value={value()} onChange={setValue} />);

      const input = getByRole("textbox") as HTMLInputElement;
      fireEvent.input(input, { target: { value: "123" } });
      expect(value()).toBe(123);
    });

    it("소수점을 입력할 수 있다", () => {
      const [value, setValue] = createSignal<number | undefined>();
      const { getByRole } = render(() => <NumberField value={value()} onChange={setValue} />);

      const input = getByRole("textbox") as HTMLInputElement;
      fireEvent.input(input, { target: { value: "123.45" } });
      expect(value()).toBe(123.45);
    });

    it("입력 중인 상태(123.)에서는 값이 변경되지 않는다", () => {
      const [value, setValue] = createSignal<number | undefined>(123);
      const { getByRole } = render(() => <NumberField value={value()} onChange={setValue} />);

      const input = getByRole("textbox") as HTMLInputElement;
      fireEvent.input(input, { target: { value: "123." } });
      // 값은 변경되지 않음 (입력 중)
      expect(value()).toBe(123);
    });

    it("유효하지 않은 입력(abc)은 무시된다", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      const { getByRole } = render(() => <NumberField value={value()} onChange={setValue} />);

      const input = getByRole("textbox") as HTMLInputElement;
      fireEvent.input(input, { target: { value: "abc" } });
      expect(value()).toBe(100);
    });
  });

  describe("표시 형식", () => {
    it("useComma=true(기본값)일 때 천단위 콤마가 표시된다", () => {
      const { getByRole } = render(() => <NumberField value={1234567} />);
      const input = getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("1,234,567");
    });

    it("useComma=false일 때 콤마 없이 표시된다", () => {
      const { getByRole } = render(() => <NumberField value={1234567} useComma={false} />);
      const input = getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("1234567");
    });

    it("minDigits가 설정되면 최소 소수점 자릿수가 표시된다", () => {
      const { getByRole } = render(() => <NumberField value={123} minDigits={2} />);
      const input = getByRole("textbox") as HTMLInputElement;
      expect(input.value).toBe("123.00");
    });
  });

  describe("step, min, max", () => {
    it("step 속성이 input에 전달된다", () => {
      const { container } = render(() => <NumberField step={0.01} />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("step")).toBe("0.01");
    });

    it("min 속성이 input에 전달된다", () => {
      const { container } = render(() => <NumberField min={0} />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("min")).toBe("0");
    });

    it("max 속성이 input에 전달된다", () => {
      const { container } = render(() => <NumberField max={100} />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("max")).toBe("100");
    });
  });

  describe("disabled/readonly", () => {
    it("disabled일 때 input이 렌더링되지 않는다", () => {
      const { container } = render(() => <NumberField disabled value={123} />);
      expect(container.querySelector("input")).toBeNull();
    });

    it("readonly일 때 input이 렌더링되지 않는다", () => {
      const { container } = render(() => <NumberField readonly value={123} />);
      expect(container.querySelector("input")).toBeNull();
    });
  });

  describe("텍스트 정렬", () => {
    it("숫자 필드는 우측 정렬이다", () => {
      const { container } = render(() => <NumberField />);
      const input = container.querySelector("input");
      expect(input?.classList.contains("text-right")).toBe(true);
    });
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/number-field/NumberField.spec.tsx --project=solid --run`
Expected: FAIL

### Step 3: NumberField 구현

```tsx
// packages/solid/src/components/form-control/number-field/NumberField.tsx
import { type JSX, Show, splitProps, createSignal, createEffect } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

type NumberFieldSize = "sm" | "lg";

const containerClass = clsx("relative");

const inputBaseClass = clsx(
  "w-full",
  "border border-neutral-300 dark:border-neutral-600",
  "rounded",
  "bg-white dark:bg-neutral-950",
  "text-neutral-900 dark:text-neutral-100",
  "text-right",
  "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
  "focus:outline-none focus:border-primary-500",
  // 스피너 숨김
  "[&::-webkit-outer-spin-button]:appearance-none",
  "[&::-webkit-inner-spin-button]:appearance-none",
);

const contentBaseClass = clsx("whitespace-pre", "text-neutral-900 dark:text-neutral-100", "text-right");

const sizeClasses = {
  sm: "px-1.5 py-0.5",
  default: "px-2 py-1",
  lg: "px-3 py-2",
};

const disabledClass = "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-default";
const errorClass = "border-danger-500 focus:border-danger-500";
const insetClass = "border-none rounded-none bg-transparent";

export interface NumberFieldProps {
  value?: number;
  onChange?: (value: number | undefined) => void;
  disabled?: boolean;
  readonly?: boolean;
  error?: string;
  size?: NumberFieldSize;
  inset?: boolean;
  placeholder?: string;
  title?: string;
  min?: number;
  max?: number;
  step?: number;
  useComma?: boolean;
  minDigits?: number;
  class?: string;
  style?: JSX.CSSProperties;
}

export const NumberField = (props: NumberFieldProps) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onChange",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "placeholder",
    "title",
    "min",
    "max",
    "step",
    "useComma",
    "minDigits",
    "class",
    "style",
  ]);

  void rest;

  // controlled/uncontrolled 패턴
  const [internalValue, setInternalValueRaw] = createSignal<number | undefined>(undefined);

  createEffect(() => {
    setInternalValueRaw(() => local.value);
  });

  const isControlled = () => local.onChange !== undefined;
  const getValue = () => (isControlled() ? local.value : internalValue());
  const setValue = (newValue: number | undefined) => {
    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalValueRaw(() => newValue);
    }
  };

  // 입력 처리
  const handleInput = (e: InputEvent) => {
    const input = e.target as HTMLInputElement;
    const inputValue = input.value.replace(/[^0-9\-.]/g, "");

    if (inputValue === "" || inputValue === "-") {
      setValue(undefined);
      return;
    }

    // 입력 중인 상태 (소수점으로 끝나거나, 0.0 등)
    if (inputValue.endsWith(".") || (inputValue.includes(".") && parseFloat(inputValue) === 0 && inputValue !== "0")) {
      return;
    }

    const num = parseFloat(inputValue);
    if (!Number.isNaN(num)) {
      setValue(num);
    }
  };

  // 표시 값
  const displayValue = () => {
    const v = getValue();
    if (v == null) return "";

    const useComma = local.useComma ?? true;
    const minDigits = local.minDigits;

    if (useComma) {
      return v.toLocaleString(undefined, {
        maximumFractionDigits: 10,
        minimumFractionDigits: minDigits,
      });
    }

    if (minDigits != null) {
      return v.toFixed(minDigits);
    }

    return v.toString();
  };

  // 스타일 계산
  const getInputClassName = () =>
    twMerge(
      inputBaseClass,
      sizeClasses[local.size ?? "default"],
      local.disabled && disabledClass,
      local.error && errorClass,
      local.inset && insetClass,
    );

  const getContentClassName = () =>
    twMerge(
      contentBaseClass,
      sizeClasses[local.size ?? "default"],
      local.disabled && disabledClass,
      local.inset && insetClass,
    );

  const isEditable = () => !local.readonly && !local.disabled;

  return (
    <div class={twMerge(containerClass, local.class)} style={local.style}>
      <div
        class={getContentClassName()}
        style={{
          visibility: isEditable() && local.inset ? "hidden" : undefined,
          display: !local.inset && isEditable() ? "none" : undefined,
        }}
        title={local.title ?? local.placeholder}
      >
        {displayValue() || local.placeholder
          ? displayValue() || <span class="text-neutral-400">{local.placeholder}</span>
          : "\u00A0"}
      </div>

      <Show when={isEditable()}>
        <input
          type="text"
          inputMode="numeric"
          class={twMerge(getInputClassName(), local.inset && "absolute inset-0")}
          value={displayValue()}
          placeholder={local.placeholder}
          title={local.title ?? local.placeholder}
          min={local.min}
          max={local.max}
          step={local.step ?? "any"}
          onInput={handleInput}
        />
      </Show>
    </div>
  );
};
```

### Step 4: 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/number-field/NumberField.spec.tsx --project=solid --run`
Expected: PASS

### Step 5: index.ts에 export 추가

```typescript
export { NumberField, type NumberFieldProps } from "./components/form-control/number-field/NumberField";
```

### Step 6: 커밋

```bash
git add packages/solid/src/components/form-control/number-field/NumberField.tsx \
        packages/solid/tests/components/form-control/number-field/NumberField.spec.tsx \
        packages/solid/src/index.ts
git commit -m "feat(solid): NumberField 컴포넌트 추가

- string ↔ number 타입 변환 내부 처리
- useComma 옵션으로 천단위 콤마 표시
- minDigits 옵션으로 최소 소수점 자릿수 지정
- min, max, step 속성 지원

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: DateField 컴포넌트

**Files:**

- Create: `packages/solid/src/components/form-control/date-field/DateField.tsx`
- Test: `packages/solid/tests/components/form-control/date-field/DateField.spec.tsx`
- Modify: `packages/solid/src/index.ts`

### Step 1: 테스트 파일 생성

```tsx
// packages/solid/tests/components/form-control/date-field/DateField.spec.tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { createSignal } from "solid-js";
import { DateOnly } from "@simplysm/core-common";
import { DateField } from "../../../../src/components/form-control/date-field/DateField";

describe("DateField 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("input이 렌더링된다", () => {
      const { container } = render(() => <DateField />);
      expect(container.querySelector("input")).not.toBeNull();
    });

    it("type=date(기본값)일 때 input type이 date이다", () => {
      const { container } = render(() => <DateField />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("type")).toBe("date");
    });

    it("type=month일 때 input type이 month이다", () => {
      const { container } = render(() => <DateField type="month" />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("type")).toBe("month");
    });

    it("type=year일 때 input type이 number이다", () => {
      const { container } = render(() => <DateField type="year" />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("type")).toBe("number");
    });
  });

  describe("값 변환", () => {
    it("날짜를 입력하면 DateOnly로 변환된다", () => {
      const [value, setValue] = createSignal<DateOnly | undefined>();
      const { container } = render(() => <DateField value={value()} onChange={setValue} />);

      const input = container.querySelector("input") as HTMLInputElement;
      fireEvent.input(input, { target: { value: "2024-01-15" } });
      expect(value()?.toFormatString("yyyy-MM-dd")).toBe("2024-01-15");
    });

    it("DateOnly 값이 input에 올바르게 표시된다", () => {
      const date = DateOnly.parse("2024-06-20");
      const { container } = render(() => <DateField value={date} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2024-06-20");
    });

    it("type=month일 때 yyyy-MM 형식으로 표시된다", () => {
      const date = DateOnly.parse("2024-06-20");
      const { container } = render(() => <DateField type="month" value={date} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2024-06");
    });

    it("type=year일 때 yyyy 형식으로 표시된다", () => {
      const date = DateOnly.parse("2024-06-20");
      const { container } = render(() => <DateField type="year" value={date} />);
      const input = container.querySelector("input") as HTMLInputElement;
      expect(input.value).toBe("2024");
    });
  });

  describe("min/max", () => {
    it("min이 DateOnly일 때 input min 속성에 문자열로 변환된다", () => {
      const minDate = DateOnly.parse("2024-01-01");
      const { container } = render(() => <DateField min={minDate} />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("min")).toBe("2024-01-01");
    });

    it("max가 DateOnly일 때 input max 속성에 문자열로 변환된다", () => {
      const maxDate = DateOnly.parse("2024-12-31");
      const { container } = render(() => <DateField max={maxDate} />);
      const input = container.querySelector("input");
      expect(input?.getAttribute("max")).toBe("2024-12-31");
    });
  });

  describe("disabled/readonly", () => {
    it("disabled일 때 input이 렌더링되지 않는다", () => {
      const date = DateOnly.parse("2024-01-15");
      const { container } = render(() => <DateField disabled value={date} />);
      expect(container.querySelector("input")).toBeNull();
    });

    it("disabled일 때 날짜가 읽기 쉬운 형식으로 표시된다", () => {
      const date = DateOnly.parse("2024-01-15");
      const { getByText } = render(() => <DateField disabled value={date} />);
      expect(getByText("2024-01-15")).not.toBeNull();
    });
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/date-field/DateField.spec.tsx --project=solid --run`
Expected: FAIL

### Step 3: DateField 구현

```tsx
// packages/solid/src/components/form-control/date-field/DateField.tsx
import { type JSX, Show, splitProps, createSignal, createEffect } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { DateOnly } from "@simplysm/core-common";

type DateFieldType = "year" | "month" | "date";
type DateFieldSize = "sm" | "lg";

const containerClass = clsx("relative");

const inputBaseClass = clsx(
  "w-full",
  "border border-neutral-300 dark:border-neutral-600",
  "rounded",
  "bg-white dark:bg-neutral-950",
  "text-neutral-900 dark:text-neutral-100",
  "focus:outline-none focus:border-primary-500",
);

const contentBaseClass = clsx("whitespace-pre", "text-neutral-900 dark:text-neutral-100");

const sizeClasses = {
  sm: "px-1.5 py-0.5",
  default: "px-2 py-1",
  lg: "px-3 py-2",
};

const disabledClass = "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-default";
const errorClass = "border-danger-500 focus:border-danger-500";
const insetClass = "border-none rounded-none bg-transparent";

export interface DateFieldProps {
  value?: DateOnly;
  onChange?: (value: DateOnly | undefined) => void;
  type?: DateFieldType;
  disabled?: boolean;
  readonly?: boolean;
  error?: string;
  size?: DateFieldSize;
  inset?: boolean;
  placeholder?: string;
  title?: string;
  min?: DateOnly;
  max?: DateOnly;
  class?: string;
  style?: JSX.CSSProperties;
}

export const DateField = (props: DateFieldProps) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onChange",
    "type",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "placeholder",
    "title",
    "min",
    "max",
    "class",
    "style",
  ]);

  void rest;

  const [internalValue, setInternalValueRaw] = createSignal<DateOnly | undefined>(undefined);

  createEffect(() => {
    setInternalValueRaw(() => local.value);
  });

  const isControlled = () => local.onChange !== undefined;
  const getValue = () => (isControlled() ? local.value : internalValue());
  const setValue = (newValue: DateOnly | undefined) => {
    if (isControlled()) {
      local.onChange?.(newValue);
    } else {
      setInternalValueRaw(() => newValue);
    }
  };

  const fieldType = () => local.type ?? "date";

  // HTML input type
  const inputType = () => {
    switch (fieldType()) {
      case "year":
        return "number";
      case "month":
        return "month";
      case "date":
      default:
        return "date";
    }
  };

  // 입력 처리
  const handleInput = (e: InputEvent) => {
    const input = e.target as HTMLInputElement;
    const inputValue = input.value;

    if (inputValue === "") {
      setValue(undefined);
      return;
    }

    try {
      if (fieldType() === "year") {
        const year = parseInt(inputValue, 10);
        if (!Number.isNaN(year) && year >= 1 && year <= 9999) {
          setValue(new DateOnly(year, 1, 1));
        }
      } else {
        setValue(DateOnly.parse(inputValue));
      }
    } catch {
      // 파싱 실패 시 무시
    }
  };

  // input에 표시할 값
  const controlValue = () => {
    const v = getValue();
    if (v == null) return "";

    switch (fieldType()) {
      case "year":
        return v.toFormatString("yyyy");
      case "month":
        return v.toFormatString("yyyy-MM");
      case "date":
      default:
        return v.toFormatString("yyyy-MM-dd");
    }
  };

  // div에 표시할 값 (읽기 전용)
  const displayValue = () => {
    const v = getValue();
    if (v == null) return "";

    switch (fieldType()) {
      case "year":
        return v.toFormatString("yyyy");
      case "month":
        return v.toFormatString("yyyy-MM");
      case "date":
      default:
        return v.toFormatString("yyyy-MM-dd");
    }
  };

  // min/max를 문자열로 변환
  const minStr = () => {
    if (!local.min) return undefined;
    switch (fieldType()) {
      case "year":
        return local.min.toFormatString("yyyy");
      case "month":
        return local.min.toFormatString("yyyy-MM");
      default:
        return local.min.toFormatString("yyyy-MM-dd");
    }
  };

  const maxStr = () => {
    if (!local.max) return undefined;
    switch (fieldType()) {
      case "year":
        return local.max.toFormatString("yyyy");
      case "month":
        return local.max.toFormatString("yyyy-MM");
      default:
        return local.max.toFormatString("yyyy-MM-dd");
    }
  };

  const getInputClassName = () =>
    twMerge(
      inputBaseClass,
      sizeClasses[local.size ?? "default"],
      local.disabled && disabledClass,
      local.error && errorClass,
      local.inset && insetClass,
    );

  const getContentClassName = () =>
    twMerge(
      contentBaseClass,
      sizeClasses[local.size ?? "default"],
      local.disabled && disabledClass,
      local.inset && insetClass,
    );

  const isEditable = () => !local.readonly && !local.disabled;

  return (
    <div class={twMerge(containerClass, local.class)} style={local.style}>
      <div
        class={getContentClassName()}
        style={{
          visibility: isEditable() && local.inset ? "hidden" : undefined,
          display: !local.inset && isEditable() ? "none" : undefined,
        }}
        title={local.title ?? local.placeholder}
      >
        {displayValue() || local.placeholder
          ? displayValue() || <span class="text-neutral-400">{local.placeholder}</span>
          : "\u00A0"}
      </div>

      <Show when={isEditable()}>
        <input
          type={inputType()}
          class={twMerge(getInputClassName(), local.inset && "absolute inset-0")}
          value={controlValue()}
          placeholder={local.placeholder}
          title={local.title ?? local.placeholder}
          min={minStr()}
          max={maxStr()}
          onInput={handleInput}
        />
      </Show>
    </div>
  );
};
```

### Step 4: 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/date-field/DateField.spec.tsx --project=solid --run`
Expected: PASS

### Step 5: index.ts에 export 추가

```typescript
export { DateField, type DateFieldProps } from "./components/form-control/date-field/DateField";
```

### Step 6: 커밋

```bash
git add packages/solid/src/components/form-control/date-field/DateField.tsx \
        packages/solid/tests/components/form-control/date-field/DateField.spec.tsx \
        packages/solid/src/index.ts
git commit -m "feat(solid): DateField 컴포넌트 추가

- year, month, date 타입 지원
- string ↔ DateOnly 타입 변환 내부 처리
- min, max 속성 지원 (DateOnly 타입)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: DateTimeField 컴포넌트

**Files:**

- Create: `packages/solid/src/components/form-control/datetime-field/DateTimeField.tsx`
- Test: `packages/solid/tests/components/form-control/datetime-field/DateTimeField.spec.tsx`
- Modify: `packages/solid/src/index.ts`

### Step 1-6: DateField와 동일한 패턴으로 구현

주요 차이점:

- value 타입: `DateTime`
- type: `"datetime" | "datetime-sec"`
- input type: `"datetime-local"`
- step: `datetime-sec`일 때 `1` (초 단위)
- 포맷: `"yyyy-MM-ddTHH:mm"` 또는 `"yyyy-MM-ddTHH:mm:ss"`

커밋 메시지:

```bash
git commit -m "feat(solid): DateTimeField 컴포넌트 추가

- datetime, datetime-sec 타입 지원
- string ↔ DateTime 타입 변환 내부 처리
- datetime-sec일 때 초 단위 입력 지원

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: TimeField 컴포넌트

**Files:**

- Create: `packages/solid/src/components/form-control/time-field/TimeField.tsx`
- Test: `packages/solid/tests/components/form-control/time-field/TimeField.spec.tsx`
- Modify: `packages/solid/src/index.ts`

### Step 1-6: DateField와 동일한 패턴으로 구현

주요 차이점:

- value 타입: `Time`
- type: `"time" | "time-sec"`
- input type: `"time"`
- step: `time-sec`일 때 `1` (초 단위)
- 포맷: `"HH:mm"` 또는 `"HH:mm:ss"`

커밋 메시지:

```bash
git commit -m "feat(solid): TimeField 컴포넌트 추가

- time, time-sec 타입 지원
- string ↔ Time 타입 변환 내부 처리
- time-sec일 때 초 단위 입력 지원

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: ColorField 컴포넌트

**Files:**

- Create: `packages/solid/src/components/form-control/color-field/ColorField.tsx`
- Test: `packages/solid/tests/components/form-control/color-field/ColorField.spec.tsx`
- Modify: `packages/solid/src/index.ts`

### Step 1-6: TextField와 유사하지만 단순화

주요 특징:

- value 타입: `string` (#RRGGBB 형식)
- input type: `"color"`
- format 옵션 없음

커밋 메시지:

```bash
git commit -m "feat(solid): ColorField 컴포넌트 추가

- HTML color picker 사용
- #RRGGBB 형식 문자열 값

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: 최종 검증 및 정리

### Step 1: 전체 테스트 실행

```bash
pnpm vitest packages/solid/tests/components/form-control --project=solid --run
```

### Step 2: 타입 체크

```bash
pnpm typecheck packages/solid
```

### Step 3: 린트

```bash
pnpm lint packages/solid
```

### Step 4: 최종 커밋 (필요 시 수정사항)

```bash
git commit -m "chore(solid): Field 컴포넌트 린트/타입 수정

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```
