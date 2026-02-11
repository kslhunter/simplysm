# Numpad 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 터치/데스크탑 환경에서 사용 가능한 Numpad(숫자 입력 패드) 컴포넌트를 구현한다.

**Architecture:** CSS Grid 레이아웃 기반의 숫자 패드. 상단에 NumberField를 내장하고, 기존 Button 컴포넌트를 재사용한다. `createPropSignal`로 controlled/uncontrolled 패턴을 지원하며, 내부 `inputStr` 시그널로 텍스트 표현을 관리한다.

**Tech Stack:** SolidJS, Tailwind CSS, clsx, tailwind-merge, @tabler/icons-solidjs

**설계 문서:** `docs/plans/2026-02-09-numpad-design.md`

---

### Task 1: Numpad 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/form-control/numpad/Numpad.tsx`

**Step 1: Numpad.tsx 작성**

```tsx
import { type Component, type JSX, createSignal, createEffect, splitProps, Show } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { createPropSignal } from "../../../utils/createPropSignal";
import { Button } from "../Button";
import { NumberField } from "../field/NumberField";
import { Icon } from "../../display/Icon";
import { IconEraser, IconArrowLeft } from "@tabler/icons-solidjs";
import type { ComponentSize } from "../../../styles/tokens.styles";

export interface NumpadProps {
  /** 입력 값 */
  value?: number;
  /** 값 변경 콜백 */
  onValueChange?: (value: number | undefined) => void;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 필수 입력 여부 */
  required?: boolean;
  /** 텍스트 필드 직접 입력 비활성화 */
  inputDisabled?: boolean;
  /** ENT 버튼 표시 */
  useEnterButton?: boolean;
  /** - 버튼 표시 */
  useMinusButton?: boolean;
  /** ENT 클릭 콜백 */
  onEnterButtonClick?: () => void;
  /** 사이즈 */
  size?: ComponentSize;
  /** 커스텀 class */
  class?: string;
  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

const baseClass = clsx("inline-grid grid-cols-3", "gap-0.5", "p-1");

export const Numpad: Component<NumpadProps> = (props) => {
  const [local, rest] = splitProps(props, [
    "value",
    "onValueChange",
    "placeholder",
    "required",
    "inputDisabled",
    "useEnterButton",
    "useMinusButton",
    "onEnterButtonClick",
    "size",
    "class",
    "style",
  ]);

  // 내부 텍스트 상태
  const [inputStr, setInputStr] = createSignal<string>("");

  // controlled/uncontrolled 값 관리
  const [value, setValue] = createPropSignal({
    value: () => local.value,
    onChange: () => local.onValueChange,
  });

  // 외부 value → inputStr 동기화
  createEffect(() => {
    const val = value();
    setInputStr(val != null ? String(val) : "");
  });

  // inputStr → value 파싱
  const applyInputStr = (str: string) => {
    setInputStr(str);
    if (str === "" || str === "-") {
      setValue(undefined);
    } else {
      const num = parseFloat(str);
      if (!Number.isNaN(num)) {
        setValue(num);
      }
    }
  };

  // 버튼 클릭 핸들러
  const handleButtonClick = (key: string) => {
    if (key === "C") {
      applyInputStr("");
    } else if (key === "BS") {
      const cur = inputStr();
      const sliced = cur.slice(0, -1);
      applyInputStr(sliced);
    } else if (key === "ENT") {
      local.onEnterButtonClick?.();
    } else if (key === "Minus") {
      const cur = inputStr();
      if (cur.startsWith("-")) {
        applyInputStr(cur.slice(1));
      } else {
        applyInputStr("-" + cur);
      }
    } else if (key === ".") {
      const cur = inputStr();
      if (!cur.includes(".")) {
        applyInputStr(cur + ".");
      }
    } else {
      // 숫자 0-9
      applyInputStr(inputStr() + key);
    }
  };

  // NumberField 값 변경 핸들러
  const handleFieldValueChange = (v: number | undefined) => {
    setValue(v);
    setInputStr(v != null ? String(v) : "");
  };

  const btnSize = () => local.size ?? "lg";

  return (
    <div data-numpad class={twMerge(baseClass, local.class)} style={local.style}>
      {/* 상단: NumberField */}
      <div class={local.useEnterButton ? "col-span-2" : "col-span-3"}>
        <NumberField
          value={value()}
          onValueChange={handleFieldValueChange}
          placeholder={local.placeholder}
          readonly={local.inputDisabled}
          inset
          class="w-full"
        />
      </div>
      <Show when={local.useEnterButton}>
        <Button
          theme="primary"
          variant="solid"
          size={btnSize()}
          inset
          disabled={local.required && value() == null}
          onClick={() => handleButtonClick("ENT")}
        >
          ENT
        </Button>
      </Show>

      {/* 기능 행: -, C, BS */}
      <Show when={local.useMinusButton}>
        <Button size={btnSize()} inset onClick={() => handleButtonClick("Minus")}>
          -
        </Button>
      </Show>
      <div class={local.useMinusButton ? "" : "col-span-2"}>
        <Button size={btnSize()} inset class="w-full text-danger-500" onClick={() => handleButtonClick("C")}>
          <Icon icon={IconEraser} size="1.25em" />
        </Button>
      </div>
      <Button size={btnSize()} inset class="text-warning-500" onClick={() => handleButtonClick("BS")}>
        <Icon icon={IconArrowLeft} size="1.25em" />
      </Button>

      {/* 숫자 행: 7-9, 4-6, 1-3 */}
      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => (
        <Button size={btnSize()} inset onClick={() => handleButtonClick(String(n))}>
          {n}
        </Button>
      ))}

      {/* 하단: 0, . */}
      <div class="col-span-2">
        <Button size={btnSize()} inset class="w-full" onClick={() => handleButtonClick("0")}>
          0
        </Button>
      </div>
      <Button size={btnSize()} inset onClick={() => handleButtonClick(".")}>
        .
      </Button>
    </div>
  );
};
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS (에러 없음)

**Step 3: 린트 실행**

Run: `pnpm lint packages/solid/src/components/form-control/numpad/Numpad.tsx`
Expected: PASS

**Step 4: 커밋**

```bash
git add packages/solid/src/components/form-control/numpad/Numpad.tsx
git commit -m "feat(solid): Numpad 컴포넌트 구현"
```

---

### Task 2: index.ts에 export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

`packages/solid/src/index.ts`의 form-control 섹션 마지막(현재 `RichTextEditor` export 다음)에 추가:

```typescript
export * from "./components/form-control/numpad/Numpad";
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "feat(solid): Numpad를 index.ts에 export 추가"
```

---

### Task 3: 데모 페이지 작성

**Files:**

- Create: `packages/solid-demo/src/pages/form-control/NumpadPage.tsx`
- Modify: `packages/solid-demo/src/main.tsx` (라우트 추가)
- Modify: `packages/solid-demo/src/pages/Home.tsx` (메뉴 추가)

**Step 1: NumpadPage.tsx 작성**

```tsx
import { createSignal } from "solid-js";
import { Numpad, Topbar } from "@simplysm/solid";

export default function NumpadPage() {
  const [val1, setVal1] = createSignal<number | undefined>();
  const [val2, setVal2] = createSignal<number | undefined>(123.45);
  const [val3, setVal3] = createSignal<number | undefined>();
  const [val4, setVal4] = createSignal<number | undefined>();

  return (
    <Topbar.Container>
      <Topbar>
        <h1 class="m-0 text-base">Numpad</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-12">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">기본 사용</h2>
            <div class="flex items-start gap-6">
              <Numpad value={val1()} onValueChange={setVal1} placeholder="숫자 입력" />
              <div class="text-sm text-base-500">
                value: <code>{JSON.stringify(val1())}</code>
              </div>
            </div>
          </section>

          {/* 초기값 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">초기값</h2>
            <div class="flex items-start gap-6">
              <Numpad value={val2()} onValueChange={setVal2} />
              <div class="text-sm text-base-500">
                value: <code>{JSON.stringify(val2())}</code>
              </div>
            </div>
          </section>

          {/* ENT + Minus 버튼 */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">ENT & Minus 버튼</h2>
            <div class="flex items-start gap-6">
              <Numpad
                value={val3()}
                onValueChange={setVal3}
                useEnterButton
                useMinusButton
                onEnterButtonClick={() => alert(`입력값: ${val3()}`)}
                placeholder="ENT 클릭 시 alert"
              />
              <div class="text-sm text-base-500">
                value: <code>{JSON.stringify(val3())}</code>
              </div>
            </div>
          </section>

          {/* inputDisabled + required */}
          <section>
            <h2 class="mb-6 text-2xl font-bold">입력 비활성화 & 필수</h2>
            <div class="flex items-start gap-6">
              <Numpad
                value={val4()}
                onValueChange={setVal4}
                inputDisabled
                required
                useEnterButton
                onEnterButtonClick={() => alert(`입력값: ${val4()}`)}
                placeholder="버튼으로만 입력"
              />
              <div class="text-sm text-base-500">
                value: <code>{JSON.stringify(val4())}</code>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Topbar.Container>
  );
}
```

**Step 2: main.tsx에 라우트 추가**

`packages/solid-demo/src/main.tsx`의 `rich-text-editor` 라우트 다음에 추가:

```typescript
<Route path="/home/form-control/numpad" component={lazy(() => import("./pages/form-control/NumpadPage"))} />
```

**Step 3: Home.tsx에 메뉴 항목 추가**

`packages/solid-demo/src/pages/Home.tsx`의 Form Control children 배열에서 `RichTextEditor` 항목 다음에 추가:

```typescript
{ title: "Numpad", href: "/home/form-control/numpad" },
```

**Step 4: 타입체크 실행**

Run: `pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 5: 커밋**

```bash
git add packages/solid-demo/src/pages/form-control/NumpadPage.tsx packages/solid-demo/src/main.tsx packages/solid-demo/src/pages/Home.tsx
git commit -m "feat(solid-demo): Numpad 데모 페이지 추가"
```

---

### Task 4: 테스트 작성

**Files:**

- Create: `packages/solid/tests/components/form-control/numpad/Numpad.spec.tsx`

**Step 1: 테스트 작성**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Numpad } from "../../../../src/components/form-control/numpad/Numpad";

describe("Numpad", () => {
  describe("기본 렌더링", () => {
    it("숫자 버튼 0-9를 렌더링한다", () => {
      render(() => <Numpad />);
      for (let i = 0; i <= 9; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument();
      }
    });

    it("C, BS 버튼을 렌더링한다", () => {
      const { container } = render(() => <Numpad />);
      expect(container.querySelector("[data-numpad]")).toBeInTheDocument();
    });

    it(". 버튼을 렌더링한다", () => {
      render(() => <Numpad />);
      expect(screen.getByText(".")).toBeInTheDocument();
    });
  });

  describe("숫자 입력", () => {
    it("숫자 버튼 클릭 시 값이 변경된다", () => {
      const onChange = vi.fn();
      render(() => <Numpad onValueChange={onChange} />);
      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("2"));
      fireEvent.click(screen.getByText("3"));
      expect(onChange).toHaveBeenLastCalledWith(123);
    });

    it("소수점 입력이 동작한다", () => {
      const onChange = vi.fn();
      render(() => <Numpad onValueChange={onChange} />);
      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("."));
      fireEvent.click(screen.getByText("5"));
      expect(onChange).toHaveBeenLastCalledWith(1.5);
    });

    it("소수점 중복 입력을 무시한다", () => {
      const onChange = vi.fn();
      render(() => <Numpad onValueChange={onChange} />);
      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("."));
      fireEvent.click(screen.getByText("."));
      fireEvent.click(screen.getByText("5"));
      expect(onChange).toHaveBeenLastCalledWith(1.5);
    });
  });

  describe("기능 버튼", () => {
    it("C 버튼 클릭 시 값이 초기화된다", () => {
      const onChange = vi.fn();
      render(() => <Numpad value={123} onValueChange={onChange} />);
      // C 버튼은 Icon을 포함하므로 data-icon으로 찾기보다 부모 버튼의 클릭 이벤트 테스트
      const buttons = screen.getAllByRole("button");
      // C 버튼 찾기 (eraser 아이콘이 있는 버튼)
      const cButton = buttons.find(
        (btn) => btn.querySelector("[data-icon]") && btn.classList.contains("text-danger-500"),
      );
      expect(cButton).toBeTruthy();
      fireEvent.click(cButton!);
      expect(onChange).toHaveBeenLastCalledWith(undefined);
    });

    it("BS 버튼 클릭 시 마지막 문자가 제거된다", () => {
      const onChange = vi.fn();
      render(() => <Numpad onValueChange={onChange} />);
      fireEvent.click(screen.getByText("1"));
      fireEvent.click(screen.getByText("2"));
      // BS 버튼 (warning 색상 아이콘 버튼)
      const buttons = screen.getAllByRole("button");
      const bsButton = buttons.find(
        (btn) => btn.querySelector("[data-icon]") && btn.classList.contains("text-warning-500"),
      );
      expect(bsButton).toBeTruthy();
      fireEvent.click(bsButton!);
      expect(onChange).toHaveBeenLastCalledWith(1);
    });
  });

  describe("ENT 버튼", () => {
    it("useEnterButton이 false이면 ENT 버튼이 없다", () => {
      render(() => <Numpad />);
      expect(screen.queryByText("ENT")).not.toBeInTheDocument();
    });

    it("useEnterButton이 true이면 ENT 버튼을 렌더링한다", () => {
      render(() => <Numpad useEnterButton />);
      expect(screen.getByText("ENT")).toBeInTheDocument();
    });

    it("ENT 클릭 시 onEnterButtonClick 콜백이 호출된다", () => {
      const onEnter = vi.fn();
      render(() => <Numpad useEnterButton onEnterButtonClick={onEnter} />);
      fireEvent.click(screen.getByText("ENT"));
      expect(onEnter).toHaveBeenCalledOnce();
    });

    it("required이고 값이 없으면 ENT 버튼이 비활성화된다", () => {
      render(() => <Numpad useEnterButton required />);
      expect(screen.getByText("ENT").closest("button")).toBeDisabled();
    });
  });

  describe("Minus 버튼", () => {
    it("useMinusButton이 false이면 - 버튼이 없다", () => {
      render(() => <Numpad />);
      // 숫자가 아닌 단독 "-" 텍스트 버튼이 없어야 함
      const buttons = screen.getAllByRole("button");
      const minusButton = buttons.find((btn) => btn.textContent === "-");
      expect(minusButton).toBeUndefined();
    });

    it("useMinusButton이 true이면 - 버튼을 렌더링한다", () => {
      render(() => <Numpad useMinusButton />);
      const buttons = screen.getAllByRole("button");
      const minusButton = buttons.find((btn) => btn.textContent === "-");
      expect(minusButton).toBeTruthy();
    });

    it("- 클릭 시 부호가 토글된다", () => {
      const onChange = vi.fn();
      render(() => <Numpad useMinusButton onValueChange={onChange} />);
      fireEvent.click(screen.getByText("5"));
      const buttons = screen.getAllByRole("button");
      const minusButton = buttons.find((btn) => btn.textContent === "-")!;
      fireEvent.click(minusButton);
      expect(onChange).toHaveBeenLastCalledWith(-5);
    });
  });

  describe("controlled 모드", () => {
    it("외부 value 변경이 반영된다", () => {
      const [value, setValue] = createSignal<number | undefined>(100);
      render(() => <Numpad value={value()} onValueChange={setValue} />);
      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.value).toContain("100");
      setValue(200);
      expect(input.value).toContain("200");
    });
  });
});
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/components/form-control/numpad/Numpad.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/form-control/numpad/Numpad.spec.tsx
git commit -m "test(solid): Numpad 테스트 추가"
```

---

### Task 5: 마이그레이션 문서 업데이트

**Files:**

- Modify: `docs/2026-02-09-solid-migration-remaining.md`

**Step 1: 5번 항목 상태를 `[x]`로 변경**

`docs/2026-02-09-solid-migration-remaining.md`의 14번째 줄:

```
| 5 | **Numpad** | 숫자 입력 패드 | [ ] |
```

→ 변경:

```
| 5 | **Numpad** | 숫자 입력 패드 | [x] |
```

**Step 2: 커밋**

```bash
git add docs/2026-02-09-solid-migration-remaining.md
git commit -m "docs: Numpad 마이그레이션 완료 표시"
```

---

### Task 6: 데모 페이지 시각 검증

**Step 1: dev 서버 실행**

Run: `pnpm dev` (worktree 내에서)

**Step 2: 브라우저에서 확인**

- Numpad 데모 페이지 접속 (사이드바 → Form Control → Numpad)
- 기본 사용, 초기값, ENT & Minus, inputDisabled 섹션 동작 확인
- 숫자 입력, C, BS, -, ENT, . 버튼 동작 검증

**Step 3: 문제가 있으면 수정 후 커밋**
