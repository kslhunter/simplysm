# Select 컴포넌트 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Angular `sd-select` 컴포넌트를 SolidJS로 마이그레이션하여 단일/다중 선택, 계층적 트리 지원, Compound Components 패턴의 Select 컴포넌트 구현

**Architecture:** Dropdown + List 컴포넌트를 내부적으로 재사용하는 Compound Components 패턴. SelectContext로 선택 상태를 공유하고, Select.Item은 ListItem을 래핑하여 키보드 네비게이션을 상속받음.

**Tech Stack:** SolidJS, Tailwind CSS, @tabler/icons-solidjs, createPropSignal (controlled/uncontrolled dual-mode)

---

## 참고 자료

- **설계 문서:** `docs/plans/2026-02-05-select-migration-design.md`
- **패턴 참고:**
  - Dropdown: `packages/solid/src/components/overlay/Dropdown.tsx`
  - List/ListItem: `packages/solid/src/components/data/List.tsx`, `ListItem.tsx`
  - Context 패턴: `packages/solid/src/components/navigation/SidebarContext.ts`
  - Compound 패턴: `ListItem.Children`

---

## Task 1: Dropdown 키보드 핸들링 개선

**Files:**

- Modify: `packages/solid/src/components/overlay/Dropdown.tsx`
- Modify: `packages/solid/tests/components/overlay/Dropdown.spec.tsx`

### Step 1: 키보드 핸들링 테스트 추가

`packages/solid/tests/components/overlay/Dropdown.spec.tsx` 파일 끝에 추가:

```tsx
describe("키보드 핸들링", () => {
  it("direction=down일 때 트리거에서 ArrowDown으로 첫 아이템 포커스", async () => {
    const handleOpenChange = vi.fn();
    let triggerRef: HTMLButtonElement;

    render(() => (
      <>
        <button ref={(el) => (triggerRef = el)} data-testid="trigger">
          트리거
        </button>
        <Dropdown triggerRef={() => triggerRef} open={true} onOpenChange={handleOpenChange}>
          <div data-testid="first-item" tabIndex={0}>
            첫 아이템
          </div>
          <div data-testid="second-item" tabIndex={0}>
            두 번째 아이템
          </div>
        </Dropdown>
      </>
    ));

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    // 트리거에 포커스
    triggerRef!.focus();

    // ArrowDown 키 입력
    fireEvent.keyDown(triggerRef!, { key: "ArrowDown" });

    // 첫 아이템에 포커스 이동
    await waitFor(() => {
      const firstItem = document.querySelector('[data-testid="first-item"]');
      expect(document.activeElement).toBe(firstItem);
    });
  });

  it("direction=down일 때 첫 아이템에서 ArrowUp으로 트리거 포커스 후 닫기", async () => {
    const handleOpenChange = vi.fn();
    let triggerRef: HTMLButtonElement;

    render(() => (
      <>
        <button ref={(el) => (triggerRef = el)} data-testid="trigger">
          트리거
        </button>
        <Dropdown triggerRef={() => triggerRef} open={true} onOpenChange={handleOpenChange}>
          <div data-testid="first-item" tabIndex={0}>
            첫 아이템
          </div>
        </Dropdown>
      </>
    ));

    await waitFor(() => {
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });

    const firstItem = document.querySelector('[data-testid="first-item"]') as HTMLElement;
    firstItem.focus();

    // 첫 아이템에서 ArrowUp → 트리거 포커스
    fireEvent.keyDown(firstItem, { key: "ArrowUp" });

    await waitFor(() => {
      expect(document.activeElement).toBe(triggerRef);
    });

    // 트리거에서 ArrowUp → 닫기
    fireEvent.keyDown(triggerRef!, { key: "ArrowUp" });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

```bash
pnpm vitest packages/solid/tests/components/overlay/Dropdown.spec.tsx --project=solid --run
```

Expected: 2개 테스트 FAIL

### Step 3: Dropdown에 키보드 핸들링 구현

`packages/solid/src/components/overlay/Dropdown.tsx`의 Props 인터페이스 수정:

```tsx
export interface DropdownProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  // ... 기존 props ...

  /**
   * 키보드 네비게이션 활성화 (Select 등에서 사용)
   *
   * direction=down일 때:
   * - 트리거에서 ArrowDown → 첫 focusable 아이템 포커스
   * - 첫 아이템에서 ArrowUp → 트리거 포커스
   * - 트리거에서 ArrowUp → 닫기
   *
   * direction=up일 때:
   * - 트리거에서 ArrowUp → 마지막 focusable 아이템 포커스
   * - 마지막 아이템에서 ArrowDown → 트리거 포커스
   * - 트리거에서 ArrowDown → 닫기
   */
  enableKeyboardNav?: boolean;
}
```

splitProps에 `"enableKeyboardNav"` 추가.

키보드 핸들링 로직 추가 (Escape 키 처리 createEffect 뒤에):

```tsx
// 키보드 네비게이션 (enableKeyboardNav=true일 때)
createEffect(() => {
  if (!open() || !local.enableKeyboardNav) return;

  const trigger = local.triggerRef?.();
  if (!trigger) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    const popup = popupRef();
    if (!popup) return;

    const dir = direction();
    const target = e.target as HTMLElement;
    const isOnTrigger = trigger.contains(target);
    const isInPopup = popup.contains(target);

    // 팝업 내 focusable 요소들
    const focusables = [
      ...popup.querySelectorAll<HTMLElement>('[tabindex]:not([tabindex="-1"]), button, [data-list-item]'),
    ];
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];
    const isFirstFocused = document.activeElement === firstFocusable;
    const isLastFocused = document.activeElement === lastFocusable;

    if (dir === "down") {
      if (e.key === "ArrowDown") {
        if (isOnTrigger && firstFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      } else if (e.key === "ArrowUp") {
        if (isInPopup && isFirstFocused) {
          e.preventDefault();
          trigger.focus();
        } else if (isOnTrigger) {
          e.preventDefault();
          setOpen(false);
        }
      }
    } else {
      // direction === "up"
      if (e.key === "ArrowUp") {
        if (isOnTrigger && lastFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else if (e.key === "ArrowDown") {
        if (isInPopup && isLastFocused) {
          e.preventDefault();
          trigger.focus();
        } else if (isOnTrigger) {
          e.preventDefault();
          setOpen(false);
        }
      }
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
});
```

### Step 4: 테스트 실행하여 통과 확인

```bash
pnpm vitest packages/solid/tests/components/overlay/Dropdown.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS

### Step 5: 커밋

```bash
git add packages/solid/src/components/overlay/Dropdown.tsx packages/solid/tests/components/overlay/Dropdown.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): Dropdown에 키보드 네비게이션 옵션 추가

enableKeyboardNav prop으로 Select 등에서 사용할 키보드 탐색 지원

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: SelectContext 생성

**Files:**

- Create: `packages/solid/src/components/form/select/SelectContext.ts`

### Step 1: SelectContext 파일 생성

```typescript
import { createContext, useContext, type Accessor } from "solid-js";

export interface SelectContextValue<T = unknown> {
  /** 다중 선택 모드 여부 */
  multiple: Accessor<boolean>;

  /** 값이 선택되어 있는지 확인 */
  isSelected: (value: T) => boolean;

  /** 값 선택/해제 토글 */
  toggleValue: (value: T) => void;

  /** 드롭다운 닫기 */
  closeDropdown: () => void;
}

export const SelectContext = createContext<SelectContextValue>();

export function useSelectContext<T = unknown>(): SelectContextValue<T> {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("useSelectContext must be used within a Select component");
  }
  return context as SelectContextValue<T>;
}
```

### Step 2: 커밋

```bash
git add packages/solid/src/components/form/select/SelectContext.ts
git commit -m "$(cat <<'EOF'
feat(solid): SelectContext 생성

Select 컴포넌트의 상태 공유를 위한 Context 정의

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SelectItem 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/form/select/SelectItem.tsx`
- Create: `packages/solid/tests/components/form/select/SelectItem.spec.tsx`

### Step 1: SelectItem 테스트 파일 생성

```tsx
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { SelectItem } from "../../../../src/components/form/select/SelectItem";
import { SelectContext, type SelectContextValue } from "../../../../src/components/form/select/SelectContext";

// 테스트용 Provider
function TestProvider(props: { children: any; value: SelectContextValue }) {
  return <SelectContext.Provider value={props.value}>{props.children}</SelectContext.Provider>;
}

describe("SelectItem 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("children이 렌더링된다", () => {
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue: vi.fn(),
        closeDropdown: vi.fn(),
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
        </TestProvider>
      ));

      expect(getByText("사과")).not.toBeNull();
    });

    it("data-select-item 속성이 설정된다", () => {
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue: vi.fn(),
        closeDropdown: vi.fn(),
      };

      render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
        </TestProvider>
      ));

      expect(document.querySelector("[data-select-item]")).not.toBeNull();
    });
  });

  describe("선택 동작", () => {
    it("클릭 시 toggleValue가 호출된다", async () => {
      const toggleValue = vi.fn();
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue,
        closeDropdown: vi.fn(),
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
        </TestProvider>
      ));

      fireEvent.click(getByText("사과"));
      expect(toggleValue).toHaveBeenCalledWith("apple");
    });

    it("단일 선택 모드에서 클릭 시 closeDropdown이 호출된다", async () => {
      const closeDropdown = vi.fn();
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue: vi.fn(),
        closeDropdown,
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
        </TestProvider>
      ));

      fireEvent.click(getByText("사과"));
      expect(closeDropdown).toHaveBeenCalled();
    });

    it("다중 선택 모드에서 클릭 시 closeDropdown이 호출되지 않는다", async () => {
      const closeDropdown = vi.fn();
      const mockContext: SelectContextValue = {
        multiple: () => true,
        isSelected: () => false,
        toggleValue: vi.fn(),
        closeDropdown,
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
        </TestProvider>
      ));

      fireEvent.click(getByText("사과"));
      expect(closeDropdown).not.toHaveBeenCalled();
    });
  });

  describe("선택 상태", () => {
    it("선택된 아이템에 aria-selected=true가 설정된다", () => {
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: (v) => v === "apple",
        toggleValue: vi.fn(),
        closeDropdown: vi.fn(),
      };

      render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple">사과</SelectItem>
        </TestProvider>
      ));

      const item = document.querySelector("[data-select-item]");
      expect(item?.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("disabled 상태", () => {
    it("disabled일 때 클릭해도 toggleValue가 호출되지 않는다", () => {
      const toggleValue = vi.fn();
      const mockContext: SelectContextValue = {
        multiple: () => false,
        isSelected: () => false,
        toggleValue,
        closeDropdown: vi.fn(),
      };

      const { getByText } = render(() => (
        <TestProvider value={mockContext}>
          <SelectItem value="apple" disabled>
            사과
          </SelectItem>
        </TestProvider>
      ));

      fireEvent.click(getByText("사과"));
      expect(toggleValue).not.toHaveBeenCalled();
    });
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

```bash
pnpm vitest packages/solid/tests/components/form/select/SelectItem.spec.tsx --project=solid --run
```

Expected: 모듈을 찾을 수 없음 에러

### Step 3: SelectItem 컴포넌트 구현

````tsx
import { children, createMemo, type JSX, type ParentComponent, Show, splitProps } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconCheck } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { useSelectContext } from "./SelectContext";
import { ripple } from "../../../directives/ripple";
import { List } from "../../data/List";
import { Collapse } from "../../disclosure/Collapse";

void ripple;

const baseClass = clsx(
  "flex",
  "items-center",
  "gap-2",
  "py-1",
  "px-1.5",
  "m-px",
  "cursor-pointer",
  "rounded-md",
  "transition-colors",
  "focus:outline-none",
  "focus-visible:bg-gray-200 dark:focus-visible:bg-gray-800",
  "hover:bg-gray-500/10 dark:hover:bg-gray-800",
);

const selectedClass = clsx("bg-primary-100", "dark:bg-primary-900/20", "font-bold");

const disabledClass = clsx("opacity-50", "pointer-events-none", "cursor-auto");

/**
 * 중첩 아이템을 담는 서브 컴포넌트
 */
const SelectItemChildren: ParentComponent = (props) => (
  <div class="flex" data-select-item-children>
    <div class={clsx("w-2", "ml-4", "border-l", "border-gray-300", "dark:border-gray-700")} />
    <List inset class="flex-1">
      {props.children}
    </List>
  </div>
);

export interface SelectItemProps<T = unknown> extends Omit<
  JSX.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onClick"
> {
  /** 아이템의 값 */
  value: T;

  /** 비활성화 */
  disabled?: boolean;
}

interface SelectItemComponent<T = unknown> extends ParentComponent<SelectItemProps<T>> {
  Children: typeof SelectItemChildren;
}

/**
 * Select 드롭다운 내의 선택 가능한 아이템
 *
 * @example
 * ```tsx
 * <Select.Item value={item}>{item.name}</Select.Item>
 *
 * // 중첩 아이템
 * <Select.Item value={parent}>
 *   {parent.name}
 *   <Select.Item.Children>
 *     <Select.Item value={child}>{child.name}</Select.Item>
 *   </Select.Item.Children>
 * </Select.Item>
 * ```
 */
export const SelectItem: SelectItemComponent = <T,>(props: SelectItemProps<T> & { children?: JSX.Element }) => {
  const [local, rest] = splitProps(props, ["children", "class", "value", "disabled"]);

  const context = useSelectContext<T>();

  const resolved = children(() => local.children);

  const slots = createMemo(() => {
    const arr = resolved.toArray();
    let childrenSlot: HTMLElement | undefined;
    const content: (typeof arr)[number][] = [];

    for (const c of arr) {
      if (c instanceof HTMLElement && c.dataset["selectItemChildren"] !== undefined) {
        childrenSlot = c;
      } else {
        content.push(c);
      }
    }

    return { childrenSlot, content };
  });

  const hasChildren = () => slots().childrenSlot !== undefined;
  const isSelected = () => context.isSelected(local.value);
  const useRipple = () => !local.disabled;

  const handleClick = () => {
    if (local.disabled) return;

    context.toggleValue(local.value);

    // 단일 선택 모드에서만 드롭다운 닫기
    if (!context.multiple()) {
      context.closeDropdown();
    }
  };

  const getClassName = () =>
    twMerge(baseClass, isSelected() && selectedClass, local.disabled && disabledClass, local.class);

  const getCheckIconClass = () =>
    clsx(isSelected() ? "text-primary-600 dark:text-primary-400" : "text-black/30 dark:text-white/30");

  return (
    <>
      <button
        {...rest}
        type="button"
        use:ripple={useRipple()}
        class={getClassName()}
        data-select-item
        data-list-item
        role="option"
        aria-selected={isSelected() || undefined}
        aria-disabled={local.disabled || undefined}
        tabIndex={local.disabled ? -1 : 0}
        onClick={handleClick}
      >
        <Show when={context.multiple() && !hasChildren()}>
          <Icon icon={IconCheck} class={getCheckIconClass()} />
        </Show>
        <span class="flex flex-1 flex-row items-center gap-1 text-left">{slots().content}</span>
      </button>
      <Show when={hasChildren()}>
        <Collapse open={true}>{slots().childrenSlot}</Collapse>
      </Show>
    </>
  );
};

SelectItem.Children = SelectItemChildren;
````

### Step 4: 테스트 실행하여 통과 확인

```bash
pnpm vitest packages/solid/tests/components/form/select/SelectItem.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS

### Step 5: 커밋

```bash
git add packages/solid/src/components/form/select/SelectItem.tsx packages/solid/tests/components/form/select/SelectItem.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): SelectItem 컴포넌트 구현

ListItem 패턴 기반의 선택 가능한 아이템 컴포넌트
- 중첩 아이템 지원 (SelectItem.Children)
- 다중 선택 시 체크박스 아이콘 표시
- 키보드 네비게이션을 위한 data-list-item 속성

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Select 메인 컴포넌트 구현

**Files:**

- Create: `packages/solid/src/components/form/select/Select.tsx`
- Create: `packages/solid/tests/components/form/select/Select.spec.tsx`

### Step 1: Select 테스트 파일 생성

```tsx
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { createSignal, For } from "solid-js";
import { Select } from "../../../../src/components/form/select/Select";

describe("Select 컴포넌트", () => {
  describe("기본 렌더링", () => {
    it("트리거가 렌더링된다", () => {
      const { getByRole } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      expect(getByRole("combobox")).not.toBeNull();
    });

    it("placeholder가 표시된다", () => {
      const { getByText } = render(() => (
        <Select placeholder="선택하세요" renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      expect(getByText("선택하세요")).not.toBeNull();
    });
  });

  describe("드롭다운 열기/닫기", () => {
    it("트리거 클릭 시 드롭다운이 열린다", async () => {
      const { getByRole } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });
    });

    it("아이템 선택 시 드롭다운이 닫힌다 (단일 선택)", async () => {
      const { getByRole, getByText } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.click(getByText("사과"));

      await waitFor(
        () => {
          // 애니메이션 후 닫힘
          expect(document.querySelector("[data-dropdown]")).toBeNull();
        },
        { timeout: 500 },
      );
    });
  });

  describe("단일 선택", () => {
    it("아이템 선택 시 onValueChange가 호출된다", async () => {
      const handleChange = vi.fn();
      const { getByRole, getByText } = render(() => (
        <Select onValueChange={handleChange} renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.click(getByText("사과"));
      expect(handleChange).toHaveBeenCalledWith("apple");
    });

    it("선택된 값이 트리거에 표시된다", async () => {
      const [value, setValue] = createSignal<string | undefined>("apple");

      const { getByRole } = render(() => (
        <Select value={value()} onValueChange={setValue} renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
          <Select.Item value="banana">바나나</Select.Item>
        </Select>
      ));

      expect(getByRole("combobox").textContent).toContain("apple");
    });
  });

  describe("다중 선택", () => {
    it("multiple 모드에서 여러 아이템 선택 가능", async () => {
      const handleChange = vi.fn();
      const { getByRole, getByText } = render(() => (
        <Select multiple onValueChange={handleChange} renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
          <Select.Item value="banana">바나나</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.click(getByText("사과"));
      expect(handleChange).toHaveBeenLastCalledWith(["apple"]);

      fireEvent.click(getByText("바나나"));
      expect(handleChange).toHaveBeenLastCalledWith(["apple", "banana"]);
    });

    it("다중 선택 모드에서 아이템 선택해도 드롭다운이 닫히지 않는다", async () => {
      const { getByRole, getByText } = render(() => (
        <Select multiple renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.click(getByText("사과"));

      // 드롭다운이 여전히 열려 있음
      expect(document.querySelector("[data-dropdown]")).not.toBeNull();
    });
  });

  describe("서브 컴포넌트", () => {
    it("Select.Button이 렌더링된다", () => {
      const handleClick = vi.fn();
      const { getByText } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
          <Select.Button onClick={handleClick}>+</Select.Button>
        </Select>
      ));

      expect(getByText("+")).not.toBeNull();
      fireEvent.click(getByText("+"));
      expect(handleClick).toHaveBeenCalled();
    });

    it("Select.Header가 드롭다운 상단에 렌더링된다", async () => {
      const { getByRole, getByText } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Header>
            <div data-testid="header">헤더 영역</div>
          </Select.Header>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      await waitFor(() => {
        expect(getByText("헤더 영역")).not.toBeNull();
      });
    });
  });

  describe("disabled 상태", () => {
    it("disabled일 때 트리거 클릭이 동작하지 않는다", () => {
      const { getByRole } = render(() => (
        <Select disabled renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      fireEvent.click(getByRole("combobox"));

      expect(document.querySelector("[data-dropdown]")).toBeNull();
    });

    it("disabled일 때 aria-disabled가 설정된다", () => {
      const { getByRole } = render(() => (
        <Select disabled renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      expect(getByRole("combobox").getAttribute("aria-disabled")).toBe("true");
    });
  });

  describe("접근성", () => {
    it("role=combobox가 설정된다", () => {
      const { getByRole } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      expect(getByRole("combobox")).not.toBeNull();
    });

    it("열림 시 aria-expanded=true", async () => {
      const { getByRole } = render(() => (
        <Select renderValue={(v) => <>{v}</>}>
          <Select.Item value="apple">사과</Select.Item>
        </Select>
      ));

      const trigger = getByRole("combobox");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(trigger);

      await waitFor(() => {
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
      });
    });
  });
});
```

### Step 2: 테스트 실행하여 실패 확인

```bash
pnpm vitest packages/solid/tests/components/form/select/Select.spec.tsx --project=solid --run
```

Expected: 모듈을 찾을 수 없음 에러

### Step 3: Select 컴포넌트 구현

````tsx
import { children, createMemo, createSignal, type JSX, type ParentComponent, Show, splitProps, For } from "solid-js";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { Icon } from "../../display/Icon";
import { Dropdown } from "../../overlay/Dropdown";
import { List } from "../../data/List";
import { SelectContext, type SelectContextValue } from "./SelectContext";
import { SelectItem } from "./SelectItem";
import { createPropSignal } from "../../../hooks/createPropSignal";

// 트리거 스타일
const triggerBaseClass = clsx(
  "inline-flex items-center gap-2",
  "min-w-40",
  "border border-neutral-300 dark:border-neutral-600",
  "rounded-md",
  "bg-neutral-50 dark:bg-neutral-900",
  "cursor-pointer",
  "focus:outline-none",
  "focus-within:border-primary-500",
);

const triggerDisabledClass = clsx("bg-neutral-200 dark:bg-neutral-800", "cursor-default", "text-neutral-400");

const triggerInsetClass = clsx("border-none", "rounded-none", "bg-transparent");

const sizeClasses = {
  sm: "py-0.5 px-1.5 gap-1.5",
  default: "py-1 px-2",
  lg: "py-2 px-3 gap-3",
};

/**
 * Select 우측 버튼 서브 컴포넌트
 */
interface SelectButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {}

const SelectButton: ParentComponent<SelectButtonProps> = (props) => {
  const [local, rest] = splitProps(props, ["children", "class"]);

  return (
    <button
      {...rest}
      type="button"
      class={twMerge(
        clsx(
          "px-2 border-l border-neutral-300 dark:border-neutral-600",
          "text-primary-500 font-bold",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        ),
        local.class,
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (typeof rest.onClick === "function") {
          rest.onClick(e);
        }
      }}
    >
      {local.children}
    </button>
  );
};

/**
 * 드롭다운 상단 커스텀 영역 서브 컴포넌트
 */
const SelectHeader: ParentComponent = (props) => <div data-select-header>{props.children}</div>;

/**
 * items prop 방식일 때 아이템 렌더링 템플릿
 */
interface SelectItemTemplateProps<T> {
  children: (item: T, index: number, depth: number) => JSX.Element;
}

const SelectItemTemplate = <T,>(props: SelectItemTemplateProps<T>) => <>{props.children}</>;

// Props 정의
interface SelectBaseProps<T> {
  /** 현재 선택된 값 */
  value?: T | T[];

  /** 값 변경 콜백 */
  onValueChange?: (value: T | T[]) => void;

  /** 다중 선택 모드 */
  multiple?: boolean;

  /** 비활성화 */
  disabled?: boolean;

  /** 필수 입력 */
  required?: boolean;

  /** 미선택 시 표시 텍스트 */
  placeholder?: string;

  /** 트리거 크기 */
  size?: "sm" | "lg";

  /** 테두리 없는 스타일 */
  inset?: boolean;

  /** 다중 선택 시 표시 방향 */
  multiDisplayDirection?: "horizontal" | "vertical";

  /** 전체 선택 버튼 숨기기 */
  hideSelectAll?: boolean;

  /** 커스텀 class */
  class?: string;

  /** 커스텀 style */
  style?: JSX.CSSProperties;
}

interface SelectWithItemsProps<T> extends SelectBaseProps<T> {
  items: T[];
  getChildren?: (item: T, index: number, depth: number) => T[] | undefined;
  renderValue?: (value: T) => JSX.Element;
  children?: JSX.Element;
}

interface SelectWithChildrenProps<T> extends SelectBaseProps<T> {
  items?: never;
  getChildren?: never;
  renderValue: (value: T) => JSX.Element;
  children: JSX.Element;
}

export type SelectProps<T = unknown> = SelectWithItemsProps<T> | SelectWithChildrenProps<T>;

interface SelectComponent {
  <T = unknown>(props: SelectProps<T>): JSX.Element;
  Item: typeof SelectItem;
  Button: typeof SelectButton;
  Header: typeof SelectHeader;
  ItemTemplate: typeof SelectItemTemplate;
}

/**
 * Select 컴포넌트
 *
 * @example
 * ```tsx
 * // children 방식
 * <Select value={selected()} onValueChange={setSelected} renderValue={(v) => v.name}>
 *   <Select.Item value={item1}>{item1.name}</Select.Item>
 *   <Select.Item value={item2}>{item2.name}</Select.Item>
 * </Select>
 *
 * // items prop 방식
 * <Select items={data} value={selected()} onValueChange={setSelected}>
 *   <Select.ItemTemplate>
 *     {(item) => <>{item.name}</>}
 *   </Select.ItemTemplate>
 * </Select>
 * ```
 */
export const Select: SelectComponent = <T,>(props: SelectProps<T>) => {
  const [local, rest] = splitProps(props as SelectProps<T> & { children?: JSX.Element }, [
    "children",
    "class",
    "style",
    "value",
    "onValueChange",
    "multiple",
    "disabled",
    "required",
    "placeholder",
    "size",
    "inset",
    "multiDisplayDirection",
    "hideSelectAll",
    "items",
    "getChildren",
    "renderValue",
  ]);

  let triggerRef!: HTMLDivElement;

  const [open, setOpen] = createSignal(false);

  // 선택된 값 관리
  const [internalValue, setInternalValue] = createPropSignal<T | T[] | undefined>({
    value: () => local.value,
    onChange: () => local.onValueChange as ((v: T | T[] | undefined) => void) | undefined,
  });

  // children 슬롯 분리
  const resolved = children(() => local.children);

  const slots = createMemo(() => {
    const arr = resolved.toArray();
    const items: (typeof arr)[number][] = [];
    const buttons: (typeof arr)[number][] = [];
    let header: (typeof arr)[number] | undefined;
    let itemTemplate: ((item: T, index: number, depth: number) => JSX.Element) | undefined;

    for (const c of arr) {
      if (c instanceof HTMLElement) {
        if (c.dataset["selectHeader"] !== undefined) {
          header = c;
        } else {
          items.push(c);
        }
      } else if (c instanceof Element && c.tagName === "BUTTON") {
        buttons.push(c);
      } else {
        items.push(c);
      }
    }

    return { items, buttons, header, itemTemplate };
  });

  // 값이 선택되어 있는지 확인
  const isSelected = (value: T): boolean => {
    const current = internalValue();
    if (current === undefined) return false;

    if (local.multiple) {
      return Array.isArray(current) && current.includes(value);
    }
    return current === value;
  };

  // 값 토글
  const toggleValue = (value: T) => {
    if (local.multiple) {
      const current = (internalValue() as T[] | undefined) ?? [];
      const idx = current.indexOf(value);
      if (idx >= 0) {
        setInternalValue([...current.slice(0, idx), ...current.slice(idx + 1)] as T[]);
      } else {
        setInternalValue([...current, value] as T[]);
      }
    } else {
      setInternalValue(value);
    }
  };

  // 드롭다운 닫기
  const closeDropdown = () => {
    setOpen(false);
  };

  // Context 값
  const contextValue: SelectContextValue<T> = {
    multiple: () => local.multiple ?? false,
    isSelected,
    toggleValue,
    closeDropdown,
  };

  // 트리거 클릭
  const handleTriggerClick = () => {
    if (local.disabled) return;
    setOpen((v) => !v);
  };

  // 트리거 키보드 처리
  const handleTriggerKeyDown = (e: KeyboardEvent) => {
    if (local.disabled) return;

    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  };

  // 선택된 값 표시
  const renderSelectedValue = () => {
    const current = internalValue();

    if (current === undefined || (Array.isArray(current) && current.length === 0)) {
      return <span class="text-neutral-400">{local.placeholder ?? ""}</span>;
    }

    if (local.multiple && Array.isArray(current)) {
      const direction = local.multiDisplayDirection ?? "horizontal";
      return (
        <div class={clsx("flex gap-1", direction === "vertical" ? "flex-col" : "flex-wrap")}>
          <For each={current}>
            {(v) => (
              <span class="rounded bg-neutral-200 px-1 dark:bg-neutral-700">
                {local.renderValue ? local.renderValue(v) : String(v)}
              </span>
            )}
          </For>
        </div>
      );
    }

    return local.renderValue ? local.renderValue(current as T) : String(current);
  };

  // 트리거 클래스
  const getTriggerClassName = () =>
    twMerge(
      triggerBaseClass,
      sizeClasses[local.size ?? "default"],
      local.disabled && triggerDisabledClass,
      local.inset && triggerInsetClass,
      local.class,
    );

  return (
    <SelectContext.Provider value={contextValue as SelectContextValue}>
      <div class="inline-flex">
        <div
          ref={triggerRef}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open()}
          aria-disabled={local.disabled || undefined}
          aria-required={local.required || undefined}
          tabIndex={local.disabled ? -1 : 0}
          class={getTriggerClassName()}
          style={local.style}
          onClick={handleTriggerClick}
          onKeyDown={handleTriggerKeyDown}
        >
          <div class="flex-1 whitespace-nowrap">{renderSelectedValue()}</div>
          <div class="opacity-30 hover:opacity-100">
            <Icon icon={IconChevronDown} size="1rem" />
          </div>
        </div>
        {slots().buttons}
      </div>

      <Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen} enableKeyboardNav>
        {slots().header}
        <List inset role="listbox">
          {slots().items}
        </List>
      </Dropdown>
    </SelectContext.Provider>
  );
};

Select.Item = SelectItem;
Select.Button = SelectButton;
Select.Header = SelectHeader;
Select.ItemTemplate = SelectItemTemplate;
````

### Step 4: 테스트 실행하여 통과 확인

```bash
pnpm vitest packages/solid/tests/components/form/select/Select.spec.tsx --project=solid --run
```

Expected: 모든 테스트 PASS

### Step 5: 커밋

```bash
git add packages/solid/src/components/form/select/Select.tsx packages/solid/tests/components/form/select/Select.spec.tsx
git commit -m "$(cat <<'EOF'
feat(solid): Select 메인 컴포넌트 구현

Compound Components 패턴의 Select 컴포넌트
- 단일/다중 선택 지원
- Select.Item, Select.Button, Select.Header 서브 컴포넌트
- 키보드 네비게이션 지원
- 접근성 (role=combobox, aria-expanded 등)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: index.ts export 추가

**Files:**

- Modify: `packages/solid/src/index.ts`

### Step 1: export 추가

`packages/solid/src/index.ts` 파일에 추가:

```typescript
export * from "./components/form/select/Select";
export * from "./components/form/select/SelectContext";
export * from "./components/form/select/SelectItem";
```

### Step 2: 타입체크

```bash
pnpm typecheck packages/solid
```

Expected: 에러 없음

### Step 3: 커밋

```bash
git add packages/solid/src/index.ts
git commit -m "$(cat <<'EOF'
feat(solid): Select 컴포넌트 export 추가

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: solid-demo에 SelectPage 추가

**Files:**

- Create: `packages/solid-demo/src/pages/form/SelectPage.tsx`
- Modify: `packages/solid-demo/src/pages/Home.tsx`
- Modify: `packages/solid-demo/src/main.tsx`

### Step 1: SelectPage 생성

```tsx
import { createSignal, For } from "solid-js";
import { Select, Topbar, TopbarContainer } from "@simplysm/solid";
import { IconPlus } from "@tabler/icons-solidjs";

interface Fruit {
  id: number;
  name: string;
  emoji: string;
}

const fruits: Fruit[] = [
  { id: 1, name: "사과", emoji: "🍎" },
  { id: 2, name: "바나나", emoji: "🍌" },
  { id: 3, name: "포도", emoji: "🍇" },
  { id: 4, name: "오렌지", emoji: "🍊" },
  { id: 5, name: "수박", emoji: "🍉" },
];

interface Category {
  id: number;
  name: string;
  children?: Category[];
}

const categories: Category[] = [
  {
    id: 1,
    name: "과일",
    children: [
      { id: 11, name: "사과" },
      { id: 12, name: "바나나" },
    ],
  },
  {
    id: 2,
    name: "채소",
    children: [
      { id: 21, name: "당근" },
      { id: 22, name: "브로콜리" },
    ],
  },
  { id: 3, name: "기타" },
];

export default function SelectPage() {
  // 기본 단일 선택
  const [selected, setSelected] = createSignal<Fruit | undefined>();

  // 다중 선택
  const [multiSelected, setMultiSelected] = createSignal<Fruit[]>([]);

  // 계층 구조
  const [categorySelected, setCategorySelected] = createSignal<Category | undefined>();

  return (
    <TopbarContainer>
      <Topbar>
        <h1 class="m-0 text-base">Select</h1>
      </Topbar>
      <div class="flex-1 overflow-auto p-6">
        <div class="space-y-8">
          {/* 기본 사용 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">기본 사용</h2>
            <p class="mb-2 text-sm text-gray-600">선택: {selected()?.name ?? "없음"}</p>
            <div class="max-w-xs">
              <Select
                value={selected()}
                onValueChange={setSelected}
                placeholder="과일을 선택하세요"
                renderValue={(v) => (
                  <>
                    {v.emoji} {v.name}
                  </>
                )}
              >
                <For each={fruits}>
                  {(fruit) => (
                    <Select.Item value={fruit}>
                      {fruit.emoji} {fruit.name}
                    </Select.Item>
                  )}
                </For>
              </Select>
            </div>
          </section>

          {/* 다중 선택 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">다중 선택</h2>
            <p class="mb-2 text-sm text-gray-600">
              선택:{" "}
              {multiSelected()
                .map((f) => f.name)
                .join(", ") || "없음"}
            </p>
            <div class="max-w-xs">
              <Select
                multiple
                value={multiSelected()}
                onValueChange={setMultiSelected}
                placeholder="여러 개 선택 가능"
                renderValue={(v) => (
                  <>
                    {v.emoji} {v.name}
                  </>
                )}
              >
                <For each={fruits}>
                  {(fruit) => (
                    <Select.Item value={fruit}>
                      {fruit.emoji} {fruit.name}
                    </Select.Item>
                  )}
                </For>
              </Select>
            </div>
          </section>

          {/* 추가 버튼 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">추가 버튼 (Select.Button)</h2>
            <div class="max-w-xs">
              <Select placeholder="선택하세요" renderValue={(v: string) => <>{v}</>}>
                <Select.Item value="옵션 1">옵션 1</Select.Item>
                <Select.Item value="옵션 2">옵션 2</Select.Item>
                <Select.Button onClick={() => alert("추가 버튼 클릭!")}>
                  <IconPlus size={16} />
                </Select.Button>
              </Select>
            </div>
          </section>

          {/* 커스텀 헤더 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">커스텀 헤더 (Select.Header)</h2>
            <div class="max-w-xs">
              <Select placeholder="선택하세요" renderValue={(v: string) => <>{v}</>}>
                <Select.Header>
                  <div class="border-b border-neutral-200 p-2 text-sm font-semibold text-neutral-500 dark:border-neutral-700">
                    🔍 검색 결과
                  </div>
                </Select.Header>
                <Select.Item value="결과 1">결과 1</Select.Item>
                <Select.Item value="결과 2">결과 2</Select.Item>
                <Select.Item value="결과 3">결과 3</Select.Item>
              </Select>
            </div>
          </section>

          {/* 계층 구조 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">계층 구조 (중첩 아이템)</h2>
            <p class="mb-2 text-sm text-gray-600">선택: {categorySelected()?.name ?? "없음"}</p>
            <div class="max-w-xs">
              <Select
                value={categorySelected()}
                onValueChange={setCategorySelected}
                placeholder="카테고리 선택"
                renderValue={(v) => <>{v.name}</>}
              >
                <For each={categories}>
                  {(category) => (
                    <Select.Item value={category}>
                      {category.name}
                      {category.children && (
                        <Select.Item.Children>
                          <For each={category.children}>
                            {(child) => <Select.Item value={child}>{child.name}</Select.Item>}
                          </For>
                        </Select.Item.Children>
                      )}
                    </Select.Item>
                  )}
                </For>
              </Select>
            </div>
          </section>

          {/* 사이즈 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">사이즈</h2>
            <div class="flex flex-col gap-4">
              <Select size="sm" placeholder="Small" renderValue={(v: string) => <>{v}</>}>
                <Select.Item value="A">옵션 A</Select.Item>
                <Select.Item value="B">옵션 B</Select.Item>
              </Select>
              <Select placeholder="Default" renderValue={(v: string) => <>{v}</>}>
                <Select.Item value="A">옵션 A</Select.Item>
                <Select.Item value="B">옵션 B</Select.Item>
              </Select>
              <Select size="lg" placeholder="Large" renderValue={(v: string) => <>{v}</>}>
                <Select.Item value="A">옵션 A</Select.Item>
                <Select.Item value="B">옵션 B</Select.Item>
              </Select>
            </div>
          </section>

          {/* 상태 */}
          <section>
            <h2 class="mb-4 text-xl font-semibold">상태</h2>
            <div class="flex flex-col gap-4 max-w-xs">
              <div>
                <p class="mb-1 text-sm text-gray-600">Disabled</p>
                <Select disabled placeholder="비활성화됨" renderValue={(v: string) => <>{v}</>}>
                  <Select.Item value="A">옵션 A</Select.Item>
                </Select>
              </div>
              <div>
                <p class="mb-1 text-sm text-gray-600">Inset (테두리 없음)</p>
                <Select inset placeholder="인셋 스타일" renderValue={(v: string) => <>{v}</>}>
                  <Select.Item value="A">옵션 A</Select.Item>
                  <Select.Item value="B">옵션 B</Select.Item>
                </Select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </TopbarContainer>
  );
}
```

### Step 2: Home.tsx 메뉴 추가

`packages/solid-demo/src/pages/Home.tsx`의 menuItems에 추가:

```typescript
{
  title: "Form",
  icon: IconLayoutList, // 또는 적절한 아이콘
  children: [{ title: "Select", href: "/home/form/select" }],
},
```

### Step 3: main.tsx 라우트 추가

`packages/solid-demo/src/main.tsx`에 추가:

```typescript
<Route path="/home/form/select" component={lazy(() => import("./pages/form/SelectPage"))} />
```

### Step 4: 데모 앱 실행 테스트

```bash
pnpm watch solid solid-demo
```

브라우저에서 http://localhost:40080/#/home/form/select 접속하여 확인

### Step 5: 커밋

```bash
git add packages/solid-demo/src/pages/form/SelectPage.tsx packages/solid-demo/src/pages/Home.tsx packages/solid-demo/src/main.tsx
git commit -m "$(cat <<'EOF'
feat(solid-demo): Select 데모 페이지 추가

단일/다중 선택, 계층 구조, 추가 버튼, 헤더 등 모든 기능 데모

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 전체 테스트 및 빌드 검증

**Files:** 없음 (검증만)

### Step 1: 린트 실행

```bash
pnpm lint packages/solid packages/solid-demo
```

Expected: 에러 없음

### Step 2: 타입체크

```bash
pnpm typecheck packages/solid packages/solid-demo
```

Expected: 에러 없음

### Step 3: 테스트 실행

```bash
pnpm vitest --project=solid --run
```

Expected: 모든 테스트 통과 (기존 8개 실패 제외)

### Step 4: 빌드

```bash
pnpm build
```

Expected: 성공

### Step 5: 커밋

린트/타입 수정사항이 있으면 커밋:

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(solid): 린트 및 타입 오류 수정

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## 완료 체크리스트

- [ ] Task 1: Dropdown 키보드 핸들링
- [ ] Task 2: SelectContext 생성
- [ ] Task 3: SelectItem 컴포넌트
- [ ] Task 4: Select 메인 컴포넌트
- [ ] Task 5: index.ts export
- [ ] Task 6: solid-demo SelectPage
- [ ] Task 7: 전체 검증

각 Task 완료 후 테스트 통과 확인 및 커밋 필수.
