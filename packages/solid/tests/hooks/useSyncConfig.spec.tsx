import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { useSyncConfig } from "../../src/hooks/useSyncConfig";
import { ConfigProvider } from "../../src/providers/ConfigContext";
import {
  SyncStorageProvider,
  useSyncStorage,
  type StorageAdapter,
} from "../../src/providers/SyncStorageContext";

/** SyncStorageProvider 안에서 adapter를 configure한 뒤 children을 렌더하는 헬퍼 */
function ConfigureStorage(props: { storage: StorageAdapter; children: any }) {
  useSyncStorage()!.configure(() => props.storage);
  return <>{props.children}</>;
}

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

  it("should use syncStorage when configured via configure()", async () => {
    const mockSyncStorage: StorageAdapter = {
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
        <SyncStorageProvider>
          <ConfigureStorage storage={mockSyncStorage}>
            <TestComponent />
          </ConfigureStorage>
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
    const mockSyncStorage: StorageAdapter = {
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
        <SyncStorageProvider>
          <ConfigureStorage storage={mockSyncStorage}>
            <TestComponent />
          </ConfigureStorage>
        </SyncStorageProvider>
      </ConfigProvider>
    ));

    await vi.waitFor(() => {
      expect(ready()).toBe(true);
    });

    expect(value()).toBe("default");
  });

  it("should handle syncStorage errors gracefully and fall back to localStorage", async () => {
    const mockSyncStorage: StorageAdapter = {
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
        <SyncStorageProvider>
          <ConfigureStorage storage={mockSyncStorage}>
            <TestComponent />
          </ConfigureStorage>
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

  it("should re-read from new adapter when configure() is called mid-session", async () => {
    const mockSyncStorage: StorageAdapter = {
      getItem: vi.fn().mockResolvedValue(JSON.stringify("server-theme")),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn(),
    };

    let value: () => string;
    let ready: () => boolean;
    let doConfiguration: () => void;

    function TestComponent() {
      [value, , ready] = useSyncConfig("test-key", "default");
      const syncStorage = useSyncStorage()!;
      doConfiguration = () => syncStorage.configure(() => mockSyncStorage);
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigProvider clientName="testApp">
        <SyncStorageProvider>
          <TestComponent />
        </SyncStorageProvider>
      </ConfigProvider>
    ));

    // Initially: default adapter (localStorage-based), wait for async read
    await vi.waitFor(() => {
      expect(ready()).toBe(true);
    });
    expect(value()).toBe("default");

    // Configure mid-session
    doConfiguration();

    // ready becomes false, then true after async read
    await vi.waitFor(() => {
      expect(ready()).toBe(true);
    });

    expect(value()).toBe("server-theme");
    expect(mockSyncStorage.getItem).toHaveBeenCalledWith("testApp.test-key");
  });
});
