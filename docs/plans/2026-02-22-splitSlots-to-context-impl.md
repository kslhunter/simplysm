# splitSlots → Context 등록 패턴 전환 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** 9개 컴포넌트의 splitSlots를 컴포넌트별 Context 등록 패턴으로 전환, 외부 API 변경 없음

**Architecture:** 서브 컴포넌트가 Context signal에 content accessor를 등록하고 null 반환. 부모가 signal에서 읽어 렌더링. 기존 Context가 있으면 확장, 없으면 새 Context 생성.

**Tech Stack:** SolidJS (createContext, createSignal, onCleanup)

**공통 패턴:**

```tsx
// Context signal 타입
type SlotAccessor = (() => JSX.Element) | undefined;

// 부모: signal 생성
const [header, setHeader] = createSignal<SlotAccessor>();
const hasHeader = () => header() !== undefined;

// 서브 컴포넌트: 등록 + cleanup
const DialogHeader: ParentComponent = (props) => {
  const ctx = useContext(DialogSlotsContext)!;
  ctx.setHeader(() => () => props.children); // 이중 래핑: 외부=signal setter, 내부=accessor
  onCleanup(() => ctx.setHeader(undefined));
  return null;
};

// 부모: 렌더링
<Show when={hasHeader()}>
  <h5>{header()!()}</h5>
</Show>
```

---

### Task 1: TextInput — Context 등록 전환

**Files:**
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx`
- Test: `packages/solid/tests/components/form-control/field/TextInput.spec.tsx`

**Step 1: 기존 테스트 확인**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextInput.spec.tsx --project=solid`
Expected: PASS

**Step 2: TextInput 수정**

`TextInput.tsx`에서:

1. `splitSlots`, `children` import 제거
2. `createContext`, `useContext`, `onCleanup`, `createSignal` import 추가
3. TextInputPrefix Context 생성 + 서브 컴포넌트 수정:

```tsx
// Context 정의 (파일 상단)
type SlotAccessor = (() => JSX.Element) | undefined;

interface TextInputSlotsContextValue {
  setPrefix: (content: SlotAccessor) => void;
}

const TextInputSlotsContext = createContext<TextInputSlotsContextValue>();

// 서브 컴포넌트 수정 (wrapper 요소 제거)
const TextInputPrefix: ParentComponent = (props) => {
  const ctx = useContext(TextInputSlotsContext)!;
  ctx.setPrefix(() => () => props.children);
  onCleanup(() => ctx.setPrefix(undefined));
  return null;
};
```

4. TextInput 컴포넌트에서 splitSlots 제거, Context Provider 추가:

```tsx
// 기존 코드 제거:
//   const resolved = children(() => local.children);
//   const [slots] = splitSlots(resolved, ["textInputPrefix"] as const);
//   const prefixEl = () => slots().textInputPrefix[0] as HTMLElement | undefined;

// 새 코드:
const [prefix, setPrefix] = createSignal<SlotAccessor>();
const prefixEl = () => prefix() !== undefined;

// wrapper 클래스에서 prefixEl() 사용 변경:
// 기존: extra: prefixEl() && fieldGapClasses[...]
// 새: extra: prefixEl() && fieldGapClasses[...]  (동일 — boolean 반환)
```

5. JSX 수정:

```tsx
// return 전체를 Provider로 감싸기:
return (
  <TextInputSlotsContext.Provider value={{ setPrefix }}>
    <Invalid ...>
      ...
    </Invalid>
  </TextInputSlotsContext.Provider>
);

// {prefixEl()} 렌더링 → prefix accessor 호출:
// 기존: {prefixEl()}
// 새: <Show when={prefix()}><span class="shrink-0">{prefix()!()}</span></Show>
```

**Step 3: 테스트 확인**

Run: `pnpm vitest packages/solid/tests/components/form-control/field/TextInput.spec.tsx --project=solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/components/form-control/field/TextInput.tsx
git commit -m "refactor(solid): TextInput splitSlots → Context registration"
```

---

### Task 2: NumberInput — Context 등록 전환

**Files:**
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx`
- Test: `packages/solid/tests/components/form-control/field/NumberInput.spec.tsx`

Task 1(TextInput)과 동일한 패턴. `textInputPrefix` → `numberInputPrefix`, `TextInputSlotsContext` → `NumberInputSlotsContext`.

**Step 1:** 기존 테스트 확인 → PASS
**Step 2:** NumberInput 수정 (Task 1과 동일 패턴)
**Step 3:** 테스트 확인 → PASS
**Step 4:** Commit

---

### Task 3: Dialog — Context 등록 전환

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx`
- Test: `packages/solid/tests/components/disclosure/Dialog.spec.tsx`

**Step 1: 기존 테스트 확인**

Run: `pnpm vitest packages/solid/tests/components/disclosure/Dialog.spec.tsx --project=solid`
Expected: PASS

**Step 2: Dialog 수정**

1. `splitSlots`, `children` import 제거, `createContext`, `createSignal`, `onCleanup` 추가

2. DialogSlotsContext + 서브 컴포넌트 수정:

```tsx
type SlotAccessor = (() => JSX.Element) | undefined;

interface DialogSlotsContextValue {
  setHeader: (content: SlotAccessor) => void;
  setAction: (content: SlotAccessor) => void;
}

const DialogSlotsContext = createContext<DialogSlotsContextValue>();

const DialogHeader: ParentComponent = (props) => {
  const ctx = useContext(DialogSlotsContext)!;
  ctx.setHeader(() => () => props.children);
  onCleanup(() => ctx.setHeader(undefined));
  return null;
};

const DialogAction: ParentComponent = (props) => {
  const ctx = useContext(DialogSlotsContext)!;
  ctx.setAction(() => () => props.children);
  onCleanup(() => ctx.setAction(undefined));
  return null;
};
```

3. Dialog 컴포넌트 수정:

```tsx
// 기존 코드 제거:
//   const resolved = children(() => local.children);
//   const [slots, content] = splitSlots(resolved, ["dialogHeader", "dialogAction"] as const);
//   const hasHeader = () => slots().dialogHeader.length > 0;

// 새 코드:
const [header, setHeader] = createSignal<SlotAccessor>();
const [action, setAction] = createSignal<SlotAccessor>();
const hasHeader = () => header() !== undefined;
```

4. JSX 수정 — Provider 감싸기 + 슬롯 렌더링:

```tsx
// Portal 내부를 Provider로 감싸기 (children이 resolve되도록)
// 헤더 영역:
<Show when={hasHeader()}>
  <div data-modal-header class={...} onPointerDown={handleHeaderPointerDown}>
    <h5 id={headerId} class={clsx("flex-1", "px-4 py-2", "text-sm font-bold")}>
      {header()!()}
    </h5>
    <Show when={action()}>
      {action()!()}
    </Show>
    <Show when={local.closable ?? true}>
      <button ...>...</button>
    </Show>
  </div>
</Show>

// 콘텐츠 영역:
<div data-modal-content class={dialogContentClass}>
  {local.children}
</div>
```

Note: 기존 `<For each={slots().dialogHeader}>` 루프와 headerId 설정 로직이 단순화됨 — h5에 직접 id 부여.

**Step 3:** 테스트 확인 → PASS
**Step 4:** Commit

---

### Task 4: ListItem — Context 등록 전환 (per-instance)

**Files:**
- Modify: `packages/solid/src/components/data/list/ListItem.tsx`
- Test: `packages/solid/tests/components/data/List.spec.tsx`

**Step 1:** 기존 테스트 확인

Run: `pnpm vitest packages/solid/tests/components/data/List.spec.tsx --project=solid`

**Step 2: ListItem 수정**

1. Per-instance Context 생성:

```tsx
type SlotAccessor = (() => JSX.Element) | undefined;

interface ListItemSlotsContextValue {
  setChildren: (content: SlotAccessor) => void;
}

const ListItemSlotsContext = createContext<ListItemSlotsContextValue>();
```

2. ListItemChildren 수정 — wrapper 제거, Context 등록:

```tsx
const ListItemChildren: ParentComponent = (props) => {
  const ctx = useContext(ListItemSlotsContext)!;
  ctx.setChildren(() => () => props.children);
  onCleanup(() => ctx.setChildren(undefined));
  return null;
};
```

3. ListItem 수정:

```tsx
// 기존 제거:
//   const resolved = children(() => local.children);
//   const [slots, content] = splitSlots(resolved, ["listItemChildren"] as const);
//   const hasChildren = () => slots().listItemChildren.length > 0;

// 새 코드:
const [childrenSlot, setChildrenSlot] = createSignal<SlotAccessor>();
const hasChildren = () => childrenSlot() !== undefined;
```

4. JSX — Provider로 감싸기 + wrapper를 부모에서 렌더링:

```tsx
return (
  <ListItemSlotsContext.Provider value={{ setChildren: setChildrenSlot }}>
    <button ...>
      ...
      <span class={listItemContentClass}>{local.children}</span>
      ...
    </button>
    <Show when={hasChildren()}>
      <Collapse open={openState()} data-collapsed={!openState() || undefined}>
        <div class="flex">
          <div class={listItemIndentGuideClass} />
          <List inset class="flex-1">{childrenSlot()!()}</List>
        </div>
      </Collapse>
    </Show>
  </ListItemSlotsContext.Provider>
);
```

Note: `{content()}` → `{local.children}` (서브 컴포넌트는 null 반환하므로 무해)

**Step 3:** 테스트 확인 → PASS
**Step 4:** Commit

---

### Task 5: SelectItem — Context 등록 전환 (per-instance)

**Files:**
- Modify: `packages/solid/src/components/form-control/select/SelectItem.tsx`
- Test: `packages/solid/tests/components/form-control/select/SelectItem.spec.tsx`

Task 4(ListItem)와 동일한 per-instance 패턴. `listItemChildren` → `selectItemChildren`.

**Step 1:** 기존 테스트 확인 → PASS
**Step 2:** SelectItem 수정 (Task 4와 동일 패턴)

SelectItemChildren의 wrapper(indent guide + List) → 부모(SelectItem)에서 렌더링.

**Step 3:** 테스트 확인 → PASS
**Step 4:** Commit

---

### Task 6: Dropdown — 기존 Context 확장

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx`
- Test: `packages/solid/tests/components/disclosure/Dropdown.spec.tsx`

**Step 1:** 기존 테스트 확인

**Step 2: DropdownContext 확장**

```tsx
type SlotAccessor = (() => JSX.Element) | undefined;

interface DropdownContextValue {
  toggle: () => void;
  // 슬롯 등록 추가
  setTrigger: (content: SlotAccessor) => void;
  setContent: (content: SlotAccessor) => void;
}
```

**Step 3: 서브 컴포넌트 수정**

```tsx
const DropdownTrigger: ParentComponent = (props) => {
  const ctx = useContext(DropdownContext)!;
  ctx.setTrigger(() => () => props.children);
  onCleanup(() => ctx.setTrigger(undefined));
  return null;
};

const DropdownContent: ParentComponent = (props) => {
  const ctx = useContext(DropdownContext)!;
  ctx.setContent(() => () => props.children);
  onCleanup(() => ctx.setContent(undefined));
  return null;
};
```

**Step 4: Dropdown 수정**

`DropdownInner` 제거 — Provider 안에서 직접 렌더링:

```tsx
const [trigger, setTrigger] = createSignal<SlotAccessor>();
const [content, setContent] = createSignal<SlotAccessor>();

// Provider value에 setTrigger, setContent 추가
// splitSlots 관련 코드 제거

// 기존 triggerEl() → trigger()!() 호출로 변경
// trigger에서 click handler, keyboard handler 등은 wrapper div에 직접 부착
```

Note: DropdownInner에서 직접 수행하던 triggerEl() 기반 위치 계산 로직은 trigger wrapper ref로 대체.

**Step 5:** 테스트 확인 → PASS
**Step 6:** Commit

---

### Task 7: Select — 기존 Context 확장 + createItemTemplate 제거

**Files:**
- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid/src/components/form-control/select/SelectContext.ts`
- Test: `packages/solid/tests/components/form-control/select/Select.spec.tsx`

**Step 1:** 기존 테스트 확인

**Step 2: SelectContext 확장**

`SelectContext.ts`에 슬롯 signal 타입 추가:

```tsx
type SlotAccessor = (() => JSX.Element) | undefined;

export interface SelectContextValue<TValue = unknown> {
  multiple: Accessor<boolean>;
  isSelected: (value: TValue) => boolean;
  toggleValue: (value: TValue) => void;
  closeDropdown: () => void;
  // 슬롯 등록
  setHeader: (content: SlotAccessor) => void;
  setAction: (content: SlotAccessor) => void;
  setItemTemplate: (fn: ((...args: unknown[]) => JSX.Element) | undefined) => void;
}
```

**Step 3: Select.tsx 수정**

1. `createItemTemplate` import 제거, `splitSlots` 제거
2. SelectHeader, SelectAction 서브 컴포넌트 → Context 등록 패턴
3. SelectItemTemplate → Context에 render function 직접 등록:

```tsx
const SelectItemTemplate = <TArgs extends unknown[]>(
  props: { children: (...args: TArgs) => JSX.Element },
) => {
  const ctx = useSelectContext();
  ctx.setItemTemplate(() => props.children as (...args: unknown[]) => JSX.Element);
  onCleanup(() => ctx.setItemTemplate(undefined));
  return null;
};
```

4. SelectInner에서 `splitSlots` 대신 Context signal 읽기

**Step 4: 테스트 수정**

`Select.spec.tsx:186` — `querySelector("[data-select-header]")` 쿼리 수정. header wrapper가 제거되므로 다른 방식으로 확인 (예: 텍스트 내용 확인).

**Step 5:** 테스트 확인 → PASS
**Step 6:** Commit

---

### Task 8: Combobox — 기존 Context 확장 + createItemTemplate 제거

**Files:**
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx`
- Modify: `packages/solid/src/components/form-control/combobox/ComboboxContext.ts`
- Test: `packages/solid/tests/components/form-control/combobox/Combobox.spec.tsx`

Task 7(Select)의 ItemTemplate 패턴과 동일.

**Step 1:** 기존 테스트 확인 → PASS
**Step 2:** ComboboxContext 확장 (setItemTemplate 추가)
**Step 3:** Combobox.tsx에서 createItemTemplate, splitSlots 제거
**Step 4:** 테스트 확인 → PASS
**Step 5:** Commit

---

### Task 9: Kanban.Lane — 기존 Context 확장

**Files:**
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx`
- Modify: `packages/solid/src/components/data/kanban/KanbanContext.ts`
- Test: `packages/solid/tests/components/data/kanban/Kanban.selection.spec.tsx`

**Step 1:** 기존 테스트 확인

**Step 2: KanbanLaneContext 확장**

```tsx
type SlotAccessor = (() => JSX.Element) | undefined;

export interface KanbanLaneContextValue<L = unknown, T = unknown> {
  // 기존
  value: Accessor<L | undefined>;
  dropTarget: Accessor<KanbanDropTarget<T> | undefined>;
  setDropTarget: (target: KanbanDropTarget<T> | undefined) => void;
  registerCard: (id: string, info: { value: T | undefined; selectable: boolean }) => void;
  unregisterCard: (id: string) => void;
  // 슬롯 등록
  setTitle: (content: SlotAccessor) => void;
  setTools: (content: SlotAccessor) => void;
}
```

**Step 3: Kanban.tsx 수정**

1. KanbanLaneTitle, KanbanLaneTools → Context 등록 패턴
2. LaneInner에서 splitSlots 제거, Context signal 읽기
3. `{slots().kanbanLaneTitle}` → `{title()!()}`

**Step 4:** 테스트 확인 → PASS
**Step 5:** Commit

---

### Task 10: Cleanup — splitSlots 및 createItemTemplate 삭제

**Files:**
- Delete: `packages/solid/src/helpers/splitSlots.ts`
- Delete: `packages/solid/tests/helpers/splitSlots.spec.tsx`
- Delete: `packages/solid/src/hooks/createItemTemplate.tsx`
- Modify: `packages/solid/src/index.ts` (export 제거)
- Modify: `packages/solid/docs/helpers.md` (splitSlots 문서 제거)

**Step 1: splitSlots 참조 확인**

Run: `grep -r "splitSlots" packages/solid/src/`
Expected: 결과 없음 (모든 참조 제거 완료)

Run: `grep -r "createItemTemplate" packages/solid/src/`
Expected: 결과 없음

**Step 2: 파일 삭제 + export 정리**

```bash
rm packages/solid/src/helpers/splitSlots.ts
rm packages/solid/tests/helpers/splitSlots.spec.tsx
rm packages/solid/src/hooks/createItemTemplate.tsx
```

`index.ts:185` 에서 `export { splitSlots }` 줄 제거.
`docs/helpers.md` 에서 splitSlots 관련 내용 제거.

**Step 3: 전체 테스트 확인**

Run: `pnpm vitest packages/solid/ --project=solid`
Expected: PASS (splitSlots.spec.tsx 삭제됨, 나머지 통과)

**Step 4: typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(solid): remove splitSlots and createItemTemplate"
```
