# Hooks

Reactive primitives and utility hooks for building components.

---

## `useLocalStorage`

Reactive localStorage accessor with SSR safety.

```tsx
import { useLocalStorage } from "@simplysm/solid";

const [value, setValue] = useLocalStorage<string>("my-key", "default");
```

```
useLocalStorage<TValue>(key: string, initialValue?: TValue): [Accessor<TValue | undefined>, StorageSetter<TValue>]
```

---

## `useSyncConfig`

Persistent configuration value backed by `SyncStorage`. Returns current value, setter, and a ready signal.

```tsx
import { useSyncConfig } from "@simplysm/solid";

const [config, setConfig, ready] = useSyncConfig("myConfig", defaultConfig);
```

```
useSyncConfig<TValue>(key: string, defaultValue: TValue): [Accessor<TValue>, Setter<TValue>, Accessor<boolean>]
```

---

## `useLogger`

Structured logger instance from the logger context.

```tsx
import { useLogger } from "@simplysm/solid";

const logger = useLogger();
logger.info("Component mounted");
logger.error(err);
```

**`Logger`**

| Method | Description |
|--------|-------------|
| `log(...args)` | Generic log |
| `info(...args)` | Info log |
| `warn(...args)` | Warning log |
| `error(...args)` | Error log |
| `configure(options)` | Set logger tag/options |

---

## `createControllableSignal`

Creates a signal that works as either controlled (externally driven) or uncontrolled (internally managed).

```tsx
import { createControllableSignal } from "@simplysm/solid";

const [value, setValue] = createControllableSignal({
  value: () => props.value,
  onChange: () => props.onValueChange,
});
```

```
createControllableSignal<TValue>(options: {
  value: Accessor<TValue>;
  onChange: Accessor<((value: TValue) => void) | undefined>;
}): [Accessor<TValue>, Setter<TValue>]
```

---

## `createControllableStore`

Creates a store that works as either controlled or uncontrolled.

```tsx
import { createControllableStore } from "@simplysm/solid";

const [store, setStore] = createControllableStore({
  value: () => props.value ?? [],
  onChange: () => props.onChange,
});
```

```
createControllableStore<TValue>(options: {
  value: Accessor<TValue>;
  onChange: Accessor<((value: TValue) => void) | undefined>;
}): [TValue, SetStoreFunction<TValue>]
```

---

## `createIMEHandler`

Creates event handlers for correct IME composition input (Korean, Japanese, Chinese).

```tsx
import { createIMEHandler } from "@simplysm/solid";

const { composingValue, handleCompositionStart, handleInput, handleCompositionEnd, flushComposition } =
  createIMEHandler(setValue);
```

Returns an object with:

| Property | Description |
|----------|-------------|
| `composingValue` | Accessor to the in-progress composition string |
| `handleCompositionStart` | `compositionstart` event handler |
| `handleInput` | `input` event handler |
| `handleCompositionEnd` | `compositionend` event handler |
| `flushComposition()` | Flush any in-progress composition immediately |

---

## `createMountTransition`

Manages mount/unmount lifecycle with animation support (enter/leave transitions).

```tsx
import { createMountTransition } from "@simplysm/solid";

const { mounted, animating, unmount } = createMountTransition(open);
```

| Return | Description |
|--------|-------------|
| `mounted` | Accessor — true while component should exist in DOM |
| `animating` | Accessor — true during enter animation, false during leave |
| `unmount()` | Call at the end of leave animation to remove from DOM |

---

## `useRouterLink`

Returns a click handler that performs SolidJS Router navigation, including support for Ctrl+click (new tab) and Shift+click (new window).

```tsx
import { useRouterLink } from "@simplysm/solid";

const navigate = useRouterLink();
const handleClick = navigate({ href: "/dashboard" });
```

```
useRouterLink(): (options: RouterLinkOptions) => (e: MouseEvent | KeyboardEvent) => void
```

**`RouterLinkOptions`**

| Property | Type | Description |
|----------|------|-------------|
| `href` | `string` | Navigation path (complete URL, e.g., `"/home/dashboard?tab=1"`) |
| `state?` | `Record<string, unknown>` | Data to pass during navigation (not exposed in URL) |
| `window?` | `{ width?: number; height?: number }` | New window size on Shift+click (default: 800x800) |
