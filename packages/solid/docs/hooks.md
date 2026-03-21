# Hooks

Source: `src/hooks/*.ts`

## useLocalStorage

localStorage-backed reactive signal. Keys are prefixed with `ConfigContext.clientName`.

```ts
function useLocalStorage<TValue>(
  key: string,
  initialValue?: TValue,
): [Accessor<TValue | undefined>, StorageSetter<TValue>];

type StorageSetter<TValue> = (
  value: TValue | undefined | ((prev: TValue | undefined) => TValue | undefined),
) => TValue | undefined;
```

- Always uses localStorage regardless of `SyncStorageProvider`.
- Used for device-specific data (auth tokens, local state).
- Setting `undefined` removes the item from localStorage.

## useSyncConfig

Storage-synced configuration signal. Uses `SyncStorageProvider` adapter if available, falls back to localStorage.

```ts
function useSyncConfig<TValue>(
  key: string,
  defaultValue: TValue,
): [Accessor<TValue>, Setter<TValue>, Accessor<boolean>];
```

- Returns `[value, setValue, ready]`.
- `ready()` becomes `true` after the initial value is loaded from storage.
- When the adapter changes via `useSyncStorage().configure()`, re-reads from the new adapter.
- Used for data that should persist and sync across devices (theme, preferences, DataSheet configs).

## useLogger

Logging hook with pluggable adapter. Falls back to `consola` if `LoggerProvider` is not present.

```ts
interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
}

function useLogger(): Logger;
```

`configure` is only usable inside `LoggerProvider`.

## createControllableSignal

Signal hook supporting the controlled/uncontrolled pattern. Used extensively by form components.

```ts
function createControllableSignal<TValue>(options: {
  value: Accessor<TValue>;
  onChange: Accessor<((value: TValue) => void) | undefined>;
}): [Accessor<TValue>, (newValue: TValue | ((prev: TValue) => TValue)) => TValue];
```

- When `onChange` is provided: controlled mode, value managed externally.
- When `onChange` returns `undefined`: uncontrolled mode, uses internal state.
- Supports functional setter: `setValue(prev => !prev)`.

## createControllableStore

Store hook supporting the controlled/uncontrolled pattern. Uses `solid-js/store` for fine-grained reactivity.

```ts
function createControllableStore<TValue extends object>(options: {
  value: () => TValue;
  onChange: () => ((value: TValue) => void) | undefined;
}): [TValue, SetStoreFunction<TValue>];
```

- Supports all `SetStoreFunction` overloads (path-based, produce, reconcile).
- In controlled mode: calls `onChange` with a deep clone when the store changes.

## createIMEHandler

IME composition handling hook. Delays value commits during IME composition (e.g., Korean input) to prevent DOM recreation and composition breakage.

```ts
function createIMEHandler(setValue: (value: string) => void): {
  composingValue: Accessor<string | null>;
  handleCompositionStart: () => void;
  handleInput: (value: string, isComposing: boolean) => void;
  handleCompositionEnd: (value: string) => void;
  flushComposition: () => void;
};
```

- During composition: only `composingValue` is updated (for display).
- On `compositionEnd`: delays `setValue` via `setTimeout(0)`.
- `flushComposition()`: immediately commits any pending value.

## createMountTransition

Mount/unmount animation state hook.

```ts
function createMountTransition(open: () => boolean): {
  mounted: () => boolean;
  animating: () => boolean;
  unmount: () => void;
};
```

- `open=true`: immediately sets `mounted=true`, then `animating=true` after double `requestAnimationFrame`.
- `open=false`: immediately sets `animating=false`, then `mounted=false` after `transitionend` or 200ms fallback.
- Use `mounted()` for DOM rendering, `animating()` for CSS class toggling.
- Call `unmount()` to manually remove from DOM (e.g., in `onTransitionEnd`).

## useRouterLink

Router navigation hook supporting modifier keys (Ctrl+click, Shift+click).

```ts
interface RouterLinkOptions {
  href: string;
  state?: Record<string, unknown>;
  window?: {
    width?: number;   // default: 800
    height?: number;  // default: 800
  };
}

function useRouterLink(): (
  options: RouterLinkOptions,
) => (e: MouseEvent | KeyboardEvent) => void;
```

- Normal click: SPA routing via `useNavigate`.
- Ctrl/Alt + click: opens in new tab.
- Shift + click: opens in new window with specified dimensions.
