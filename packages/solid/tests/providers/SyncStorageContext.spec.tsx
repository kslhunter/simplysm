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
