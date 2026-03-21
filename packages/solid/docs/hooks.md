# Hooks

Source: `src/hooks/**`

## `useLocalStorage`

LocalStorage-based storage hook. Always uses localStorage regardless of SyncStorage settings. Keys are prefixed with `clientName`.

```typescript
export function useLocalStorage<TValue>(
  key: string,
  initialValue?: TValue,
): [Accessor<TValue | undefined>, StorageSetter<TValue>];
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Storage key (auto-prefixed with `clientName`) |
| `initialValue` | `TValue` | Default value if nothing stored |

---

## `useSyncConfig`

Reactive signal that syncs to storage via SyncStorageProvider (falls back to localStorage). Designed for data that should persist and sync across devices.

```typescript
export function useSyncConfig<TValue>(
  key: string,
  defaultValue: TValue,
): [Accessor<TValue>, Setter<TValue>, Accessor<boolean>];
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `key` | `string` | Storage key (auto-prefixed with `clientName`) |
| `defaultValue` | `TValue` | Default value |

Returns `[value, setValue, ready]` where `ready()` is `true` after initial storage read completes.

---

## `useLogger`

Logging hook that delegates to LoggerProvider adapter (defaults to consola).

```typescript
export function useLogger(): Logger;

export interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
}
```

---

## `createControllableSignal`

Signal hook supporting the controlled/uncontrolled pattern.

```typescript
export function createControllableSignal<TValue>(options: {
  value: Accessor<TValue>;
  onChange: Accessor<((value: TValue) => void) | undefined>;
}): [Accessor<TValue>, (newValue: TValue | ((prev: TValue) => TValue)) => TValue];
```

- When `onChange` is provided: controlled mode (value managed externally)
- When `onChange` is absent: uncontrolled mode (uses internal state)
- Supports functional setter: `setValue(prev => !prev)`

---

## `createControllableStore`

Store hook supporting the controlled/uncontrolled pattern. Supports all `SetStoreFunction` overloads (path-based, produce, reconcile).

```typescript
export function createControllableStore<TValue extends object>(options: {
  value: () => TValue;
  onChange: () => ((value: TValue) => void) | undefined;
}): [TValue, SetStoreFunction<TValue>];
```

---

## `createIMEHandler`

IME composition handling hook. Delays value changes during IME composition (e.g., Korean) to prevent DOM recreation.

```typescript
export function createIMEHandler(setValue: (value: string) => void): {
  composingValue: Accessor<string | null>;
  handleCompositionStart: () => void;
  handleInput: (value: string, isComposing: boolean) => void;
  handleCompositionEnd: (value: string) => void;
  flushComposition: () => void;
};
```

---

## `createMountTransition`

Mount transition hook for open/close CSS animations. Returns `mounted` for DOM rendering and `animating` for CSS class toggling.

```typescript
export function createMountTransition(open: () => boolean): {
  mounted: () => boolean;
  animating: () => boolean;
  unmount: () => void;
};
```

- `open=true`: `mounted=true` immediately, `animating=true` after double rAF
- `open=false`: `animating=false` immediately, `mounted=false` after transitionend or 200ms fallback

---

## `useRouterLink`

Router navigation hook with modifier key support.

```typescript
export function useRouterLink(): (
  options: RouterLinkOptions,
) => (e: MouseEvent | KeyboardEvent) => void;

export interface RouterLinkOptions {
  href: string;
  state?: Record<string, unknown>;
  window?: { width?: number; height?: number };
}
```

- Normal click: SPA routing via `useNavigate`
- Ctrl/Alt + click: new tab
- Shift + click: new window with configurable size
