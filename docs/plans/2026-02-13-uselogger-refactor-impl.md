# useLogger Refactor & Global Error Handling — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Unify `useLogger` to use `ConfigContext` (remove `LogConfig.ts`), add global error capturing via `InitializeProvider`.

**Architecture:** `useLogger` reads `config.logger` from `useConfig()`. If adapter is present, logs go to adapter only; otherwise falls back to `consola`. `InitializeProvider` registers `window.onerror`/`unhandledrejection` handlers via an internal component.

**Tech Stack:** SolidJS, consola, vitest, @solidjs/testing-library

---

### Task 1: Delete `LogConfig.ts` and update `ConfigContext.ts`

**Files:**
- Delete: `packages/solid/src/configs/LogConfig.ts`
- Modify: `packages/solid/src/providers/ConfigContext.ts:22-24`

**Step 1: Update `LogAdapter` interface in ConfigContext to add `"info"` severity**

In `packages/solid/src/providers/ConfigContext.ts`, change line 23:

```typescript
// Before:
export interface LogAdapter {
  write(severity: "error" | "warn" | "log", ...data: any[]): Promise<void> | void;
}

// After:
export interface LogAdapter {
  write(severity: "error" | "warn" | "info" | "log", ...data: any[]): Promise<void> | void;
}
```

Also update JSDoc on line 19-20:

```typescript
// Before:
/**
 * 로그 어댑터 인터페이스
 *
 * @remarks
 * - `useLogger`에서 consola 출력 외에 추가 로그 전송(DB, 서버 등)에 사용
 */

// After:
/**
 * 로그 어댑터 인터페이스
 *
 * @remarks
 * - `useLogger`에서 사용하는 로그 전송 어댑터 (DB, 서버 등)
 * - adapter가 설정되면 consola 대신 adapter만 사용됨
 */
```

**Step 2: Delete `packages/solid/src/configs/LogConfig.ts`**

This file is only imported by:
- `packages/solid/src/hooks/useLogger.ts` (will be updated in Task 2)
- `packages/solid/tests/hooks/useLogger.spec.tsx` (will be updated in Task 3)

**Step 3: Run typecheck to confirm expected failures**

Run: `pnpm typecheck packages/solid`
Expected: FAIL — `useLogger.ts` and `useLogger.spec.tsx` reference deleted file

**Step 4: Commit**

```bash
git add packages/solid/src/configs/LogConfig.ts packages/solid/src/providers/ConfigContext.ts
git commit -m "refactor(solid): remove LogConfig.ts, add 'info' to LogAdapter severity"
```

---

### Task 2: Rewrite `useLogger.ts` to use `ConfigContext`

**Files:**
- Modify: `packages/solid/src/hooks/useLogger.ts`

**Step 1: Rewrite `useLogger.ts`**

Replace the entire file with:

```typescript
import { consola } from "consola";
import { useConfig, type LogAdapter } from "../providers/ConfigContext";

type LogLevel = Parameters<LogAdapter["write"]>[0];

interface Logger {
  log: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function useLogger(): Logger {
  const config = useConfig();

  const createLogFunction = (level: LogLevel) => {
    return (...args: unknown[]) => {
      if (config.logger) {
        config.logger.write(level, ...args);
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

Key changes:
- Imports `useConfig` and `LogAdapter` from `ConfigContext` (not `LogConfig`)
- `LogLevel` derived from `LogAdapter["write"]` parameter — no separate type needed
- If `config.logger` exists → adapter only (no consola)
- If `config.logger` absent → consola fallback
- No more message serialization (adapter receives raw args via `...data`)
- No more try/catch around adapter call (adapter is responsible for its own error handling)

**Step 2: Run typecheck**

Run: `pnpm typecheck packages/solid`
Expected: FAIL — only `useLogger.spec.tsx` still broken (references deleted `LogConfig`)

**Step 3: Commit**

```bash
git add packages/solid/src/hooks/useLogger.ts
git commit -m "refactor(solid): useLogger reads adapter from ConfigContext"
```

---

### Task 3: Rewrite `useLogger.spec.tsx`

**Files:**
- Modify: `packages/solid/tests/hooks/useLogger.spec.tsx`

**Step 1: Rewrite the entire test file**

Replace `packages/solid/tests/hooks/useLogger.spec.tsx` with:

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook } from "@solidjs/testing-library";
import { useLogger } from "../../src/hooks/useLogger";
import { ConfigContext, type LogAdapter } from "../../src/providers/ConfigContext";
import { consola } from "consola";

function configWrapper(logger?: LogAdapter) {
  return (props: { children: any }) => (
    <ConfigContext.Provider value={{ clientName: "test", logger }}>
      {props.children}
    </ConfigContext.Provider>
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
    const { result } = renderHook(() => useLogger(), { wrapper: configWrapper() });
    expect(typeof result.log).toBe("function");
    expect(typeof result.info).toBe("function");
    expect(typeof result.warn).toBe("function");
    expect(typeof result.error).toBe("function");
  });

  it("should call consola when no adapter is configured", () => {
    const consolaSpy = {
      log: vi.spyOn(consola, "log").mockImplementation(() => {}),
      info: vi.spyOn(consola, "info").mockImplementation(() => {}),
      warn: vi.spyOn(consola, "warn").mockImplementation(() => {}),
      error: vi.spyOn(consola, "error").mockImplementation(() => {}),
    };

    const { result } = renderHook(() => useLogger(), { wrapper: configWrapper() });

    result.log("log message");
    result.info("info message");
    result.warn("warn message");
    result.error("error message");

    expect(consolaSpy.log).toHaveBeenCalledWith("log message");
    expect(consolaSpy.info).toHaveBeenCalledWith("info message");
    expect(consolaSpy.warn).toHaveBeenCalledWith("warn message");
    expect(consolaSpy.error).toHaveBeenCalledWith("error message");
  });

  it("should call adapter only when adapter is configured (no consola)", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };
    const consolaSpy = vi.spyOn(consola, "info").mockImplementation(() => {});

    const { result } = renderHook(() => useLogger(), { wrapper: configWrapper(adapter) });

    result.info("test message", { key: "value" });

    expect(writeSpy).toHaveBeenCalledWith("info", "test message", { key: "value" });
    expect(consolaSpy).not.toHaveBeenCalled();
  });

  it("should pass all severity levels to adapter", () => {
    const writeSpy = vi.fn();
    const adapter: LogAdapter = { write: writeSpy };

    const { result } = renderHook(() => useLogger(), { wrapper: configWrapper(adapter) });

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

    render(() => <TestComponent />, { wrapper: configWrapper(adapter) });

    expect(writeSpy).toHaveBeenCalledWith("info", "component log");
  });
});
```

Key changes:
- Removed `LogConfig`/`LogAdapter` imports from deleted file
- All `renderHook`/`render` calls use `configWrapper` with `ConfigContext.Provider`
- Tests verify adapter-only behavior (consola NOT called when adapter present)
- Tests verify consola fallback (no adapter)
- Removed `waitFor` — calls are synchronous now (no message serialization)
- Removed adapter error swallowing test (adapter handles its own errors)

**Step 2: Run tests**

Run: `pnpm vitest packages/solid/tests/hooks/useLogger.spec.tsx --project=solid --run`
Expected: PASS — all tests green

**Step 3: Run full typecheck and lint**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/tests/hooks/useLogger.spec.tsx
git commit -m "test(solid): rewrite useLogger tests for ConfigContext-based adapter"
```

---

### Task 4: Add `GlobalErrorLogger` to `InitializeProvider`

**Files:**
- Modify: `packages/solid/src/providers/InitializeProvider.tsx`

**Step 1: Add `GlobalErrorLogger` internal component**

Add after the existing `PwaUpdater` component (after line 15):

```typescript
import { onCleanup } from "solid-js";
import { useLogger } from "../hooks/useLogger";
```

```typescript
/** Captures uncaught errors and unhandled rejections via useLogger */
function GlobalErrorLogger() {
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

  return null;
}
```

**Step 2: Add `<GlobalErrorLogger />` to JSX**

In the return JSX, add after `<NotificationBanner />`:

```tsx
return (
  <ConfigContext.Provider value={props.config}>
    <ThemeProvider>
      <NotificationProvider>
        <NotificationBanner />
        <GlobalErrorLogger />
        <PwaUpdater />
        <LoadingProvider variant={props.config.loadingVariant}>
          <DialogProvider>{props.children}</DialogProvider>
        </LoadingProvider>
      </NotificationProvider>
    </ThemeProvider>
  </ConfigContext.Provider>
);
```

Also update the JSDoc `@remarks` to include global error logging:

```typescript
 * - 전역 에러 캡처 (window.onerror, unhandledrejection)
```

**Step 3: Run typecheck and lint**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/solid/src/providers/InitializeProvider.tsx
git commit -m "feat(solid): add GlobalErrorLogger to InitializeProvider"
```

---

### Task 5: Add `logger.error()` to `SharedDataProvider`

**Files:**
- Modify: `packages/solid/src/providers/shared-data/SharedDataProvider.tsx:70-75`

**Step 1: Import `useLogger` and add error logging**

Add import at top:

```typescript
import { useLogger } from "../../hooks/useLogger";
```

Add `useLogger()` call after existing hooks (after line 18):

```typescript
const logger = useLogger();
```

Update the catch block (lines 70-75) to add `logger.error()` before `notification.danger()`:

```typescript
    } catch (err) {
      logger.error(`SharedData '${name}' fetch failed:`, err);
      notification.danger(
        "공유 데이터 로드 실패",
        err instanceof Error ? err.message : `'${name}' 데이터를 불러오는 중 오류가 발생했습니다.`,
      );
    } finally {
```

**Step 2: Run typecheck and lint**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/solid/src/providers/shared-data/SharedDataProvider.tsx
git commit -m "feat(solid): log SharedData fetch errors via useLogger"
```

---

### Task 6: Final verification

**Step 1: Run all solid tests**

Run: `pnpm vitest --project=solid --run`
Expected: PASS

**Step 2: Run full typecheck and lint**

Run: `pnpm typecheck packages/solid && pnpm lint packages/solid`
Expected: PASS
