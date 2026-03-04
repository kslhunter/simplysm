# Toast Component Design

**Date:** 2026-03-04
**Package:** `@simplysm/solid`
**Status:** Validated

---

## Summary

Add a Toast notification component to the `solid` package. Toast is a temporary feedback message
system that is completely independent from the existing `NotificationProvider`/`NotificationBanner`
system. It is used for transient feedback (e.g., "Saved successfully.") and disappears automatically
after 3 seconds.

---

## Confirmed Requirements

| Item | Value |
|------|-------|
| Position | Fixed, top-right corner (`top-4 right-4`) |
| Types | `info \| success \| warning \| danger` |
| Auto-dismiss | 3 seconds after mount |
| Max stack | 5 items; FIFO (oldest removed when exceeded) |
| Close button | Included with fade-out animation |
| API | `const { createToast } = useToast()` |
| Animation | Fade-in on mount, fade-out on dismiss (200ms) |
| Accessibility | `aria-live="polite"` region + `role="alert"` per item |
| Relation to Notification | Completely independent — different purpose, different API |

---

## Architecture

### Approach Chosen: Independent Provider Pattern

Follows the existing pattern of `NotificationProvider` / `useBusy`. The team already knows this
pattern, and it works correctly within SolidJS reactivity and potential SSR.

Rejected alternatives:
- **Module singleton**: Creates SolidJS reactivity issues; incompatible with SSR.
- **Provider + singleton fallback**: Adds complexity and unpredictable behavior.

### File Structure

```
packages/solid/src/components/feedback/toast/
├── ToastProvider.tsx    ← Context, types, useToast hook, state management
├── ToastContainer.tsx   ← Fixed top-right Portal wrapper
├── ToastItem.tsx        ← Individual toast item with timer and animation
└── index.ts             ← Re-exports
```

---

## Type Definitions

```typescript
// ToastProvider.tsx

export type ToastType = "info" | "success" | "warning" | "danger";

export interface ToastItem {
  id: string;        // crypto.randomUUID()
  type: ToastType;
  message: string;
  createdAt: Date;
}

export interface ToastContextValue {
  items: Accessor<ToastItem[]>;
  createToast: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
}
```

---

## Component Design

### ToastProvider

```typescript
const MAX_TOASTS = 5;

export const ToastProvider: ParentComponent = (props) => {
  const [items, setItems] = createSignal<ToastItem[]>([]);

  const createToast = (message: string, type: ToastType = "info"): void => {
    const newItem: ToastItem = {
      id: crypto.randomUUID(),
      type,
      message,
      createdAt: new Date(),
    };
    setItems((prev) => {
      const updated = [...prev, newItem];
      if (updated.length > MAX_TOASTS) {
        return updated.slice(-MAX_TOASTS); // FIFO: remove oldest
      }
      return updated;
    });
  };

  const remove = (id: string): void => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <ToastContext.Provider value={{ items, createToast, remove }}>
      {/* Screen reader live region */}
      <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
        {items().at(-1)?.message}
      </div>
      {props.children}
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
```

### ToastContainer

Rendered via `Portal`. Placed as a sibling to `NotificationBanner` in the app shell.

```typescript
export const ToastContainer: Component = () => {
  const toast = useToast();
  return (
    <Portal>
      <div class="fixed top-4 right-4 z-notification flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        <For each={toast.items()}>
          {(item) => <ToastItem item={item} onClose={toast.remove} />}
        </For>
      </div>
    </Portal>
  );
};
```

### ToastItem

Each item owns its own 3-second auto-dismiss timer. Using `onCleanup` ensures the timer is
cancelled when the item is removed from the DOM (whether by timeout, manual close, or FIFO eviction).

```typescript
const AUTO_DISMISS_MS = 3000;
const FADE_DURATION_MS = 200;

const ToastItem: Component<{ item: ToastItem; onClose: (id: string) => void }> = (props) => {
  const i18n = useI18n();
  const [open, setOpen] = createSignal(true);
  const { mounted, animating } = createMountTransition(open);

  const triggerClose = () => {
    setOpen(false);
    setTimeout(() => props.onClose(props.item.id), FADE_DURATION_MS);
  };

  onMount(() => {
    const timer = setTimeout(triggerClose, AUTO_DISMISS_MS);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <Show when={mounted()}>
      <div
        role="alert"
        class={clsx(
          baseClass,
          themeClasses[props.item.type],
          animating() ? "opacity-100" : "opacity-0",
          "transition-opacity duration-200",
        )}
      >
        <span class="flex-1 text-sm">{props.item.message}</span>
        <button
          type="button"
          aria-label={i18n.t("toast.close")}
          class={dismissButtonClass}
          onClick={triggerClose}
        >
          <Icon icon={IconX} size="1.25em" />
        </button>
      </div>
    </Show>
  );
};
```

---

## Styling

Reuses existing design tokens from `themeTokens`:

```typescript
const themeClasses: Record<ToastType, string> = {
  info:    themeTokens.info.solid,
  success: themeTokens.success.solid,
  warning: themeTokens.warning.solid,
  danger:  themeTokens.danger.solid,
};
```

Each item: `flex items-center gap-3 px-3 py-2 rounded-lg shadow-lg text-white w-full`

Dark mode is automatically supported because `themeTokens.*.solid` already includes dark-mode
variants.

---

## i18n Additions

Add to both `locales/ko.ts` and `locales/en.ts`:

```typescript
toast: {
  close: "토스트 닫기",   // ko
  close: "Close toast",  // en
},
```

---

## Public API (index.ts exports)

```typescript
// packages/solid/src/index.ts — add to Feedback section:
export * from "./components/feedback/toast/ToastProvider";
export * from "./components/feedback/toast/ToastContainer";
```

`ToastItem` is internal and not exported from `index.ts`.

---

## Usage Example

```tsx
// App root
<ToastProvider>
  <ToastContainer />
  <App />
</ToastProvider>

// Anywhere inside the tree
const { createToast } = useToast();
createToast("저장되었습니다.", "success");
createToast("네트워크 오류가 발생했습니다.", "danger");
createToast("처리 중입니다."); // defaults to "info"
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| 5+ toasts fired rapidly | FIFO: oldest removed, newest shown |
| Manual close mid-timer | Timer cancelled via `onCleanup`, fade-out plays |
| FIFO eviction while animating | `onCleanup` cancels timer; component unmounts cleanly |
| Empty state | Container div rendered but empty; no visual impact |

---

## Out of Scope

- Toast message (body text below title) — title only, per confirmed requirement
- Action buttons — not needed for this use case
- Hover-to-pause timer — not requested
- Custom duration per toast — not requested
- Programmatic update of existing toast — not requested
