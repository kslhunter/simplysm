# Combobox 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 검색 필터링, 자유 입력, 자동완성을 지원하는 범용 Combobox 컴포넌트 구현

**Architecture:** Select 컴포넌트 구조를 참고하되 독립 컴포넌트로 구현. TextInput(inset), Dropdown, List 컴포넌트 재사용. DebounceQueue로 검색 디바운스 처리.

**Tech Stack:** SolidJS, Tailwind CSS, @simplysm/core-common (DebounceQueue)

---

## Task 1: ComboboxContext 생성

**Files:**

- Create: `packages/solid/src/components/form-control/combobox/ComboboxContext.ts`

**Step 1: Context 파일 생성**

```typescript
import { createContext, useContext } from "solid-js";

export interface ComboboxContextValue<T = unknown> {
  /** 값이 선택되어 있는지 확인 */
  isSelected: (value: T) => boolean;

  /** 값 선택 */
  selectValue: (value: T) => void;

  /** 드롭다운 닫기 */
  closeDropdown: () => void;
}

export const ComboboxContext = createContext<ComboboxContextValue>();

export function useComboboxContext<T = unknown>(): ComboboxContextValue<T> {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error("useComboboxContext는 Combobox 컴포넌트 내부에서만 사용할 수 있습니다");
  }
  return context as ComboboxContextValue<T>;
}
```

**Step 2: 린트 확인**

Run: `pnpm lint packages/solid/src/components/form-control/combobox/ComboboxContext.ts`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/solid/src/components/form-control/combobox/ComboboxContext.ts
git commit -m "$(cat <<'EOF'
feat(solid): Combobox Context 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: ComboboxItem 컴포넌트 생성

**Files:**

- Create: `packages/solid/src/components/form-control/combobox/ComboboxItem.tsx`
- Test: `packages/solid/tests/components/form/combobox/ComboboxItem.spec.tsx`

**Step 1: 테스트 파일 생성**

```tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import {
  ComboboxContext,
  type ComboboxContextValue,
} from "../../../../src/components/form-control/combobox/ComboboxContext";
import { ComboboxItem } from "../../../../src/components/form-control/combobox/ComboboxItem";

const createMockContext = (overrides: Partial<ComboboxContextValue> = {}): ComboboxContextValue => ({
  isSelected: () => false,
  selectValue: vi.fn(),
  closeDropdown: vi.fn(),
  ...overrides,
});

describe("ComboboxItem 컴포넌트", () => {
  it("아이템이 렌더링된다", () => {
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext()}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    expect(getByRole("option")).not.toBeNull();
    expect(getByRole("option").textContent).toContain("사과");
  });

  it("클릭 시 selectValue가 호출된다", () => {
    const selectValue = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ selectValue })}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(selectValue).toHaveBeenCalledWith("apple");
  });

  it("선택된 상태일 때 aria-selected가 true", () => {
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ isSelected: () => true })}>
        <ComboboxItem value="apple">사과</ComboboxItem>
      </ComboboxContext.Provider>
    ));

    expect(getByRole("option").getAttribute("aria-selected")).toBe("true");
  });

  it("disabled일 때 클릭이 동작하지 않는다", () => {
    const selectValue = vi.fn();
    const { getByRole } = render(() => (
      <ComboboxContext.Provider value={createMockContext({ selectValue })}>
        <ComboboxItem value="apple" disabled>
          사과
        </ComboboxItem>
      </ComboboxContext.Provider>
    ));

    fireEvent.click(getByRole("option"));
    expect(selectValue).not.toHaveBeenCalled();
  });
});
```

**Step 2: 테스트 실행 (실패 확인)**

Run: `pnpm vitest packages/solid/tests/components/form/combobox/ComboboxItem.spec.tsx --project=solid --run`
Expected: FAIL - 모듈을 찾을 수 없음

**Step 3: ComboboxItem 구현**

```tsx
import { type JSX, type ParentComponent, splitProps } from "solid-js";
import { twMerge } from "tailwind-merge";
import { useComboboxContext } from "./ComboboxContext";
import { ripple } from "../../../directives/ripple";
import {
  listItemBaseClass,
  listItemSelectedClass,
  listItemDisabledClass,
  listItemContentClass,
} from "../../data/list/ListItem.styles";

void ripple;

export interface ComboboxItemProps<T = unknown> extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onClick"
> {
  /** 아이템의 값 */
  value: T;

  /** 비활성화 */
  disabled?: boolean;
}

/**
 * Combobox 드롭다운 내의 선택 가능한 아이템
 */
export const ComboboxItem: ParentComponent<ComboboxItemProps> = <T,>(
  props: ComboboxItemProps<T> & { children?: JSX.Element },
) => {
  const [local, rest] = splitProps(props, ["children", "class", "value", "disabled"]);

  const context = useComboboxContext<T>();

  const isSelected = () => context.isSelected(local.value);
  const useRipple = () => !local.disabled;

  const handleClick = () => {
    if (local.disabled) return;
    context.selectValue(local.value);
    context.closeDropdown();
  };

  const getClassName = () =>
    twMerge(
      listItemBaseClass,
      isSelected() && listItemSelectedClass,
      local.disabled && listItemDisabledClass,
      local.class,
    );

  return (
    <button
      {...rest}
      type="button"
      use:ripple={useRipple()}
      class={getClassName()}
      data-combobox-item
      data-list-item
      role="option"
      aria-selected={isSelected() || undefined}
      aria-disabled={local.disabled || undefined}
      tabIndex={local.disabled ? -1 : 0}
      onClick={handleClick}
    >
      <span class={listItemContentClass}>{local.children}</span>
    </button>
  );
};
```

**Step 4: 테스트 실행 (통과 확인)**

Run: `pnpm vitest packages/solid/tests/components/form/combobox/ComboboxItem.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: 린트 확인**

Run: `pnpm lint packages/solid/src/components/form-control/combobox/ComboboxItem.tsx`
Expected: 에러 없음

**Step 6: 커밋**

```bash
git add packages/solid/src/components/form-control/combobox/ComboboxItem.tsx packages/solid/tests/components/form/combobox/ComboboxItem.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): ComboboxItem 컴포넌트 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Combobox 메인 컴포넌트 - 기본 렌더링

**Files:**

- Create: `packages/solid/src/components/form-control/combobox/Combobox.tsx`
- Test: `packages/solid/tests/components/form/combobox/Combobox.spec.tsx`

**Step 1: 기본 렌더링 테스트 작성**

```tsx
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { Combobox } from "../../../../src/components/form-control/combobox/Combobox";

describe("Combobox 컴포넌트", () => {
  const mockLoadItems = vi.fn(async () => []);

  beforeEach(() => {
    mockLoadItems.mockClear();
  });

  describe("기본 렌더링", () => {
    it("트리거가 렌더링된다", () => {
      const { getByRole } = render(() => <Combobox loadItems={mockLoadItems} renderValue={(v) => <>{v}</>} />);

      expect(getByRole("combobox")).not.toBeNull();
    });

    it("placeholder가 표시된다", () => {
      const { getByPlaceholderText } = render(() => (
        <Combobox loadItems={mockLoadItems} placeholder="검색하세요" renderValue={(v) => <>{v}</>} />
      ));

      expect(getByPlaceholderText("검색하세요")).not.toBeNull();
    });

    it("disabled일 때 aria-disabled가 설정된다", () => {
      const { getByRole } = render(() => <Combobox loadItems={mockLoadItems} disabled renderValue={(v) => <>{v}</>} />);

      expect(getByRole("combobox").getAttribute("aria-disabled")).toBe("true");
    });
  });
});
```

**Step 2: 테스트 실행 (실패 확인)**

Run: `pnpm vitest packages/solid/tests/components/form/combobox/Combobox.spec.tsx --project=solid --run`
Expected: FAIL - 모듈을 찾을 수 없음

**Step 3: Combobox 기본 구조 구현**

````tsx
import {
  children,
  createEffect,
  createSignal,
  For,
  type JSX,
  type ParentComponent,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronDown, IconLoader2 } from "@tabler/icons-solidjs";
import { DebounceQueue } from "@simplysm/core-common";
import { Icon } from "../../display/Icon";
import { Dropdown } from "../../disclosure/Dropdown";
import { List } from "../../data/list/List";
import { TextInput } from "../field/TextInput";
import { ComboboxContext, type ComboboxContextValue } from "./ComboboxContext";
import { ComboboxItem } from "./ComboboxItem";
import { splitSlots } from "../../../utils/splitSlots";
import { borderDefault, type ComponentSize, paddingLg, paddingSm, textMuted } from "../../../styles/tokens.styles";
import { insetBase, insetFocusOutlineSelf } from "../../../styles/patterns.styles";

// 트리거 스타일 (Select와 동일)
const triggerBaseClass = clsx(
  "inline-flex items-center gap-2",
  "w-40",
  "border",
  borderDefault,
  "rounded",
  "bg-transparent",
  "hover:bg-base-100 dark:hover:bg-base-700",
  "cursor-pointer",
  "focus-within:border-primary-400 dark:focus-within:border-primary-400",
);

const triggerDisabledClass = clsx("cursor-default bg-base-200 text-base-400 dark:bg-base-800 dark:text-base-500");

const triggerInsetClass = clsx(insetBase, "bg-transparent", insetFocusOutlineSelf);

const sizeClasses: Record<ComponentSize, string> = {
  sm: clsx("gap-1.5", paddingSm),
  lg: clsx("gap-3", paddingLg),
};

const noResultsClass = clsx("px-3 py-2", textMuted);
const chevronWrapperClass = clsx("opacity-30", "hover:opacity-100", "flex-shrink-0");

/**
 * ItemTemplate 서브 컴포넌트
 */
interface ComboboxItemTemplateProps<T> {
  children: (item: T, index: number) => JSX.Element;
}

const templateFnMap = new WeakMap<HTMLElement, (item: unknown, index: number) => JSX.Element>();

const ComboboxItemTemplate = <T,>(props: ComboboxItemTemplateProps<T>) => (
  <span
    ref={(el) => {
      templateFnMap.set(el, props.children as (item: unknown, index: number) => JSX.Element);
    }}
    data-combobox-item-template
    style={{ display: "none" }}
  />
);

// Props 정의
export interface ComboboxProps<T = unknown> {
  /** 현재 선택된 값 */
  value?: T;

  /** 값 변경 콜백 */
  onValueChange?: (value: T | undefined) => void;

  /** 아이템 로드 함수 (필수) */
  loadItems: (query: string) => Promise<T[]>;

  /** 디바운스 시간 (ms) */
  debounceMs?: number;

  /** 커스텀 값 허용 */
  allowCustomValue?: boolean;

  /** 커스텀 값 파싱 함수 */
  parseCustomValue?: (text: string) => T;

  /** 선택된 값 렌더링 (필수) */
  renderValue: (value: T) => JSX.Element;

  /** 비활성화 */
  disabled?: boolean;

  /** 필수 입력 */
  required?: boolean;

  /** 플레이스홀더 */
  placeholder?: string;

  /** 사이즈 */
  size?: ComponentSize;

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;

  /** children (ItemTemplate) */
  children?: JSX.Element;
}

interface ComboboxComponent {
  <T = unknown>(props: ComboboxProps<T>): JSX.Element;
  Item: typeof ComboboxItem;
  ItemTemplate: typeof ComboboxItemTemplate;
}

/**
 * Combobox 컴포넌트
 *
 * @example
 * ```tsx
 * <Combobox
 *   loadItems={async (q) => users.filter(u => u.name.includes(q))}
 *   renderValue={(u) => u.name}
 *   value={selected()}
 *   onValueChange={setSelected}
 * >
 *   <Combobox.ItemTemplate>
 *     {(user) => <>{user.name}</>}
 *   </Combobox.ItemTemplate>
 * </Combobox>
 * ```
 */
export const Combobox: ComboboxComponent = <T,>(props: ComboboxProps<T>) => {
  const [local, rest] = splitProps(props, [
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "loadItems",
    "debounceMs",
    "allowCustomValue",
    "parseCustomValue",
    "renderValue",
    "disabled",
    "required",
    "placeholder",
    "size",
    "inset",
  ]);

  let triggerRef!: HTMLDivElement;

  // 내부 상태
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [items, setItems] = createSignal<T[]>([]);
  const [loading, setLoading] = createSignal(false);

  // 디바운스 큐
  const debounceQueue = new DebounceQueue(local.debounceMs ?? 300);
  onCleanup(() => debounceQueue.dispose());

  // 선택된 값 관리 (controlled/uncontrolled)
  const [internalValue, setInternalValueRaw] = createSignal<T | undefined>(undefined);

  createEffect(() => {
    const propValue = local.value;
    setInternalValueRaw(() => propValue);
  });

  const isControlled = () => local.onValueChange !== undefined;
  const getValue = () => (isControlled() ? local.value : internalValue());
  const setInternalValue = (newValue: T | undefined) => {
    if (isControlled()) {
      local.onValueChange?.(newValue);
    } else {
      setInternalValueRaw(() => newValue);
    }
  };

  // 아이템 로드
  const loadItemsDebounced = (q: string) => {
    debounceQueue.run(async () => {
      setLoading(true);
      try {
        const result = await local.loadItems(q);
        setItems(result);
      } finally {
        setLoading(false);
      }
    });
  };

  // 입력 처리
  const handleInput = (value: string) => {
    setQuery(value);
    loadItemsDebounced(value);
  };

  // 드롭다운 열릴 때 초기 로드
  createEffect(() => {
    if (open()) {
      loadItemsDebounced(query());
    }
  });

  // 값 선택 시 쿼리 업데이트
  createEffect(() => {
    const val = getValue();
    if (val !== undefined && !open()) {
      // 선택된 값이 있고 드롭다운이 닫혀있으면 쿼리를 비움
      // (다시 열 때 전체 목록 표시)
    }
  });

  // Context 값
  const contextValue: ComboboxContextValue<T> = {
    isSelected: (value: T) => getValue() === value,
    selectValue: (value: T) => {
      setInternalValue(value);
    },
    closeDropdown: () => setOpen(false),
  };

  // 트리거 클래스
  const getTriggerClassName = () =>
    twMerge(
      triggerBaseClass,
      "px-2 py-1",
      local.size && sizeClasses[local.size],
      local.disabled && triggerDisabledClass,
      local.inset && triggerInsetClass,
      local.class,
    );

  // 키보드 처리
  const handleKeyDown = (e: KeyboardEvent) => {
    if (local.disabled) return;

    switch (e.key) {
      case "ArrowDown":
        if (!open()) {
          setOpen(true);
          e.preventDefault();
        }
        break;
      case "Enter":
        if (!open() && local.allowCustomValue && query()) {
          const customValue = local.parseCustomValue ? local.parseCustomValue(query()) : (query() as unknown as T);
          setInternalValue(customValue);
          e.preventDefault();
        }
        break;
      case "Escape":
        setOpen(false);
        e.preventDefault();
        break;
    }
  };

  // 내부 컴포넌트
  const ComboboxInner: ParentComponent = (innerProps) => {
    const resolved = children(() => innerProps.children);
    const [slots] = splitSlots(resolved, ["comboboxItemTemplate"] as const);

    // itemTemplate 함수 추출
    const getItemTemplate = (): ((item: T, index: number) => JSX.Element) | undefined => {
      const templateSlots = slots().comboboxItemTemplate;
      if (templateSlots.length === 0) return undefined;
      return templateFnMap.get(templateSlots[0]) as ((item: T, index: number) => JSX.Element) | undefined;
    };

    // 아이템 렌더링
    const renderItem = (item: T, index: number): JSX.Element => {
      const itemTemplate = getItemTemplate();
      if (itemTemplate) {
        return itemTemplate(item, index);
      }
      return local.renderValue(item);
    };

    // 현재 표시할 텍스트
    const displayQuery = () => {
      const val = getValue();
      if (open()) {
        return query();
      }
      // 드롭다운 닫혀있을 때 선택된 값 표시는 placeholder 처리
      return "";
    };

    return (
      <div {...rest} data-combobox class={local.inset ? "flex" : "inline-flex"}>
        <div
          ref={triggerRef}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open()}
          aria-disabled={local.disabled || undefined}
          aria-required={local.required || undefined}
          class={getTriggerClassName()}
          style={local.style}
          onKeyDown={handleKeyDown}
        >
          <TextInput
            inset
            value={displayQuery()}
            onValueChange={handleInput}
            placeholder={getValue() !== undefined ? undefined : local.placeholder}
            disabled={local.disabled}
            class="flex-1 min-w-0"
          />

          <Show
            when={loading()}
            fallback={
              <div class={chevronWrapperClass}>
                <Icon icon={IconChevronDown} size="1em" />
              </div>
            }
          >
            <div class={chevronWrapperClass}>
              <Icon icon={IconLoader2} size="1em" class="animate-spin" />
            </div>
          </Show>
        </div>

        <Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen} keyboardNav>
          <Show
            when={items().length > 0}
            fallback={
              <Show when={!loading()}>
                <div class={noResultsClass}>검색 결과가 없습니다</div>
              </Show>
            }
          >
            <List inset role="listbox">
              <For each={items()}>
                {(item, index) => <ComboboxItem value={item}>{renderItem(item, index())}</ComboboxItem>}
              </For>
            </List>
          </Show>
        </Dropdown>
      </div>
    );
  };

  return (
    <ComboboxContext.Provider value={contextValue as ComboboxContextValue}>
      <ComboboxInner>{local.children}</ComboboxInner>
    </ComboboxContext.Provider>
  );
};

Combobox.Item = ComboboxItem;
Combobox.ItemTemplate = ComboboxItemTemplate;
````

**Step 4: 테스트 실행 (통과 확인)**

Run: `pnpm vitest packages/solid/tests/components/form/combobox/Combobox.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: 린트 및 타입 체크**

Run: `pnpm lint packages/solid/src/components/form-control/combobox/ && pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 6: 커밋**

```bash
git add packages/solid/src/components/form-control/combobox/Combobox.tsx packages/solid/tests/components/form/combobox/Combobox.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): Combobox 기본 렌더링 구현

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Combobox 드롭다운 동작 테스트

**Files:**

- Modify: `packages/solid/tests/components/form/combobox/Combobox.spec.tsx`

**Step 1: 드롭다운 테스트 추가**

```tsx
// Combobox.spec.tsx에 추가

describe("드롭다운 열기/닫기", () => {
  it("입력 시 드롭다운이 열린다", async () => {
    const loadItems = vi.fn(async () => [{ id: 1, name: "사과" }]);
    const { getByRole } = render(() => (
      <Combobox loadItems={loadItems} renderValue={(v: { name: string }) => <>{v.name}</>} />
    ));

    const input = getByRole("combobox").querySelector("input")!;
    fireEvent.input(input, { target: { value: "사" } });

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });
  });

  it("아이템 선택 시 드롭다운이 닫힌다", async () => {
    const loadItems = vi.fn(async () => [{ id: 1, name: "사과" }]);
    const { getByRole } = render(() => (
      <Combobox loadItems={loadItems} renderValue={(v: { name: string }) => <>{v.name}</>} />
    ));

    const input = getByRole("combobox").querySelector("input")!;
    fireEvent.input(input, { target: { value: "사" } });

    await waitFor(() => {
      expect(document.querySelector("[data-combobox-item]")).not.toBeNull();
    });

    const item = document.querySelector("[data-combobox-item]") as HTMLElement;
    fireEvent.click(item);

    await waitFor(() => {
      expect(getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
    });
  });

  it("Escape 키로 드롭다운이 닫힌다", async () => {
    const loadItems = vi.fn(async () => [{ id: 1, name: "사과" }]);
    const { getByRole } = render(() => (
      <Combobox loadItems={loadItems} renderValue={(v: { name: string }) => <>{v.name}</>} />
    ));

    const input = getByRole("combobox").querySelector("input")!;
    fireEvent.input(input, { target: { value: "사" } });

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    fireEvent.keyDown(getByRole("combobox"), { key: "Escape" });

    await waitFor(() => {
      expect(getByRole("combobox").getAttribute("aria-expanded")).toBe("false");
    });
  });
});
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/components/form/combobox/Combobox.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/form/combobox/Combobox.spec.tsx
git commit -m "$(cat <<'EOF'
test(solid): Combobox 드롭다운 동작 테스트 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Combobox 값 선택 및 디바운스 테스트

**Files:**

- Modify: `packages/solid/tests/components/form/combobox/Combobox.spec.tsx`

**Step 1: 값 선택 테스트 추가**

```tsx
// Combobox.spec.tsx에 추가

describe("값 선택", () => {
  it("아이템 선택 시 onValueChange가 호출된다", async () => {
    const handleChange = vi.fn();
    const loadItems = vi.fn(async () => [{ id: 1, name: "사과" }]);

    const { getByRole } = render(() => (
      <Combobox
        loadItems={loadItems}
        onValueChange={handleChange}
        renderValue={(v: { name: string }) => <>{v.name}</>}
      />
    ));

    const input = getByRole("combobox").querySelector("input")!;
    fireEvent.input(input, { target: { value: "사" } });

    await waitFor(() => {
      expect(document.querySelector("[data-combobox-item]")).not.toBeNull();
    });

    const item = document.querySelector("[data-combobox-item]") as HTMLElement;
    fireEvent.click(item);

    expect(handleChange).toHaveBeenCalledWith({ id: 1, name: "사과" });
  });
});

describe("디바운스", () => {
  it("빠른 연속 입력 시 마지막 요청만 실행된다", async () => {
    vi.useFakeTimers();
    const loadItems = vi.fn(async () => []);

    const { getByRole } = render(() => (
      <Combobox loadItems={loadItems} debounceMs={300} renderValue={(v) => <>{v}</>} />
    ));

    const input = getByRole("combobox").querySelector("input")!;

    fireEvent.input(input, { target: { value: "a" } });
    fireEvent.input(input, { target: { value: "ab" } });
    fireEvent.input(input, { target: { value: "abc" } });

    // 디바운스 시간 전
    expect(loadItems).not.toHaveBeenCalled();

    // 디바운스 시간 후
    await vi.advanceTimersByTimeAsync(300);

    expect(loadItems).toHaveBeenCalledTimes(1);
    expect(loadItems).toHaveBeenCalledWith("abc");

    vi.useRealTimers();
  });
});
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/components/form/combobox/Combobox.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/form/combobox/Combobox.spec.tsx
git commit -m "$(cat <<'EOF'
test(solid): Combobox 값 선택 및 디바운스 테스트 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Combobox allowCustomValue 테스트

**Files:**

- Modify: `packages/solid/tests/components/form/combobox/Combobox.spec.tsx`

**Step 1: allowCustomValue 테스트 추가**

```tsx
// Combobox.spec.tsx에 추가

describe("allowCustomValue", () => {
  it("allowCustomValue가 true일 때 Enter로 커스텀 값 입력 가능", async () => {
    const handleChange = vi.fn();
    const loadItems = vi.fn(async () => []);

    const { getByRole } = render(() => (
      <Combobox loadItems={loadItems} onValueChange={handleChange} allowCustomValue renderValue={(v) => <>{v}</>} />
    ));

    const input = getByRole("combobox").querySelector("input")!;
    fireEvent.input(input, { target: { value: "새로운 값" } });
    fireEvent.keyDown(getByRole("combobox"), { key: "Enter" });

    expect(handleChange).toHaveBeenCalledWith("새로운 값");
  });

  it("parseCustomValue로 커스텀 값을 변환할 수 있다", async () => {
    const handleChange = vi.fn();
    const loadItems = vi.fn(async () => []);

    const { getByRole } = render(() => (
      <Combobox
        loadItems={loadItems}
        onValueChange={handleChange}
        allowCustomValue
        parseCustomValue={(text) => ({ name: text, custom: true })}
        renderValue={(v: { name: string }) => <>{v.name}</>}
      />
    ));

    const input = getByRole("combobox").querySelector("input")!;
    fireEvent.input(input, { target: { value: "테스트" } });
    fireEvent.keyDown(getByRole("combobox"), { key: "Enter" });

    expect(handleChange).toHaveBeenCalledWith({ name: "테스트", custom: true });
  });
});
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/solid/tests/components/form/combobox/Combobox.spec.tsx --project=solid --run`
Expected: PASS

**Step 3: 커밋**

```bash
git add packages/solid/tests/components/form/combobox/Combobox.spec.tsx
git commit -m "$(cat <<'EOF'
test(solid): Combobox allowCustomValue 테스트 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: index.ts에 Combobox export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

**Step 1: export 추가**

```typescript
// index.ts에 추가 (Select export 근처에)
export * from "./components/form-control/combobox/Combobox";
export * from "./components/form-control/combobox/ComboboxContext";
```

**Step 2: 타입 체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 3: 커밋**

```bash
git add packages/solid/src/index.ts
git commit -m "$(cat <<'EOF'
feat(solid): Combobox export 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 전체 검증

**Step 1: 린트**

Run: `pnpm lint packages/solid`
Expected: 에러 없음

**Step 2: 타입 체크**

Run: `pnpm typecheck packages/solid`
Expected: 에러 없음

**Step 3: 전체 테스트**

Run: `pnpm vitest packages/solid/tests/components/form/combobox/ --project=solid --run`
Expected: 모든 테스트 PASS

**Step 4: 최종 커밋 (필요시)**

린트/타입 수정이 있었다면 커밋.

---

## 요약

| Task | 설명                       | 파일                   |
| ---- | -------------------------- | ---------------------- |
| 1    | ComboboxContext 생성       | ComboboxContext.ts     |
| 2    | ComboboxItem 구현 + 테스트 | ComboboxItem.tsx, spec |
| 3    | Combobox 기본 렌더링       | Combobox.tsx, spec     |
| 4    | 드롭다운 동작 테스트       | spec 추가              |
| 5    | 값 선택/디바운스 테스트    | spec 추가              |
| 6    | allowCustomValue 테스트    | spec 추가              |
| 7    | index.ts export            | index.ts               |
| 8    | 전체 검증                  | -                      |
