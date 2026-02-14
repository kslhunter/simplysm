# Field Dual-Element 패턴 구현 계획서

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** inset 모드에서 readonly ↔ 편집 전환 시 셀 크기가 변동되지 않도록, Field 6개 컴포넌트의 inset 렌더링을 dual-element overlay 패턴으로 재설계한다.

**Architecture:** standalone(inset 아님)은 기존 `<Show>` 구조 유지. inset일 때만 content div(항상 존재, 크기 잡아줌) + input(편집 시 absolute overlay)로 전환. 값 변환/이벤트/props는 변경 없음.

**Tech Stack:** SolidJS, Tailwind CSS, twMerge, clsx, Vitest (solid 프로젝트)

---

## 핵심 설계

### 현재 구조 (모든 Field 공통)

```tsx
<Show when={!isDisplayMode()} fallback={<div>{displayValue()}</div>}>
  <div>
    <input />
  </div>
</Show>
```

readonly ↔ 편집 전환 시 DOM이 통째로 교체되어 셀 크기가 바뀜.

### 새 구조 — standalone (inset 아님)

기존과 동일. 변경 없음.

### 새 구조 — inset일 때 (dual-element overlay)

```tsx
<div class={clsx("relative", local.class)} style={local.style}>
  {/* content div — 항상 존재, 셀 크기 잡아줌 */}
  <div class={wrapperClass} style={{ visibility: isEditable() ? "hidden" : undefined }}>
    {displayValue() || local.placeholder || "\u00A0"}
  </div>

  {/* input — 편집 가능할 때만, content 위에 겹침 */}
  <Show when={isEditable()}>
    <div class={twMerge(wrapperClass, "absolute left-0 top-0 size-full")}>
      <input class={inputClass} />
    </div>
  </Show>
</div>
```

핵심:

- content div가 항상 DOM에 존재 → 셀 크기 유지
- 편집 모드: content `visibility: hidden`, input wrapper가 `absolute left-0 top-0 size-full`로 위에 겹침
- readonly/disabled: content만 보임, input 없음
- content div와 input wrapper가 동일한 `wrapperClass` 공유 → 크기 일치
- `inset-0` 대신 `left-0 top-0 size-full` 사용 (Chrome 84 미지원: `inset`)

### isEditable 정의 변경

```tsx
// 기존
const isDisplayMode = () => local.disabled || local.readonly;

// 변경 (inset 분기에서 사용)
const isEditable = () => !local.disabled && !local.readonly;
```

### Field.styles.ts 변경

`getWrapperClass`에서 twMerge 순서 조정 — `fieldInsetClass`가 `fieldReadonlyClass`/`fieldDisabledClass` **뒤에** 위치하여 inset의 `bg-transparent`가 항상 이기도록:

```typescript
const getWrapperClass = () =>
  twMerge(
    fieldBaseClass,
    local.size && fieldSizeClasses[local.size],
    local.error && fieldErrorClass,
    local.disabled && fieldDisabledClass,
    local.readonly && fieldReadonlyClass,
    local.inset && fieldInsetClass, // ← 마지막 (disabled/readonly보다 뒤)
    // inset 분기에서는 local.class가 outer div에 적용되므로 여기선 제외
  );
```

---

## Task 1: TextField dual-element 패턴

**Files:**

- Modify: `packages/solid/src/components/form-control/field/TextField.tsx`
- Test: `packages/solid/tests/components/form-control/field/TextField.spec.tsx`

### Step 1: 기존 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextField.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

### Step 2: inset + dual-element 테스트 추가

`TextField.spec.tsx`의 `describe("inset 스타일")` 블록을 아래로 교체:

```tsx
describe("inset 스타일", () => {
  it("inset=true일 때 테두리가 없고 배경이 투명하다", () => {
    const { container } = render(() => <TextField inset />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("border-none")).toBe(true);
    expect(wrapper.classList.contains("bg-transparent")).toBe(true);
  });

  it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
    const { container } = render(() => <TextField inset readonly value="Hello" />);
    // inset이므로 outer relative div가 최상위
    const outer = container.firstChild as HTMLElement;
    expect(outer.classList.contains("relative")).toBe(true);

    // content div 존재, 값 표시
    const contentDiv = outer.querySelector("[data-text-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.textContent).toBe("Hello");

    // input 없음
    const input = outer.querySelector("input");
    expect(input).toBeFalsy();
  });

  it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
    const { container } = render(() => <TextField inset value="Hello" />);
    const outer = container.firstChild as HTMLElement;

    // content div 존재 (visibility: hidden)
    const contentDiv = outer.querySelector("[data-text-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.style.visibility).toBe("hidden");

    // input도 존재
    const input = outer.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("Hello");
  });

  it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
    const { container } = render(() => <TextField inset readonly />);
    const outer = container.firstChild as HTMLElement;
    const contentDiv = outer.querySelector("[data-text-field-content]") as HTMLElement;
    expect(contentDiv.textContent).toBe("\u00A0");
  });

  it("inset + readonly ↔ editable 전환 시 content div가 항상 DOM에 존재한다", () => {
    const [readonly, setReadonly] = createSignal(true);
    const { container } = render(() => <TextField inset readonly={readonly()} value="Test" />);
    const outer = container.firstChild as HTMLElement;

    // readonly 상태: content 존재, input 없음
    let contentDiv = outer.querySelector("[data-text-field-content]");
    expect(contentDiv).toBeTruthy();
    expect(outer.querySelector("input")).toBeFalsy();

    // editable 전환
    setReadonly(false);
    contentDiv = outer.querySelector("[data-text-field-content]");
    expect(contentDiv).toBeTruthy(); // 여전히 DOM에 존재
    expect(outer.querySelector("input")).toBeTruthy(); // input 등장
  });
});
```

### Step 3: 테스트 실행하여 실패 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextField.spec.tsx --project=solid --run`
Expected: 새 테스트 FAIL (아직 dual-element 미구현)

### Step 4: TextField 구현 — dual-element 패턴 적용

`TextField.tsx`의 return문을 아래로 교체:

```tsx
export const TextField: Component<TextFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "type",
    "placeholder",
    "title",
    "autocomplete",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "format",
    "class",
    "style",
  ]);

  // controlled/uncontrolled 패턴 지원
  const [value, setValue] = createPropSignal({
    value: () => local.value ?? "",
    onChange: () => local.onValueChange,
  });

  // 포맷이 적용된 표시 값
  const displayValue = () => {
    const val = value();
    if (local.format != null && local.format !== "") {
      return applyFormat(val, local.format);
    }
    return val;
  };

  // 입력 핸들러
  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    let newValue = e.currentTarget.value;

    if (local.format != null && local.format !== "") {
      newValue = removeFormat(newValue, local.format);
    }

    setValue(newValue);
  };

  // wrapper 클래스 (inset 분기에서는 local.class 제외)
  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.inset && fieldInsetClass,
      includeCustomClass && local.class,
    );

  const isEditable = () => !local.disabled && !local.readonly;

  // inset 모드: dual-element overlay 패턴
  if (local.inset) {
    return (
      <div {...rest} data-text-field class={clsx("relative", local.class)} style={local.style}>
        {/* content div — 항상 존재, 셀 크기 잡아줌 */}
        <div
          data-text-field-content
          class={getWrapperClass(false)}
          style={{ visibility: isEditable() ? "hidden" : undefined }}
          title={local.title}
        >
          {displayValue() || local.placeholder || "\u00A0"}
        </div>

        {/* input — 편집 가능할 때만 */}
        <Show when={isEditable()}>
          <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
            <input
              type={local.type ?? "text"}
              class={fieldInputClass}
              value={displayValue()}
              placeholder={local.placeholder}
              title={local.title}
              autocomplete={local.autocomplete}
              onInput={handleInput}
            />
          </div>
        </Show>
      </div>
    );
  }

  // standalone 모드: 기존 Show 패턴 유지
  return (
    <Show
      when={isEditable()}
      fallback={
        <div
          {...rest}
          data-text-field
          class={twMerge(getWrapperClass(true), "sd-text-field")}
          style={local.style}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>
      }
    >
      <div {...rest} data-text-field class={getWrapperClass(true)} style={local.style}>
        <input
          type={local.type ?? "text"}
          class={fieldInputClass}
          value={displayValue()}
          placeholder={local.placeholder}
          title={local.title}
          autocomplete={local.autocomplete}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
```

**주요 변경:**

- `import clsx from "clsx"` 추가
- `getWrapperClass(includeCustomClass)` — inset 분기에서 `local.class`는 outer div에만 적용
- `local.inset`에 따라 분기: inset이면 dual-element, 아니면 기존 Show
- inset content div에 `data-text-field-content` 속성 추가 (테스트 셀렉터용)
- `absolute left-0 top-0 size-full` 사용 (`inset-0`은 Chrome 84 미지원)

### Step 5: 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextField.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

### Step 6: 타입체크

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

### Step 7: 커밋

```bash
git add packages/solid/src/components/form-control/field/TextField.tsx packages/solid/tests/components/form-control/field/TextField.spec.tsx
git commit -m "feat(solid): TextField inset dual-element overlay 패턴 적용"
```

---

## Task 2: NumberField dual-element 패턴

**Files:**

- Modify: `packages/solid/src/components/form-control/field/NumberField.tsx`
- Test: `packages/solid/tests/components/form-control/field/NumberField.spec.tsx`

### Step 1: 기존 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/NumberField.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

### Step 2: inset + dual-element 테스트 추가

`NumberField.spec.tsx`에 `describe("inset dual-element")` 블록 추가:

```tsx
describe("inset dual-element", () => {
  it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
    const { container } = render(() => <NumberField inset readonly value={1234} />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.classList.contains("relative")).toBe(true);

    const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.textContent).toBe("1,234");

    expect(outer.querySelector("input")).toBeFalsy();
  });

  it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
    const { container } = render(() => <NumberField inset value={1234} />);
    const outer = container.firstChild as HTMLElement;

    const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.style.visibility).toBe("hidden");

    const input = outer.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
  });

  it("inset + readonly에서 우측 정렬이 적용된다", () => {
    const { container } = render(() => <NumberField inset readonly value={100} />);
    const outer = container.firstChild as HTMLElement;
    const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
    expect(contentDiv.classList.contains("justify-end")).toBe(true);
  });

  it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
    const { container } = render(() => <NumberField inset readonly />);
    const outer = container.firstChild as HTMLElement;
    const contentDiv = outer.querySelector("[data-number-field-content]") as HTMLElement;
    expect(contentDiv.textContent).toBe("\u00A0");
  });
});
```

### Step 3: 테스트 실행하여 실패 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/NumberField.spec.tsx --project=solid --run`
Expected: 새 테스트 FAIL

### Step 4: NumberField 구현 — dual-element 패턴 적용

`NumberField.tsx`의 return문을 아래로 교체. TextField와 동일한 패턴이되, NumberField 고유 사항 반영:

```tsx
export const NumberField: Component<NumberFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "useComma",
    "minDigits",
    "min",
    "max",
    "step",
    "placeholder",
    "title",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "class",
    "style",
  ]);

  const [inputStr, setInputStr] = createSignal<string>("");
  const [isEditing, setIsEditing] = createSignal(false);

  const [value, setValue] = createPropSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  createEffect(() => {
    const val = value();
    if (!isEditing()) {
      setInputStr(formatNumber(val, local.useComma ?? true, local.minDigits));
    }
  });

  const displayValue = () => {
    if (isEditing()) {
      return inputStr();
    }
    return formatNumber(value(), local.useComma ?? true, local.minDigits);
  };

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value;
    if (!isValidNumberInput(newValue)) {
      e.currentTarget.value = inputStr();
      return;
    }
    setInputStr(newValue);
    setIsEditing(true);
    const num = parseNumber(newValue);
    setValue(num);
  };

  const handleFocus: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = () => {
    setIsEditing(true);
    const val = value();
    if (val != null) {
      setInputStr(String(val));
    }
  };

  const handleBlur: JSX.FocusEventHandler<HTMLInputElement, FocusEvent> = () => {
    setIsEditing(false);
    setInputStr(formatNumber(value(), local.useComma ?? true, local.minDigits));
  };

  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.inset && fieldInsetClass,
      includeCustomClass && local.class,
    );

  const isEditable = () => !local.disabled && !local.readonly;

  // inset 모드: dual-element overlay 패턴
  if (local.inset) {
    return (
      <div {...rest} data-number-field class={clsx("relative", local.class)} style={local.style}>
        <div
          data-number-field-content
          class={twMerge(getWrapperClass(false), "justify-end")}
          style={{ visibility: isEditable() ? "hidden" : undefined }}
          title={local.title}
        >
          {formatNumber(value(), local.useComma ?? true, local.minDigits) || "\u00A0"}
        </div>

        <Show when={isEditable()}>
          <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
            <input
              type="text"
              inputmode="numeric"
              class={numberInputClass}
              value={displayValue()}
              placeholder={local.placeholder}
              title={local.title}
              min={local.min}
              max={local.max}
              step={local.step}
              onInput={handleInput}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        </Show>
      </div>
    );
  }

  // standalone 모드
  return (
    <Show
      when={isEditable()}
      fallback={
        <div
          {...rest}
          data-number-field
          class={twMerge(getWrapperClass(true), "sd-number-field", "justify-end")}
          style={local.style}
          title={local.title}
        >
          {formatNumber(value(), local.useComma ?? true, local.minDigits) || "\u00A0"}
        </div>
      }
    >
      <div {...rest} data-number-field class={getWrapperClass(true)} style={local.style}>
        <input
          type="text"
          inputmode="numeric"
          class={numberInputClass}
          value={displayValue()}
          placeholder={local.placeholder}
          title={local.title}
          min={local.min}
          max={local.max}
          step={local.step}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
    </Show>
  );
};
```

**주요 변경:**

- `import clsx from "clsx"` 추가
- `getWrapperClass(includeCustomClass)` 파라미터화
- inset content div에 `justify-end` 추가 (우측 정렬)
- inset content div에 `data-number-field-content` 속성 추가

### Step 5: 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/NumberField.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

### Step 6: 커밋

```bash
git add packages/solid/src/components/form-control/field/NumberField.tsx packages/solid/tests/components/form-control/field/NumberField.spec.tsx
git commit -m "feat(solid): NumberField inset dual-element overlay 패턴 적용"
```

---

## Task 3: DateField dual-element 패턴

**Files:**

- Modify: `packages/solid/src/components/form-control/field/DateField.tsx`
- Test: `packages/solid/tests/components/form-control/field/DateField.spec.tsx`

### Step 1: 기존 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/DateField.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

### Step 2: inset + dual-element 테스트 추가

```tsx
describe("inset dual-element", () => {
  it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
    const { container } = render(() => <DateField inset readonly value={new DateOnly(2025, 3, 15)} />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.classList.contains("relative")).toBe(true);

    const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.textContent).toBe("2025-03-15");

    expect(outer.querySelector("input")).toBeFalsy();
  });

  it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
    const { container } = render(() => <DateField inset value={new DateOnly(2025, 3, 15)} />);
    const outer = container.firstChild as HTMLElement;

    const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.style.visibility).toBe("hidden");

    const input = outer.querySelector("input") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe("2025-03-15");
  });

  it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
    const { container } = render(() => <DateField inset readonly />);
    const outer = container.firstChild as HTMLElement;
    const contentDiv = outer.querySelector("[data-date-field-content]") as HTMLElement;
    expect(contentDiv.textContent).toBe("\u00A0");
  });
});
```

### Step 3: 테스트 실행하여 실패 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/DateField.spec.tsx --project=solid --run`
Expected: 새 테스트 FAIL

### Step 4: DateField 구현 — dual-element 패턴 적용

TextField와 동일한 패턴. return문 교체:

```tsx
export const DateField: Component<DateFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "type",
    "min",
    "max",
    "title",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "class",
    "style",
  ]);

  const fieldType = () => local.type ?? "date";

  const [value, setValue] = createPropSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  const displayValue = () => formatValue(value(), fieldType());

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value;
    const parsed = parseValue(newValue, fieldType());
    setValue(parsed);
  };

  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.inset && fieldInsetClass,
      includeCustomClass && local.class,
    );

  const isEditable = () => !local.disabled && !local.readonly;

  if (local.inset) {
    return (
      <div {...rest} data-date-field class={clsx("relative", local.class)} style={local.style}>
        <div
          data-date-field-content
          class={getWrapperClass(false)}
          style={{ visibility: isEditable() ? "hidden" : undefined }}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>

        <Show when={isEditable()}>
          <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
            <input
              type={getInputType(fieldType())}
              class={fieldInputClass}
              value={displayValue()}
              title={local.title}
              min={formatMinMax(local.min, fieldType())}
              max={formatMinMax(local.max, fieldType())}
              onInput={handleInput}
            />
          </div>
        </Show>
      </div>
    );
  }

  return (
    <Show
      when={isEditable()}
      fallback={
        <div
          {...rest}
          data-date-field
          class={twMerge(getWrapperClass(true), "sd-date-field")}
          style={local.style}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>
      }
    >
      <div {...rest} data-date-field class={getWrapperClass(true)} style={local.style}>
        <input
          type={getInputType(fieldType())}
          class={fieldInputClass}
          value={displayValue()}
          title={local.title}
          min={formatMinMax(local.min, fieldType())}
          max={formatMinMax(local.max, fieldType())}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
```

**변경:** `import clsx from "clsx"` 추가, `getWrapperClass` 파라미터화, inset 분기.

### Step 5: 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/DateField.spec.tsx --project=solid --run`
Expected: 모든 테스트 PASS

### Step 6: 커밋

```bash
git add packages/solid/src/components/form-control/field/DateField.tsx packages/solid/tests/components/form-control/field/DateField.spec.tsx
git commit -m "feat(solid): DateField inset dual-element overlay 패턴 적용"
```

---

## Task 4: DateTimeField dual-element 패턴

**Files:**

- Modify: `packages/solid/src/components/form-control/field/DateTimeField.tsx`
- Test: `packages/solid/tests/components/form-control/field/DateTimeField.spec.tsx`

### Step 1: 기존 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/DateTimeField.spec.tsx --project=solid --run`

### Step 2: inset + dual-element 테스트 추가

```tsx
describe("inset dual-element", () => {
  it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
    const { container } = render(() => <DateTimeField inset readonly value={new DateTime(2025, 3, 15, 14, 30, 0)} />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.classList.contains("relative")).toBe(true);

    const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.textContent).toBe("2025-03-15T14:30");

    expect(outer.querySelector("input")).toBeFalsy();
  });

  it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
    const { container } = render(() => <DateTimeField inset value={new DateTime(2025, 3, 15, 14, 30, 0)} />);
    const outer = container.firstChild as HTMLElement;

    const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.style.visibility).toBe("hidden");

    expect(outer.querySelector("input")).toBeTruthy();
  });

  it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
    const { container } = render(() => <DateTimeField inset readonly />);
    const outer = container.firstChild as HTMLElement;
    const contentDiv = outer.querySelector("[data-datetime-field-content]") as HTMLElement;
    expect(contentDiv.textContent).toBe("\u00A0");
  });
});
```

### Step 3: 테스트 실행하여 실패 확인

### Step 4: DateTimeField 구현

TextField 패턴과 동일. `import clsx`, `getWrapperClass` 파라미터화, inset 분기 추가.

```tsx
export const DateTimeField: Component<DateTimeFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "type",
    "min",
    "max",
    "title",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "class",
    "style",
  ]);

  const fieldType = () => local.type ?? "datetime";

  const [value, setValue] = createPropSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  const displayValue = () => formatValue(value(), fieldType());

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value;
    const parsed = parseValue(newValue, fieldType());
    setValue(parsed);
  };

  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.inset && fieldInsetClass,
      includeCustomClass && local.class,
    );

  const isEditable = () => !local.disabled && !local.readonly;
  const getStep = () => (fieldType() === "datetime-sec" ? "1" : undefined);

  if (local.inset) {
    return (
      <div {...rest} data-datetime-field class={clsx("relative", local.class)} style={local.style}>
        <div
          data-datetime-field-content
          class={getWrapperClass(false)}
          style={{ visibility: isEditable() ? "hidden" : undefined }}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>

        <Show when={isEditable()}>
          <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
            <input
              type="datetime-local"
              class={fieldInputClass}
              value={displayValue()}
              title={local.title}
              min={formatMinMax(local.min, fieldType())}
              max={formatMinMax(local.max, fieldType())}
              step={getStep()}
              onInput={handleInput}
            />
          </div>
        </Show>
      </div>
    );
  }

  return (
    <Show
      when={isEditable()}
      fallback={
        <div
          {...rest}
          data-datetime-field
          class={twMerge(getWrapperClass(true), "sd-datetime-field")}
          style={local.style}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>
      }
    >
      <div {...rest} data-datetime-field class={getWrapperClass(true)} style={local.style}>
        <input
          type="datetime-local"
          class={fieldInputClass}
          value={displayValue()}
          title={local.title}
          min={formatMinMax(local.min, fieldType())}
          max={formatMinMax(local.max, fieldType())}
          step={getStep()}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
```

### Step 5: 테스트 실행하여 통과 확인

### Step 6: 커밋

```bash
git add packages/solid/src/components/form-control/field/DateTimeField.tsx packages/solid/tests/components/form-control/field/DateTimeField.spec.tsx
git commit -m "feat(solid): DateTimeField inset dual-element overlay 패턴 적용"
```

---

## Task 5: TimeField dual-element 패턴

**Files:**

- Modify: `packages/solid/src/components/form-control/field/TimeField.tsx`
- Test: `packages/solid/tests/components/form-control/field/TimeField.spec.tsx`

### Step 1: 기존 테스트 실행하여 통과 확인

### Step 2: inset + dual-element 테스트 추가

```tsx
describe("inset dual-element", () => {
  it("inset + readonly일 때 content div가 보이고 input이 없다", () => {
    const { container } = render(() => <TimeField inset readonly value={new Time(14, 30, 0)} />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.classList.contains("relative")).toBe(true);

    const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.textContent).toBe("14:30");

    expect(outer.querySelector("input")).toBeFalsy();
  });

  it("inset + editable일 때 content div(hidden)와 input이 모두 존재한다", () => {
    const { container } = render(() => <TimeField inset value={new Time(14, 30, 0)} />);
    const outer = container.firstChild as HTMLElement;

    const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.style.visibility).toBe("hidden");

    expect(outer.querySelector("input")).toBeTruthy();
  });

  it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
    const { container } = render(() => <TimeField inset readonly />);
    const outer = container.firstChild as HTMLElement;
    const contentDiv = outer.querySelector("[data-time-field-content]") as HTMLElement;
    expect(contentDiv.textContent).toBe("\u00A0");
  });
});
```

### Step 3: 테스트 실행하여 실패 확인

### Step 4: TimeField 구현

```tsx
export const TimeField: Component<TimeFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "type",
    "title",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "class",
    "style",
  ]);

  const fieldType = () => local.type ?? "time";

  const [value, setValue] = createPropSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  const displayValue = () => formatValue(value(), fieldType());

  const handleInput: JSX.InputEventHandler<HTMLInputElement, InputEvent> = (e) => {
    const newValue = e.currentTarget.value;
    const parsed = parseValue(newValue, fieldType());
    setValue(parsed);
  };

  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldBaseClass,
      local.size && fieldSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.inset && fieldInsetClass,
      includeCustomClass && local.class,
    );

  const isEditable = () => !local.disabled && !local.readonly;
  const getStep = () => (fieldType() === "time-sec" ? "1" : undefined);

  if (local.inset) {
    return (
      <div {...rest} data-time-field class={clsx("relative", local.class)} style={local.style}>
        <div
          data-time-field-content
          class={getWrapperClass(false)}
          style={{ visibility: isEditable() ? "hidden" : undefined }}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>

        <Show when={isEditable()}>
          <div class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}>
            <input
              type="time"
              class={fieldInputClass}
              value={displayValue()}
              title={local.title}
              step={getStep()}
              onInput={handleInput}
            />
          </div>
        </Show>
      </div>
    );
  }

  return (
    <Show
      when={isEditable()}
      fallback={
        <div
          {...rest}
          data-time-field
          class={twMerge(getWrapperClass(true), "sd-time-field")}
          style={local.style}
          title={local.title}
        >
          {displayValue() || "\u00A0"}
        </div>
      }
    >
      <div {...rest} data-time-field class={getWrapperClass(true)} style={local.style}>
        <input
          type="time"
          class={fieldInputClass}
          value={displayValue()}
          title={local.title}
          step={getStep()}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
```

### Step 5: 테스트 실행하여 통과 확인

### Step 6: 커밋

```bash
git add packages/solid/src/components/form-control/field/TimeField.tsx packages/solid/tests/components/form-control/field/TimeField.spec.tsx
git commit -m "feat(solid): TimeField inset dual-element overlay 패턴 적용"
```

---

## Task 6: TextAreaField dual-element 패턴

**Files:**

- Modify: `packages/solid/src/components/form-control/field/TextAreaField.tsx`
- Test: `packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx`

TextAreaField는 이미 hidden div + textarea overlay 구조를 가지고 있다. inset 모드에서의 변경은:

- readonly/disabled일 때도 hidden div가 항상 존재하여 크기를 잡아줌
- 기존: readonly → `<Show>` fallback div (hidden div 없음)
- 변경: inset일 때 항상 hidden div + textarea(편집 시만) 구조 유지

### Step 1: 기존 테스트 실행하여 통과 확인

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx --project=solid --run`

### Step 2: inset + dual-element 테스트 추가

```tsx
describe("inset dual-element", () => {
  it("inset + readonly일 때 content div가 보이고 textarea가 없다", () => {
    const { container } = render(() => <TextAreaField inset readonly value="Hello" />);
    const outer = container.firstChild as HTMLElement;
    expect(outer.classList.contains("relative")).toBe(true);

    const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.textContent).toBe("Hello");

    expect(outer.querySelector("textarea")).toBeFalsy();
  });

  it("inset + editable일 때 content div(hidden)와 textarea가 모두 존재한다", () => {
    const { container } = render(() => <TextAreaField inset value="Hello" />);
    const outer = container.firstChild as HTMLElement;

    const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
    expect(contentDiv).toBeTruthy();
    expect(contentDiv.style.visibility).toBe("hidden");

    const textarea = outer.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe("Hello");
  });

  it("inset + 빈 값일 때 content div에 NBSP가 표시된다", () => {
    const { container } = render(() => <TextAreaField inset readonly />);
    const outer = container.firstChild as HTMLElement;
    const contentDiv = outer.querySelector("[data-textarea-field-content]") as HTMLElement;
    expect(contentDiv.textContent).toBe("\u00A0");
  });
});
```

### Step 3: 테스트 실행하여 실패 확인

### Step 4: TextAreaField 구현

TextAreaField는 특수: 편집 모드에서도 hidden div(높이 계산용)가 이미 존재. inset에서는:

- readonly/disabled → content div만 표시 (기존 텍스트 스타일)
- editable → hidden div(높이 계산) + absolute textarea (기존 구조 유지)

```tsx
export const TextAreaField: Component<TextAreaFieldProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "placeholder",
    "title",
    "disabled",
    "readonly",
    "error",
    "size",
    "inset",
    "minRows",
    "class",
    "style",
  ]);

  const [value, setValue] = createPropSignal({
    value: () => local.value ?? "",
    onChange: () => local.onValueChange,
  });

  const handleInput: JSX.InputEventHandler<HTMLTextAreaElement, InputEvent> = (e) => {
    setValue(e.currentTarget.value);
  };

  const contentForHeight = () => {
    const rows = local.minRows ?? 1;
    const val = value();
    const content = val !== "" && val.split("\n").length >= rows ? val : "\n".repeat(rows - 1) + "\u00A0";
    return content.endsWith("\n") ? content + "\u00A0" : content;
  };

  const getWrapperClass = (includeCustomClass: boolean) =>
    twMerge(
      fieldTextAreaBaseClass,
      local.size && textAreaSizeClasses[local.size],
      local.error && fieldErrorClass,
      local.disabled && fieldDisabledClass,
      local.readonly && fieldReadonlyClass,
      local.inset && fieldInsetClass,
      includeCustomClass && local.class,
    );

  const getTextareaClass = () =>
    twMerge(textareaBaseClass, local.size && textAreaSizeClasses[local.size], local.inset && "p-0");

  const isEditable = () => !local.disabled && !local.readonly;

  if (local.inset) {
    return (
      <div {...rest} data-textarea-field class={clsx("relative", local.class)} style={local.style}>
        {/* content div — 항상 존재, 크기 잡아줌 */}
        <div
          data-textarea-field-content
          class={getWrapperClass(false)}
          style={{
            "visibility": isEditable() ? "hidden" : undefined,
            "white-space": "pre-wrap",
            "word-break": "break-all",
            "position": "relative",
          }}
          title={local.title}
        >
          <div
            data-hidden-content
            style={{
              "visibility": "hidden",
              "white-space": "pre-wrap",
              "word-break": "break-all",
            }}
          >
            {contentForHeight()}
          </div>
          <Show when={!isEditable()}>
            <div
              style={{
                "position": "absolute",
                "left": "0",
                "top": "0",
                "width": "100%",
                "height": "100%",
                "white-space": "pre-wrap",
                "word-break": "break-all",
              }}
            >
              {value() || "\u00A0"}
            </div>
          </Show>
        </div>

        {/* textarea — 편집 가능할 때만 */}
        <Show when={isEditable()}>
          <div
            class={twMerge(getWrapperClass(false), "absolute left-0 top-0 size-full")}
            style={{ position: "absolute" }}
          >
            <div
              data-hidden-content
              style={{
                "visibility": "hidden",
                "white-space": "pre-wrap",
                "word-break": "break-all",
              }}
            >
              {contentForHeight()}
            </div>
            <textarea
              class={getTextareaClass()}
              value={value()}
              placeholder={local.placeholder}
              title={local.title}
              onInput={handleInput}
            />
          </div>
        </Show>
      </div>
    );
  }

  // standalone 모드: 기존 구조 유지
  return (
    <Show
      when={isEditable()}
      fallback={
        <div
          {...rest}
          data-textarea-field
          class={getWrapperClass(true)}
          style={{ "white-space": "pre-wrap", "word-break": "break-all", ...local.style }}
          title={local.title}
        >
          {value() || "\u00A0"}
        </div>
      }
    >
      <div {...rest} data-textarea-field class={getWrapperClass(true)} style={{ position: "relative", ...local.style }}>
        <div
          data-hidden-content
          style={{
            "visibility": "hidden",
            "white-space": "pre-wrap",
            "word-break": "break-all",
          }}
        >
          {contentForHeight()}
        </div>

        <textarea
          class={getTextareaClass()}
          value={value()}
          placeholder={local.placeholder}
          title={local.title}
          onInput={handleInput}
        />
      </div>
    </Show>
  );
};
```

**참고:** TextAreaField의 inset dual-element는 다른 필드보다 복잡함. content div 내부에서 높이 계산용 hidden div + 읽기 전용 텍스트 표시를 모두 처리해야 함. 구현 시 실제 렌더링을 데모에서 확인 필요.

### Step 5: 테스트 실행하여 통과 확인

### Step 6: 커밋

```bash
git add packages/solid/src/components/form-control/field/TextAreaField.tsx packages/solid/tests/components/form-control/field/TextAreaField.spec.tsx
git commit -m "feat(solid): TextAreaField inset dual-element overlay 패턴 적용"
```

---

## Task 7: Field.styles.ts twMerge 순서 확인 + 전체 검증

**Files:**

- Check: `packages/solid/src/components/form-control/field/Field.styles.ts`
- All field components

### Step 1: Field.styles.ts의 twMerge 순서 확인

현재 각 컴포넌트의 `getWrapperClass`에서 `fieldInsetClass`가 `fieldDisabledClass`/`fieldReadonlyClass` **뒤에** 위치하는지 확인. 이미 Task 1-6에서 적용됨.

확인 사항:

```typescript
// 올바른 순서 (inset이 disabled/readonly보다 뒤)
local.disabled && fieldDisabledClass,
local.readonly && fieldReadonlyClass,
local.inset && fieldInsetClass,  // ← 마지막 (bg-transparent가 bg-base-100을 이김)
```

### Step 2: 전체 타입체크

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

### Step 3: 전체 린트

Run: `pnpm lint packages/solid/src/components/form-control/field`
Expected: 에러 없음

### Step 4: 전체 Field 테스트 실행

Run: `pnpm vitest packages/solid/tests/components/form-control/field/ --project=solid --run`
Expected: 모든 테스트 PASS

### Step 5: 데모에서 시각적 확인

Run: `pnpm dev`

브라우저에서 확인할 항목:

1. Field 데모 페이지: inset 필드가 정상 렌더링되는지
2. Sheet 데모 페이지: 셀 편집 시 크기 변동 없는지
3. readonly ↔ 편집 전환이 부드러운지

### Step 6: 최종 커밋 (필요 시)

```bash
git add -A
git commit -m "fix(solid): Field inset dual-element 최종 검증 및 수정"
```

---

## 구현 시 주의사항

1. **Chrome 84 호환**: `inset-0` 대신 `left-0 top-0 size-full` 사용 (CSS `inset`은 Chrome 87+)
2. **SolidJS 반응성**: `local.inset`은 컴포넌트 마운트 시 한 번만 평가되므로 `if (local.inset)` 분기는 안전 (런타임에 inset이 바뀌지 않는다는 전제)
3. **`data-*-content` 속성**: 테스트 셀렉터용. 프로덕션에서 제거할 필요 없음
4. **`getWrapperClass(includeCustomClass)`**: inset 분기에서 `local.class`는 outer relative div에 적용, content/input wrapper에는 적용하지 않음
5. **TextAreaField**: 가장 복잡. 높이 자동 조정 로직이 dual-element와 결합되어 구현 시 세심한 테스트 필요
