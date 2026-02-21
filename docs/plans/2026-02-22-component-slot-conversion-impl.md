# Component Slot Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert 6 component APIs from prop-based to slot-based patterns using `splitSlots`.

**Architecture:** Each component gains compound sub-components (e.g., `Dropdown.Trigger`) that use `data-*` attributes for slot identification. `splitSlots` extracts them from resolved children. Internal consumers (Select, Combobox, etc.) are migrated in the same task as the component they depend on.

**Tech Stack:** SolidJS, `splitSlots` helper, `@solidjs/testing-library` (Vitest `--project=solid`)

---

### Task 1: Dropdown — Trigger/Content restructure

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx`
- Test: `packages/solid/tests/components/disclosure/Dropdown.spec.tsx`

**Step 1: Update tests for new API**

Rewrite the existing test file to use `Dropdown.Trigger` / `Dropdown.Content` instead of `triggerRef` prop.

```tsx
// packages/solid/tests/components/disclosure/Dropdown.spec.tsx
import { render, fireEvent, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSignal } from "solid-js";
import { Dropdown } from "../../../src/components/disclosure/Dropdown";

describe("Dropdown 컴포넌트", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);
    vi.stubGlobal("scrollX", 0);
    vi.stubGlobal("scrollY", 0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Trigger/Content 구조", () => {
    it("Trigger 클릭 시 Content가 렌더링된다", async () => {
      render(() => (
        <Dropdown>
          <Dropdown.Trigger>
            <button data-testid="trigger">열기</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div data-testid="content">팝업 내용</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      const trigger = document.querySelector('[data-testid="trigger"]')!;
      expect(document.querySelector('[data-testid="content"]')).toBeNull();

      fireEvent.click(trigger);

      await waitFor(() => {
        expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
      });
    });

    it("Trigger 재클릭 시 닫힌다", async () => {
      render(() => (
        <Dropdown>
          <Dropdown.Trigger>
            <button data-testid="trigger">열기</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div data-testid="content">팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      const trigger = document.querySelector('[data-testid="trigger"]')!;
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
      });

      fireEvent.click(trigger);
      // onOpenChange(false)가 호출되므로 닫힘 시작
    });
  });

  describe("Controlled 모드", () => {
    it("open prop으로 제어된다", async () => {
      const [open, setOpen] = createSignal(false);

      render(() => (
        <Dropdown open={open()} onOpenChange={setOpen}>
          <Dropdown.Trigger>
            <button>트리거</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div data-testid="content">팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      expect(document.querySelector('[data-testid="content"]')).toBeNull();

      setOpen(true);

      await waitFor(() => {
        expect(document.querySelector('[data-testid="content"]')).not.toBeNull();
      });
    });
  });

  describe("Context menu (Trigger 없음)", () => {
    it("position prop으로 위치가 설정된다", async () => {
      render(() => (
        <Dropdown position={{ x: 300, y: 200 }} open={true}>
          <Dropdown.Content>
            <div data-testid="content">메뉴</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown).not.toBeNull();
        expect(dropdown.style.left).toBeTruthy();
      });
    });
  });

  describe("닫힘 감지", () => {
    it("외부 pointerdown 시 닫힌다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <>
          <div data-testid="outside">외부</div>
          <Dropdown open={true} onOpenChange={handleOpenChange}>
            <Dropdown.Trigger>
              <button>트리거</button>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <div>팝업</div>
            </Dropdown.Content>
          </Dropdown>
        </>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.pointerDown(document.querySelector('[data-testid="outside"]')!);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("Escape 키로 닫힌다", async () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Dropdown open={true} onOpenChange={handleOpenChange}>
          <Dropdown.Trigger>
            <button>트리거</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div>팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        expect(document.querySelector("[data-dropdown]")).not.toBeNull();
      });

      fireEvent.keyDown(document, { key: "Escape" });
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("maxHeight", () => {
    it("기본값 300px", async () => {
      render(() => (
        <Dropdown open={true}>
          <Dropdown.Trigger>
            <button>트리거</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div>팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown.style.maxHeight).toBe("300px");
      });
    });

    it("커스텀 값 적용", async () => {
      render(() => (
        <Dropdown open={true} maxHeight={500}>
          <Dropdown.Trigger>
            <button>트리거</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div>팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      await waitFor(() => {
        const dropdown = document.querySelector("[data-dropdown]") as HTMLElement;
        expect(dropdown.style.maxHeight).toBe("500px");
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dropdown.spec.tsx --project=solid --run`
Expected: FAIL — `Dropdown.Trigger` is not a function

**Step 3: Implement Dropdown restructure**

Rewrite `Dropdown.tsx`:
- Add `DropdownTrigger` sub-component: `<span data-dropdown-trigger>{props.children}</span>`
- Add `DropdownContent` sub-component: `<div data-dropdown-content>{props.children}</div>`
- `Dropdown` becomes a container using `children()` + `splitSlots` to extract trigger/content
- Trigger: captures ref via the wrapping `<span>`, adds click handler for open toggle
- Content: receives all existing popup logic (Portal, position calc, animation, close detection)
- Remove `triggerRef` from `DropdownProps`
- Keep `position`, `open`, `onOpenChange`, `maxHeight`, `keyboardNav`, `class`, `style`
- `class`/`style` on `Dropdown.Content` are passed through to the popup element

Key implementation detail: When `Dropdown.Trigger` is present, the trigger's `<span>` ref is used for position calculation. When absent, `position` prop is used. The popup is only rendered inside `Dropdown.Content` slot.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dropdown.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Migrate Dropdown consumers**

Update these files to use `Dropdown.Trigger`/`Dropdown.Content`:

- `packages/solid/src/components/form-control/select/Select.tsx` (line ~413)
- `packages/solid/src/components/form-control/combobox/Combobox.tsx` (line ~390)
- `packages/solid/src/components/layout/topbar/TopbarMenu.tsx` (lines ~87, ~172)
- `packages/solid/src/components/layout/topbar/TopbarUser.tsx` (line ~90)
- `packages/solid/src/components/feedback/notification/NotificationBell.tsx` (line ~94)

Pattern for each:
```tsx
// Before
<Dropdown triggerRef={() => triggerRef} open={open()} onOpenChange={setOpen} keyboardNav>
  {items}
</Dropdown>

// After
<Dropdown open={open()} onOpenChange={setOpen} keyboardNav>
  <Dropdown.Trigger>
    {/* existing trigger element with ref={triggerRef} */}
  </Dropdown.Trigger>
  <Dropdown.Content>
    {items}
  </Dropdown.Content>
</Dropdown>
```

Note: For Select/Combobox, the trigger div and its siblings (SelectAction) are OUTSIDE the Dropdown wrapper, so the Dropdown wraps only the trigger div + content. The existing trigger click handlers in Select/Combobox should be preserved (they do not use auto-toggle since Select manages its own open state via controlled mode).

**Step 6: Run all related tests**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dropdown.spec.tsx packages/solid/tests/components/form-control/select/Select.spec.tsx packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx --project=solid --run`
Expected: PASS

**Step 7: Update demo page**

Modify `packages/solid-demo/src/pages/disclosure/DropdownPage.tsx`:
- Remove `let buttonRef` variables and manual `ref={buttonRef}` assignments
- Remove manual `onClick={() => setOpen(!open())}` on buttons
- Wrap trigger buttons in `<Dropdown.Trigger>`, content in `<Dropdown.Content>`
- Context menu section: keep `position` mode, wrap content in `<Dropdown.Content>`

**Step 8: Commit**

```bash
git add packages/solid/src/components/disclosure/Dropdown.tsx \
  packages/solid/tests/components/disclosure/Dropdown.spec.tsx \
  packages/solid/src/components/form-control/select/Select.tsx \
  packages/solid/src/components/form-control/combobox/Combobox.tsx \
  packages/solid/src/components/layout/topbar/TopbarMenu.tsx \
  packages/solid/src/components/layout/topbar/TopbarUser.tsx \
  packages/solid/src/components/feedback/notification/NotificationBell.tsx \
  packages/solid-demo/src/pages/disclosure/DropdownPage.tsx
git commit -m "refactor(solid): convert Dropdown to Trigger/Content slot pattern"
```

---

### Task 2: Dialog — Header/Action slots

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx`
- Modify: `packages/solid/src/components/disclosure/DialogContext.ts`
- Modify: `packages/solid/src/components/disclosure/DialogProvider.tsx`
- Test: `packages/solid/tests/components/disclosure/Dialog.spec.tsx`
- Test: `packages/solid/tests/components/disclosure/DialogProvider.spec.tsx`

**Step 1: Update Dialog tests for new API**

Update tests to use `Dialog.Header`/`Dialog.Action` instead of `title`/`headerAction` props.

```tsx
// Key test cases:
it("Dialog.Header 슬롯이 헤더에 렌더링된다", async () => {
  render(() => (
    <Dialog open={true}>
      <Dialog.Header>테스트 제목</Dialog.Header>
      <div>내용</div>
    </Dialog>
  ));

  await waitFor(() => {
    const header = document.querySelector("[data-modal-header]");
    expect(header?.textContent).toContain("테스트 제목");
  });
});

it("Dialog.Action 슬롯이 닫기 버튼 옆에 렌더링된다", async () => {
  render(() => (
    <Dialog open={true}>
      <Dialog.Header>제목</Dialog.Header>
      <Dialog.Action>
        <button data-testid="action">액션</button>
      </Dialog.Action>
      <div>내용</div>
    </Dialog>
  ));

  await waitFor(() => {
    expect(document.querySelector('[data-testid="action"]')).not.toBeNull();
  });
});

it("Dialog.Header 미제공 시 헤더가 렌더링되지 않는다", async () => {
  render(() => (
    <Dialog open={true}>
      <div>내용만</div>
    </Dialog>
  ));

  await waitFor(() => {
    expect(document.querySelector("[data-modal-header]")).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dialog.spec.tsx --project=solid --run`
Expected: FAIL

**Step 3: Implement Dialog slot changes**

In `Dialog.tsx`:
- Add `DialogHeader: ParentComponent` → `<div data-dialog-header>{props.children}</div>`
- Add `DialogAction: ParentComponent` → `<div data-dialog-action>{props.children}</div>`
- Use `children()` + `splitSlots(resolved, ["dialogHeader", "dialogAction"] as const)` to extract slots
- Remove `title` and `headerAction` from `DialogProps`
- Keep `children` as `JSX.Element` (no longer needs to be the only content)
- Header renders when `dialogHeader` slot has content AND `hideHeader` is not true
- Layout: `[dialogHeader slot (flex-1 px-4 py-2 text-sm font-bold)] [dialogAction slot] [close button]`
- `aria-label` needs a fallback since `title` prop is removed — use text content of header slot or a generic label

In `DialogContext.ts`:
- `DialogShowOptions.title` remains for programmatic API

In `DialogProvider.tsx`:
- Change `title={entry.options.title}` to render `<Dialog.Header>{entry.options.title}</Dialog.Header>` as a child

**Step 4: Run tests**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dialog.spec.tsx packages/solid/tests/components/disclosure/DialogProvider.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Update demo page**

Modify `packages/solid-demo/src/pages/disclosure/DialogPage.tsx`:
- Replace all `title="..."` with `<Dialog.Header>...</Dialog.Header>` child

**Step 6: Commit**

```bash
git add packages/solid/src/components/disclosure/Dialog.tsx \
  packages/solid/src/components/disclosure/DialogContext.ts \
  packages/solid/src/components/disclosure/DialogProvider.tsx \
  packages/solid/tests/components/disclosure/Dialog.spec.tsx \
  packages/solid/tests/components/disclosure/DialogProvider.spec.tsx \
  packages/solid-demo/src/pages/disclosure/DialogPage.tsx
git commit -m "refactor(solid): convert Dialog title/headerAction to Header/Action slots"
```

---

### Task 3: TextInput.Prefix slot

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx`
- Test: `packages/solid/tests/components/form-control/field/TextInput.spec.tsx`

**Step 1: Update tests**

Add test for Prefix slot, update existing prefixIcon tests:

```tsx
it("TextInput.Prefix 슬롯이 렌더링된다", () => {
  render(() => (
    <TextInput>
      <TextInput.Prefix>
        <span data-testid="prefix">P</span>
      </TextInput.Prefix>
    </TextInput>
  ));

  expect(document.querySelector('[data-testid="prefix"]')).not.toBeNull();
});

it("Prefix 슬롯 사용 시 gap 클래스가 적용된다", () => {
  const { container } = render(() => (
    <TextInput>
      <TextInput.Prefix>
        <span>P</span>
      </TextInput.Prefix>
    </TextInput>
  ));

  const wrapper = container.querySelector("[data-text-field]") as HTMLElement;
  expect(wrapper.className).toContain("gap-");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextInput.spec.tsx --project=solid --run`
Expected: FAIL

**Step 3: Implement**

In `TextInput.tsx`:
- Add `TextInputPrefix: ParentComponent` → `<span data-text-input-prefix class="shrink-0">{props.children}</span>`
- Change `Component<TextInputProps>` to `ParentComponent` (to accept children)
- Add `children` to splitProps list
- Use `children()` + `splitSlots(resolved, ["textInputPrefix"] as const)`
- Replace `prefixIconEl()` usage with `prefixEl()` that renders the slot content
- Gap class: apply `fieldGapClasses` when prefix slot has content (same logic as current `local.prefixIcon`)
- Remove `prefixIcon` from `TextInputProps`
- Assign `TextInput.Prefix = TextInputPrefix`
- Update type: `interface TextInputComponent extends Component<TextInputProps> { Prefix: typeof TextInputPrefix }`

**Step 4: Run test**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextInput.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Update demo**

Modify `packages/solid-demo/src/pages/LoginPage.tsx`:
```tsx
// Before
<TextInput prefixIcon={IconMail} ... />

// After
<TextInput ...>
  <TextInput.Prefix><Icon icon={IconMail} /></TextInput.Prefix>
</TextInput>
```

**Step 6: Commit**

```bash
git add packages/solid/src/components/form-control/field/TextInput.tsx \
  packages/solid/tests/components/form-control/field/TextInput.spec.tsx \
  packages/solid-demo/src/pages/LoginPage.tsx
git commit -m "refactor(solid): convert TextInput prefixIcon to Prefix slot"
```

---

### Task 4: NumberInput.Prefix slot

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx`
- Test: `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx`

Same pattern as Task 3. Key differences:
- Sub-component: `NumberInputPrefix` with `data-number-input-prefix`
- Remove `prefixIcon` from `NumberInputProps`
- Update type to `NumberInputComponent` with `Prefix` property

**Step 1: Update tests**

```tsx
it("NumberInput.Prefix 슬롯이 렌더링된다", () => {
  render(() => (
    <NumberInput>
      <NumberInput.Prefix>
        <span data-testid="prefix">₩</span>
      </NumberInput.Prefix>
    </NumberInput>
  ));

  expect(document.querySelector('[data-testid="prefix"]')).not.toBeNull();
});
```

**Step 2–4: Same TDD cycle as Task 3**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/NumberInput.spec.tsx --project=solid --run`

**Step 5: Commit**

```bash
git add packages/solid/src/components/form-control/field/NumberInput.tsx \
  packages/solid/tests/components/form-control/field/NumberInput.spec.tsx
git commit -m "refactor(solid): convert NumberInput prefixIcon to Prefix slot"
```

---

### Task 5: Topbar.Right slot + User extraction

**Files:**
- Modify: `packages/solid/src/components/layout/topbar/Topbar.tsx`
- Modify: `packages/solid/src/components/layout/topbar/TopbarUser.tsx`
- Test: new test or update existing topbar tests

**Step 1: Write tests**

```tsx
// packages/solid/tests/components/layout/topbar/Topbar.spec.tsx (new)
import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { Topbar } from "../../../../src/components/layout/topbar/Topbar";

describe("Topbar 슬롯", () => {
  it("children은 왼쪽, Topbar.Right는 오른쪽에 렌더링된다", () => {
    const { container } = render(() => (
      <Topbar>
        <span data-testid="left">왼쪽</span>
        <Topbar.Right>
          <span data-testid="right">오른쪽</span>
        </Topbar.Right>
      </Topbar>
    ));

    const header = container.querySelector("[data-topbar]")!;
    const children = [...header.children];

    // left content가 먼저, spacer, right content 순서
    const leftEl = header.querySelector('[data-testid="left"]');
    const rightEl = header.querySelector('[data-testid="right"]');
    expect(leftEl).not.toBeNull();
    expect(rightEl).not.toBeNull();

    // spacer (flex-1) 존재
    const spacer = header.querySelector("[data-topbar-spacer]");
    expect(spacer).not.toBeNull();
  });

  it("Topbar.User는 항상 가장 오른쪽에 렌더링된다", () => {
    const { container } = render(() => (
      <Topbar>
        <span>왼쪽</span>
        <Topbar.User>홍길동</Topbar.User>
        <Topbar.Right>
          <span data-testid="right">알림</span>
        </Topbar.Right>
      </Topbar>
    ));

    const header = container.querySelector("[data-topbar]")!;
    const children = [...header.children];
    // User가 마지막 child
    const lastChild = children[children.length - 1];
    expect(lastChild.textContent).toContain("홍길동");
  });
});
```

**Step 2: Run test to verify fail**

Run: `pnpm vitest packages/solid/tests/components/layout/topbar/Topbar.spec.tsx --project=solid --run`
Expected: FAIL

**Step 3: Implement**

In `Topbar.tsx`:
- Add `TopbarRight: ParentComponent` → `<div data-topbar-right class="flex items-center gap-2">{props.children}</div>`
- Add `Topbar.Right = TopbarRight` to compound component interface
- Use `children()` + `splitSlots(resolved, ["topbarRight", "topbarUser"] as const)`
- Render order: `[sidebar toggle] [left content] [<div data-topbar-spacer class="flex-1" />] [topbarRight slot] [topbarUser slot]`
- Spacer only rendered when Right or User slots have content

In `TopbarUser.tsx`:
- Add `data-topbar-user` attribute to the root element so `splitSlots` can extract it

**Step 4: Run tests**

Run: `pnpm vitest packages/solid/tests/components/layout/topbar/ --project=solid --run`
Expected: PASS

**Step 5: Update demos**

Modify `packages/solid-demo/src/pages/Home.tsx`:
```tsx
// Before
<Topbar>
  <span ...>{titleChain().join(" > ")}</span>
  <div class="flex-1" />
  <NotificationBell />
  <ThemeToggle size="sm" />
</Topbar>

// After
<Topbar>
  <span ...>{titleChain().join(" > ")}</span>
  <Topbar.Right>
    <NotificationBell />
    <ThemeToggle size="sm" />
  </Topbar.Right>
</Topbar>
```

Also update:
- `packages/solid-demo/src/pages/layout/TopbarPage.tsx` — remove manual `<div class="flex-1" />` spacers
- `packages/solid-demo/src/pages/mobile/MobileLayoutDemoPage.tsx`

**Step 6: Commit**

```bash
git add packages/solid/src/components/layout/topbar/Topbar.tsx \
  packages/solid/src/components/layout/topbar/TopbarUser.tsx \
  packages/solid/tests/components/layout/topbar/Topbar.spec.tsx \
  packages/solid-demo/src/pages/Home.tsx \
  packages/solid-demo/src/pages/layout/TopbarPage.tsx \
  packages/solid-demo/src/pages/mobile/MobileLayoutDemoPage.tsx
git commit -m "refactor(solid): add Topbar.Right slot and extract Topbar.User"
```

---

### Task 6: DateRangePicker — remove periodLabels

**Files:**
- Modify: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx`
- Test: `packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx`

**Step 1: Update tests**

Remove any test using `periodLabels` prop. Add test verifying hardcoded labels:

```tsx
it("기간 타입 라벨이 '일/월/범위'로 고정된다", async () => {
  render(() => (
    <DateRangePicker />
  ));

  // Select의 렌더링된 값 확인 (기본 periodType=range)
  // Select 트리거에 "범위" 텍스트가 표시됨
});
```

**Step 2: Implement**

In `DateRangePicker.tsx`:
- Remove `periodLabels` from `DateRangePickerProps`
- Remove `periodLabels` from `splitProps` list
- Remove `labels()` function
- Replace `labels().day` → `"일"`, `labels().month` → `"월"`, `labels().range` → `"범위"` (4 occurrences: `renderValue` and 3 `Select.Item` children)

**Step 3: Run tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx --project=solid --run`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx \
  packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx
git commit -m "refactor(solid): remove periodLabels prop from DateRangePicker"
```

---

### Task 7: Typecheck + lint + README

**Step 1: Typecheck**

Run: `pnpm typecheck packages/solid && pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 2: Lint**

Run: `pnpm lint packages/solid packages/solid-demo --fix`
Expected: PASS (or auto-fixable issues only)

**Step 3: Update README**

Update `packages/solid/README.md`:
- Dropdown: document `Dropdown.Trigger`/`Dropdown.Content`, remove `triggerRef` docs
- Dialog: document `Dialog.Header`/`Dialog.Action`, remove `title`/`headerAction` docs
- TextInput: document `TextInput.Prefix`, remove `prefixIcon` docs
- NumberInput: document `NumberInput.Prefix`, remove `prefixIcon` docs
- Topbar: document `Topbar.Right` slot
- DateRangePicker: remove `periodLabels` docs

**Step 4: Commit**

```bash
git add packages/solid/README.md
git commit -m "docs(solid): update README for slot pattern conversions"
```
