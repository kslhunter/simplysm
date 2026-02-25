# Configure Decorator Pattern Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Change all `configure()` methods to accept a decorator function `(origin) => adapter` instead of a direct adapter object, enabling middleware/chaining patterns.

**Architecture:** Each Provider initializes its signal with a built-in default adapter (instead of `undefined`). The `configure()` method uses SolidJS functional signal update `setAdapter((prev) => fn(prev))` to chain decorators. The `useLogger` hook no longer needs its own consola fallback since the default adapter handles it.

**Tech Stack:** SolidJS, TypeScript, Vitest

---

### Task 1: LoggerContext — Change configure to decorator pattern

**Files:**
- Modify: `packages/solid/src/providers/LoggerContext.tsx`

**Step 1: Write the failing test**

In `packages/solid/tests/providers/LoggerContext.spec.tsx`, update the existing `configure()` test and add a decorator chaining test:

```typescript
// Replace the existing "configure()로 adapter를 설정할 수 있다" test (line 47-68)
it("configure()로 decorator function을 통해 adapter를 설정할 수 있다", () => {
  const writeSpy = vi.fn();

  let received: LoggerContextValue | undefined;

  function TestComponent() {
    received = useLogAdapter();
    return <div />;
  }

  render(() => (
    <LoggerProvider>
      <TestComponent />
    </LoggerProvider>
  ));

  // Before configure: default adapter exists (consola-based)
  expect(received!.adapter()).toBeDefined();

  received!.configure((origin) => ({
    write: (...args) => {
      writeSpy(...args);
      origin.write(...args);
    },
  }));

  const adapter = received!.adapter();
  expect(adapter).toBeDefined();
  adapter!.write("info", "test");
  expect(writeSpy).toHaveBeenCalledWith("info", "test");
});
```

Also update the test at line 44 that expects `adapter()` to be `undefined` initially — it should now expect a defined default adapter:

```typescript
// Change line 44 from:
expect(received!.adapter()).toBeUndefined();
// To:
expect(received!.adapter()).toBeDefined();
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/providers/LoggerContext.spec.tsx --project=solid --run`
Expected: FAIL — configure still expects a direct adapter object

**Step 3: Implement LoggerContext changes**

In `packages/solid/src/providers/LoggerContext.tsx`:

1. Add consola import and default adapter constant:
```typescript
import { consola } from "consola";

const defaultLogAdapter: LogAdapter = {
  write: (severity, ...data) => (consola as any)[severity](...data),
};
```

2. Change `LoggerContextValue.configure` type (line 29):
```typescript
configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
```

3. Update JSDoc on `LoggerContextValue` (line 24-25):
```
 * - `adapter`: 현재 설정된 LogAdapter (signal). 기본값은 consola 기반 adapter
 * - `configure`: decorator function으로 adapter를 설정/체이닝하는 함수
```

4. Change Provider signal init (line 67):
```typescript
const [adapter, setAdapter] = createSignal<LogAdapter>(defaultLogAdapter);
```

5. Change configure implementation (line 71):
```typescript
configure: (fn: (origin: LogAdapter) => LogAdapter) => setAdapter((prev) => fn(prev)),
```

6. Update `adapter` accessor type — remove `| undefined` from the signal type:
```typescript
// Interface line 28: change
adapter: Accessor<LogAdapter | undefined>;
// To:
adapter: Accessor<LogAdapter>;
```

7. Update JSDoc examples to use decorator pattern.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/providers/LoggerContext.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/providers/LoggerContext.tsx packages/solid/tests/providers/LoggerContext.spec.tsx
git commit -m "feat(solid): change LoggerContext.configure to decorator pattern"
```

---

### Task 2: useLogger — Adapt to new LoggerContext (always has adapter)

**Files:**
- Modify: `packages/solid/src/hooks/useLogger.ts`

**Step 1: Write the failing test**

In `packages/solid/tests/hooks/useLogger.spec.tsx`, update tests:

1. Update "should use adapter after configure()" test (line 59-71) to use decorator:
```typescript
it("should use adapter after configure() is called", () => {
  const writeSpy = vi.fn();
  const consolaSpy = vi.spyOn(consola, "info").mockImplementation(() => {});

  const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });

  result.configure((origin) => ({ write: writeSpy }));
  result.info("test message", { key: "value" });

  expect(writeSpy).toHaveBeenCalledWith("info", "test message", { key: "value" });
  expect(consolaSpy).not.toHaveBeenCalled();
});
```

2. Update "should pass all severity levels" test (line 73-89):
```typescript
it("should pass all severity levels to adapter after configure()", () => {
  const writeSpy = vi.fn();

  const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });
  result.configure((origin) => ({ write: writeSpy }));

  result.log("a");
  result.info("b");
  result.warn("c");
  result.error("d");

  expect(writeSpy).toHaveBeenCalledWith("log", "a");
  expect(writeSpy).toHaveBeenCalledWith("info", "b");
  expect(writeSpy).toHaveBeenCalledWith("warn", "c");
  expect(writeSpy).toHaveBeenCalledWith("error", "d");
});
```

3. Update "should throw when configure() is called without LoggerProvider" test (line 91-98):
```typescript
it("should throw when configure() is called without LoggerProvider", () => {
  const { result } = renderHook(() => useLogger());

  expect(() => result.configure((origin) => ({ write: vi.fn() }))).toThrow(
    "configure()는 LoggerProvider 내부에서만 사용할 수 있습니다",
  );
});
```

4. Add new test for decorator chaining with origin:
```typescript
it("should chain decorators — origin receives the previous adapter", () => {
  const firstSpy = vi.fn();
  const secondSpy = vi.fn();

  const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });

  result.configure(() => ({ write: firstSpy }));
  result.configure((origin) => ({
    write: (severity, ...data) => {
      secondSpy(severity, ...data);
      origin.write(severity, ...data);
    },
  }));

  result.info("chained");

  expect(secondSpy).toHaveBeenCalledWith("info", "chained");
  expect(firstSpy).toHaveBeenCalledWith("info", "chained");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/hooks/useLogger.spec.tsx --project=solid --run`
Expected: FAIL

**Step 3: Implement useLogger changes**

In `packages/solid/src/hooks/useLogger.ts`:

1. Change `Logger.configure` type (line 12):
```typescript
configure: (fn: (origin: LogAdapter) => LogAdapter) => void;
```

2. Simplify `createLogFunction` — since adapter is now always defined when Provider exists, simplify the logic:
```typescript
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
```
(Keep same logic — without Provider, still falls back to consola. With Provider, adapter is always defined.)

3. Change configure call (line 35-39):
```typescript
configure: (fn: (origin: LogAdapter) => LogAdapter) => {
  if (!loggerCtx) {
    throw new Error("configure()는 LoggerProvider 내부에서만 사용할 수 있습니다");
  }
  loggerCtx.configure(fn);
},
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/hooks/useLogger.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/hooks/useLogger.ts packages/solid/tests/hooks/useLogger.spec.tsx
git commit -m "feat(solid): adapt useLogger to decorator configure pattern"
```

---

### Task 3: SyncStorageContext — Change configure to decorator pattern

**Files:**
- Modify: `packages/solid/src/providers/SyncStorageContext.tsx`

**Step 1: Write the failing test**

In `packages/solid/tests/providers/SyncStorageContext.spec.tsx`:

1. Update "SyncStorageProvider가 SyncStorageContextValue를 정상 제공한다" (line 27-45) — change the initial adapter expectation:
```typescript
// Change line 44 from:
expect(received!.adapter()).toBeUndefined();
// To:
expect(received!.adapter()).toBeDefined();
```

2. Replace "configure()로 adapter를 설정할 수 있다" test (line 47-70):
```typescript
it("configure()로 decorator function을 통해 adapter를 설정할 수 있다", () => {
  const mockGetItem = vi.fn().mockResolvedValue(null);

  let received: SyncStorageContextValue | undefined;

  function TestComponent() {
    received = useSyncStorage();
    return <div />;
  }

  render(() => (
    <SyncStorageProvider>
      <TestComponent />
    </SyncStorageProvider>
  ));

  // Default adapter exists (localStorage-based)
  expect(received!.adapter()).toBeDefined();

  received!.configure((origin) => ({
    getItem: mockGetItem,
    setItem: origin.setItem,
    removeItem: origin.removeItem,
  }));

  const adapter = received!.adapter();
  expect(adapter).toBeDefined();
  // Custom getItem is used
  void adapter!.getItem("test");
  expect(mockGetItem).toHaveBeenCalledWith("test");
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/providers/SyncStorageContext.spec.tsx --project=solid --run`
Expected: FAIL

**Step 3: Implement SyncStorageContext changes**

In `packages/solid/src/providers/SyncStorageContext.tsx`:

1. Add default localStorage adapter:
```typescript
const defaultStorageAdapter: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
```

2. Change `SyncStorageContextValue.configure` type (line 31):
```typescript
configure: (fn: (origin: StorageAdapter) => StorageAdapter) => void;
```

3. Remove `| undefined` from adapter type (line 30):
```typescript
adapter: Accessor<StorageAdapter>;
```

4. Change Provider signal init (line 69):
```typescript
const [adapter, setAdapter] = createSignal<StorageAdapter>(defaultStorageAdapter);
```

5. Change configure implementation (line 73):
```typescript
configure: (fn: (origin: StorageAdapter) => StorageAdapter) => setAdapter((prev) => fn(prev)),
```

6. Update JSDoc to reflect new behavior.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/providers/SyncStorageContext.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/providers/SyncStorageContext.tsx packages/solid/tests/providers/SyncStorageContext.spec.tsx
git commit -m "feat(solid): change SyncStorageContext.configure to decorator pattern"
```

---

### Task 4: useSyncConfig — Adapt to new SyncStorageContext (adapter always defined)

**Files:**
- Modify: `packages/solid/src/hooks/useSyncConfig.ts`

**Step 1: Write the failing test**

In `packages/solid/tests/hooks/useSyncConfig.spec.tsx`:

1. Update `ConfigureStorage` helper (line 12-15) to use decorator:
```typescript
function ConfigureStorage(props: { storage: StorageAdapter; children: any }) {
  useSyncStorage()!.configure(() => props.storage);
  return <>{props.children}</>;
}
```

2. Update "should re-read from new adapter when configure() is called mid-session" test (line 275):
```typescript
doConfiguration = () => syncStorage.configure(() => mockSyncStorage);
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/hooks/useSyncConfig.spec.tsx --project=solid --run`
Expected: FAIL

**Step 3: Implement useSyncConfig changes**

In `packages/solid/src/hooks/useSyncConfig.ts`:

The key change: `syncStorageCtx?.adapter()` now always returns a defined `StorageAdapter` when the Provider exists. The hook's internal logic that checks `if (!currentAdapter)` for localStorage fallback needs adjustment.

Since the default adapter IS localStorage, the existing fallback logic should still work correctly without code changes — when no custom adapter is configured, the default localStorage adapter is used automatically through the signal. However, the existing `!currentAdapter` check no longer triggers (adapter is never undefined).

Actually, we need to keep the `!currentAdapter` check working for when there's NO SyncStorageProvider at all (`syncStorageCtx` is undefined). In that case, `syncStorageCtx?.adapter()` returns `undefined`, and the localStorage fallback kicks in.

So: **No changes needed to useSyncConfig.ts** — only the test helpers that call `.configure()` need updating.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/hooks/useSyncConfig.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/tests/hooks/useSyncConfig.spec.tsx
git commit -m "test(solid): update useSyncConfig tests for decorator configure pattern"
```

---

### Task 5: SharedDataContext + SharedDataProvider — Change configure to decorator pattern

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataContext.ts`
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`

**Step 1: Write the failing test**

In `packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx`:

1. Update `ConfigureSharedData` helper (line 63-70):
```typescript
function ConfigureSharedData(props: {
  definitions: { user: SharedDataDefinition<{ id: number; name: string }> };
  children: any;
}) {
  const shared = useSharedData<TestData>();
  shared.configure(() => props.definitions);
  return <>{props.children}</>;
}
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx --project=solid --run`
Expected: FAIL

**Step 3: Implement SharedDataContext + SharedDataProvider changes**

In `packages/solid/src/providers/shared-data/SharedDataContext.ts`, change configure type (line 52-54):
```typescript
configure: (fn: (origin: {
  [K in keyof TSharedData]: SharedDataDefinition<TSharedData[K]>;
}) => {
  [K in keyof TSharedData]: SharedDataDefinition<TSharedData[K]>;
}) => void;
```

In `packages/solid/src/providers/shared-data/SharedDataProvider.tsx`, change `configure` function (line 118):
```typescript
function configure(fn: (origin: Record<string, SharedDataDefinition<unknown>>) => Record<string, SharedDataDefinition<unknown>>): void {
  if (configured) {
    throw new Error("SharedDataProvider: configure()는 1회만 호출할 수 있습니다");
  }
  configured = true;

  const definitions = fn({});
  currentDefinitions = definitions;
  // ... rest of the existing logic unchanged
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/providers/shared-data/SharedDataContext.ts packages/solid/src/providers/shared-data/SharedDataProvider.tsx packages/solid/tests/providers/shared-data/SharedDataProvider.spec.tsx
git commit -m "feat(solid): change SharedData.configure to decorator pattern"
```

---

### Task 6: Update demo page

**Files:**
- Modify: `packages/solid-demo/src/pages/service/SharedDataPage.tsx:135`

**Step 1: Update SharedDataPage configure call**

Change the `sharedData.configure({...})` call (line 135-158) to:
```typescript
sharedData.configure(() => ({
  user: {
    serviceKey: "main",
    fetch: async (changeKeys) => {
      const client = serviceClient.get("main");
      return (await client.send("SharedDataDemoService", "getUsers", [
        changeKeys,
      ])) as IDemoUser[];
    },
    getKey: (item) => item.id,
    orderBy: [[(item) => item.name, "asc"]],
  },
  company: {
    serviceKey: "main",
    fetch: async (changeKeys) => {
      const client = serviceClient.get("main");
      return (await client.send("SharedDataDemoService", "getCompanies", [
        changeKeys,
      ])) as IDemoCompany[];
    },
    getKey: (item) => item.id,
    orderBy: [[(item) => item.name, "asc"]],
  },
}));
```

**Step 2: Commit**

```bash
git add packages/solid-demo/src/pages/service/SharedDataPage.tsx
git commit -m "refactor(solid-demo): update SharedDataPage to use decorator configure"
```

---

### Task 7: Typecheck

**Step 1: Run full typecheck**

Run: `pnpm typecheck packages/solid && pnpm typecheck packages/solid-demo`
Expected: PASS with no type errors

If errors found, fix them and re-run.

**Step 2: Commit fixes if any**

---

### Task 8: Update documentation

**Files:**
- Modify: `packages/solid/README.md`
- Modify: `packages/solid/docs/providers.md`
- Modify: `packages/solid/docs/hooks.md`

**Step 1: Update README.md**

In `packages/solid/README.md`, update the Provider Setup section (lines 54-63):
```typescript
function AppRoot() {
  const serviceClient = useServiceClient();

  onMount(async () => {
    await serviceClient.connect("main", { port: 3000 });
    useSyncStorage()!.configure((origin) => myStorageAdapter);
    useLogger().configure((origin) => myLogAdapter);
    useSharedData().configure((origin) => definitions);
  });
}
```

**Step 2: Update docs/providers.md**

Update the configure usage example (line 23-27):
```typescript
function AppRoot() {
  const serviceClient = useServiceClient();

  onMount(async () => {
    await serviceClient.connect("main", { port: 3000 });
    useSyncStorage()!.configure((origin) => myStorageAdapter);
    useLogger().configure((origin) => myLogAdapter);
    useSharedData().configure((origin) => definitions);
  });
}
```

Update SharedDataValue extras table — configure signature:
```
| `configure` | `(fn: (origin) => definitions) => void` | Set up data subscriptions via decorator function |
```

**Step 3: Update docs/hooks.md**

In the useLogger section, add configure documentation:
```markdown
**Configuring a custom adapter (decorator pattern):**

```tsx
// Replace default consola adapter
useLogger().configure((origin) => myLogAdapter);

// Wrap default adapter (chaining)
useLogger().configure((origin) => ({
  write(severity, ...data) {
    sendToServer(severity, ...data);
    origin.write(severity, ...data);  // also log to consola
  },
}));
```
```

**Step 4: Commit**

```bash
git add packages/solid/README.md packages/solid/docs/providers.md packages/solid/docs/hooks.md
git commit -m "docs(solid): update documentation for decorator configure pattern"
```
