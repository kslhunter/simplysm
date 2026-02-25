# Provider Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Decompose `InitializeProvider` into independent, composable providers to resolve the circular dependency between `ConfigContext(syncStorage)` and `ServiceClientProvider`.

**Architecture:** Split `AppConfig` so `ConfigContext` only holds `clientName`. Create new `SyncStorageContext` and `LoggerContext` with default `undefined` (optional providers that fallback gracefully). Convert `GlobalErrorLogger`, `PwaUpdater`, `useClipboardValueCopy` into standalone Provider components.

**Tech Stack:** SolidJS, TypeScript, Vitest, @solidjs/testing-library

**Working directory:** `/home/kslhunter/projects/simplysm/.worktrees/provider-split/`

---

### Task 1: Create SyncStorageContext

**Files:**
- Create: `packages/solid/src/providers/SyncStorageContext.ts`
- Test: `packages/solid/tests/providers/SyncStorageContext.spec.tsx`

**Step 1: Write the test**

```typescript
// packages/solid/tests/providers/SyncStorageContext.spec.tsx
import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import {
  SyncStorageContext,
  SyncStorageProvider,
  useSyncStorage,
  type StorageAdapter,
} from "../../src/providers/SyncStorageContext";
import { useContext } from "solid-js";

describe("SyncStorageContext", () => {
  afterEach(() => {
    cleanup();
  });

  it("Provider 없이 useContext하면 undefined를 반환한다", () => {
    createRoot((dispose) => {
      const value = useContext(SyncStorageContext);
      expect(value).toBeUndefined();
      dispose();
    });
  });

  it("SyncStorageProvider가 StorageAdapter를 정상 제공한다", () => {
    const mockStorage: StorageAdapter = {
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn().mockResolvedValue(undefined),
    };

    let received: StorageAdapter | undefined;

    function TestComponent() {
      received = useSyncStorage();
      return <div />;
    }

    render(() => (
      <SyncStorageProvider storage={mockStorage}>
        <TestComponent />
      </SyncStorageProvider>
    ));

    expect(received).toBe(mockStorage);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/SyncStorageContext.spec.tsx --project=solid --run`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/solid/src/providers/SyncStorageContext.ts
import { createContext, useContext, type ParentComponent } from "solid-js";

/**
 * 커스텀 동기화 저장소 어댑터 인터페이스
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
 * 동기화 저장소 Context
 *
 * @remarks
 * Provider가 없으면 `undefined` (useSyncConfig에서 localStorage로 fallback)
 */
export const SyncStorageContext = createContext<StorageAdapter | undefined>(undefined);

/**
 * 동기화 저장소 Context에 접근하는 훅
 *
 * @returns StorageAdapter 또는 undefined (Provider가 없으면)
 */
export function useSyncStorage(): StorageAdapter | undefined {
  return useContext(SyncStorageContext);
}

/**
 * 동기화 저장소 Provider
 *
 * @example
 * ```tsx
 * <SyncStorageProvider storage={myStorageAdapter}>
 *   <ThemeProvider>
 *     <App />
 *   </ThemeProvider>
 * </SyncStorageProvider>
 * ```
 */
export const SyncStorageProvider: ParentComponent<{ storage: StorageAdapter }> = (props) => {
  return (
    // eslint-disable-next-line solid/reactivity -- storage는 초기 설정값으로 변경되지 않음
    <SyncStorageContext.Provider value={props.storage}>
      {props.children}
    </SyncStorageContext.Provider>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/SyncStorageContext.spec.tsx --project=solid --run`
Expected: PASS

---

### Task 2: Create LoggerContext

**Files:**
- Create: `packages/solid/src/providers/LoggerContext.ts`
- Test: `packages/solid/tests/providers/LoggerContext.spec.tsx`

**Step 1: Write the test**

```typescript
// packages/solid/tests/providers/LoggerContext.spec.tsx
import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import {
  LoggerContext,
  LoggerProvider,
  useLogAdapter,
  type LogAdapter,
} from "../../src/providers/LoggerContext";
import { useContext } from "solid-js";

describe("LoggerContext", () => {
  afterEach(() => {
    cleanup();
  });

  it("Provider 없이 useContext하면 undefined를 반환한다", () => {
    createRoot((dispose) => {
      const value = useContext(LoggerContext);
      expect(value).toBeUndefined();
      dispose();
    });
  });

  it("LoggerProvider가 LogAdapter를 정상 제공한다", () => {
    const mockAdapter: LogAdapter = {
      write: vi.fn(),
    };

    let received: LogAdapter | undefined;

    function TestComponent() {
      received = useLogAdapter();
      return <div />;
    }

    render(() => (
      <LoggerProvider adapter={mockAdapter}>
        <TestComponent />
      </LoggerProvider>
    ));

    expect(received).toBe(mockAdapter);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/LoggerContext.spec.tsx --project=solid --run`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// packages/solid/src/providers/LoggerContext.ts
import { createContext, useContext, type ParentComponent } from "solid-js";

/**
 * 로그 어댑터 인터페이스
 *
 * @remarks
 * - `useLogger`에서 사용하는 로그 전송 어댑터 (DB, 서버 등)
 * - adapter가 설정되면 consola 대신 adapter만 사용됨
 */
export interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}

/**
 * 로그 어댑터 Context
 *
 * @remarks
 * Provider가 없으면 `undefined` (useLogger에서 consola로 fallback)
 */
export const LoggerContext = createContext<LogAdapter | undefined>(undefined);

/**
 * 로그 어댑터 Context에 접근하는 훅
 *
 * @returns LogAdapter 또는 undefined (Provider가 없으면)
 */
export function useLogAdapter(): LogAdapter | undefined {
  return useContext(LoggerContext);
}

/**
 * 로그 어댑터 Provider
 *
 * @example
 * ```tsx
 * <LoggerProvider adapter={myLogAdapter}>
 *   <App />
 * </LoggerProvider>
 * ```
 */
export const LoggerProvider: ParentComponent<{ adapter: LogAdapter }> = (props) => {
  return (
    // eslint-disable-next-line solid/reactivity -- adapter는 초기 설정값으로 변경되지 않음
    <LoggerContext.Provider value={props.adapter}>
      {props.children}
    </LoggerContext.Provider>
  );
};
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/LoggerContext.spec.tsx --project=solid --run`
Expected: PASS

---

### Task 3: Create ClipboardProvider

**Files:**
- Create: `packages/solid/src/providers/ClipboardProvider.tsx`
- Move from: `packages/solid/src/hooks/useClipboardValueCopy.ts`
- Test: `packages/solid/tests/providers/ClipboardProvider.spec.tsx`

**Step 1: Write the test**

```typescript
// packages/solid/tests/providers/ClipboardProvider.spec.tsx
import { describe, it, expect } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import { ClipboardProvider } from "../../src/providers/ClipboardProvider";

describe("ClipboardProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("children을 정상적으로 렌더링한다", () => {
    const { getByText } = render(() => (
      <ClipboardProvider>
        <div>child content</div>
      </ClipboardProvider>
    ));

    expect(getByText("child content")).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/ClipboardProvider.spec.tsx --project=solid --run`
Expected: FAIL — module not found

**Step 3: Write implementation**

Create `packages/solid/src/providers/ClipboardProvider.tsx` by moving logic from `useClipboardValueCopy.ts`:

```tsx
// packages/solid/src/providers/ClipboardProvider.tsx
import { onCleanup, onMount, type ParentComponent } from "solid-js";

/**
 * 폼 컨트롤의 value를 클립보드 복사에 포함시키는 Provider
 *
 * @remarks
 * 브라우저 기본 동작에서는 드래그 선택 후 복사 시 `<input>`, `<textarea>`, `<select>`의
 * 값이 포함되지 않는 문제를 해결한다.
 *
 * - `<input type="text|number|...">` → `.value`
 * - `<textarea>` → `.value`
 * - `<select>` → 선택된 옵션 텍스트
 * - `<input type="checkbox|radio">` → `.checked` ? "Y" : ""
 * - 테이블 내에서는 셀 간 탭(`\t`), 행 간 개행(`\n`) 구분 (Excel 호환)
 */
export const ClipboardProvider: ParentComponent = (props) => {
  onMount(() => {
    const handler = (e: ClipboardEvent) => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      const text = extractTextFromRange(range);
      if (text == null) return;

      e.clipboardData!.setData("text/plain", text);
      e.preventDefault();
    };

    document.addEventListener("copy", handler);
    onCleanup(() => document.removeEventListener("copy", handler));
  });

  return <>{props.children}</>;
};

/**
 * Selection Range 내의 텍스트를 추출한다.
 * 폼 컨트롤은 value로 치환하고, 테이블 구조는 TSV 형식으로 변환한다.
 *
 * @returns 추출된 텍스트. 폼 컨트롤이 없으면 `null` (브라우저 기본 동작 유지)
 */
function extractTextFromRange(range: Range): string | null {
  const root =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (!root) return null;

  const formSelector =
    'input:not([type=hidden]), textarea, select, [role="checkbox"], [role="radio"]';
  const hasFormElements = [...root.querySelectorAll(formSelector)].some((el) =>
    range.intersectsNode(el),
  );
  if (!hasFormElements) return null;

  const parts: string[] = [];

  const walk = (node: Node) => {
    if (!range.intersectsNode(node)) return;

    if (node instanceof Element) {
      const role = node.getAttribute("role");
      if (role === "checkbox" || role === "radio") {
        parts.push(node.getAttribute("aria-checked") === "true" ? "Y" : "");
        return;
      }
    }

    if (node instanceof HTMLInputElement) {
      if (node.type === "hidden") return;
      if (node.type === "checkbox" || node.type === "radio") {
        parts.push(node.checked ? "Y" : "");
      } else {
        parts.push(formatInputValue(node));
      }
      return;
    }
    if (node instanceof HTMLTextAreaElement) {
      const v = node.value;
      parts.push(v.includes("\n") ? `"${v.replace(/"/g, '""')}"` : v);
      return;
    }
    if (node instanceof HTMLSelectElement) {
      if (node.selectedOptions.length > 0) {
        parts.push(node.selectedOptions[0].textContent.trim());
      }
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent) {
        const style = getComputedStyle(parent);
        if (style.visibility === "hidden" || style.display === "none") {
          return;
        }
      }

      let text = node.textContent ?? "";
      if (node === range.startContainer && node === range.endContainer) {
        text = text.slice(range.startOffset, range.endOffset);
      } else if (node === range.startContainer) {
        text = text.slice(range.startOffset);
      } else if (node === range.endContainer) {
        text = text.slice(0, range.endOffset);
      }
      parts.push(text);
      return;
    }

    if (!(node instanceof Element)) {
      for (const child of node.childNodes) walk(child);
      return;
    }

    if (node.tagName === "BR") {
      parts.push("\n");
      return;
    }

    if (node.tagName === "TR") {
      let firstCell = true;
      for (const child of node.childNodes) {
        if (!range.intersectsNode(child)) continue;
        if (child instanceof HTMLTableCellElement) {
          if (!firstCell) parts.push("\t");
          firstCell = false;
        }
        walk(child);
      }
      parts.push("\n");
      return;
    }

    for (const child of node.childNodes) {
      walk(child);
    }
  };

  walk(range.commonAncestorContainer);

  return parts.join("").replace(/\n+$/, "");
}

function formatInputValue(input: HTMLInputElement): string {
  const { type, value } = input;
  if (!value) return "";

  if (type === "date" || type === "datetime-local") {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return type === "date" ? date.toLocaleDateString() : date.toLocaleString();
    }
  }

  if (type === "time") {
    const date = new Date(`1970-01-01T${value}`);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString();
    }
  }

  return value;
}
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/ClipboardProvider.spec.tsx --project=solid --run`
Expected: PASS

---

### Task 4: Modify ConfigContext — shrink AppConfig, add ConfigProvider

**Files:**
- Modify: `packages/solid/src/providers/ConfigContext.ts`
- Modify: `packages/solid/tests/providers/ConfigContext.spec.ts` → rename to `.spec.tsx`

**Step 1: Update the test**

Rename `ConfigContext.spec.ts` → `ConfigContext.spec.tsx` and rewrite:

```typescript
// packages/solid/tests/providers/ConfigContext.spec.tsx
import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import { useConfig, ConfigProvider } from "../../src/providers/ConfigContext";

describe("ConfigContext", () => {
  afterEach(() => {
    cleanup();
  });

  describe("useConfig", () => {
    it("Provider 없이 사용하면 에러가 발생한다", () => {
      createRoot((dispose) => {
        expect(() => useConfig()).toThrow(
          "useConfig는 ConfigProvider 내부에서만 사용할 수 있습니다",
        );
        dispose();
      });
    });
  });

  describe("ConfigProvider", () => {
    it("clientName을 올바르게 제공한다", () => {
      let receivedClientName: string | undefined;

      function TestComponent() {
        const config = useConfig();
        receivedClientName = config.clientName;
        return <div />;
      }

      render(() => (
        <ConfigProvider clientName="myApp">
          <TestComponent />
        </ConfigProvider>
      ));

      expect(receivedClientName).toBe("myApp");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/ConfigContext.spec.tsx --project=solid --run`
Expected: FAIL — `ConfigProvider` not exported

**Step 3: Modify ConfigContext.ts**

Replace the entire file:

```typescript
// packages/solid/src/providers/ConfigContext.ts
import { createContext, useContext, type ParentComponent } from "solid-js";

/**
 * 앱 전역 설정
 */
export interface AppConfig {
  /**
   * 클라이언트 식별자 (저장소 key prefix로 사용)
   */
  clientName: string;
}

/**
 * 앱 전역 설정 Context
 */
export const ConfigContext = createContext<AppConfig>();

/**
 * 앱 전역 설정에 접근하는 훅
 *
 * @throws ConfigProvider가 없으면 에러 발생
 */
export function useConfig(): AppConfig {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfig는 ConfigProvider 내부에서만 사용할 수 있습니다");
  }
  return context;
}

/**
 * 앱 전역 설정 Provider
 *
 * @example
 * ```tsx
 * <ConfigProvider clientName="myApp">
 *   <App />
 * </ConfigProvider>
 * ```
 */
export const ConfigProvider: ParentComponent<{ clientName: string }> = (props) => {
  return (
    // eslint-disable-next-line solid/reactivity -- clientName은 초기 설정값으로 변경되지 않음
    <ConfigContext.Provider value={{ clientName: props.clientName }}>
      {props.children}
    </ConfigContext.Provider>
  );
};
```

Also delete old test file: `packages/solid/tests/providers/ConfigContext.spec.ts`

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/ConfigContext.spec.tsx --project=solid --run`
Expected: PASS

---

### Task 5: Modify useSyncConfig — use SyncStorageContext instead of config.syncStorage

**Files:**
- Modify: `packages/solid/src/hooks/useSyncConfig.ts`
- Modify: `packages/solid/tests/hooks/useSyncConfig.spec.tsx`

**Step 1: Update the test**

Replace all `ConfigContext.Provider value={{ clientName: "testApp", syncStorage: ... }}` wrappers with `ConfigProvider` + `SyncStorageProvider`:

```typescript
// packages/solid/tests/hooks/useSyncConfig.spec.tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { useSyncConfig } from "../../src/hooks/useSyncConfig";
import { ConfigProvider } from "../../src/providers/ConfigContext";
import { SyncStorageProvider } from "../../src/providers/SyncStorageContext";

describe("useSyncConfig", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("should initialize with default value when no stored value exists", () => {
    let value: () => string;

    function TestComponent() {
      [value] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <TestComponent />
      </ConfigProvider>
    ));

    expect(value()).toBe("default");
  });

  it("should load value from localStorage when no SyncStorageProvider", () => {
    localStorage.setItem("testApp.test-key", JSON.stringify("stored"));

    let value: () => string;

    function TestComponent() {
      [value] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <TestComponent />
      </ConfigProvider>
    ));

    expect(value()).toBe("stored");
  });

  it("should save value to localStorage when updated", () => {
    let setValue: (v: string) => void;

    function TestComponent() {
      const [, setVal] = useSyncConfig("test-key", "default");
      setValue = setVal;
      return <div />;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <TestComponent />
      </ConfigProvider>
    ));

    setValue("new-value");
    expect(localStorage.getItem("testApp.test-key")).toBe(JSON.stringify("new-value"));
  });

  it("should return ready=true when using localStorage (sync initialization)", () => {
    let ready: () => boolean;

    function TestComponent() {
      [, , ready] = useSyncConfig("test-key", "default");
      return <div />;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <TestComponent />
      </ConfigProvider>
    ));

    expect(ready()).toBe(true);
  });

  it("should use syncStorage when SyncStorageProvider is present", async () => {
    const mockSyncStorage = {
      getItem: vi.fn().mockResolvedValue(JSON.stringify("synced-value")),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn(),
    };

    let value: () => string;
    let setValue: (v: string) => void;
    let ready: () => boolean;

    function TestComponent() {
      [value, setValue, ready] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <SyncStorageProvider storage={mockSyncStorage}>
          <TestComponent />
        </SyncStorageProvider>
      </ConfigProvider>
    ));

    await vi.waitFor(() => {
      expect(ready()).toBe(true);
    });

    expect(value()).toBe("synced-value");
    expect(mockSyncStorage.getItem).toHaveBeenCalledWith("testApp.test-key");

    setValue("new-synced");
    expect(value()).toBe("new-synced");
    await vi.waitFor(() => {
      expect(mockSyncStorage.setItem).toHaveBeenCalledWith(
        "testApp.test-key",
        JSON.stringify("new-synced"),
      );
    });
  });

  it("should handle syncStorage.getItem returning null", async () => {
    const mockSyncStorage = {
      getItem: vi.fn().mockResolvedValue(null),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn(),
    };

    let value: () => string;
    let ready: () => boolean;

    function TestComponent() {
      [value, , ready] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <SyncStorageProvider storage={mockSyncStorage}>
          <TestComponent />
        </SyncStorageProvider>
      </ConfigProvider>
    ));

    await vi.waitFor(() => {
      expect(ready()).toBe(true);
    });

    expect(value()).toBe("default");
  });

  it("should handle syncStorage errors gracefully and fall back to localStorage", async () => {
    const mockSyncStorage = {
      getItem: vi.fn().mockRejectedValue(new Error("Network error")),
      setItem: vi.fn().mockRejectedValue(new Error("Network error")),
      removeItem: vi.fn(),
    };

    localStorage.setItem("testApp.test-key", JSON.stringify("local-fallback"));

    let value: () => string;
    let setValue: (v: string) => void;
    let ready: () => boolean;

    function TestComponent() {
      [value, setValue, ready] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <SyncStorageProvider storage={mockSyncStorage}>
          <TestComponent />
        </SyncStorageProvider>
      </ConfigProvider>
    ));

    await vi.waitFor(() => {
      expect(ready()).toBe(true);
    });

    expect(value()).toBe("local-fallback");

    setValue("new-local");
    expect(value()).toBe("new-local");
    await vi.waitFor(() => {
      expect(localStorage.getItem("testApp.test-key")).toBe(JSON.stringify("new-local"));
    });
  });

  it("should handle non-JSON values in storage", () => {
    localStorage.setItem("testApp.test-key", "not-json");

    let value: () => string;

    function TestComponent() {
      [value] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <TestComponent />
      </ConfigProvider>
    ));

    expect(value()).toBe("default");
  });

  it("should support complex objects", () => {
    const defaultObj = { theme: "light", fontSize: 14 };

    let value: () => { theme: string; fontSize: number };
    let setValue: (v: { theme: string; fontSize: number }) => void;

    function TestComponent() {
      [value, setValue] = useSyncConfig("test-key", defaultObj);
      return <div />;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <TestComponent />
      </ConfigProvider>
    ));

    expect(value()).toEqual(defaultObj);

    const newObj = { theme: "dark", fontSize: 16 };
    setValue(newObj);

    expect(value()).toEqual(newObj);
    expect(JSON.parse(localStorage.getItem("testApp.test-key")!)).toEqual(newObj);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/hooks/useSyncConfig.spec.tsx --project=solid --run`
Expected: FAIL — useSyncConfig still reads config.syncStorage which no longer exists

**Step 3: Modify useSyncConfig.ts**

```typescript
// packages/solid/src/hooks/useSyncConfig.ts
import { type Accessor, type Setter, createEffect, createSignal } from "solid-js";
import { useConfig } from "../providers/ConfigContext";
import { useSyncStorage } from "../providers/SyncStorageContext";

/**
 * Creates a reactive signal that syncs configuration data to storage.
 *
 * Uses `SyncStorageProvider` storage if available, otherwise falls back to `localStorage`.
 * Designed for data that should persist and sync across devices (e.g., theme, user preferences, DataSheet configs).
 *
 * @param key - Storage key for the config value
 * @param defaultValue - Default value if no stored value exists
 * @returns Tuple of [value accessor, value setter, ready state accessor]
 *
 * @example
 * ```tsx
 * const [theme, setTheme, ready] = useSyncConfig("user-theme", "light");
 *
 * <Show when={ready()}>
 *   <button onClick={() => setTheme(theme() === "light" ? "dark" : "light")}>
 *     Toggle theme
 *   </button>
 * </Show>
 * ```
 */
export function useSyncConfig<TValue>(
  key: string,
  defaultValue: TValue,
): [Accessor<TValue>, Setter<TValue>, Accessor<boolean>] {
  const config = useConfig();
  const syncStorage = useSyncStorage();
  const prefixedKey = `${config.clientName}.${key}`;
  const [value, setValue] = createSignal<TValue>(defaultValue);
  const [ready, setReady] = createSignal(false);

  // Initialize from storage
  const initializeFromStorage = async () => {
    if (!syncStorage) {
      // Use localStorage synchronously
      try {
        const stored = localStorage.getItem(prefixedKey);
        if (stored !== null) {
          setValue(() => JSON.parse(stored) as TValue);
        }
      } catch {
        // Ignore parse errors, keep default value
      }
      setReady(true);
      return;
    }

    // Use syncStorage asynchronously
    try {
      const stored = await syncStorage.getItem(prefixedKey);
      if (stored !== null) {
        setValue(() => JSON.parse(stored) as TValue);
      }
    } catch {
      // Fall back to localStorage on error
      try {
        const stored = localStorage.getItem(prefixedKey);
        if (stored !== null) {
          setValue(() => JSON.parse(stored) as TValue);
        }
      } catch {
        // Ignore parse errors
      }
    } finally {
      setReady(true);
    }
  };

  // Initialize on mount
  void initializeFromStorage();

  // Save to storage whenever value changes
  createEffect(() => {
    if (!ready()) return; // Don't save until storage has been read
    const currentValue = value();
    const serialized = JSON.stringify(currentValue);

    if (!syncStorage) {
      // Use localStorage synchronously
      localStorage.setItem(prefixedKey, serialized);
      return;
    }

    // Use syncStorage asynchronously
    void (async () => {
      try {
        await syncStorage.setItem(prefixedKey, serialized);
      } catch {
        // Fall back to localStorage on error
        localStorage.setItem(prefixedKey, serialized);
      }
    })();
  });

  return [value, setValue, ready];
}
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/hooks/useSyncConfig.spec.tsx --project=solid --run`
Expected: PASS

---

### Task 6: Modify useLogger — use LoggerContext instead of config.logger

**Files:**
- Modify: `packages/solid/src/hooks/useLogger.ts`
- Modify: `packages/solid/tests/hooks/useLogger.spec.tsx`

**Step 1: Update the test**

Replace `ConfigContext.Provider` wrapper with `LoggerProvider`:

```typescript
// packages/solid/tests/hooks/useLogger.spec.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook } from "@solidjs/testing-library";
import { useLogger } from "../../src/hooks/useLogger";
import { LoggerProvider, type LogAdapter } from "../../src/providers/LoggerContext";
import { consola } from "consola";

function loggerWrapper(adapter?: LogAdapter) {
  if (!adapter) {
    return (props: { children: any }) => <>{props.children}</>;
  }
  return (props: { children: any }) => (
    <LoggerProvider adapter={adapter}>{props.children}</LoggerProvider>
  );
}

describe("useLogger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("should return a logger object with log, info, warn, error methods", () => {
    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });
    expect(typeof result.log).toBe("function");
    expect(typeof result.info).toBe("function");
    expect(typeof result.warn).toBe("function");
    expect(typeof result.error).toBe("function");
  });

  it("should call consola when no LoggerProvider is present", () => {
    const consolaSpy = {
      log: vi.spyOn(consola, "log").mockImplementation(() => {}),
      info: vi.spyOn(consola, "info").mockImplementation(() => {}),
      warn: vi.spyOn(consola, "warn").mockImplementation(() => {}),
      error: vi.spyOn(consola, "error").mockImplementation(() => {}),
    };

    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper() });

    result.log("log message");
    result.info("info message");
    result.warn("warn message");
    result.error("error message");

    expect(consolaSpy.log).toHaveBeenCalledWith("log message");
    expect(consolaSpy.info).toHaveBeenCalledWith("info message");
    expect(consolaSpy.warn).toHaveBeenCalledWith("warn message");
    expect(consolaSpy.error).toHaveBeenCalledWith("error message");
  });

  it("should call adapter only when LoggerProvider is present (no consola)", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };
    const consolaSpy = vi.spyOn(consola, "info").mockImplementation(() => {});

    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper(adapter) });

    result.info("test message", { key: "value" });

    expect(writeSpy).toHaveBeenCalledWith("info", "test message", { key: "value" });
    expect(consolaSpy).not.toHaveBeenCalled();
  });

  it("should pass all severity levels to adapter", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    const { result } = renderHook(() => useLogger(), { wrapper: loggerWrapper(adapter) });

    result.log("a");
    result.info("b");
    result.warn("c");
    result.error("d");

    expect(writeSpy).toHaveBeenCalledWith("log", "a");
    expect(writeSpy).toHaveBeenCalledWith("info", "b");
    expect(writeSpy).toHaveBeenCalledWith("warn", "c");
    expect(writeSpy).toHaveBeenCalledWith("error", "d");
  });

  it("should work correctly in a component", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    function TestComponent() {
      const logger = useLogger();
      logger.info("component log");
      return <div>test</div>;
    }

    render(() => <TestComponent />, { wrapper: loggerWrapper(adapter) });

    expect(writeSpy).toHaveBeenCalledWith("info", "component log");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/hooks/useLogger.spec.tsx --project=solid --run`
Expected: FAIL — useLogger still imports from ConfigContext

**Step 3: Modify useLogger.ts**

```typescript
// packages/solid/src/hooks/useLogger.ts
import { consola } from "consola";
import { useLogAdapter, type LogAdapter } from "../providers/LoggerContext";

type LogLevel = Parameters<LogAdapter["write"]>[0];

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function useLogger(): Logger {
  const logAdapter = useLogAdapter();

  const createLogFunction = (level: LogLevel) => {
    return (...args: unknown[]) => {
      if (logAdapter) {
        void logAdapter.write(level, ...args);
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
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/hooks/useLogger.spec.tsx --project=solid --run`
Expected: PASS

---

### Task 7: Create ErrorLoggerProvider

**Files:**
- Create: `packages/solid/src/providers/ErrorLoggerProvider.tsx`
- Test: `packages/solid/tests/providers/ErrorLoggerProvider.spec.tsx`

**Step 1: Write the test**

```typescript
// packages/solid/tests/providers/ErrorLoggerProvider.spec.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ErrorLoggerProvider } from "../../src/providers/ErrorLoggerProvider";
import { LoggerProvider, type LogAdapter } from "../../src/providers/LoggerContext";

describe("ErrorLoggerProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("children을 정상적으로 렌더링한다", () => {
    const { getByText } = render(() => (
      <ErrorLoggerProvider>
        <div>child content</div>
      </ErrorLoggerProvider>
    ));

    expect(getByText("child content")).toBeDefined();
  });

  it("window error 이벤트를 캡처하여 logger.error를 호출한다", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    render(() => (
      <LoggerProvider adapter={adapter}>
        <ErrorLoggerProvider>
          <div />
        </ErrorLoggerProvider>
      </LoggerProvider>
    ));

    const errorEvent = new ErrorEvent("error", {
      error: new Error("test error"),
      message: "test error",
    });
    window.dispatchEvent(errorEvent);

    expect(writeSpy).toHaveBeenCalledWith("error", "Uncaught error:", expect.any(Error));
  });

  it("unhandledrejection 이벤트를 캡처하여 logger.error를 호출한다", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    render(() => (
      <LoggerProvider adapter={adapter}>
        <ErrorLoggerProvider>
          <div />
        </ErrorLoggerProvider>
      </LoggerProvider>
    ));

    const rejectionEvent = new PromiseRejectionEvent("unhandledrejection", {
      promise: Promise.resolve(),
      reason: "rejection reason",
    });
    window.dispatchEvent(rejectionEvent);

    expect(writeSpy).toHaveBeenCalledWith("error", "Unhandled rejection:", "rejection reason");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/ErrorLoggerProvider.spec.tsx --project=solid --run`
Expected: FAIL — module not found

**Step 3: Write implementation**

```tsx
// packages/solid/src/providers/ErrorLoggerProvider.tsx
import { onCleanup, type ParentComponent } from "solid-js";
import { useLogger } from "../hooks/useLogger";

/**
 * 전역 에러 캡처 Provider
 *
 * @remarks
 * window.onerror, unhandledrejection 이벤트를 캡처하여 useLogger를 통해 로깅한다.
 * LoggerProvider가 없으면 consola로 fallback.
 */
export const ErrorLoggerProvider: ParentComponent = (props) => {
  const logger = useLogger();

  const onError = (event: ErrorEvent) => {
    logger.error("Uncaught error:", event.error ?? event.message);
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    logger.error("Unhandled rejection:", event.reason);
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  onCleanup(() => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  });

  return <>{props.children}</>;
};
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/ErrorLoggerProvider.spec.tsx --project=solid --run`
Expected: PASS

---

### Task 8: Create PwaUpdateProvider

**Files:**
- Create: `packages/solid/src/providers/PwaUpdateProvider.tsx`
- Test: `packages/solid/tests/providers/PwaUpdateProvider.spec.tsx`

**Step 1: Write the test**

```typescript
// packages/solid/tests/providers/PwaUpdateProvider.spec.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { PwaUpdateProvider } from "../../src/providers/PwaUpdateProvider";
import { NotificationProvider } from "../../src/components/feedback/notification/NotificationProvider";

describe("PwaUpdateProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("children을 정상적으로 렌더링한다", () => {
    const { getByText } = render(() => (
      <NotificationProvider>
        <PwaUpdateProvider>
          <div>child content</div>
        </PwaUpdateProvider>
      </NotificationProvider>
    ));

    expect(getByText("child content")).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/PwaUpdateProvider.spec.tsx --project=solid --run`
Expected: FAIL — module not found

**Step 3: Write implementation**

```tsx
// packages/solid/src/providers/PwaUpdateProvider.tsx
import { onCleanup, type ParentComponent } from "solid-js";
import { useNotification } from "../components/feedback/notification/NotificationContext";

const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * PWA Service Worker 업데이트 감지 Provider
 *
 * @remarks
 * 5분마다 SW 업데이트를 폴링하며, 새 버전 감지 시 알림을 표시한다.
 * NotificationProvider 내부에서 사용해야 한다.
 *
 * navigator.serviceWorker가 없거나 등록된 SW가 없으면 graceful no-op.
 */
export const PwaUpdateProvider: ParentComponent = (props) => {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const notification = useNotification();
    let intervalId: ReturnType<typeof setInterval> | undefined;

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration == null) return;

      intervalId = setInterval(() => {
        void registration.update();
      }, UPDATE_INTERVAL);

      if (registration.waiting != null) {
        promptUpdate(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const newSW = registration.installing;
        if (newSW == null) return;

        newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller != null) {
            promptUpdate(newSW);
          }
        });
      });
    });

    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    onCleanup(() => {
      if (intervalId != null) {
        clearInterval(intervalId);
      }
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    });

    function promptUpdate(waitingSW: ServiceWorker): void {
      notification.info("앱이 업데이트되었습니다", "새로고침하면 최신 버전을 사용할 수 있습니다", {
        action: {
          label: "새로고침",
          onClick: () => {
            waitingSW.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
    }
  }

  return <>{props.children}</>;
};
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm vitest packages/solid/tests/providers/PwaUpdateProvider.spec.tsx --project=solid --run`
Expected: PASS

---

### Task 9: Delete old files, update index.ts, update error messages

**Files:**
- Delete: `packages/solid/src/providers/InitializeProvider.tsx`
- Delete: `packages/solid/src/hooks/usePwaUpdate.ts`
- Delete: `packages/solid/src/hooks/useClipboardValueCopy.ts`
- Delete: `packages/solid/tests/providers/ConfigContext.spec.ts` (old .ts version, replaced by .tsx in Task 4)
- Modify: `packages/solid/src/index.ts`
- Modify: `packages/solid/src/providers/ThemeContext.tsx` (error message)
- Modify: `packages/solid/src/providers/ServiceClientContext.ts` (error message)

**Step 1: Delete old files**

```bash
cd /home/kslhunter/projects/simplysm/.worktrees/provider-split
rm packages/solid/src/providers/InitializeProvider.tsx
rm packages/solid/src/hooks/usePwaUpdate.ts
rm packages/solid/src/hooks/useClipboardValueCopy.ts
```

(Note: `ConfigContext.spec.ts` should already be deleted in Task 4 when renamed to `.spec.tsx`)

**Step 2: Update index.ts**

In the Providers section, replace:
```typescript
export * from "./providers/InitializeProvider";
```
with:
```typescript
export * from "./providers/SyncStorageContext";
export * from "./providers/LoggerContext";
export * from "./providers/ErrorLoggerProvider";
export * from "./providers/PwaUpdateProvider";
export * from "./providers/ClipboardProvider";
```

In the Hooks section, remove:
```typescript
export { usePwaUpdate } from "./hooks/usePwaUpdate";
```

The `export * from "./providers/ConfigContext"` stays (it now exports `ConfigProvider` + `AppConfig` + `useConfig`).

**Step 3: Update ThemeContext.tsx error message**

In `packages/solid/src/providers/ThemeContext.tsx`, change useTheme error message from:
```typescript
"useTheme는 ThemeProvider 내부에서만 사용할 수 있습니다. ThemeProvider는 InitializeProvider 아래에 위치해야 합니다"
```
to:
```typescript
"useTheme는 ThemeProvider 내부에서만 사용할 수 있습니다"
```

**Step 4: Update ServiceClientContext.ts error message**

In `packages/solid/src/providers/ServiceClientContext.ts`, change useServiceClient error message from:
```typescript
"useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다. ServiceClientProvider는 InitializeProvider와 NotificationProvider 아래에 위치해야 합니다"
```
to:
```typescript
"useServiceClient는 ServiceClientProvider 내부에서만 사용할 수 있습니다"
```

**Step 5: Run typecheck to verify no broken imports**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm typecheck packages/solid`
Expected: PASS (no errors)

---

### Task 10: Update demo App.tsx and CLI template

**Files:**
- Modify: `packages/solid-demo/src/App.tsx`
- Modify: `packages/sd-cli/templates/add-client/__CLIENT__/src/App.tsx.hbs`

**Step 1: Update demo App.tsx**

```tsx
// packages/solid-demo/src/App.tsx
import type { RouteSectionProps } from "@solidjs/router";
import {
  BusyProvider,
  ClipboardProvider,
  ConfigProvider,
  ErrorLoggerProvider,
  NotificationBanner,
  NotificationProvider,
  PwaUpdateProvider,
  ThemeProvider,
} from "@simplysm/solid";
import { onMount } from "solid-js";

export function App(props: RouteSectionProps) {
  onMount(() => {
    document.querySelector(".app-busy")?.remove();
  });

  return (
    <ConfigProvider clientName="solid-demo">
      <NotificationProvider>
        <NotificationBanner />
        <ErrorLoggerProvider>
          <PwaUpdateProvider>
            <ClipboardProvider>
              <ThemeProvider>
                <BusyProvider>{props.children}</BusyProvider>
              </ThemeProvider>
            </ClipboardProvider>
          </PwaUpdateProvider>
        </ErrorLoggerProvider>
      </NotificationProvider>
    </ConfigProvider>
  );
}
```

**Step 2: Update CLI template**

```handlebars
{{!-- packages/sd-cli/templates/add-client/__CLIENT__/src/App.tsx.hbs --}}
{{#if router}}
import type { RouteSectionProps } from "@solidjs/router";
import {
  BusyProvider,
  ClipboardProvider,
  ConfigProvider,
  ErrorLoggerProvider,
  NotificationBanner,
  NotificationProvider,
  PwaUpdateProvider,
  ThemeProvider,
} from "@simplysm/solid";

export function App(props: RouteSectionProps) {
  return (
    <ConfigProvider clientName="{{clientName}}">
      <NotificationProvider>
        <NotificationBanner />
        <ErrorLoggerProvider>
          <PwaUpdateProvider>
            <ClipboardProvider>
              <ThemeProvider>
                <BusyProvider>{props.children}</BusyProvider>
              </ThemeProvider>
            </ClipboardProvider>
          </PwaUpdateProvider>
        </ErrorLoggerProvider>
      </NotificationProvider>
    </ConfigProvider>
  );
}
{{else}}
import {
  BusyProvider,
  ClipboardProvider,
  ConfigProvider,
  ErrorLoggerProvider,
  NotificationBanner,
  NotificationProvider,
  PwaUpdateProvider,
  ThemeProvider,
} from "@simplysm/solid";
import { HomePage } from "./pages/HomePage";

export function App() {
  return (
    <ConfigProvider clientName="{{clientName}}">
      <NotificationProvider>
        <NotificationBanner />
        <ErrorLoggerProvider>
          <PwaUpdateProvider>
            <ClipboardProvider>
              <ThemeProvider>
                <BusyProvider>
                  <HomePage />
                </BusyProvider>
              </ThemeProvider>
            </ClipboardProvider>
          </PwaUpdateProvider>
        </ErrorLoggerProvider>
      </NotificationProvider>
    </ConfigProvider>
  );
}
{{/if}}
```

**Step 3: Verify typecheck**

Run: `cd /home/kslhunter/projects/simplysm/.worktrees/provider-split && pnpm typecheck packages/solid-demo`
Expected: PASS

---

### Task 11: Update README and docs

**Files:**
- Modify: `packages/solid/README.md`
- Modify: `packages/solid/docs/providers.md`
- Modify: `packages/solid/docs/hooks.md`
- Modify: `packages/solid/docs/feedback.md`
- Modify: `packages/solid/docs/disclosure.md`
- Modify: `packages/solid/docs/form-controls.md`
- Modify: `packages/solid/docs/styling.md`
- Modify: `packages/solid-demo/README.md`

Use the `sd-readme` skill to update `packages/solid/README.md` to reflect the new provider architecture.

For docs files, replace all `InitializeProvider` references with the appropriate individual provider references. Specific changes:

**docs/providers.md:**
- Replace InitializeProvider section with individual provider docs:
  - ConfigProvider (clientName prop, topmost required)
  - SyncStorageProvider (optional, StorageAdapter)
  - LoggerProvider (optional, LogAdapter)
  - ErrorLoggerProvider (captures window errors)
  - PwaUpdateProvider (SW update detection)
  - ClipboardProvider (form control clipboard)
  - ThemeProvider (already documented, update prerequisites)
- Add provider dependency order diagram

**docs/hooks.md:**
- Remove `usePwaUpdate` section (replaced by PwaUpdateProvider)
- Update `useSyncConfig` docs: mention SyncStorageProvider instead of config.syncStorage
- Update `useLogger` docs: mention LoggerProvider instead of config.logger
- Update any "must be inside InitializeProvider" → specific provider names

**docs/feedback.md:**
- Update references from "InitializeProvider" to individual providers

**docs/disclosure.md:**
- Update references from "InitializeProvider" to individual providers

**docs/form-controls.md:**
- Update references from "InitializeProvider" to individual providers

**docs/styling.md:**
- Update references from "InitializeProvider" to "ConfigProvider + ThemeProvider"

**solid-demo/README.md:**
- Update provider setup example
