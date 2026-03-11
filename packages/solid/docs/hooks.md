# Hooks

## useLocalStorage

```typescript
function useLocalStorage<TValue>(
  key: string,
  initialValue?: TValue,
): [Accessor<TValue | undefined>, StorageSetter<TValue>];
```

Reactive `localStorage` binding. Returns a signal-like tuple. Automatically serializes/deserializes values as JSON.

---

## useSyncConfig

```typescript
function useSyncConfig<TValue>(
  key: string,
  defaultValue: TValue,
): [Accessor<TValue>, Setter<TValue>, Accessor<boolean>];
```

Persisted configuration backed by `SyncStorageProvider`. Returns `[value, setValue, ready]`. The `ready` accessor becomes `true` once the stored value has been loaded.

---

## useLogger

```typescript
interface Logger {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  configure(fn: (origin: LogAdapter) => LogAdapter): void;
}

function useLogger(): Logger;
```

Access the logging system from `LoggerProvider`. Supports middleware composition via `configure()`.

---

## createControllableSignal

```typescript
function createControllableSignal<TValue>(options: {
  value: Accessor<TValue>;
  onChange: Accessor<((value: TValue) => void) | undefined>;
}): [Accessor<TValue>, (newValue: TValue | ((prev: TValue) => TValue)) => TValue];
```

Creates a signal that supports both controlled and uncontrolled modes. When `onChange` is provided, the component is controlled; otherwise, internal state is used. This is the primitive behind all form control `value`/`onValueChange` pairs.

---

## createControllableStore

```typescript
function createControllableStore<TValue extends object>(options: {
  value: () => TValue;
  onChange: () => ((value: TValue) => void) | undefined;
}): [TValue, SetStoreFunction<TValue>];
```

Like `createControllableSignal` but for SolidJS stores (deep reactive objects).

---

## createIMEHandler

```typescript
function createIMEHandler(setValue: (value: string) => void): {
  composingValue: Accessor<string | null>;
  handleCompositionStart(): void;
  handleInput(value: string, isComposing: boolean): void;
  handleCompositionEnd(value: string): void;
  flushComposition(): void;
};
```

Handles IME composition events (Korean, Chinese, Japanese input). Buffers intermediate composition states and only commits the final value. Used internally by `TextInput` and `Textarea`.

---

## createMountTransition

```typescript
function createMountTransition(
  open: () => boolean,
): {
  mounted: () => boolean;
  animating: () => boolean;
  unmount: () => void;
};
```

Manages mount/unmount transitions. While `open()` is true, `mounted` and `animating` are true. When `open()` becomes false, `animating` becomes false (triggering CSS transition), and `unmount()` should be called after the transition ends to set `mounted` to false.

---

## useRouterLink

```typescript
interface RouterLinkOptions {
  href: string;
  state?: Record<string, unknown>;
  window?: { width?: number; height?: number };
}

function useRouterLink(): (options: RouterLinkOptions) => (e: MouseEvent | KeyboardEvent) => void;
```

Creates click handlers for SolidJS Router navigation. Supports opening links in new windows with specified dimensions via the `window` option.

---

## Usage Examples

```typescript
import {
  useLocalStorage,
  useSyncConfig,
  createControllableSignal,
  useLogger,
} from "@simplysm/solid";

// Local storage
const [theme, setTheme] = useLocalStorage<string>("app-theme", "light");

// Sync config (persisted to SyncStorageProvider)
const [pageSize, setPageSize, ready] = useSyncConfig("pageSize", 20);

// Logger
const logger = useLogger();
logger.info("Application started");

// Controlled/uncontrolled primitive
const [value, setValue] = createControllableSignal({
  value: () => props.value,
  onChange: () => props.onValueChange,
});
```
