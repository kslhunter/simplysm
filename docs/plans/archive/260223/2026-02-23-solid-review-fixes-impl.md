# Solid Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** `/sd-review solid` 결과에서 합의된 7건의 이슈를 수정한다.

**Architecture:** 기존 패턴(createControllableSignal, createSlotSignal, export *)에 맞춰 일관성을 확보하는 리팩토링. 새로운 유틸리티 `createSlotSignal`을 추가하고, 기존 컴포넌트들을 이에 맞게 수정한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS

---

### Task 1: createSlotSignal 유틸리티 추출

**Files:**
- Create: `packages/solid/src/hooks/createSlotSignal.ts`
- Modify: `packages/solid/src/index.ts`

**Step 1: Write implementation**

`packages/solid/src/hooks/createSlotSignal.ts`:

```typescript
import { createSignal, type Accessor, type JSX } from "solid-js";

export type SlotAccessor = (() => JSX.Element) | undefined;

/**
 * 슬롯 등록용 signal 생성
 *
 * @returns [accessor, setter] — setter는 함수를 값으로 저장하기 위해 래핑 처리
 */
export function createSlotSignal(): [Accessor<SlotAccessor>, (content: SlotAccessor) => void] {
  const [slot, _setSlot] = createSignal<SlotAccessor>();
  const setSlot = (content: SlotAccessor) => _setSlot(() => content);
  return [slot, setSlot];
}
```

**Step 2: index.ts에 export 추가**

`packages/solid/src/index.ts` Hooks 섹션에 추가:

```typescript
export * from "./hooks/createSlotSignal";
```

**Step 3: Verify**

Run: `pnpm check packages/solid --type typecheck`

---

### Task 2: SlotAccessor 사용처를 createSlotSignal로 마이그레이션

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx`
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx`
- Modify: `packages/solid/src/components/form-control/field/TextInput.tsx`
- Modify: `packages/solid/src/components/form-control/field/NumberInput.tsx`
- Modify: `packages/solid/src/components/form-control/select/Select.tsx`
- Modify: `packages/solid/src/components/form-control/select/SelectContext.ts`
- Modify: `packages/solid/src/components/form-control/select/SelectItem.tsx`
- Modify: `packages/solid/src/components/data/list/ListItem.tsx`
- Modify: `packages/solid/src/components/data/kanban/KanbanContext.ts`
- Modify: `packages/solid/src/components/data/kanban/Kanban.tsx`

각 파일에서:
1. `type SlotAccessor = (() => JSX.Element) | undefined;` 로컬 정의 삭제
2. `import { createSlotSignal, type SlotAccessor } from "..."` 추가 (필요한 것만)
3. `const [xxx, _setXxx] = createSignal<SlotAccessor>(); const setXxx = (content: SlotAccessor) => _setXxx(() => content);` 패턴을 `const [xxx, setXxx] = createSlotSignal();`로 교체

**파일별 변경사항:**

**Dialog.tsx** (line 28, 192-195):
- 삭제: `type SlotAccessor` (line 28)
- import 추가: `import { createSlotSignal, type SlotAccessor } from "../../hooks/createSlotSignal";`
- 교체 (line 192-195):
  - `const [header, _setHeader] = createSignal<SlotAccessor>(); const setHeader = ...` → `const [header, setHeader] = createSlotSignal();`
  - `const [action, _setAction] = createSignal<SlotAccessor>(); const setAction = ...` → `const [action, setAction] = createSlotSignal();`
- `createSignal` import에서 `createSignal` 제거 가능 여부 확인 (다른 곳에서 사용하면 유지)

**Dropdown.tsx** (line 22, 180-183):
- 삭제: `type SlotAccessor` (line 22)
- import 추가: `import { createSlotSignal, type SlotAccessor } from "../../hooks/createSlotSignal";`
- 교체 (line 180-183):
  - `const [triggerSlot, _setTriggerSlot] = ... const setTrigger = ...` → `const [triggerSlot, setTrigger] = createSlotSignal();`
  - `const [contentSlot, _setContentSlot] = ... const setContent = ...` → `const [contentSlot, setContent] = createSlotSignal();`

**TextInput.tsx** (line 26, 247-248):
- 삭제: `type SlotAccessor` (line 26)
- import 추가: `import { createSlotSignal, type SlotAccessor } from "../../../hooks/createSlotSignal";`
- 교체 (line 247-248):
  - `const [prefix, _setPrefix] = ... const setPrefix = ...` → `const [prefix, setPrefix] = createSlotSignal();`

**NumberInput.tsx** (line 33, 238-239):
- 삭제: `type SlotAccessor` (line 33)
- import 추가: `import { createSlotSignal, type SlotAccessor } from "../../../hooks/createSlotSignal";`
- 교체 (line 238-239):
  - `const [prefix, _setPrefix] = ... const setPrefix = ...` → `const [prefix, setPrefix] = createSlotSignal();`

**Select.tsx** (line 29, 275-283):
- 삭제: `type SlotAccessor` (line 29)
- import 추가: `import { createSlotSignal, type SlotAccessor } from "../../../hooks/createSlotSignal";`
- 교체 (line 275-278):
  - `const [header, _setHeader] = ... const setHeader = ...` → `const [header, setHeader] = createSlotSignal();`
  - `const [action, _setAction] = ... const setAction = ...` → `const [action, setAction] = createSlotSignal();`
- Note: `itemTemplate` (line 279-283)은 `SlotAccessor` 타입이 아닌 별도 함수 타입이므로 그대로 유지

**SelectContext.ts** (line 3):
- 삭제: `type SlotAccessor` (line 3)
- import 추가: `import type { SlotAccessor } from "../../../hooks/createSlotSignal";`

**SelectItem.tsx** (line 29, 86-87):
- 삭제: `type SlotAccessor` (line 29)
- import 추가: `import { createSlotSignal, type SlotAccessor } from "../../../hooks/createSlotSignal";`
- 교체 (line 86-87):
  - `const [childrenSlot, _setChildrenSlot] = ... const setChildrenSlot = ...` → `const [childrenSlot, setChildrenSlot] = createSlotSignal();`

**ListItem.tsx** (line 35, 169-170):
- 삭제: `type SlotAccessor` (line 35)
- import 추가: `import { createSlotSignal, type SlotAccessor } from "../../../hooks/createSlotSignal";`
- 교체 (line 169-170):
  - `const [childrenSlot, _setChildrenSlot] = ... const setChildrenSlot = ...` → `const [childrenSlot, setChildrenSlot] = createSlotSignal();`

**KanbanContext.ts** (line 53):
- 삭제: `type SlotAccessor` (line 53)
- import 추가: `import type { SlotAccessor } from "../../../hooks/createSlotSignal";`

**Kanban.tsx** (line 389, 390-393):
- 삭제: `type SlotAccessor` (line 389)
- import 추가: `import { createSlotSignal } from "../../../hooks/createSlotSignal";`
- 교체 (line 390-393):
  - `const [title, _setTitle] = ... const setTitle = ...` → `const [title, setTitle] = createSlotSignal();`
  - `const [tools, _setTools] = ... const setTools = ...` → `const [tools, setTools] = createSlotSignal();`

**Step 2: Verify**

Run: `pnpm check packages/solid --type typecheck`

---

### Task 3: ColorPicker validation 버그 수정

**Files:**
- Modify: `packages/solid/src/components/form-control/color-picker/ColorPicker.tsx:109`

**Step 1: Fix**

Line 109 변경:

```typescript
// Before
const v = props.value;

// After
const v = value();
```

**Step 2: Verify**

Run: `pnpm check packages/solid --type typecheck`

---

### Task 4: CrudSheet selectMode "multi" → "multiple" 통일

**Files:**
- Modify: `packages/solid/src/components/data/crud-sheet/types.ts:88`
- Modify: `packages/solid/src/components/data/crud-sheet/CrudSheet.tsx`

**Step 1: types.ts 수정**

Line 88:

```typescript
// Before
selectMode?: "single" | "multi";

// After
selectMode?: "single" | "multiple";
```

**Step 2: CrudSheet.tsx 수정**

Line 501-508 — selectMode 변환 로직 단순화:

```typescript
// Before
selectMode={
  isSelectMode()
    ? local.selectMode === "multi"
      ? "multiple"
      : "single"
    : local.modalEdit?.deleteItems != null
      ? "multiple"
      : undefined
}

// After
selectMode={
  isSelectMode()
    ? local.selectMode
    : local.modalEdit?.deleteItems != null
      ? "multiple"
      : undefined
}
```

Line 512 — autoSelect 조건:

```typescript
// Before
autoSelect={isSelectMode() && local.selectMode === "single" ? "click" : undefined}

// After (변경 없음 — "single"은 동일)
autoSelect={isSelectMode() && local.selectMode === "single" ? "click" : undefined}
```

Line 607 — UI 텍스트:

```typescript
// Before
{local.selectMode === "multi" ? "모두" : "선택"} 해제

// After
{local.selectMode === "multiple" ? "모두" : "선택"} 해제
```

Line 610 — Show 조건:

```typescript
// Before
<Show when={local.selectMode === "multi"}>

// After
<Show when={local.selectMode === "multiple"}>
```

**Step 3: Verify**

Run: `pnpm check packages/solid --type typecheck`

---

### Task 5: createPointerDrag에 pointercancel 핸들러 추가

**Files:**
- Modify: `packages/solid/src/hooks/createPointerDrag.ts`

**Step 1: 전체 교체**

```typescript
/**
 * Sets up pointer capture and manages pointermove/pointerup lifecycle on a target element.
 *
 * @param target - Element to capture pointer on
 * @param pointerId - Pointer ID from the initiating PointerEvent
 * @param options.onMove - Called on each pointermove
 * @param options.onEnd - Called on pointerup or pointercancel (after listener cleanup)
 */
export function createPointerDrag(
  target: HTMLElement,
  pointerId: number,
  options: {
    onMove: (e: PointerEvent) => void;
    onEnd: (e: PointerEvent) => void;
  },
): void {
  target.setPointerCapture(pointerId);

  const cleanup = (e: PointerEvent) => {
    target.removeEventListener("pointermove", onPointerMove);
    target.removeEventListener("pointerup", cleanup);
    target.removeEventListener("pointercancel", cleanup);
    options.onEnd(e);
  };

  const onPointerMove = (e: PointerEvent) => options.onMove(e);

  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", cleanup);
  target.addEventListener("pointercancel", cleanup);
}
```

**Step 2: Verify**

Run: `pnpm check packages/solid --type typecheck`

---

### Task 6: Dropdown을 createControllableSignal로 리팩토링

**Files:**
- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx`

**Step 1: import 수정**

```typescript
// Before (line 1-11)
import {
  type JSX,
  type ParentComponent,
  createSignal,
  createEffect,
  createContext,
  useContext,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";

// After — createEffect 제거, createSignal은 popupRef 등에서 여전히 사용하므로 유지
import {
  type JSX,
  type ParentComponent,
  createSignal,
  createContext,
  useContext,
  onCleanup,
  Show,
  splitProps,
} from "solid-js";
```

`createControllableSignal` import 추가:

```typescript
import { createControllableSignal } from "../../hooks/createControllableSignal";
```

**Step 2: open 상태 관리 리팩토링**

Lines 157-171 교체:

```typescript
// Before
const [open, setOpenInternal] = createSignal(false);

// props.open 변경 시 내부 상태 동기화
createEffect(() => {
  const propOpen = local.open;
  if (propOpen !== undefined) {
    setOpenInternal(propOpen);
  }
});

// 콜백 포함 setter
const setOpen = (value: boolean) => {
  setOpenInternal(value);
  local.onOpenChange?.(value);
};

// After
const [open, setOpen] = createControllableSignal({
  value: () => local.open ?? false,
  onChange: () => local.onOpenChange,
});
```

**Step 3: Verify**

Run: `pnpm check packages/solid --type typecheck`

---

### Task 7: ColorPicker inset/size 확장

**Files:**
- Modify: `packages/solid/src/components/form-control/color-picker/ColorPicker.tsx`

**Step 1: size 클래스 확장**

```typescript
// Before (line 6)
import { type ComponentSizeCompact } from "../../../styles/tokens.styles";

// After
import { type ComponentSize } from "../../../styles/tokens.styles";

// Before (line 23-26)
const sizeClasses: Record<ComponentSizeCompact, string> = {
  sm: "size-field-sm",
  lg: "size-field-lg",
};

// After
const sizeClasses: Record<ComponentSize, string> = {
  xs: "size-field-xs",
  sm: "size-field-sm",
  lg: "size-field-lg",
  xl: "size-field-xl",
};
```

**Step 2: props 타입 수정**

```typescript
// Before (line 51)
size?: ComponentSizeCompact;

// After
size?: ComponentSize;
```

`inset` prop 추가 (line 54 근처, `required` 앞):

```typescript
/** inset 모드 (DataSheet 셀 내부 등) */
inset?: boolean;
```

`splitProps`에 `"inset"` 추가 (line 78-89):

```typescript
const [local, rest] = splitProps(props, [
  "value",
  "onValueChange",
  "title",
  "disabled",
  "size",
  "inset",
  "required",
  "validate",
  "touchMode",
  "class",
  "style",
]);
```

**Step 3: Invalid variant를 inset에 따라 분기**

```typescript
// Before (line 115)
<Invalid variant="border" message={errorMsg()} touchMode={local.touchMode}>

// After
<Invalid variant={local.inset ? "dot" : "border"} message={errorMsg()} touchMode={local.touchMode}>
```

**Step 4: Verify**

Run: `pnpm check packages/solid --type typecheck`

---

### Task 8: index.ts export * 통일

**Files:**
- Modify: `packages/solid/src/index.ts:115-199`

**Step 1: Providers 섹션 교체 (line 115-154)**

```typescript
//#region ========== Providers ==========

// Config
export * from "./providers/ConfigContext";

// SyncStorage
export * from "./providers/SyncStorageContext";

// Logger
export * from "./providers/LoggerContext";

// Theme
export * from "./providers/ThemeContext";

// ServiceClient
export * from "./providers/ServiceClientContext";

// SharedData
export * from "./providers/shared-data/SharedDataContext";
export * from "./providers/shared-data/SharedDataChangeEvent";

// SystemProvider
export * from "./providers/SystemProvider";

//#endregion
```

**Step 2: Hooks 섹션 교체 (line 156-167)**

```typescript
//#region ========== Hooks ==========

export * from "./hooks/useLocalStorage";
export * from "./hooks/useSyncConfig";
export * from "./hooks/useLogger";
export * from "./hooks/createControllableSignal";
export * from "./hooks/createControllableStore";
export * from "./hooks/createIMEHandler";
export * from "./hooks/createMountTransition";
export * from "./hooks/createSlotSignal";
export * from "./hooks/useRouterLink";

//#endregion
```

**Step 3: Directives 섹션 교체 (line 176-180)**

```typescript
//#region ========== Directives ==========

export * from "./directives/ripple";

//#endregion
```

**Step 4: Helpers 섹션 교체 (line 182-199)**

```typescript
//#region ========== Helpers ==========

export * from "./helpers/mergeStyles";
export * from "./helpers/createAppStructure";

//#endregion
```

**Step 5: Verify**

Run: `pnpm check packages/solid --type typecheck,lint`

typecheck 통과 후 lint도 확인 — `export *`로 변경 시 이전에 명시적으로 제한했던 내부 심볼이 노출될 수 있으므로, 의도치 않은 export가 없는지 확인.
