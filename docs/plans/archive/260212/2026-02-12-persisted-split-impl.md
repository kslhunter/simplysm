# Split usePersisted into useLocalConfig / useSyncConfig / useLogger — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Split `usePersisted` into three purpose-specific hooks: `useLocalConfig` (always localStorage), `useSyncConfig` (syncStorage with localStorage fallback), `useLogger` (consola + optional server logging).

**Architecture:** Update `ConfigContext` interfaces (`storage` → `syncStorage`, add `LogAdapter`/`logger`), create three new hooks, migrate all existing `usePersisted` callers, then delete the old hook.

**Tech Stack:** SolidJS, `@solid-primitives/storage` (makePersisted), `consola`, Vitest

---

### Task 1: Update ConfigContext interfaces

**Files:**
- Modify: `packages/solid/src/providers/ConfigContext.ts`

**Step 1: Modify ConfigContext.ts**

Replace the full file content:

```typescript
import { createContext, useContext } from "solid-js";

/**
 * 커스텀 저장소 어댑터 인터페이스
 *
 * @remarks
 * - 동기 저장소: `localStorage`, `sessionStorage` 등 그대로 전달 가능
 * - 비동기 저장소: `getItem`이 `Promise`를 반환하는 구현체 전달
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<unknown>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * 로그 어댑터 인터페이스
 *
 * @remarks
 * - `useLogger`에서 consola 출력 외에 추가 로그 전송(DB, 서버 등)에 사용
 */
export interface LogAdapter {
  write(severity: "error" | "warn" | "log", ...data: any[]): Promise<void> | void;
}

/**
 * 앱 전역 설정
 */
export interface AppConfig {
  /**
   * 클라이언트 식별자 (저장소 key prefix로 사용)
   */
  clientName: string;

  /**
   * 동기화 가능 저장소 (useSyncConfig에서 사용, 기본값: localStorage)
   */
  syncStorage?: StorageAdapter;

  /**
   * 로그 어댑터 (useLogger에서 consola 외 추가 전송에 사용)
   */
  logger?: LogAdapter;

  /**
   * 루트 로딩 오버레이 변형 (기본값: "spinner")
   */
  loadingVariant?: "spinner" | "bar";
}

/**
 * 앱 전역 설정 Context
 *
 * @example
 * ```tsx
 * // 앱 루트에서 Provider 설정
 * <ConfigContext.Provider value={{ clientName: "myApp" }}>
 *   <App />
 * </ConfigContext.Provider>
 *
 * // 컴포넌트에서 사용
 * const config = useConfig();
 * console.log(config.clientName); // "myApp"
 * ```
 */
export const ConfigContext = createContext<AppConfig>();

/**
 * 앱 전역 설정에 접근하는 훅
 *
 * @throws ConfigContext.Provider가 없으면 에러 발생
 */
export function useConfig(): AppConfig {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig는 ConfigContext.Provider 내부에서만 사용할 수 있습니다");
  }
  return context;
}
```

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS (no callers use `storage` field name directly — they go through `usePersisted` which we haven't changed yet)

**Step 3: Commit**

```bash
git add packages/solid/src/providers/ConfigContext.ts
git commit -m "refactor(solid): rename storage to syncStorage, add LogAdapter in ConfigContext"
```

---

### Task 2: Create useLocalConfig hook (TDD)

**Files:**
- Create: `packages/solid/tests/hooks/useLocalConfig.spec.tsx`
- Create: `packages/solid/src/hooks/useLocalConfig.ts`

**Step 1: Write the test file**

```tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ConfigContext } from "../../src/providers/ConfigContext";
import { useLocalConfig } from "../../src/hooks/useLocalConfig";

describe("useLocalConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("초기값이 올바르게 설정된다", () => {
    let capturedValue: string | undefined;

    function TestComponent() {
      const [value] = useLocalConfig("theme", "light");
      capturedValue = value();
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(capturedValue).toBe("light");
  });

  it("clientName prefix가 localStorage 키에 적용된다", () => {
    function TestComponent() {
      const [, setValue] = useLocalConfig("token", "abc");
      setValue("xyz");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "myApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(localStorage.getItem("myApp.token")).toBe(JSON.stringify("xyz"));
  });

  it("값 변경 시 localStorage에 저장된다", () => {
    let setValue: ((v: string) => void) | undefined;

    function TestComponent() {
      const [, setVal] = useLocalConfig("setting", "initial");
      setValue = setVal;
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    setValue?.("updated");
    expect(localStorage.getItem("app.setting")).toBe(JSON.stringify("updated"));
  });

  it("syncStorage가 설정되어도 항상 localStorage를 사용한다", () => {
    const store = new Map<string, string>();
    const customStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    };

    function TestComponent() {
      const [, setValue] = useLocalConfig("token", "abc");
      setValue("xyz");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app", syncStorage: customStorage }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    // localStorage에 저장됨 (syncStorage 무시)
    expect(localStorage.getItem("app.token")).toBe(JSON.stringify("xyz"));
    // customStorage에는 저장 안 됨
    expect(store.has("app.token")).toBe(false);
  });

  it("반환값이 [Accessor, Setter] 2-tuple이다 (loading 없음)", () => {
    function TestComponent() {
      const result = useLocalConfig("key", "val");
      expect(result).toHaveLength(2);
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));
  });

  it("ConfigContext.Provider 없이 사용하면 에러가 발생한다", () => {
    function TestComponent() {
      useLocalConfig("key", "value");
      return <div />;
    }

    expect(() => render(() => <TestComponent />)).toThrow(
      "useConfig는 ConfigContext.Provider 내부에서만 사용할 수 있습니다",
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/hooks/useLocalConfig.spec.tsx --project=solid --run`
Expected: FAIL (module not found)

**Step 3: Write implementation**

```typescript
import { createSignal, type Accessor, type Setter } from "solid-js";
import { makePersisted, type SyncStorage } from "@solid-primitives/storage";
import { jsonStringify, jsonParse } from "@simplysm/core-common";
import { useConfig } from "../providers/ConfigContext";

/**
 * 로컬 전용 설정 저장 훅 (항상 localStorage)
 *
 * @remarks
 * - ConfigContext.Provider 내부에서만 사용 가능
 * - 키는 자동으로 `{clientName}.{key}` 형태로 저장됨
 * - syncStorage 설정과 무관하게 항상 localStorage 사용
 * - auth-token, 기기별 설정 등 서버에 보내지 않을 데이터에 사용
 *
 * @example
 * ```tsx
 * const [token, setToken] = useLocalConfig<string | undefined>("auth-token", undefined);
 * ```
 *
 * @param key - 저장소 키 (clientName prefix가 자동 적용됨)
 * @param initialValue - 초기값 (저장된 값이 없을 때 사용)
 * @returns [getter, setter] 튜플
 */
export function useLocalConfig<T>(key: string, initialValue: T): [Accessor<T>, Setter<T>] {
  const config = useConfig();
  const prefixedKey = `${config.clientName}.${key}`;

  // eslint-disable-next-line solid/reactivity -- makePersisted는 signal 튜플을 직접 받도록 설계됨
  const [value, setValue] = makePersisted(createSignal<T>(initialValue), {
    name: prefixedKey,
    storage: localStorage as SyncStorage,
    serialize: (v) => jsonStringify(v),
    deserialize: (v) => jsonParse<T>(v),
  });

  return [value, setValue];
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/hooks/useLocalConfig.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/hooks/useLocalConfig.ts packages/solid/tests/hooks/useLocalConfig.spec.tsx
git commit -m "feat(solid): add useLocalConfig hook with tests"
```

---

### Task 3: Create useSyncConfig hook (TDD)

**Files:**
- Create: `packages/solid/tests/hooks/useSyncConfig.spec.tsx`
- Create: `packages/solid/src/hooks/useSyncConfig.ts`

**Step 1: Write the test file**

```tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ConfigContext } from "../../src/providers/ConfigContext";
import { useSyncConfig } from "../../src/hooks/useSyncConfig";

describe("useSyncConfig", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("syncStorage 미설정 시 localStorage를 사용한다", () => {
    function TestComponent() {
      const [, setValue] = useSyncConfig("theme", "light");
      setValue("dark");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(localStorage.getItem("app.theme")).toBe(JSON.stringify("dark"));
  });

  it("syncStorage 미설정 시 loading이 항상 false이다", () => {
    let capturedLoading: boolean | undefined;

    function TestComponent() {
      const [, , loading] = useSyncConfig("theme", "light");
      capturedLoading = loading();
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(capturedLoading).toBe(false);
  });

  it("커스텀 동기 저장소를 사용할 수 있다", () => {
    const store = new Map<string, string>();
    const customStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
    };

    function TestComponent() {
      const [, setValue] = useSyncConfig("theme", "light");
      setValue("dark");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app", syncStorage: customStorage }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(store.get("app.theme")).toBe(JSON.stringify("dark"));
    expect(localStorage.getItem("app.theme")).toBeNull();
  });

  it("비동기 저장소 사용 시 loading이 true로 시작한다", () => {
    const store = new Map<string, string>();
    const asyncStorage = {
      async getItem(key: string) {
        const result = store.get(key) ?? null;
        await Promise.resolve();
        return result;
      },
      async setItem(key: string, value: string) {
        await Promise.resolve();
        store.set(key, value);
      },
      async removeItem(key: string) {
        await Promise.resolve();
        store.delete(key);
      },
    };

    let capturedLoading: boolean | undefined;

    function TestComponent() {
      const [, , loading] = useSyncConfig("theme", "light");
      capturedLoading = loading();
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app", syncStorage: asyncStorage }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(capturedLoading).toBe(true);
  });

  it("다양한 타입을 지원한다", () => {
    function TestComponent() {
      const [, setNumber] = useSyncConfig("count", 0);
      const [, setObject] = useSyncConfig("data", { key: "value" });

      setNumber(42);
      setObject({ key: "updated" });

      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(localStorage.getItem("app.count")).toBe(JSON.stringify(42));
    expect(localStorage.getItem("app.data")).toBe(JSON.stringify({ key: "updated" }));
  });

  it("ConfigContext.Provider 없이 사용하면 에러가 발생한다", () => {
    function TestComponent() {
      useSyncConfig("key", "value");
      return <div />;
    }

    expect(() => render(() => <TestComponent />)).toThrow(
      "useConfig는 ConfigContext.Provider 내부에서만 사용할 수 있습니다",
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/hooks/useSyncConfig.spec.tsx --project=solid --run`
Expected: FAIL (module not found)

**Step 3: Write implementation**

```typescript
import { createSignal, type Accessor, type Setter } from "solid-js";
import { makePersisted, type AsyncStorage, type SyncStorage } from "@solid-primitives/storage";
import { jsonStringify, jsonParse } from "@simplysm/core-common";
import { useConfig } from "../providers/ConfigContext";

/**
 * 동기화 가능 설정 저장 훅
 *
 * @remarks
 * - ConfigContext.Provider 내부에서만 사용 가능
 * - 키는 자동으로 `{clientName}.{key}` 형태로 저장됨
 * - `syncStorage` 설정 시 해당 저장소 사용, 미설정 시 localStorage 폴백
 * - 비동기 저장소 사용 시 세 번째 반환값 `loading`으로 초기 로드 상태 확인 가능
 * - 테마, DataSheet 설정, 필터 프리셋 등 기기 간 동기화가 필요한 데이터에 사용
 *
 * @example
 * ```tsx
 * const [theme, setTheme, loading] = useSyncConfig("theme", "light");
 * ```
 *
 * @param key - 저장소 키 (clientName prefix가 자동 적용됨)
 * @param initialValue - 초기값 (저장된 값이 없을 때 사용)
 * @returns [getter, setter, loading] 튜플
 */
export function useSyncConfig<T>(key: string, initialValue: T): [Accessor<T>, Setter<T>, Accessor<boolean>] {
  const config = useConfig();
  const prefixedKey = `${config.clientName}.${key}`;
  const storage = config.syncStorage ?? localStorage;

  // eslint-disable-next-line solid/reactivity -- makePersisted는 signal 튜플을 직접 받도록 설계됨
  const [value, setValue, init] = makePersisted(createSignal<T>(initialValue), {
    name: prefixedKey,
    storage: storage as SyncStorage | AsyncStorage,
    serialize: (v) => jsonStringify(v),
    deserialize: (v) => jsonParse<T>(v),
  });

  // init이 Promise이면 비동기 저장소 → loading 추적
  const isAsync = init instanceof Promise;
  const [loading, setLoading] = createSignal(isAsync);

  if (isAsync) {
    void init.then(() => setLoading(false));
  }

  return [value, setValue, loading];
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/hooks/useSyncConfig.spec.tsx --project=solid --run`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/solid/src/hooks/useSyncConfig.ts packages/solid/tests/hooks/useSyncConfig.spec.tsx
git commit -m "feat(solid): add useSyncConfig hook with tests"
```

---

### Task 4: Create useLogger hook (TDD)

**Files:**
- Modify: `packages/solid/package.json` (add `consola` dependency)
- Create: `packages/solid/tests/hooks/useLogger.spec.tsx`
- Create: `packages/solid/src/hooks/useLogger.ts`

**Step 1: Add consola dependency**

Run: `pnpm -C packages/solid add consola`

**Step 2: Write the test file**

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ConfigContext } from "../../src/providers/ConfigContext";
import { useLogger } from "../../src/hooks/useLogger";

// consola mock
vi.mock("consola", () => {
  const consolaMock = {
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  };
  return { consola: consolaMock };
});

import { consola } from "consola";

describe("useLogger", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("기본적으로 consola로 출력한다", () => {
    let logger: ReturnType<typeof useLogger> | undefined;

    function TestComponent() {
      logger = useLogger();
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    logger!.write("log", "hello", "world");
    expect(consola.log).toHaveBeenCalledWith("hello", "world");

    logger!.write("warn", "warning message");
    expect(consola.warn).toHaveBeenCalledWith("warning message");

    logger!.write("error", "error message");
    expect(consola.error).toHaveBeenCalledWith("error message");
  });

  it("logger 설정 시 추가로 LogAdapter.write를 호출한다", () => {
    const mockLogAdapter = { write: vi.fn() };
    let logger: ReturnType<typeof useLogger> | undefined;

    function TestComponent() {
      logger = useLogger();
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app", logger: mockLogAdapter }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    logger!.write("error", "something failed");

    expect(consola.error).toHaveBeenCalledWith("something failed");
    expect(mockLogAdapter.write).toHaveBeenCalledWith("error", "something failed");
  });

  it("LogAdapter.write 에러 시 consola.error로 찍고 삼킨다", () => {
    const adapterError = new Error("adapter failed");
    const mockLogAdapter = {
      write: vi.fn(() => { throw adapterError; }),
    };
    let logger: ReturnType<typeof useLogger> | undefined;

    function TestComponent() {
      logger = useLogger();
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "app", logger: mockLogAdapter }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    // 에러가 throw 되지 않아야 함
    expect(() => logger!.write("log", "test")).not.toThrow();
    // adapter error가 consola.error로 출력됨
    expect(consola.error).toHaveBeenCalledWith(adapterError);
  });

  it("ConfigContext.Provider 없이 사용하면 에러가 발생한다", () => {
    function TestComponent() {
      useLogger();
      return <div />;
    }

    expect(() => render(() => <TestComponent />)).toThrow(
      "useConfig는 ConfigContext.Provider 내부에서만 사용할 수 있습니다",
    );
  });
});
```

**Step 3: Run test to verify it fails**

Run: `pnpm vitest packages/solid/tests/hooks/useLogger.spec.tsx --project=solid --run`
Expected: FAIL (module not found)

**Step 4: Write implementation**

```typescript
import { consola } from "consola";
import { useConfig } from "../providers/ConfigContext";

interface Logger {
  write(severity: "error" | "warn" | "log", ...data: any[]): void;
}

/**
 * 로깅 훅
 *
 * @remarks
 * - ConfigContext.Provider 내부에서만 사용 가능
 * - 항상 consola로 출력
 * - AppConfig.logger 설정 시 추가로 LogAdapter.write() 호출
 * - LogAdapter.write() 에러 시 consola.error로 출력하고 삼킴
 *
 * @example
 * ```tsx
 * const logger = useLogger();
 * logger.write("error", "something failed", errorObj);
 * logger.write("log", "user action", { userId: 123 });
 * ```
 */
export function useLogger(): Logger {
  const config = useConfig();

  return {
    write(severity: "error" | "warn" | "log", ...data: any[]) {
      consola[severity](...data);

      if (config.logger) {
        try {
          const result = config.logger.write(severity, ...data);
          if (result instanceof Promise) {
            void result.catch((err) => consola.error(err));
          }
        } catch (err) {
          consola.error(err);
        }
      }
    },
  };
}
```

**Step 5: Run test to verify it passes**

Run: `pnpm vitest packages/solid/tests/hooks/useLogger.spec.tsx --project=solid --run`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/solid/package.json packages/solid/src/hooks/useLogger.ts packages/solid/tests/hooks/useLogger.spec.tsx
git commit -m "feat(solid): add useLogger hook with tests"
```

---

### Task 5: Migrate callers and update exports

**Files:**
- Modify: `packages/solid/src/providers/ThemeContext.tsx`
- Modify: `packages/solid/src/components/data/sheet/DataSheet.tsx`
- Modify: `packages/solid/src/components/form-control/state-preset/StatePreset.tsx`
- Modify: `packages/solid/src/components/layout/sidebar/SidebarContainer.tsx`
- Modify: `packages/solid/src/index.ts`

**Step 1: Update ThemeContext.tsx**

Line 3 — change import:
```
- import { usePersisted } from "../hooks/usePersisted";
+ import { useSyncConfig } from "../hooks/useSyncConfig";
```

Line 67 — update remark:
```
- * - ConfigContext.Provider 내부에서 사용해야 함 (usePersisted 의존)
+ * - ConfigContext.Provider 내부에서 사용해야 함 (useSyncConfig 의존)
```

Line 81 — change call:
```
- const [mode, setMode] = usePersisted<ThemeMode>("theme", "system");
+ const [mode, setMode] = useSyncConfig<ThemeMode>("theme", "system");
```

**Step 2: Update DataSheet.tsx**

Line 30 — change import:
```
- import { usePersisted } from "../../../hooks/usePersisted";
+ import { useSyncConfig } from "../../../hooks/useSyncConfig";
```

Line 113 — update comment:
```
- // #region Config (usePersisted)
+ // #region Config (useSyncConfig)
```

Line 117 — change call:
```
- ? usePersisted<DataSheetConfig>(`sheet.${local.persistKey}`, { columnRecord: {} })
+ ? useSyncConfig<DataSheetConfig>(`sheet.${local.persistKey}`, { columnRecord: {} })
```

**Step 3: Update StatePreset.tsx**

Line 7 — change import:
```
- import { usePersisted } from "../../../hooks/usePersisted";
+ import { useSyncConfig } from "../../../hooks/useSyncConfig";
```

Line 113 — change call:
```
- const [presets, setPresets] = usePersisted<StatePresetItem<T>[]>(`state-preset.${local.presetKey}`, []);
+ const [presets, setPresets] = useSyncConfig<StatePresetItem<T>[]>(`state-preset.${local.presetKey}`, []);
```

**Step 4: Update SidebarContainer.tsx**

Line 7 — remove import:
```
- import { usePersisted } from "../../../hooks/usePersisted";
```

Add `createSignal` to existing solid-js import (line 1):
```
- import { type JSX, type ParentComponent, Show, splitProps, createMemo } from "solid-js";
+ import { type JSX, type ParentComponent, Show, splitProps, createMemo, createSignal } from "solid-js";
```

Line 35 — update remark:
```
- * - usePersisted로 toggle 상태 localStorage 저장 (키: sidebar.toggle)
+ * - toggle 상태는 메모리에만 유지 (페이지 새로고침 시 초기화)
```

Line 58 — change to createSignal:
```
- const [toggle, setToggle] = usePersisted("sidebar.toggle", false);
+ const [toggle, setToggle] = createSignal(false);
```

**Step 5: Update index.ts**

Line 92 — replace export:
```
- export * from "./hooks/usePersisted";
+ export * from "./hooks/useLocalConfig";
+ export * from "./hooks/useSyncConfig";
+ export * from "./hooks/useLogger";
```

Also add type export after the existing `StorageAdapter` exports. Find where `ConfigContext` is exported and ensure `LogAdapter` is available. Since `ConfigContext.ts` uses `export interface LogAdapter`, and `index.ts` already has `export * from "./providers/ConfigContext"`, `LogAdapter` will be automatically exported.

**Step 6: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: PASS

**Step 7: Commit**

```bash
git add packages/solid/src/providers/ThemeContext.tsx packages/solid/src/components/data/sheet/DataSheet.tsx packages/solid/src/components/form-control/state-preset/StatePreset.tsx packages/solid/src/components/layout/sidebar/SidebarContainer.tsx packages/solid/src/index.ts
git commit -m "refactor(solid): migrate usePersisted callers to useSyncConfig/createSignal"
```

---

### Task 6: Update Sidebar tests and delete usePersisted

**Files:**
- Modify: `packages/solid/tests/components/layout/sidebar/SidebarContainer.spec.tsx`
- Modify: `packages/solid/tests/components/layout/sidebar/Sidebar.spec.tsx`
- Delete: `packages/solid/src/hooks/usePersisted.ts`
- Delete: `packages/solid/tests/hooks/usePersisted.spec.tsx`

**Step 1: Update SidebarContainer.spec.tsx**

Remove the usePersisted mock (lines 18-24) and replace with createSignal mock since SidebarContainer now uses `createSignal` directly — the existing `mockToggle` variable still works, but we need to mock `solid-js`'s `createSignal` instead.

Actually, since `SidebarContainer` now uses `createSignal` directly (a SolidJS primitive), we no longer need the `usePersisted` mock at all. The `createSignal` works natively in tests. The tests already use `mockToggle` to control the toggle state.

Replace the mock block (lines 18-24):
```
- // usePersisted mock - 테스트에서 상태를 제어할 수 있도록
- let mockToggle: ReturnType<typeof createSignal<boolean>>;
- vi.mock("../../../../src/hooks/usePersisted", () => ({
-   usePersisted: () => {
-     return mockToggle;
-   },
- }));
```

But we still need to control the toggle state in tests. Since `SidebarContainer` now uses `createSignal(false)` internally, we need a different approach. We can mock the solid-js `createSignal` — but that's fragile. Better approach: test via the `SidebarContext` by interacting with the component directly (click backdrop, etc.) or accept that internal state can't be directly set.

However, the existing tests set `mockToggle` to control open/closed state. The simplest migration is to keep a mock, but now mock `solid-js`'s `createSignal` for the specific import. This is fragile.

**Better approach:** Replace the mock with a wrapper that provides the toggle via `SidebarContext`. But `SidebarContainer` creates its own context internally.

**Simplest approach:** Keep the `usePersisted` mock pattern but redirect it. Since `SidebarContainer` now imports `createSignal` from `solid-js` and uses it directly, and we can't easily mock that, we should restructure the tests to:

1. Use the default initial state (`toggle = false`)
2. Trigger state changes via user interaction (clicking toggle buttons, backdrop)

For tests that need `toggle = true` (e.g., desktop closed, mobile open), we need to trigger the toggle. Since `SidebarContext` exposes `setToggle`, and `Sidebar` component has a toggle button, we can interact with that.

However, this is a significant test rewrite. The **pragmatic** approach: extract the toggle state into a prop or keep a thin internal hook that can be mocked.

**Most pragmatic approach:** Create a small internal hook `useSidebarToggle` that wraps `createSignal(false)` so it remains mockable in tests, just like `usePersisted` was. This avoids a large test rewrite while still removing the persistence.

Actually, looking more carefully — the tests are already structured to work with any `[Accessor, Setter]` tuple. The mock just returns `mockToggle` which is a `createSignal` result. We can simply change the mock path:

Replace the `usePersisted` mock in both test files with a mock that patches `SidebarContainer` module's internal `createSignal` call. But this is not clean.

**Final approach:** The cleanest fix is to update the mock to target the actual module. Since `SidebarContainer` now uses `createSignal` from `solid-js` directly, and the tests need to control the initial toggle state, we can use `vi.hoisted` + partial module mock.

Actually the simplest: just refactor `SidebarContainer` to accept an optional `defaultOpen` prop, then tests set that. But that changes the component API.

**Decided approach:** Keep the original mock approach by making `SidebarContainer` use a tiny importable function. No — that over-engineers it.

**Actual simplest:** Mock `createSignal` at the module level only for the SidebarContainer file. Since the tests already use `vi.mock` patterns, we can mock `solid-js` partially:

In both sidebar test files, replace:
```typescript
// usePersisted mock - 테스트에서 상태를 제어할 수 있도록
let mockToggle: ReturnType<typeof createSignal<boolean>>;
vi.mock("../../../../src/hooks/usePersisted", () => ({
  usePersisted: () => {
    return mockToggle;
  },
}));
```

With:
```typescript
// SidebarContainer의 createSignal을 제어하기 위한 mock
let mockToggle: ReturnType<typeof createSignal<boolean>>;
const originalCreateSignal = await vi.importActual<typeof import("solid-js")>("solid-js").then((m) => m.createSignal);
vi.mock("solid-js", async () => {
  const actual = await vi.importActual<typeof import("solid-js")>("solid-js");
  return {
    ...actual,
    createSignal: (...args: any[]) => {
      // SidebarContainer의 toggle signal만 mock (초기값 false, boolean 타입)
      if (args[0] === false && mockToggle) {
        return mockToggle;
      }
      return actual.createSignal(...args);
    },
  };
});
```

This is too fragile. Let me think again...

**Final decision:** The simplest, cleanest approach is:
1. Add an optional `initialOpen` prop to `SidebarContainer` (defaults to `true` for desktop, `false` for mobile — matching current behavior where `toggle=false` means open on desktop).
2. Tests use this prop instead of mocking.

But this changes the component API and the user didn't ask for that.

**Actually the real simplest:** Just update the mock path. `SidebarContainer` still calls `createSignal(false)` — we mock the module-level export to intercept it. Since `SidebarContainer` is the module under test, we can use a factory pattern.

OK, I'll go with: extract a `createSidebarToggle` helper in SidebarContainer that returns `createSignal(false)`, mock that in tests. This is minimal and mockable.

No, that's over-engineering too. Let me just do it the way the tests were already set up — with a module mock. The `SidebarContainer` will import its `createSignal` from a local helper or we just update tests to interact with the component via user actions.

Let me re-examine what tests actually need the mock:

1. **SidebarContainer.spec.tsx:**
   - "padding-left" tests: need toggle=false (open) and toggle=true (closed)
   - "backdrop" tests: need toggle=true (mobile open) and toggle=false (mobile closed)
   - "backdrop click" tests: need toggle=true, then verify it becomes false

2. **Sidebar.spec.tsx:**
   - "열림/닫힘 상태" tests: need toggle=false and toggle=true
   - "aria 속성" tests: same

These all need direct control of the toggle state. User interaction (clicking a button) could work but requires `Sidebar` to have a toggle button rendered — and the test structure would change significantly.

I'll go with the pragmatic approach: the tests should be updated to not mock anymore. Instead, since SidebarContainer always starts with `toggle = false`, tests that need `toggle = true` should trigger it programmatically via `SidebarContext`.

Looking at the test — `SidebarContext` provides `{ toggle, setToggle }`. The tests can call `setToggle(true)` after render. But they don't have access to the context from outside.

A simple approach: create a small helper component in tests:

```tsx
let testSetToggle: Setter<boolean>;

function ToggleCapture() {
  const ctx = useSidebarContext();
  testSetToggle = ctx.setToggle;
  return null;
}

// In test:
render(() => (
  <Sidebar.Container>
    <ToggleCapture />
    <div>Content</div>
  </Sidebar.Container>
));
testSetToggle(true); // now toggle is true
```

This is clean and doesn't require mocking. Let me use this approach.

**Step 1: Update SidebarContainer.spec.tsx**

Replace the full file:

```tsx
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Setter } from "solid-js";

// 미디어 쿼리 mock
const mockCreateMediaQuery = vi.fn(() => () => true as boolean);
vi.mock("@solid-primitives/media", () => ({
  createMediaQuery: () => mockCreateMediaQuery(),
}));

// @solidjs/router mock
vi.mock("@solidjs/router", () => ({
  useBeforeLeave: vi.fn(),
  useLocation: vi.fn(() => ({ pathname: "/" })),
  useNavigate: vi.fn(() => vi.fn()),
}));

import { Sidebar, useSidebarContext } from "../../../../src";

// SidebarContext에 접근하여 toggle 상태를 제어하는 헬퍼
let testSetToggle: Setter<boolean>;
function ToggleCapture() {
  const ctx = useSidebarContext();
  testSetToggle = ctx.setToggle;
  return null;
}

describe("SidebarContainer 컴포넌트", () => {
  beforeEach(() => {
    mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑 모드
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("기본 렌더링", () => {
    it("children이 컨테이너 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <Sidebar.Container>
          <span>콘텐츠</span>
        </Sidebar.Container>
      ));

      expect(getByText("콘텐츠")).toBeTruthy();
    });
  });

  describe("padding-left 처리", () => {
    it("데스크탑에서 열림 상태일 때 padding-left 적용", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture />
          <div>Content</div>
        </Sidebar.Container>
      ));
      // toggle=false → 데스크탑에서 열림 (기본값)

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.paddingLeft).toBe("16rem");
    });

    it("데스크탑에서 닫힘 상태일 때 padding-left 없음", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture />
          <div>Content</div>
        </Sidebar.Container>
      ));
      testSetToggle(true); // toggle=true → 데스크탑에서 닫힘

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.paddingLeft).toBe("");
    });

    it("모바일에서는 padding-left 없음", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.paddingLeft).toBe("");
    });
  });

  describe("backdrop 렌더링", () => {
    it("모바일에서 열림 상태일 때 backdrop이 렌더링된다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture />
          <div>Content</div>
        </Sidebar.Container>
      ));
      testSetToggle(true); // toggle=true → 모바일에서 열림

      const backdrop = container.querySelector('[role="button"][aria-label="사이드바 닫기"]');
      expect(backdrop).toBeTruthy();
    });

    it("모바일에서 닫힘 상태일 때 backdrop이 렌더링되지 않는다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));
      // toggle=false → 모바일에서 닫힘 (기본값)

      const backdrop = container.querySelector('[role="button"][aria-label="사이드바 닫기"]');
      expect(backdrop).toBeFalsy();
    });

    it("데스크탑에서는 backdrop이 렌더링되지 않는다", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑

      const { container } = render(() => (
        <Sidebar.Container>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const backdrop = container.querySelector('[role="button"][aria-label="사이드바 닫기"]');
      expect(backdrop).toBeFalsy();
    });
  });

  describe("backdrop 클릭 이벤트", () => {
    it("backdrop 클릭 시 사이드바가 닫힌다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture />
          <Sidebar>Sidebar Content</Sidebar>
          <div>Content</div>
        </Sidebar.Container>
      ));
      testSetToggle(true); // 열림 상태

      const backdrop = container.querySelector('[role="button"][aria-label="사이드바 닫기"]') as HTMLElement;
      expect(backdrop).toBeTruthy();

      fireEvent.click(backdrop);

      // backdrop이 사라짐 (toggle=false)
      const backdropAfter = container.querySelector('[role="button"][aria-label="사이드바 닫기"]');
      expect(backdropAfter).toBeFalsy();
    });

    it("backdrop에서 Escape 키 누르면 사이드바가 닫힌다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture />
          <Sidebar>Sidebar Content</Sidebar>
          <div>Content</div>
        </Sidebar.Container>
      ));
      testSetToggle(true); // 열림 상태

      const backdrop = container.querySelector('[role="button"][aria-label="사이드바 닫기"]') as HTMLElement;
      expect(backdrop).toBeTruthy();

      fireEvent.keyDown(backdrop, { key: "Escape" });

      const backdropAfter = container.querySelector('[role="button"][aria-label="사이드바 닫기"]');
      expect(backdropAfter).toBeFalsy();
    });
  });

  describe("스타일 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      const { container } = render(() => (
        // eslint-disable-next-line tailwindcss/no-custom-classname
        <Sidebar.Container class="my-custom-class">
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.classList.contains("my-custom-class")).toBe(true);
    });

    it("사용자 정의 style이 병합된다", () => {
      const { container } = render(() => (
        <Sidebar.Container style={{ "background-color": "red" }}>
          <div>Content</div>
        </Sidebar.Container>
      ));

      const containerEl = container.firstElementChild as HTMLElement;
      expect(containerEl.style.backgroundColor).toBe("red");
    });
  });
});
```

**Step 2: Update Sidebar.spec.tsx**

Same pattern — replace `usePersisted` mock with `ToggleCapture` helper. Replace the full file:

```tsx
import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Setter } from "solid-js";

// 미디어 쿼리 mock
const mockCreateMediaQuery = vi.fn(() => () => true as boolean);
vi.mock("@solid-primitives/media", () => ({
  createMediaQuery: () => mockCreateMediaQuery(),
}));

// @solidjs/router mock
vi.mock("@solidjs/router", () => ({
  useBeforeLeave: vi.fn(),
  useLocation: vi.fn(() => ({ pathname: "/" })),
  useNavigate: vi.fn(() => vi.fn()),
}));

import { Sidebar, useSidebarContext } from "../../../../src";

// SidebarContext에 접근하여 toggle 상태를 제어하는 헬퍼
let testSetToggle: Setter<boolean>;
function ToggleCapture() {
  const ctx = useSidebarContext();
  testSetToggle = ctx.setToggle;
  return null;
}

describe("Sidebar 컴포넌트", () => {
  beforeEach(() => {
    mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑 모드
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("기본 렌더링", () => {
    it("children이 사이드바 내부에 표시된다", () => {
      const { getByText } = render(() => (
        <Sidebar.Container>
          <Sidebar>
            <span>사이드바 콘텐츠</span>
          </Sidebar>
        </Sidebar.Container>
      ));

      expect(getByText("사이드바 콘텐츠")).toBeTruthy();
    });

    it("aside 요소로 렌더링된다", () => {
      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      expect(container.querySelector("aside")).toBeTruthy();
    });
  });

  describe("열림/닫힘 상태", () => {
    it("데스크탑에서 toggle=false일 때 열림 상태 (translateX(0))", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));
      // toggle=false (기본값) → 데스크탑에서 열림

      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(0px)");
    });

    it("데스크탑에서 toggle=true일 때 닫힘 상태 (translateX(-100%))", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture />
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));
      testSetToggle(true);

      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(-100%)");
    });

    it("모바일에서 toggle=false일 때 닫힘 상태 (translateX(-100%))", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));
      // toggle=false (기본값) → 모바일에서 닫힘

      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(-100%)");
    });

    it("모바일에서 toggle=true일 때 열림 상태 (translateX(0))", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일

      const { container } = render(() => (
        <Sidebar.Container>
          <ToggleCapture />
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));
      testSetToggle(true);

      const sidebar = container.querySelector("aside") as HTMLElement;
      expect(sidebar.style.transform).toBe("translateX(0px)");
    });
  });

  describe("aria 속성", () => {
    it("열림 상태일 때 aria-hidden=false", () => {
      mockCreateMediaQuery.mockReturnValue(() => true); // 데스크탑, 열림

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      const sidebar = container.querySelector("aside");
      expect(sidebar?.getAttribute("aria-hidden")).toBe("false");
    });

    it("닫힘 상태일 때 aria-hidden=true", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일, 닫힘

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      const sidebar = container.querySelector("aside");
      expect(sidebar?.getAttribute("aria-hidden")).toBe("true");
    });

    it("닫힘 상태일 때 inert 속성이 설정된다", () => {
      mockCreateMediaQuery.mockReturnValue(() => false); // 모바일, 닫힘

      const { container } = render(() => (
        <Sidebar.Container>
          <Sidebar>Content</Sidebar>
        </Sidebar.Container>
      ));

      const sidebar = container.querySelector("aside");
      expect(sidebar?.hasAttribute("inert")).toBe(true);
    });
  });

  describe("스타일 병합", () => {
    it("사용자 정의 class가 병합된다", () => {
      const { container } = render(() => (
        <Sidebar.Container>
          {/* eslint-disable-next-line tailwindcss/no-custom-classname */}
          <Sidebar class="my-custom-class">Content</Sidebar>
        </Sidebar.Container>
      ));

      const sidebar = container.querySelector("aside");
      expect(sidebar?.classList.contains("my-custom-class")).toBe(true);
    });
  });

  describe("Context 사용", () => {
    it("SidebarContainer 외부에서 useSidebarContext 사용 시 에러 발생", () => {
      const TestComponent = () => {
        useSidebarContext();
        return <div>Test</div>;
      };

      expect(() => render(() => <TestComponent />)).toThrow(
        "useSidebarContext는 SidebarContainer 내부에서만 사용할 수 있습니다",
      );
    });
  });
});
```

**Step 3: Delete old files**

```bash
rm packages/solid/src/hooks/usePersisted.ts
rm packages/solid/tests/hooks/usePersisted.spec.tsx
```

**Step 4: Run all solid tests**

Run: `pnpm vitest --project=solid --run`
Expected: PASS

**Step 5: Run typecheck and lint**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: PASS

**Step 6: Commit**

```bash
git add -A packages/solid/
git commit -m "refactor(solid): remove usePersisted, update sidebar tests to use ToggleCapture"
```

---

### Task 7: Final verification

**Step 1: Run full test suite**

Run: `pnpm vitest --project=solid --run`
Expected: All tests PASS

**Step 2: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Run lint**

Run: `pnpm lint packages/solid`
Expected: PASS
