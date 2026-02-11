# Solid 리뷰 수정사항 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** 코드 리뷰에서 합의된 15건의 수정사항과 2건의 스킬 개선사항을 구현한다.

**Architecture:** 버그 수정(Combobox 클릭, Dialog+Dropdown Escape, Dropdown 위치, Dialog z-index, DataSheet resize stale rect), API 개선(persistKey/pageIndex 이름 변경), 코드 품질(Select createControllableSignal 전환, DataSheet 중복 제거, 트리거 클래스 공유 함수, displayItems 래퍼 제거, Tabs ComponentSize, 에러 메시지 한국어 통일), 문서화(Hook 네이밍), 스킬 개선(sd-review 거짓양성 방지)을 수행한다.

**Tech Stack:** SolidJS, TypeScript, Tailwind CSS, `@solid-primitives/resize-observer`

---

## 의존성 그래프

```
Task 1 (Combobox 클릭 버그)  ─ 독립
Task 2 (Dialog+Dropdown Escape) ─ 독립
Task 3 (Dropdown 위치 재계산) ─ 독립
Task 4 (Dialog z-index 레지스트리) ─ 독립
Task 5 (DataSheet resize stale rect) ─ 독립
Task 6 (DataSheet key → persistKey) ─ 독립
Task 7 (Pagination page → pageIndex) ─ Task 6 이후 (DataSheet도 page→pageIndex 변경)
Task 8 (에러 메시지 한국어 통일) ─ 독립
Task 9 (Select createControllableSignal) ─ 독립
Task 10 (DataSheet 리팩토링: createTrackedWidth, left memo, displayItems) ─ Task 6 이후
Task 11 (트리거 클래스 공유 함수) ─ 독립
Task 12 (Tabs ComponentSize import) ─ 독립
Task 13 (CLAUDE.md Hook 네이밍 문서) ─ 독립
Task 14 (sd-review 스킬 개선) ─ 독립
```

Task 1~5: 버그 수정 (우선 처리)
Task 6~7: API 이름 변경 (순서대로)
Task 8~12: 코드 품질 개선 (독립)
Task 13~14: 문서/스킬 (독립)

---

## Task 1: Combobox 트리거 클릭 시 검색 로직 반전 버그 수정

**Files:**

- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:244-249`

**버그 설명:**
`setOpen((v) => !v)` 후 `if (!open())` 에서 이미 토글된 값을 읽어 로직이 반전됨.
닫혀있을 때(false→true) `!open()` = `!true` = false → 검색 미실행.

**Step 1: wasOpen 캡처 패턴으로 수정**

lines 244-249 변경:

```typescript
// Before:
setOpen((v) => !v);
if (!open()) {
  performSearch(query());
}

// After:
const wasOpen = open();
setOpen(!wasOpen);
if (!wasOpen) {
  performSearch(query());
}
```

**Step 2: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/form-control/combobox/Combobox.tsx
```

**Step 3: 커밋**

```bash
git add packages/solid/src/components/form-control/combobox/Combobox.tsx
git commit -m "fix(solid): Combobox 트리거 클릭 시 검색 로직 반전 버그 수정"
```

---

## Task 2: Dialog + Dropdown 중첩 시 Escape 키 전파 문제 수정

**Files:**

- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx:217-229`
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx:176-188`

**문제:** Dialog 안에 Dropdown이 열린 상태에서 Escape를 누르면 Dropdown과 Dialog 모두 닫힘.
**해결:** Dropdown이 `stopImmediatePropagation()`으로 Escape를 소비하면 Dialog까지 전파되지 않음.

**Step 1: Dropdown Escape 핸들러에 stopImmediatePropagation 추가**

`Dropdown.tsx` lines 217-229:

```typescript
// Before:
createEffect(() => {
  if (!open()) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
});

// After:
createEffect(() => {
  if (!open()) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopImmediatePropagation();
      setOpen(false);
    }
  };

  document.addEventListener("keydown", handleKeyDown);
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
});
```

**Step 2: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/disclosure/Dropdown.tsx
```

**Step 3: 커밋**

```bash
git add packages/solid/src/components/disclosure/Dropdown.tsx
git commit -m "fix(solid): Dropdown Escape 시 stopImmediatePropagation으로 Dialog 중첩 닫힘 방지"
```

---

## Task 3: Dropdown 위치 재계산 — 콘텐츠 크기 변경 시

**Files:**

- Modify: `packages/solid/src/components/disclosure/Dropdown.tsx:107-162`

**문제:** `createEffect`가 `mounted()` 변경 시만 실행되어, 드롭다운 콘텐츠 크기가 변경되어도(검색 결과 로드 등) 위치가 재계산되지 않음.

**Step 1: popup에 ResizeObserver 추가하여 위치 재계산**

기존 `createEffect` 내부에서 popup 크기 변경 감지를 추가한다.

`Dropdown.tsx`의 위치 계산 로직(lines 107-162)을 리팩토링:

```typescript
// 위치 계산 함수 추출
const updatePosition = () => {
  const popup = popupRef();
  if (!popup) return;

  const style: JSX.CSSProperties = {};

  if (local.triggerRef) {
    const trigger = local.triggerRef();
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openDown = spaceBelow >= spaceAbove;
    setDirection(openDown ? "down" : "up");

    const adjustedLeft = Math.min(rect.left, viewportWidth - popup.offsetWidth);
    style.left = `${Math.max(0, adjustedLeft)}px`;
    style["min-width"] = `${rect.width}px`;

    if (openDown) {
      style.top = `${rect.bottom}px`;
    } else {
      style.bottom = `${viewportHeight - rect.top}px`;
    }
  } else if (local.position) {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - local.position.y;
    const spaceAbove = local.position.y;
    const openDown = spaceBelow >= spaceAbove;
    setDirection(openDown ? "down" : "up");

    const adjustedLeft = Math.min(local.position.x, viewportWidth - (popup.offsetWidth || 200));
    style.left = `${Math.max(0, adjustedLeft)}px`;

    if (openDown) {
      style.top = `${local.position.y}px`;
    } else {
      style.bottom = `${viewportHeight - local.position.y}px`;
    }
  }

  setComputedStyle(style);
};

// 마운트 시 위치 계산 + popup 크기 변경 시 재계산
createEffect(() => {
  if (!mounted()) return;

  updatePosition();

  const popup = popupRef();
  if (popup) {
    createResizeObserver(popup, () => {
      updatePosition();
    });
  }
});
```

**Step 2: import 확인**

`createResizeObserver`가 이미 import되어 있는지 확인. 없으면 추가:

```typescript
import { createResizeObserver } from "@solid-primitives/resize-observer";
```

Dropdown.tsx에는 현재 이 import가 없으므로 추가 필요.

**Step 3: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/disclosure/Dropdown.tsx
```

**Step 4: 커밋**

```bash
git add packages/solid/src/components/disclosure/Dropdown.tsx
git commit -m "fix(solid): Dropdown 콘텐츠 크기 변경 시 위치 재계산 지원"
```

---

## Task 4: Dialog z-index 무한 증가 → 레지스트리 방식

**Files:**

- Create: `packages/solid/src/components/disclosure/dialogZIndex.ts`
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx:215-228`

**문제:** `handleDialogFocus`가 모든 `[data-modal]`의 z-index를 스캔하여 max+1로 설정하므로 z-index가 무한 증가함.
**해결:** 모듈 레벨 레지스트리로 z-index를 등록/회수/재정렬.

**Step 1: z-index 레지스트리 생성**

`packages/solid/src/components/disclosure/dialogZIndex.ts`:

```typescript
/**
 * Dialog z-index 레지스트리
 *
 * 열린 Dialog의 z-index를 관리하여 무한 증가를 방지한다.
 * 기본 시작값 1000, 최대 열린 Dialog 수만큼만 사용.
 */

const BASE_Z = 1000;

// 열린 Dialog wrapper 요소 목록 (순서 = z-index 순서)
const stack: HTMLElement[] = [];

/** Dialog 등록 — 스택 최상위에 추가하고 z-index 할당 */
export function registerDialog(el: HTMLElement): void {
  const idx = stack.indexOf(el);
  if (idx >= 0) return; // 이미 등록됨
  stack.push(el);
  el.style.zIndex = (BASE_Z + stack.length - 1).toString();
}

/** Dialog 해제 — 스택에서 제거하고 나머지 재정렬 */
export function unregisterDialog(el: HTMLElement): void {
  const idx = stack.indexOf(el);
  if (idx < 0) return;
  stack.splice(idx, 1);
  reindex();
}

/** Dialog를 최상위로 올림 (포커스 시) */
export function bringToFront(el: HTMLElement): void {
  const idx = stack.indexOf(el);
  if (idx < 0 || idx === stack.length - 1) return; // 이미 최상위
  stack.splice(idx, 1);
  stack.push(el);
  reindex();
}

/** 스택 순서대로 z-index 재할당 */
function reindex(): void {
  for (let i = 0; i < stack.length; i++) {
    stack[i].style.zIndex = (BASE_Z + i).toString();
  }
}
```

**Step 2: Dialog.tsx에서 레지스트리 사용**

`Dialog.tsx` lines 215-228의 `handleDialogFocus`를 교체하고, 마운트/언마운트 시 등록/해제:

```typescript
// import 추가
import { registerDialog, unregisterDialog, bringToFront } from "./dialogZIndex";

// lines 215-228 교체:
// Before:
const handleDialogFocus = () => {
  if (!wrapperRef) return;
  const modals = document.querySelectorAll("[data-modal]");
  let maxZ = 0;
  modals.forEach((el) => {
    const z = Number(getComputedStyle(el).zIndex);
    if (z > maxZ) maxZ = z;
  });
  if (maxZ > 0) {
    wrapperRef.style.zIndex = (maxZ + 1).toString();
  }
};

// After:
const handleDialogFocus = () => {
  if (!wrapperRef) return;
  bringToFront(wrapperRef);
};
```

Dialog의 마운트/언마운트에 `registerDialog`/`unregisterDialog` 추가. Dialog.tsx에서 wrapper가 DOM에 추가되는 시점(Portal 안의 Show/wrapper ref 할당 후)에 등록하고, `onCleanup`에서 해제. 기존 코드에서 `wrapperRef`를 사용하는 Effect 영역을 확인하여 적절한 위치에 삽입:

```typescript
// 열릴 때 등록, 닫힐 때 해제
createEffect(() => {
  if (!open()) return;
  if (!wrapperRef) return;
  registerDialog(wrapperRef);
  onCleanup(() => {
    if (wrapperRef) unregisterDialog(wrapperRef);
  });
});
```

> 기존 wrapper의 인라인 `z-index: 1000` 스타일은 제거 (레지스트리가 관리).

**Step 3: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/disclosure/Dialog.tsx packages/solid/src/components/disclosure/dialogZIndex.ts
```

**Step 4: 커밋**

```bash
git add packages/solid/src/components/disclosure/dialogZIndex.ts
git add packages/solid/src/components/disclosure/Dialog.tsx
git commit -m "fix(solid): Dialog z-index 레지스트리 방식으로 전환하여 무한 증가 방지"
```

---

## Task 5: DataSheet 컬럼 리사이즈 stale containerRect 수정

**Files:**

- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:369,382`

**문제:** `onResizerPointerdown`에서 `containerRect`를 한 번만 읽고 `onPointerMove`에서 재사용. 스크롤 등으로 컨테이너가 이동하면 인디케이터 위치가 어긋남.

**Step 1: onPointerMove에서 containerRect 재읽기**

lines 377-386:

```typescript
// Before:
const onPointerMove = (e: PointerEvent) => {
  const delta = e.clientX - startX;
  const newWidth = Math.max(30, startWidth + delta);
  setResizeIndicatorStyle({
    display: "block",
    left: `${th.getBoundingClientRect().left - containerRect.left + container.scrollLeft + newWidth}px`,
    top: "0",
    height: `${container.scrollHeight}px`,
  });
};

// After:
const onPointerMove = (e: PointerEvent) => {
  const delta = e.clientX - startX;
  const newWidth = Math.max(30, startWidth + delta);
  const currentRect = container.getBoundingClientRect();
  setResizeIndicatorStyle({
    display: "block",
    left: `${th.getBoundingClientRect().left - currentRect.left + container.scrollLeft + newWidth}px`,
    top: "0",
    height: `${container.scrollHeight}px`,
  });
};
```

**Step 2: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/data/sheet/DataSheet.tsx
```

**Step 3: 커밋**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "fix(solid): DataSheet 컬럼 리사이즈 시 containerRect를 매 이동마다 재계산"
```

---

## Task 6: DataSheet `key` → `persistKey` 이름 변경

**Files:**

- Modify: `packages/solid/src/components/data/sheet/types.ts:7`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:731` (및 `local.key` 참조 모두)
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx` (모든 `key="..."`)
- Modify: `packages/solid-demo/src/pages/data/SheetFullPage.tsx:121`
- Modify: 테스트 파일에서 `key=` 사용 부분

**Step 1: types.ts에서 props 이름 변경**

`types.ts` line 7:

```typescript
// Before:
  key?: string;

// After:
  persistKey?: string;
```

**Step 2: DataSheet.tsx에서 참조 변경**

`DataSheet.tsx`에서 `local.key` → `local.persistKey`로 모든 참조 변경:

- splitProps 배열에서 `"key"` → `"persistKey"`
- `data-sheet={local.key ?? ""}` → `data-sheet={local.persistKey ?? ""}`
- `saveColumnWidth`, `loadConfig` 등에서 `local.key`를 사용하는 부분 모두

**Step 3: 데모 파일 변경**

`SheetPage.tsx`에서 모든 `<DataSheet ... key="...">`의 `key=` → `persistKey=`로 변경.
단, `<DataSheet.Column key="...">`의 `key`는 컬럼 식별자이므로 변경하지 않음.

`SheetFullPage.tsx:121`에서 `key="full"` → `persistKey="full"`.

**Step 4: 테스트 파일 변경**

DataSheet 테스트에서 `key=` prop 사용 부분을 `persistKey=`로 변경.

**Step 5: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
pnpm lint packages/solid/src/components/data/sheet
```

**Step 6: 커밋**

```bash
git add packages/solid/src/components/data/sheet/types.ts
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git add packages/solid-demo/src/pages/data/SheetPage.tsx
git add packages/solid-demo/src/pages/data/SheetFullPage.tsx
# 테스트 파일도 추가
git commit -m "refactor(solid): DataSheet key prop을 persistKey로 이름 변경"
```

---

## Task 7: Pagination `page` → `pageIndex` 이름 변경 + DataSheet 연동

**Files:**

- Modify: `packages/solid/src/components/data/Pagination.tsx:10-12` (props), 내부 참조
- Modify: `packages/solid/src/components/data/sheet/types.ts:18-19`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:738-739` (DataSheet 내 Pagination 사용)
- Modify: `packages/solid-demo/src/pages/data/PaginationPage.tsx`
- Modify: `packages/solid-demo/src/pages/data/SheetPage.tsx:255`
- Modify: `packages/solid/src/index.ts` (export 확인)

**Step 1: Pagination props 변경**

`Pagination.tsx` lines 10-12:

```typescript
// Before:
export interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  page: number;
  onPageChange?: (page: number) => void;

// After:
export interface PaginationProps extends JSX.HTMLAttributes<HTMLElement> {
  pageIndex: number;
  onPageIndexChange?: (pageIndex: number) => void;
```

Pagination 내부에서 `local.page` → `local.pageIndex`, `local.onPageChange` → `local.onPageIndexChange`로 모든 참조 변경.
splitProps에서도 `"page"` → `"pageIndex"`, `"onPageChange"` → `"onPageIndexChange"`.

**Step 2: DataSheet types.ts 변경**

`types.ts` lines 18-19:

```typescript
// Before:
  page?: number;
  onPageChange?: (page: number) => void;

// After:
  pageIndex?: number;
  onPageIndexChange?: (pageIndex: number) => void;
```

**Step 3: DataSheet.tsx 내부 참조 변경**

- `local.page` → `local.pageIndex`
- `local.onPageChange` → `local.onPageIndexChange`
- splitProps에서 `"page"` → `"pageIndex"`, `"onPageChange"` → `"onPageIndexChange"`
- DataSheet 내 `<Pagination page={...} onPageChange={...}>` → `<Pagination pageIndex={...} onPageIndexChange={...}>`

**Step 4: 데모 파일 변경**

`PaginationPage.tsx`: 모든 `page={...}` → `pageIndex={...}`, `onPageChange={...}` → `onPageIndexChange={...}`
`SheetPage.tsx:255`: `page={page()} onPageChange={setPage}` → `pageIndex={page()} onPageIndexChange={setPage}`

**Step 5: 테스트 파일 변경**

Pagination/DataSheet 테스트에서 `page=` → `pageIndex=`, `onPageChange=` → `onPageIndexChange=`

**Step 6: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm typecheck packages/solid-demo
pnpm lint packages/solid/src/components/data
```

**Step 7: 커밋**

```bash
git add packages/solid/src/components/data/Pagination.tsx
git add packages/solid/src/components/data/sheet/types.ts
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git add packages/solid-demo/src/pages/data/PaginationPage.tsx
git add packages/solid-demo/src/pages/data/SheetPage.tsx
# 테스트 파일도 추가
git commit -m "refactor(solid): Pagination page/onPageChange를 pageIndex/onPageIndexChange로 이름 변경"
```

---

## Task 8: 에러 메시지 한국어 통일

**Files:**

- Modify: `packages/solid/src/components/disclosure/Tabs.tsx:27`
- Modify: `packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx:29`
- Modify: `packages/solid/src/components/form-control/checkbox/RadioGroup.tsx:29`

**Step 1: 영어 에러 메시지를 한국어로 변경**

`Tabs.tsx:27`:

```typescript
// Before:
if (!ctx) throw new Error("Tabs.Tab must be used inside Tabs");
// After:
if (!ctx) throw new Error("Tabs.Tab은 Tabs 내부에서만 사용할 수 있습니다");
```

`CheckboxGroup.tsx:29`:

```typescript
// Before:
if (!ctx) throw new Error("CheckboxGroup.Item must be used inside CheckboxGroup");
// After:
if (!ctx) throw new Error("CheckboxGroup.Item은 CheckboxGroup 내부에서만 사용할 수 있습니다");
```

`RadioGroup.tsx:29`:

```typescript
// Before:
if (!ctx) throw new Error("RadioGroup.Item must be used inside RadioGroup");
// After:
if (!ctx) throw new Error("RadioGroup.Item은 RadioGroup 내부에서만 사용할 수 있습니다");
```

**Step 2: 타입체크 및 린트**

```bash
pnpm lint packages/solid/src/components/disclosure/Tabs.tsx packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx packages/solid/src/components/form-control/checkbox/RadioGroup.tsx
```

**Step 3: 커밋**

```bash
git add packages/solid/src/components/disclosure/Tabs.tsx
git add packages/solid/src/components/form-control/checkbox/CheckboxGroup.tsx
git add packages/solid/src/components/form-control/checkbox/RadioGroup.tsx
git commit -m "fix(solid): 에러 메시지를 한국어로 통일"
```

---

## Task 9: Select controlled/uncontrolled → createControllableSignal

**Files:**

- Modify: `packages/solid/src/components/form-control/select/Select.tsx:225-243`

**문제:** Select가 수동 controlled/uncontrolled 패턴을 사용하지만, 라이브러리 내 공유 훅 `createControllableSignal`이 존재함.
단, Select는 단일/다중 선택으로 값 타입이 `T | T[] | undefined`이므로 단순 교체가 어려움.

**Step 1: Select에서 수동 패턴을 createControllableSignal로 교체**

lines 225-243:

```typescript
// Before:
type ValueType = T | T[] | undefined;
const [internalValue, setInternalValueRaw] = createSignal<ValueType>(undefined);

createEffect(() => {
  const propValue = local.value;
  setInternalValueRaw(() => propValue);
});

const isControlled = () => local.onValueChange !== undefined;
const getValue = () => (isControlled() ? local.value : internalValue());
const setInternalValue = (newValue: ValueType) => {
  if (isControlled()) {
    (local.onValueChange as ((v: T | T[]) => void) | undefined)?.(newValue as T | T[]);
  } else {
    setInternalValueRaw(() => newValue);
  }
};

// After:
type ValueType = T | T[] | undefined;
const [getValue, setInternalValue] = createControllableSignal<ValueType>({
  value: () => local.value,
  onChange: () => local.onValueChange as ((v: ValueType) => void) | undefined,
} as Parameters<typeof createControllableSignal<ValueType>>[0]);
```

**Step 2: import 변경**

```typescript
// import에서 createEffect 제거 (다른 곳에서 사용하지 않는다면)
// createControllableSignal import 추가
import { createControllableSignal } from "../../../hooks/createControllableSignal";
```

Select.tsx에서 `createEffect`가 다른 곳에서도 사용되는지 확인 필요. 사용되지 않으면 제거.
`createSignal`도 다른 곳에서 사용되는지 확인 필요 (`open` signal은 createSignal 사용). `createSignal` 유지.

**Step 3: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/form-control/select/Select.tsx
```

**Step 4: 커밋**

```bash
git add packages/solid/src/components/form-control/select/Select.tsx
git commit -m "refactor(solid): Select의 controlled/uncontrolled 패턴을 createControllableSignal로 통일"
```

---

## Task 10: DataSheet 리팩토링 (createTrackedWidth, left memo, displayItems)

**Files:**

- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx:263-288,704,821-822,855-862,1092-1093,1153-1159`

**10-A: 기능 컬럼 너비 추적 3회 반복 → createTrackedWidth 헬퍼**

lines 264-288에서 expand/select/reorder 3개 컬럼이 동일한 패턴을 반복:

```typescript
// 현재 반복 패턴:
const [expandColWidth, setExpandColWidth] = createSignal(0);
function registerExpandColRef(el: HTMLElement): void {
  createResizeObserver(el, () => {
    setExpandColWidth(el.offsetWidth);
  });
}
```

→ DataSheet 내부 헬퍼로 추출:

```typescript
function createTrackedWidth(): [() => number, (el: HTMLElement) => void] {
  const [width, setWidth] = createSignal(0);
  const register = (el: HTMLElement) => {
    createResizeObserver(el, () => {
      setWidth(el.offsetWidth);
    });
  };
  return [width, register];
}

const [expandColWidth, registerExpandColRef] = createTrackedWidth();
const [selectColWidth, registerSelectColRef] = createTrackedWidth();
const [reorderColWidth, registerReorderColRef] = createTrackedWidth();
```

**10-B: 기능 컬럼 left 위치 IIFE → createMemo**

lines 855-862, 1153-1159에서 IIFE로 left 계산:

```typescript
// Before (IIFE, 여러 곳에서 동일 계산):
left: (() => {
  let left = 0;
  if (hasExpandFeature()) left += expandColWidth();
  if (hasSelectFeature()) left += selectColWidth();
  return `${left}px`;
})(),
```

→ createMemo로 추출:

```typescript
const reorderColLeft = createMemo(() => {
  let left = 0;
  if (hasExpandFeature()) left += expandColWidth();
  if (hasSelectFeature()) left += selectColWidth();
  return `${left}px`;
});
```

select 컬럼의 left도 마찬가지:

```typescript
const selectColLeft = createMemo(() => (hasExpandFeature() ? `${expandColWidth()}px` : "0"));
```

JSX에서 `style={{ left: reorderColLeft() }}` / `style={{ left: selectColLeft() }}` 사용.

**10-C: displayItems 불필요 createMemo 래퍼 제거**

line 704:

```typescript
// Before:
const displayItems = createMemo(() => flatItems());

// After:
const displayItems = flatItems;
```

`flatItems`가 이미 `createMemo`이므로 이중 래핑이 불필요.

**Step 1: 위의 3가지 변경 적용**

**Step 2: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/data/sheet/DataSheet.tsx
```

**Step 3: 커밋**

```bash
git add packages/solid/src/components/data/sheet/DataSheet.tsx
git commit -m "refactor(solid): DataSheet 기능 컬럼 중복 코드 정리 (createTrackedWidth, left memo, displayItems)"
```

---

## Task 11: Select/Combobox 트리거 클래스 함수 중복 → 공유 함수

**Files:**

- Modify: `packages/solid/src/components/form-control/DropdownTrigger.styles.ts`
- Modify: `packages/solid/src/components/form-control/select/Select.tsx:301-309`
- Modify: `packages/solid/src/components/form-control/combobox/Combobox.tsx:271-279`

**문제:** Select와 Combobox 모두 동일한 `getTriggerClassName()` 함수를 내부에 중복 정의.

**Step 1: DropdownTrigger.styles.ts에 공유 함수 추가**

```typescript
import type { ComponentSize } from "../../styles/tokens.styles";
import { twMerge } from "tailwind-merge";

// 기존 export들 유지...

/** Select/Combobox 공유 트리거 클래스 빌더 */
export function getTriggerClass(options: {
  size?: ComponentSize;
  disabled?: boolean;
  inset?: boolean;
  class?: string;
}): string {
  return twMerge(
    triggerBaseClass,
    "px-2 py-1",
    options.size && triggerSizeClasses[options.size],
    options.disabled && triggerDisabledClass,
    options.inset && triggerInsetClass,
    options.class,
  );
}
```

**Step 2: Select.tsx에서 내부 함수 제거 → 공유 함수 사용**

```typescript
// Before (lines 301-309):
const getTriggerClassName = () =>
  twMerge(
    triggerBaseClass,
    "px-2 py-1",
    local.size && triggerSizeClasses[local.size],
    local.disabled && triggerDisabledClass,
    local.inset && triggerInsetClass,
    local.class,
  );

// After:
const getTriggerClassName = () =>
  getTriggerClass({
    size: local.size,
    disabled: local.disabled,
    inset: local.inset,
    class: local.class,
  });
```

import에 `getTriggerClass` 추가. 직접 사용하던 `triggerBaseClass`, `triggerDisabledClass`, `triggerInsetClass`, `triggerSizeClasses`는 `getTriggerClassName` 외의 다른 곳에서 쓰이는지 확인 후, 쓰이지 않으면 import에서 제거.

Select.tsx에서는 `triggerBaseClass`를 line 390 `twMerge(getTriggerClassName(), ...)` 안에서 사용하므로 `getTriggerClassName()`으로 충분. 하지만 추가적으로 action이 있을 때 `"rounded-r-none border-r-0"`를 추가하므로 `getTriggerClassName()`을 기반으로 `twMerge`를 한 번 더 감싸는 패턴은 유지.

**Step 3: Combobox.tsx에서 동일하게 교체**

```typescript
// Before (lines 271-279):
const getTriggerClassName = () =>
  twMerge(
    triggerBaseClass,
    "px-2 py-1",
    local.size && triggerSizeClasses[local.size],
    local.disabled && triggerDisabledClass,
    local.inset && triggerInsetClass,
    local.class,
  );

// After:
const getTriggerClassName = () =>
  getTriggerClass({
    size: local.size,
    disabled: local.disabled,
    inset: local.inset,
    class: local.class,
  });
```

import에 `getTriggerClass` 추가, 불필요한 개별 스타일 import 제거.

**Step 4: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/form-control
```

**Step 5: 커밋**

```bash
git add packages/solid/src/components/form-control/DropdownTrigger.styles.ts
git add packages/solid/src/components/form-control/select/Select.tsx
git add packages/solid/src/components/form-control/combobox/Combobox.tsx
git commit -m "refactor(solid): Select/Combobox 트리거 클래스 함수를 getTriggerClass로 통합"
```

---

## Task 12: Tabs ComponentSize 타입 import

**Files:**

- Modify: `packages/solid/src/components/disclosure/Tabs.tsx:11,84-87`

**문제:** `size` prop이 인라인 `"sm" | "lg"`로 정의되어 있으나, `tokens.styles.ts`에 `ComponentSize` 타입이 존재.

**Step 1: ComponentSize import 및 적용**

```typescript
// import 추가
import { type ComponentSize } from "../../styles/tokens.styles";

// TabsContextValue (line 11):
// Before:
  size: () => "sm" | "lg" | undefined;
// After:
  size: () => ComponentSize | undefined;

// TabsProps (line 87):
// Before:
  size?: "sm" | "lg";
// After:
  size?: ComponentSize;
```

**Step 2: 타입체크 및 린트**

```bash
pnpm typecheck packages/solid
pnpm lint packages/solid/src/components/disclosure/Tabs.tsx
```

**Step 3: 커밋**

```bash
git add packages/solid/src/components/disclosure/Tabs.tsx
git commit -m "refactor(solid): Tabs size prop에 ComponentSize 타입 적용"
```

---

## Task 13: CLAUDE.md Hook 네이밍 컨벤션 문서화

**Files:**

- Modify: `CLAUDE.md` (코드 컨벤션 > SolidJS 규칙 섹션)

**Step 1: Hook 네이밍 규칙 추가**

`CLAUDE.md`의 `### SolidJS 규칙` 섹션에 다음 추가:

```markdown
**Hook 네이밍 컨벤션:**

- `create*`: SolidJS primitive를 래핑/조합하는 반응형 Hook (`createControllableSignal`, `createMountTransition`, `createTrackedWidth`)
- `use*`: Provider Context에 의존하는 Hook (`useConfig`, `usePersisted`, `useTheme`)
- 일반 유틸리티 함수는 Hook prefix 없이 명명
```

**Step 2: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md에 SolidJS Hook 네이밍 컨벤션 추가"
```

---

## Task 14: sd-review 스킬 개선 — 거짓양성 방지

**Files:**

- Modify: `.claude/agents/sd-code-reviewer.md`
- Modify: `.claude/agents/sd-api-reviewer.md`

**배경:** 리뷰에서 2건의 거짓양성 발생:

1. ListItem chevron `rotate-90` — 아이콘이 오른쪽에 있어 정상이지만, 일반적 패턴(아래→오른쪽)으로 보고함
2. Checkbox `value` prop — 라이브러리 내 다른 컨트롤이 모두 `value`/`onValueChange`를 사용하지만 `checked` 변경 제안

**Step 1: sd-code-reviewer.md에 시각적 요소 검증 규칙 추가**

`Review Scope` 또는 `Confidence Scoring` 섹션 뒤에:

```markdown
## False Positive Prevention

- **Visual/UI behavior**: Do NOT flag CSS transforms (rotate, translate, scale) or visual states without verifying the actual rendering context (e.g., icon position, layout direction). CSS rotate values depend on icon placement — rotate-90 on a right-aligned chevron is correct for a "collapsed" state.
- **Pre-existing patterns**: If an issue exists in unchanged code and is part of an established pattern, do NOT report it unless it causes actual bugs.
```

**Step 2: sd-api-reviewer.md에 내부 일관성 우선 규칙 추가**

`Naming Review` 섹션에:

```markdown
- **Internal consistency over external standards**: Before suggesting a naming change, verify the existing pattern across ALL similar components in the library. If the library consistently uses one convention (e.g., `value`/`onValueChange` for all form controls), do NOT suggest an industry-standard alternative (e.g., `checked`/`onCheckedChange`) that would break internal consistency.
```

**Step 3: 커밋**

```bash
git add .claude/agents/sd-code-reviewer.md .claude/agents/sd-api-reviewer.md
git commit -m "docs: sd-review 에이전트에 거짓양성 방지 규칙 추가"
```
