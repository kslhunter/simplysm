# solid 패키지 리뷰 수정 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** solid 패키지 코드 리뷰에서 발견된 P0~P4 이슈 12건 수정

**Architecture:** 각 수정은 독립적. 기존 패턴 유지하며 버그 수정, DX 개선, 보일러플레이트 제거를 수행.

**Tech Stack:** SolidJS, TypeScript

---

### Task 1: Dialog Escape — 최상위만 닫기

**Files:**
- Modify: `packages/solid/src/components/disclosure/dialogZIndex.ts`
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx:239-251`

**Step 1: `dialogZIndex.ts`에 `isTopmost` 추가**

```typescript
/** 해당 Dialog가 스택 최상위인지 확인 */
export function isTopmost(el: HTMLElement): boolean {
  return stack.length > 0 && stack[stack.length - 1] === el;
}
```

기존 `reindex` 함수 아래에 추가.

**Step 2: `Dialog.tsx` Escape 핸들러 수정**

import에 `isTopmost` 추가:
```typescript
import { registerDialog, unregisterDialog, bringToFront, isTopmost } from "./dialogZIndex";
```

Escape 핸들러 (line 239-251)를 수정:
```typescript
  // Escape 키 감지
  createEffect(() => {
    if (!open()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      const el = wrapperRef();
      if (!el || !isTopmost(el)) return;

      if (closeOnEscape()) {
        e.stopImmediatePropagation();
        tryClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });
```

핵심 변경:
- `closeOnEscape()` 체크를 effect 진입 조건에서 handler 내부로 이동 (최상위이지만 closeOnEscape=false인 경우 아래로 전파 방지)
- `isTopmost(el)` 가드 추가
- `stopImmediatePropagation()`으로 같은 이벤트가 다른 Dialog 핸들러에 전달되지 않도록 차단

**Step 3: typecheck**

Run: `pnpm typecheck packages/solid`

---

### Task 2: SharedDataProvider 리스너 누수 방지

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx:147-204`

**Step 1: disposed 플래그 추가 및 ensureInitialized 수정**

configure 함수 내부 (line 110 부근, `for` 루프 시작 전)에 `disposed` 플래그를 선언하고, `onCleanup`에서 설정:

기존 `onCleanup` (line 194-204)을 수정:
```typescript
  let disposed = false;

  onCleanup(() => {
    disposed = true;
    if (!currentDefinitions) return;
    for (const [name] of Object.entries(currentDefinitions)) {
      const listenerKey = listenerKeyMap.get(name);
      if (listenerKey != null) {
        const def = currentDefinitions[name];
        const client = serviceClient.get(def.serviceKey ?? "default");
        void client.removeEventListener(listenerKey);
      }
    }
  });
```

`ensureInitialized` 내 `.then()` 수정 (line 149-164):
```typescript
      function ensureInitialized() {
        if (initialized) return;
        initialized = true;

        void client
          .addEventListener(
            SharedDataChangeEvent,
            { name, filter: def.filter },
            async (changeKeys) => {
              await loadData(name, def, changeKeys);
            },
          )
          .then((key) => {
            if (disposed) {
              void client.removeEventListener(key);
            } else {
              listenerKeyMap.set(name, key);
            }
          });

        void loadData(name, def);
      }
```

TODO 주석 제거.

**Step 2: typecheck**

Run: `pnpm typecheck packages/solid`

---

### Task 3: CrudSheet/CrudDetail 키보드 단축키 포커스 스코핑

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:389-399`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx:177-186`

**Step 1: CrudSheet 단축키 핸들러 수정**

`formRef`를 활용하여 포커스 스코핑 (line 389-399):
```typescript
  // -- Keyboard Shortcuts --
  createEventListener(document, "keydown", async (e: KeyboardEvent) => {
    if (!formRef?.contains(document.activeElement)) return;
    if (e.ctrlKey && e.key === "s" && !isSelectMode()) {
      e.preventDefault();
      formRef?.requestSubmit();
    }
    if (e.ctrlKey && e.altKey && e.key === "l") {
      e.preventDefault();
      if (!checkIgnoreChanges()) return;
      await doRefresh();
    }
  });
```

**Step 2: CrudDetail 단축키 핸들러 수정**

동일 패턴 (line 177-186):
```typescript
  // -- Keyboard Shortcuts --
  createEventListener(document, "keydown", (e: KeyboardEvent) => {
    if (!formRef?.contains(document.activeElement)) return;
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      formRef?.requestSubmit();
    }
    if (e.ctrlKey && e.altKey && e.key === "l") {
      e.preventDefault();
      void handleRefresh();
    }
  });
```

**Step 3: typecheck**

Run: `pnpm typecheck packages/solid`

---

### Task 4: createControllableStore onChange 변경 감지

**Files:**
- Modify: `packages/solid/src/hooks/createControllableStore.ts:40-44`

**Step 1: wrappedSet에 변경 감지 추가**

```typescript
  // 함수 래퍼로 setter 감싸서 onChange 알림 추가
  const wrappedSet = ((...args: any[]) => {
    const before = JSON.stringify(unwrap(store));
    (rawSet as any)(...args);
    const after = JSON.stringify(unwrap(store));
    if (before !== after) {
      options.onChange()?.(objClone(unwrap(store)));
    }
  }) as SetStoreFunction<TValue>;
```

**Step 2: typecheck**

Run: `pnpm typecheck packages/solid`

---

### Task 5: useSyncConfig race condition 방지

**Files:**
- Modify: `packages/solid/src/hooks/useSyncConfig.ts`

**Step 1: write-version 카운터 추가**

`ready` signal 아래에 추가:
```typescript
  let writeVersion = 0;
```

init effect의 async 블록 (line 43-77) 수정 — async read 전에 버전 스냅샷, 완료 후 비교:
```typescript
    void (async () => {
      const versionBefore = writeVersion;

      if (!currentAdapter) {
        try {
          const stored = localStorage.getItem(prefixedKey);
          if (stored !== null && writeVersion === versionBefore) {
            setValue(() => JSON.parse(stored) as TValue);
          }
        } catch {
          // Ignore parse errors, keep default value
        }
        setReady(true);
        return;
      }

      try {
        const stored = await currentAdapter.getItem(prefixedKey);
        if (stored !== null && writeVersion === versionBefore) {
          setValue(() => JSON.parse(stored) as TValue);
        }
      } catch {
        try {
          const stored = localStorage.getItem(prefixedKey);
          if (stored !== null && writeVersion === versionBefore) {
            setValue(() => JSON.parse(stored) as TValue);
          }
        } catch {
          // Ignore parse errors
        }
      } finally {
        setReady(true);
      }
    })();
```

반환부 (line 106) 수정 — setValue를 래퍼로 교체:
```typescript
  const userSetValue: Setter<TValue> = ((...args: any[]) => {
    writeVersion++;
    return (setValue as any)(...args);
  }) as Setter<TValue>;

  return [value, userSetValue, ready];
```

**Step 2: typecheck**

Run: `pnpm typecheck packages/solid`

---

### Task 6: PrintContext 에러 메시지 한국어 통일

**Files:**
- Modify: `packages/solid/src/components/feedback/print/PrintContext.ts:18`

**Step 1: 에러 메시지 변경**

```typescript
  if (!ctx) throw new Error("usePrint는 PrintProvider 내부에서만 사용할 수 있습니다");
```

---

### Task 7: useLogAdapter public export 제거

**Files:**
- Modify: `packages/solid/src/providers/LoggerContext.tsx`
- Modify: `packages/solid/src/hooks/useLogger.ts`

**Step 1: LoggerContext.tsx에서 useLogAdapter 제거**

`useLogAdapter` 함수와 그 위의 JSDoc 주석 전체를 삭제 (line 45-52).

**Step 2: useLogger.ts에서 직접 useContext 사용**

```typescript
import { useContext } from "solid-js";
import { consola } from "consola";
import { LoggerContext, type LogAdapter } from "../providers/LoggerContext";

type LogLevel = Parameters<LogAdapter["write"]>[0];

export interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  /** LogAdapter를 나중에 주입. LoggerProvider 내부에서만 사용 가능 */
  configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
}

export function useLogger(): Logger {
  const loggerCtx = useContext(LoggerContext);

  const createLogFunction = (level: LogLevel) => {
    return (...args: unknown[]) => {
      const adapter = loggerCtx?.adapter();
      if (adapter) {
        void adapter.write(level, ...args);
      } else {
        (consola as any)[level](...args);
      }
    };
  };

  return {
    log: createLogFunction("log"),
    info: createLogFunction("info"),
    warn: createLogFunction("warn"),
    error: createLogFunction("error"),
    configure: (fn: (origin: LogAdapter) => LogAdapter) => {
      if (!loggerCtx) {
        throw new Error("configure()는 LoggerProvider 내부에서만 사용할 수 있습니다");
      }
      loggerCtx.configure(fn);
    },
  };
}
```

**Step 3: typecheck**

Run: `pnpm typecheck packages/solid`

---

### Task 8: createPointerDrag → startPointerDrag 리네이밍

**Files:**
- Move: `packages/solid/src/hooks/createPointerDrag.ts` → `packages/solid/src/helpers/startPointerDrag.ts`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx` (import 경로 변경 + 함수명)
- Modify: `packages/solid/src/components/disclosure/Dialog.tsx` (import 경로 변경 + 함수명)

**Step 1: 파일 이동 + 리네이밍**

`packages/solid/src/helpers/startPointerDrag.ts` 생성 (기존 파일 내용에서 함수명만 변경):
```typescript
/**
 * Sets up pointer capture and manages pointermove/pointerup lifecycle on a target element.
 *
 * @param target - Element to capture pointer on
 * @param pointerId - Pointer ID from the initiating PointerEvent
 * @param options.onMove - Called on each pointermove
 * @param options.onEnd - Called on pointerup or pointercancel (after listener cleanup)
 */
export function startPointerDrag(
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

기존 `packages/solid/src/hooks/createPointerDrag.ts` 삭제.

**Step 2: import 업데이트**

`DataSheet.tsx`: import 변경
```typescript
import { startPointerDrag } from "../../../helpers/startPointerDrag";
```
호출부 3곳: `createPointerDrag(` → `startPointerDrag(`

`Dialog.tsx`: import 변경
```typescript
import { startPointerDrag } from "../../helpers/startPointerDrag";
```
호출부 2곳: `createPointerDrag(` → `startPointerDrag(`

**Step 3: typecheck**

Run: `pnpm typecheck packages/solid`

---

### Task 9: BusyContainer JSDoc 추가

**Files:**
- Modify: `packages/solid/src/components/feedback/busy/BusyContainer.tsx:16-23`

**Step 1: BusyContainerProps에 JSDoc 추가**

```typescript
export interface BusyContainerProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children"> {
  /** 로딩 오버레이 표시 (children은 유지됨) */
  busy?: boolean;
  /** false이면 children을 숨기고 로딩 오버레이 표시. 초기 데이터 로드 시 사용 */
  ready?: boolean;
  variant?: BusyVariant;
  message?: string;
  progressPercent?: number;
  children?: JSX.Element;
}
```

---

### Task 10: createSlotComponent 팩토리 추출

**Files:**
- Create: `packages/solid/src/helpers/createSlotComponent.ts`
- Modify: 7개 파일의 slot 등록 패턴 (10곳)

**Step 1: 팩토리 함수 생성**

`packages/solid/src/helpers/createSlotComponent.ts`:
```typescript
import { type Context, type ParentComponent, onCleanup, useContext } from "solid-js";
import type { JSX } from "solid-js";

type SlotSetter = (value: (() => JSX.Element) | undefined) => void;

/**
 * Slot 등록 컴포넌트를 생성하는 팩토리 함수
 *
 * @param context - slot을 등록할 Context
 * @param getSetter - context value에서 setter를 추출하는 함수
 */
export function createSlotComponent<TCtx>(
  context: Context<TCtx | undefined>,
  getSetter: (ctx: TCtx) => SlotSetter,
): ParentComponent {
  return (props) => {
    const ctx = useContext(context)!;
    // eslint-disable-next-line solid/reactivity -- slot 등록은 초기 마운트 시 한 번만 수행
    getSetter(ctx)(() => props.children);
    onCleanup(() => getSetter(ctx)(undefined));
    return null;
  };
}
```

**Step 2: index.ts에 export 추가**

`packages/solid/src/index.ts`의 helpers 섹션에 추가:
```typescript
export * from "./helpers/createSlotComponent";
```

**Step 3: 10곳의 slot 등록 패턴을 팩토리로 교체**

각 파일에서 기존 5줄 패턴을 1줄로 교체. 예시:

`Dialog.tsx` (line 39-56):
```typescript
// Before:
const DialogHeader: ParentComponent = (props) => {
  const ctx = useContext(DialogSlotsContext)!;
  ctx.setHeader(() => props.children);
  onCleanup(() => ctx.setHeader(undefined));
  return null;
};

// After:
const DialogHeader = createSlotComponent(DialogSlotsContext, (ctx) => ctx.setHeader);
```

교체 대상 전체 목록:

| File | Component | Context | Setter |
|------|-----------|---------|--------|
| `Dialog.tsx` | DialogHeader | DialogSlotsContext | setHeader |
| `Dialog.tsx` | DialogAction | DialogSlotsContext | setAction |
| `Dropdown.tsx` | DropdownTrigger | DropdownContext | setTrigger |
| `Dropdown.tsx` | DropdownContent | DropdownContext | setContent |
| `Kanban.tsx` | KanbanLaneTitle | KanbanLaneContext | setTitle |
| `Kanban.tsx` | KanbanLaneTools | KanbanLaneContext | setTools |
| `ListItem.tsx` | ListItemChildren | ListItemSlotsContext | setChildren |
| `NumberInput.tsx` | NumberInputPrefix | NumberInputSlotsContext | setPrefix |
| `TextInput.tsx` | TextInputPrefix | TextInputSlotsContext | setPrefix |
| `SelectItem.tsx` | SelectItemChildren | SelectItemSlotsContext | setChildren |

**Step 4: typecheck**

Run: `pnpm typecheck packages/solid`

---

### Task 11: Minor cleanups (_rest, clsx)

**Files:**
- Modify: `packages/solid/src/components/features/crud-sheet/CrudSheet.tsx:68, 625`
- Modify: `packages/solid/src/components/features/crud-detail/CrudDetail.tsx:50`

**Step 1: CrudSheet _rest 제거**

Line 68: `const [local, _rest] = splitProps(` → `const [local] = splitProps(`

**Step 2: CrudSheet clsx 단순화**

Line 625: `return clsx("line-through");` → `return "line-through";`

**Step 3: CrudDetail _rest 제거**

Line 50: `const [local, _rest] = splitProps(` → `const [local] = splitProps(`

---

### Task 12: 최종 검증

**Step 1: 전체 typecheck + lint**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`

**Step 2: commit**

```bash
git add -A
git commit -m "fix(solid): review 이슈 수정 (Dialog Escape, SharedData 리스너, 키보드 스코핑 등)"
```
