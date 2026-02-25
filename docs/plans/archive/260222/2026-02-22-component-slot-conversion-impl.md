# Component Slot Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Convert 5 component APIs from prop-based to slot-based patterns using `splitSlots`.

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
      const handleOpenChange = vi.fn();

      render(() => (
        <Dropdown onOpenChange={handleOpenChange}>
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
      expect(handleOpenChange).toHaveBeenCalledWith(true);

      fireEvent.click(trigger);
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    });

    it("disabled 시 Trigger 클릭이 무시된다", () => {
      const handleOpenChange = vi.fn();

      render(() => (
        <Dropdown disabled onOpenChange={handleOpenChange}>
          <Dropdown.Trigger>
            <button data-testid="trigger">열기</button>
          </Dropdown.Trigger>
          <Dropdown.Content>
            <div>팝업</div>
          </Dropdown.Content>
        </Dropdown>
      ));

      fireEvent.click(document.querySelector('[data-testid="trigger"]')!);
      expect(handleOpenChange).not.toHaveBeenCalled();
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
- Add `DropdownTrigger` sub-component: `<div data-dropdown-trigger onClick={...}>{props.children}</div>`
  - Click handler calls `ctx.toggle()` via Context (only if not disabled)
- Add `DropdownContent` sub-component: `<div data-dropdown-content>{props.children}</div>`
- Add `DropdownContext` (internal) to pass `toggle` function from Dropdown to Trigger
- Add `disabled?: boolean` to `DropdownProps`, remove `triggerRef` from `DropdownProps`
- `Dropdown` uses `children(() => local.children)` + `splitSlots(resolved, ["dropdownTrigger", "dropdownContent"] as const)` to extract slots
- Trigger slot element: rendered inline, its ref used for position calculation
- Content slot element: rendered inside existing Portal + popup logic
- Trigger click handler: `if (!local.disabled) setOpen(!open())` — auto-toggle gated by `disabled`
- Keep all existing popup logic: position calc, outside click, Escape, scroll close, resize close, animation, keyboard nav
- For keyboard nav: use `triggerEl()` instead of `local.triggerRef?.()`
- For outside click: check `triggerEl()?.contains(target)` instead of `local.triggerRef?.()?.contains(target)`
- Compound component interface:

```typescript
interface DropdownComponent extends ParentComponent<DropdownProps> {
  Trigger: typeof DropdownTrigger;
  Content: typeof DropdownContent;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dropdown.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Migrate Dropdown consumers**

Update these files to use `Dropdown.Trigger`/`Dropdown.Content`. For each:
- Remove `let xxxRef` declaration
- Remove `ref={xxxRef}` assignment on trigger element
- Remove `onClick={handleTriggerClick}` / manual toggle on trigger element (auto-toggle replaces it)
- Wrap trigger element in `<Dropdown.Trigger>`
- Wrap content in `<Dropdown.Content>`
- Replace `triggerRef={() => xxxRef}` with nothing (removed prop)
- Add `disabled={local.disabled}` to Dropdown (for Select, Combobox)

Files:
- `packages/solid/src/components/form-control/select/Select.tsx` (line ~390-420)
  - Remove `let triggerRef!: HTMLDivElement` (line ~217)
  - Remove `ref={triggerRef}` on trigger div (line ~385)
  - Remove `onClick={handleTriggerClick}` on trigger div (line ~393)
  - Remove `handleTriggerClick` function
  - Add `disabled={local.disabled}` to `<Dropdown>`
  - Wrap trigger div in `<Dropdown.Trigger>`
  - Wrap dropdown content (selectHeader + List) in `<Dropdown.Content>`

- `packages/solid/src/components/form-control/combobox/Combobox.tsx` (line ~370-395)
  - Remove `let triggerRef!: HTMLDivElement` (line ~153)
  - Remove `ref={triggerRef}` on trigger div
  - Remove `onClick={handleTriggerClick}` on trigger div (line ~379)
  - Remove `handleTriggerClick` function
  - Add `disabled={local.disabled}` to `<Dropdown>`
  - Wrap trigger div in `<Dropdown.Trigger>`, content in `<Dropdown.Content>`

- `packages/solid/src/components/layout/topbar/TopbarMenu.tsx`
  - Desktop `TopbarMenuButton` (line ~148-181): remove `let buttonRef`, remove `ref={buttonRef}`, remove `onClick={handleClick}` from Button, wrap Button in `<Dropdown.Trigger>`, wrap List in `<Dropdown.Content>`
  - Mobile hamburger (line ~76-101): same pattern with `mobileButtonRef`

- `packages/solid/src/components/layout/topbar/TopbarUser.tsx` (line ~70-99)
  - Remove `let buttonRef` (line ~53), remove `ref={buttonRef}` on Button
  - Remove `onClick={handleClick}` from Button
  - Wrap Button in `<Dropdown.Trigger>`, wrap List in `<Dropdown.Content>`

- `packages/solid/src/components/feedback/notification/NotificationBell.tsx` (line ~76-100)
  - Remove `let buttonRef` (line ~56), remove `ref={(el) => (buttonRef = el)}`
  - Remove `onClick={() => handleOpenChange(!open())}` from button
  - Wrap button in `<Dropdown.Trigger>`, wrap popup content in `<Dropdown.Content>`
  - Move `class="w-80"` from `<Dropdown>` to `<Dropdown.Content>`

**Step 6: Run related tests**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dropdown.spec.tsx packages/solid/tests/components/form-control/select/Select.spec.tsx packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx --project=solid --run`
Expected: PASS

**Step 7: Update demo page**

Modify `packages/solid-demo/src/pages/disclosure/DropdownPage.tsx`:
- Remove `let xButtonRef` variables and `ref={xButtonRef}` assignments
- Remove manual `onClick={() => setXOpen(!xOpen())}` on buttons
- Wrap trigger buttons in `<Dropdown.Trigger>`, content in `<Dropdown.Content>`
- Context menu section: keep `position` mode, wrap content in `<Dropdown.Content>` only (no Trigger)

**Step 8: Commit**

```
refactor(solid): convert Dropdown to Trigger/Content slot pattern
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
// Key test cases to add/modify in Dialog.spec.tsx:

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

it("aria-labelledby가 Dialog.Header 요소를 참조한다", async () => {
  render(() => (
    <Dialog open={true}>
      <Dialog.Header>접근성 제목</Dialog.Header>
      <div>내용</div>
    </Dialog>
  ));

  await waitFor(() => {
    const dialog = document.querySelector("[data-modal-dialog]") as HTMLElement;
    const headerId = dialog.getAttribute("aria-labelledby");
    expect(headerId).toBeTruthy();
    const header = document.getElementById(headerId!);
    expect(header?.textContent).toContain("접근성 제목");
  });
});
```

Also update ALL existing tests: replace `title="..."` with `<Dialog.Header>...</Dialog.Header>` child, remove `hideHeader` usage.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dialog.spec.tsx --project=solid --run`
Expected: FAIL

**Step 3: Implement Dialog slot changes**

In `Dialog.tsx`:
- Add `DialogHeader: ParentComponent` → `<h5 data-dialog-header class={clsx("flex-1", "px-4 py-2", "text-sm font-bold")}>{props.children}</h5>`
- Add `DialogAction: ParentComponent` → `<div data-dialog-action>{props.children}</div>`
- Use `children(() => local.children)` + `splitSlots(resolved, ["dialogHeader", "dialogAction"] as const)` to extract slots
- Remove `title`, `hideHeader`, `headerAction` from `DialogProps`
- Add `children` to splitProps list, remove `title`, `hideHeader`, `headerAction`
- Header renders when `slots().dialogHeader.length > 0`
- Generate auto id: `const headerId = "dialog-header-" + createUniqueId()` (import from `solid-js`)
- Set `aria-labelledby={headerId}` on dialog div when header slot exists, else omit
- Set `id={headerId}` on the header h5 element (via the slot element's id attribute or wrapper)
- Layout: `[dialogHeader slot (from splitSlots)] [dialogAction slot] [close button]`
- Note: `dialogHeader` slot returns the `<h5 data-dialog-header>` element itself (already styled with flex-1, px-4, etc.)
- Compound component interface:

```typescript
interface DialogComponent extends ParentComponent<DialogProps> {
  Header: typeof DialogHeader;
  Action: typeof DialogAction;
}
```

- Assign `Dialog.Header = DialogHeader; Dialog.Action = DialogAction;`

In `DialogContext.ts`:
- Replace `title: string` with `header?: JSX.Element` in `DialogShowOptions`
- Remove `hideHeader` from `DialogShowOptions`
- Keep all other options unchanged

In `DialogProvider.tsx`:
- Remove `title={entry.options.title}` and `hideHeader={entry.options.hideHeader}` from `<Dialog>`
- When `entry.options.header` exists, render `<Dialog.Header>{entry.options.header}</Dialog.Header>` as first child of Dialog
- Import `Show` if not already imported

**Step 4: Run tests**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dialog.spec.tsx packages/solid/tests/components/disclosure/DialogProvider.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Update demo page**

Modify `packages/solid-demo/src/pages/disclosure/DialogPage.tsx`:
- Replace all `title="..."` with `<Dialog.Header>...</Dialog.Header>` child
- Replace all `hideHeader` usage with simply omitting `<Dialog.Header>`
- Replace programmatic `{ title: "..." }` with `{ header: "..." }`

**Step 6: Commit**

```
refactor(solid): convert Dialog title/headerAction to Header/Action slots
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
- Add `children?: JSX.Element` to `TextInputProps`
- Add `children` to splitProps list
- Use `children(() => local.children)` + `splitSlots(resolved, ["textInputPrefix"] as const)` to extract prefix
- Replace `prefixIconEl()` with `prefixEl()`:
  ```typescript
  const prefixEl = () => slots().textInputPrefix[0] as HTMLElement | undefined;
  ```
- Replace all `{prefixIconEl()}` calls (4 places: disabled standalone, editable standalone, inset content, inset overlay) with `{prefixEl()}`
- Gap class logic: replace `local.prefixIcon && fieldGapClasses[...]` with `prefixEl() && fieldGapClasses[...]` in `getWrapperClass()`
- Remove `prefixIcon` from `TextInputProps` and `splitProps` list
- Remove `prefixIconEl()` function
- Remove `Icon` import if no longer used
- Remove `TablerIconProps` import
- Compound component interface:
  ```typescript
  interface TextInputComponent {
    (props: TextInputProps): JSX.Element;
    Prefix: typeof TextInputPrefix;
  }
  export const TextInput: TextInputComponent = ...
  TextInput.Prefix = TextInputPrefix;
  ```

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

```
refactor(solid): convert TextInput prefixIcon to Prefix slot
```

---

### Task 4: NumberInput.Prefix slot

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx`
- Test: `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx`

Same pattern as Task 3. Key differences:
- Sub-component: `NumberInputPrefix` with `data-number-input-prefix`
- Remove `prefixIcon` from `NumberInputProps`
- Update compound type to `NumberInputComponent` with `Prefix` property
- Replace `prefixIconEl()` with `prefixEl()` using splitSlots (4 places: disabled standalone, editable standalone, inset content, inset overlay)
- Gap class: `prefixEl() && fieldGapClasses[...]` in `getWrapperClass()`

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

```
refactor(solid): convert NumberInput prefixIcon to Prefix slot
```

---

### Task 5: DateRangePicker — remove periodLabels

**Files:**
- Modify: `packages/solid/src/components/form-control/date-range-picker/DateRangePicker.tsx`
- Test: `packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx`

**Step 1: Update tests**

Remove any test using `periodLabels` prop. Verify hardcoded labels work.

**Step 2: Implement**

In `DateRangePicker.tsx`:
- Remove `periodLabels` from `DateRangePickerProps` (line ~43)
- Remove `periodLabels` from `splitProps` list (line ~93)
- Remove `labels()` function (lines ~99-104)
- Replace `labels().day` → `"일"`, `labels().month` → `"월"`, `labels().range` → `"범위"` (4 occurrences):
  - `renderValue` callback (line ~173): `labels()[v]` → inline map `({ day: "일", month: "월", range: "범위" })[v]`
  - 3 `Select.Item` children (lines ~179-181): `{labels().day}` → `일`, etc.

**Step 3: Run tests**

Run: `pnpm vitest packages/solid/tests/components/form-control/date-range-picker/DateRangePicker.spec.tsx --project=solid --run`
Expected: PASS

**Step 4: Commit**

```
refactor(solid): remove periodLabels prop from DateRangePicker
```

---

### Task 6: Typecheck + lint + README

**Step 1: Typecheck**

Run: `pnpm typecheck packages/solid && pnpm typecheck packages/solid-demo`
Expected: PASS

**Step 2: Lint**

Run: `pnpm lint packages/solid packages/solid-demo --fix`
Expected: PASS (or auto-fixable issues only)

**Step 3: Update README**

Update `packages/solid/README.md`:
- Dropdown: document `Dropdown.Trigger`/`Dropdown.Content`, add `disabled` prop, remove `triggerRef` docs
- Dialog: document `Dialog.Header`/`Dialog.Action`, remove `title`/`hideHeader`/`headerAction` docs, document `aria-labelledby` behavior
- TextInput: document `TextInput.Prefix`, remove `prefixIcon` docs
- NumberInput: document `NumberInput.Prefix`, remove `prefixIcon` docs
- DateRangePicker: remove `periodLabels` docs
- DialogShowOptions: update `title: string` → `header?: JSX.Element`

**Step 4: Commit**

```
docs(solid): update README for slot pattern conversions
```
