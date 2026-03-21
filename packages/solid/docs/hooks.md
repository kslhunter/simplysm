# Hooks

Source: `src/hooks/**`

## `useLocalStorage`

localStorage-based reactive signal. Keys are prefixed with clientName from ConfigContext.

```ts
function useLocalStorage<TValue>(
  key: string,
  initialValue?: TValue,
): [Accessor<TValue | undefined>, StorageSetter<TValue>];
```

Always uses localStorage regardless of SyncStorageProvider settings.

## `useSyncConfig`

Config signal synced to storage. Uses SyncStorageProvider if available, falls back to localStorage.

```ts
function useSyncConfig<TValue>(
  key: string,
  defaultValue: TValue,
): [Accessor<TValue>, Setter<TValue>, Accessor<boolean>];
```

Returns `[value, setter, ready]`. The `ready` accessor is false until async storage resolves.

## `useLogger`

Logger with custom adapter support.

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

| Method | Description |
|--------|-------------|
| `log()` | Log message |
| `info()` | Info message |
| `warn()` | Warning message |
| `error()` | Error message |
| `configure()` | Replace log adapter |

## `createControllableSignal`

Signal hook supporting controlled/uncontrolled pattern (like React's useState with controlled override).

```ts
function createControllableSignal<TValue>(options: {
  value: Accessor<TValue>;
  onChange: Accessor<((value: TValue) => void) | undefined>;
}): [Accessor<TValue>, (newValue: TValue | ((prev: TValue) => TValue)) => TValue];
```

When `onChange` is provided, the component is controlled. When undefined, it manages its own internal state.

## `createControllableStore`

Store hook supporting controlled/uncontrolled pattern for object values.

```ts
function createControllableStore<TValue extends object>(options: {
  value: () => TValue;
  onChange: () => ((value: TValue) => void) | undefined;
}): [TValue, SetStoreFunction<TValue>];
```

## `createIMEHandler`

IME composition handling hook. Delays value change callbacks during IME composition (e.g., Korean, Japanese, Chinese input).

```ts
function createIMEHandler(setValue: (value: string) => void): {
  composingValue: Accessor<string | null>;
  handleCompositionStart: () => void;
  handleInput: (value: string, isComposing: boolean) => void;
  handleCompositionEnd: (value: string) => void;
  flushComposition: () => void;
};
```

| Return Field | Description |
|-------------|-------------|
| `composingValue` | Current composing text (null when not composing) |
| `handleCompositionStart` | Attach to `onCompositionStart` |
| `handleInput` | Attach to `onInput` |
| `handleCompositionEnd` | Attach to `onCompositionEnd` |
| `flushComposition` | Force flush pending composition |

## `createMountTransition`

Mount/unmount animation state hook.

```ts
function createMountTransition(open: () => boolean): {
  mounted: () => boolean;
  animating: () => boolean;
  unmount: () => void;
};
```

| Return Field | Description |
|-------------|-------------|
| `mounted` | Whether element should be in DOM |
| `animating` | Whether animation is in progress |
| `unmount` | Force unmount immediately |

## `useRouterLink`

SPA router navigation handler with modifier key support.

```ts
interface RouterLinkOptions {
  href: string;
  state?: Record<string, unknown>;
  window?: { width?: number; height?: number };
}

function useRouterLink(): (options: RouterLinkOptions) => (e: MouseEvent | KeyboardEvent) => void;
```

| Modifier | Behavior |
|----------|----------|
| Normal click | SPA navigation via @solidjs/router |
| Ctrl/Alt + click | Open in new tab |
| Shift + click | Open in new window (with optional size) |
