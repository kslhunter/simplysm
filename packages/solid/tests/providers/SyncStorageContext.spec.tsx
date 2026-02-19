import { describe, it, expect, vi } from "vitest";
import { createRoot } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { afterEach } from "vitest";
import {
  SyncStorageContext,
  SyncStorageProvider,
  useSyncStorage,
  type SyncStorageContextValue,
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

  it("SyncStorageProvider가 SyncStorageContextValue를 정상 제공한다", () => {
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

    expect(received).toBeDefined();
    expect(typeof received!.adapter).toBe("function");
    expect(typeof received!.configure).toBe("function");
    expect(received!.adapter()).toBeDefined();
  });

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
    void adapter.getItem("test");
    expect(mockGetItem).toHaveBeenCalledWith("test");
  });
});
