import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { useSyncConfig } from "../../src/hooks/useSyncConfig";
import { ConfigContext } from "../../src/providers/ConfigContext";

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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(value()).toBe("default");
  });

  it("should load value from localStorage when no syncStorage is configured", () => {
    localStorage.setItem("testApp.test-key", JSON.stringify("stored"));

    let value: () => string;

    function TestComponent() {
      [value] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    setValue("new-value");
    expect(localStorage.getItem("testApp.test-key")).toBe(JSON.stringify("new-value"));
  });

  it("should return busy=false when using localStorage", () => {
    let busy: () => boolean;

    function TestComponent() {
      [, , busy] = useSyncConfig("test-key", "default");
      return <div />;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(busy()).toBe(false);
  });

  it("should use syncStorage when configured in ConfigContext.Provider", async () => {
    const mockSyncStorage = {
      getItem: vi.fn().mockResolvedValue(JSON.stringify("synced-value")),
      setItem: vi.fn().mockResolvedValue(undefined),
      removeItem: vi.fn(),
    };

    let value: () => string;
    let setValue: (v: string) => void;
    let busy: () => boolean;

    function TestComponent() {
      [value, setValue, busy] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp", syncStorage: mockSyncStorage }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    // Wait for async initialization
    await vi.waitFor(() => {
      expect(busy()).toBe(false);
    });

    expect(value()).toBe("synced-value");
    expect(mockSyncStorage.getItem).toHaveBeenCalledWith("testApp.test-key");

    // Test setting value
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
    let busy: () => boolean;

    function TestComponent() {
      [value, , busy] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp", syncStorage: mockSyncStorage }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    await vi.waitFor(() => {
      expect(busy()).toBe(false);
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
    let busy: () => boolean;

    function TestComponent() {
      [value, setValue, busy] = useSyncConfig("test-key", "default");
      return <div>{value()}</div>;
    }

    render(() => (
      <ConfigContext.Provider value={{ clientName: "testApp", syncStorage: mockSyncStorage }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    await vi.waitFor(() => {
      expect(busy()).toBe(false);
    });

    // Should fall back to localStorage
    expect(value()).toBe("local-fallback");

    // Setting should fall back to localStorage too
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
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
      <ConfigContext.Provider value={{ clientName: "testApp" }}>
        <TestComponent />
      </ConfigContext.Provider>
    ));

    expect(value()).toEqual(defaultObj);

    const newObj = { theme: "dark", fontSize: 16 };
    setValue(newObj);

    expect(value()).toEqual(newObj);
    expect(JSON.parse(localStorage.getItem("testApp.test-key")!)).toEqual(newObj);
  });
});
