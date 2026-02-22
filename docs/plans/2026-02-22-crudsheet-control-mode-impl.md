# CrudSheet 3-mode 지원 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** CrudSheet에 CrudDetail과 동일한 3-mode 패턴(page/modal/control) 적용

**Architecture:** `useDialogInstance`로 modal 감지를 추가하고, control 모드에서 인라인 저장/새로고침 바를 표시하며, modal 모드에서 Dialog.Action 추가 및 하단 바 조건 수정

**Tech Stack:** SolidJS, Tailwind CSS

---

### Task 1: CrudSheet 3-mode 지원 구현

**Files:**
- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`
- Test: `packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx`

**Step 1: Write the failing tests**

`packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx`에 아래 테스트를 추가:

```typescript
import { DialogInstanceContext } from "../../../../src/components/disclosure/DialogInstanceContext";

// TestWrapper 아래에 DialogWrapper 추가
function DialogWrapper(props: { children: JSX.Element }) {
  return (
    <ConfigContext.Provider value={{ clientName: "test" }}>
      <NotificationProvider>
        <DialogInstanceContext.Provider value={{ close: () => {} }}>
          {props.children}
        </DialogInstanceContext.Provider>
      </NotificationProvider>
    </ConfigContext.Provider>
  );
}
```

`describe("CrudSheet control mode")` 블록:

```typescript
describe("CrudSheet control mode", () => {
  it("topbar/dialog 없이 inlineEdit 제공 시 저장/새로고침 버튼이 표시된다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [] })}
          getItemKey={(item) => item.id}
          inlineEdit={{
            submit: () => Promise.resolve(),
            newItem: () => ({ name: "", isDeleted: false }),
          }}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("저장");
    expect(container.textContent).toContain("새로고침");
  });

  it("inlineEdit 없으면 저장/새로고침 버튼이 없다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [] })}
          getItemKey={(item) => item.id}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("저장");
    expect(container.textContent).not.toContain("새로고침");
  });
});
```

`describe("CrudSheet modal mode")` 블록:

```typescript
describe("CrudSheet modal mode", () => {
  it("Dialog 안에서 selectMode='multi' 시 하단 바가 표시된다", async () => {
    const { container } = render(() => (
      <DialogWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectMode="multi"
          onSelect={() => {}}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </DialogWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain("확인");
  });

  it("Dialog 없이 selectMode='multi'이면 하단 바가 표시되지 않는다", async () => {
    const { container } = render(() => (
      <TestWrapper>
        <CrudSheet<TestItem, Record<string, never>>
          search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
          getItemKey={(item) => item.id}
          selectMode="multi"
          onSelect={() => {}}
        >
          <CrudSheet.Column<TestItem> key="name" header="이름">
            {(ctx) => <div>{ctx.item.name}</div>}
          </CrudSheet.Column>
        </CrudSheet>
      </TestWrapper>
    ));

    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).not.toContain("확인");
  });
});
```

기존 테스트 수정 — `describe("CrudSheet select mode")` 내 `selectMode='multi' 시 확인 버튼이 표시된다` 테스트를 `DialogWrapper`로 변경:

```typescript
it("selectMode='multi' 시 확인 버튼이 표시된다", async () => {
  const { container } = render(() => (
    <DialogWrapper>
      <CrudSheet<TestItem, Record<string, never>>
        search={() => Promise.resolve({ items: [{ id: 1, name: "홍길동", isDeleted: false }] })}
        getItemKey={(item) => item.id}
        selectMode="multi"
        onSelect={() => {}}
      >
        <CrudSheet.Column<TestItem> key="name" header="이름">
          {(ctx) => <div>{ctx.item.name}</div>}
        </CrudSheet.Column>
      </CrudSheet>
    </DialogWrapper>
  ));

  await new Promise((r) => setTimeout(r, 100));
  expect(container.textContent).toContain("확인");
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: control mode 테스트 FAIL (저장/새로고침 버튼 없음), modal mode 테스트 FAIL

**Step 3: Write implementation**

`packages/solid/src/components/data/crud-sheet/CrudSheet.tsx` 수정:

**3a. import 추가** (기존 import 블록에):

```typescript
import { useDialogInstance } from "../../disclosure/DialogInstanceContext";
import { Dialog } from "../../disclosure/Dialog";
```

**3b. isModal 감지** (`topbarCtx` 선언 직후):

```typescript
const dialogInstance = useDialogInstance();
const isModal = dialogInstance !== undefined;
```

**3c. Control 모드 인라인 바** (렌더 영역, `BusyContainer` 시작 직후 `{/* Header */}` 전에 추가):

```tsx
{/* Control mode: inline save/refresh bar */}
<Show when={!isModal && !topbarCtx && canEdit() && local.inlineEdit}>
  <div class="flex gap-2 p-2 pb-0">
    <Button
      size="sm"
      theme="primary"
      variant="ghost"
      onClick={() => formRef?.requestSubmit()}
    >
      <Icon icon={IconDeviceFloppy} class="mr-1" />
      저장
    </Button>
    <Button size="sm" theme="info" variant="ghost" onClick={handleRefresh}>
      <Icon icon={IconRefresh} class="mr-1" />
      새로고침
    </Button>
  </div>
</Show>
```

**3d. Modal 모드 Dialog.Action** (return 최상위, `BusyContainer` 전에 추가 — CrudDetail 패턴과 동일하게 `<>...</>` fragment로 감싸기):

```tsx
return (
  <>
    {/* Modal mode: Dialog.Action (refresh button in header) */}
    <Show when={isModal}>
      <Dialog.Action>
        <button
          class="flex items-center px-2 text-base-400 hover:text-base-600"
          onClick={handleRefresh}
        >
          <Icon icon={IconRefresh} />
        </button>
      </Dialog.Action>
    </Show>

    <BusyContainer ...>
      ...
    </BusyContainer>
  </>
);
```

**3e. 하단 바 조건 수정** (기존 567행):

변경 전:
```tsx
<Show when={isSelectMode()}>
```
변경 후:
```tsx
<Show when={isModal && isSelectMode()}>
```

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx --project=solid --run`
Expected: ALL PASS

**Step 5: Typecheck**

Run: `pnpm typecheck packages/solid`
Expected: No errors

**Step 6: Commit**

```bash
git add packages/solid/src/components/data/crud-sheet/CrudSheet.tsx packages/solid/tests/components/data/crud-sheet/CrudSheet.spec.tsx
git commit -m "feat(solid): add 3-mode support to CrudSheet (page/modal/control)"
```
