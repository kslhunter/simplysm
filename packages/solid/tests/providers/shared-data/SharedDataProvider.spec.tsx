import { describe, expect, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import "@simplysm/core-common";
import {
  useSharedData,
  type SharedDataDefinition,
  type ServiceClientContextValue,
  type NotificationContextValue,
} from "../../../src";
import { ServiceClientContext } from "../../../src/providers/ServiceClientProvider";
import { NotificationContext } from "../../../src/components/feedback/notification/NotificationProvider";
import { SharedDataProvider } from "../../../src/providers/shared-data/SharedDataProvider";

interface TestUser {
  id: number;
  name: string;
}

function useTestSharedData(): any {
  return useSharedData();
}

function createMockServiceClient() {
  const listeners = new Map<string, (data: unknown) => PromiseLike<void>>();
  let listenerCounter = 0;

  const mockClient = {
    addListener: vi.fn(
      (_type: unknown, _info: unknown, cb: (data: unknown) => PromiseLike<void>) => {
        const key = String(listenerCounter++);
        listeners.set(key, cb);
        return Promise.resolve(key);
      },
    ),
    removeListener: vi.fn((_key: string) => Promise.resolve()),
    emitEvent: vi.fn(() => Promise.resolve()),
  };

  const serviceClientValue: ServiceClientContextValue = {
    connect: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    get: () => mockClient as never,
    isConnected: () => true,
  };

  return { mockClient, serviceClientValue, listeners };
}

function createMockNotification(): NotificationContextValue {
  return {
    items: () => [],
    unreadCount: () => 0,
    latestUnread: () => undefined,
    info: vi.fn(() => ""),
    success: vi.fn(() => ""),
    warning: vi.fn(() => ""),
    danger: vi.fn(() => ""),
    error: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    dismissBanner: vi.fn(),
    clear: vi.fn(),
  };
}

/** Helper to call configure() within SharedDataProvider and render children */
function ConfigureSharedData(props: {
  definitions: { user: SharedDataDefinition<TestUser> };
  children: any;
}) {
  const shared = useTestSharedData();
   
  shared.configure(() => props.definitions);
  return <>{props.children}</>;
}

function TestConsumer(props: { onData?: (shared: any) => void }) {
  const shared = useTestSharedData();
   
  props.onData?.(shared);

  return (
    <div>
      <span data-testid="count">{shared.user.items().length}</span>
      <span data-testid="busy">{Boolean(shared.busy()) ? "true" : "false"}</span>
    </div>
  );
}

describe("SharedDataProvider", () => {
  it("loads initial data and allows access via items()", async () => {
    const { serviceClientValue } = createMockServiceClient();
    const mockUsers: TestUser[] = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: vi.fn(() => Promise.resolve(mockUsers)),
        getKey: (item) => item.id,
        orderBy: [[(item) => item.name, "asc"]],
      },
    };

    const result = render(() => (
      <NotificationContext.Provider value={createMockNotification()}>
        <ServiceClientContext.Provider value={serviceClientValue}>
          <SharedDataProvider>
            <ConfigureSharedData definitions={definitions}>
              <TestConsumer />
            </ConfigureSharedData>
          </SharedDataProvider>
        </ServiceClientContext.Provider>
      </NotificationContext.Provider>
    ));

    await vi.waitFor(() => {
      expect(result.getByTestId("count").textContent).toBe("2");
    });

    result.unmount();
  });

  it("allows O(1) single item lookup via get()", async () => {
    const { serviceClientValue } = createMockServiceClient();
    const mockUsers: TestUser[] = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    let sharedRef: any;

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: vi.fn(() => Promise.resolve(mockUsers)),
        getKey: (item) => item.id,
        orderBy: [[(item) => item.name, "asc"]],
      },
    };

    const result = render(() => (
      <NotificationContext.Provider value={createMockNotification()}>
        <ServiceClientContext.Provider value={serviceClientValue}>
          <SharedDataProvider>
            <ConfigureSharedData definitions={definitions}>
              <TestConsumer
                onData={(s) => {
                  sharedRef = s;
                }}
              />
            </ConfigureSharedData>
          </SharedDataProvider>
        </ServiceClientContext.Provider>
      </NotificationContext.Provider>
    ));

    await vi.waitFor(() => {
      expect(result.getByTestId("count").textContent).toBe("2");
    });

    expect(sharedRef!.user.get(1)).toEqual({ id: 1, name: "Alice" });
    expect(sharedRef!.user.get(999)).toBeUndefined();
    expect(sharedRef!.user.get(undefined)).toBeUndefined();

    result.unmount();
  });

  it("returns results sorted by orderBy", async () => {
    const { serviceClientValue } = createMockServiceClient();
    const mockUsers: TestUser[] = [
      { id: 2, name: "Charlie" },
      { id: 1, name: "Alice" },
      { id: 3, name: "Bob" },
    ];

    let sharedRef: any;

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: vi.fn(() => Promise.resolve(mockUsers)),
        getKey: (item) => item.id,
        orderBy: [[(item) => item.name, "asc"]],
      },
    };

    const result = render(() => (
      <NotificationContext.Provider value={createMockNotification()}>
        <ServiceClientContext.Provider value={serviceClientValue}>
          <SharedDataProvider>
            <ConfigureSharedData definitions={definitions}>
              <TestConsumer
                onData={(s) => {
                  sharedRef = s;
                }}
              />
            </ConfigureSharedData>
          </SharedDataProvider>
        </ServiceClientContext.Provider>
      </NotificationContext.Provider>
    ));

    await vi.waitFor(() => {
      expect(result.getByTestId("count").textContent).toBe("3");
    });

    const names = sharedRef!.user.items().map((u: TestUser) => u.name);
    expect(names).toEqual(["Alice", "Bob", "Charlie"]);

    result.unmount();
  });

  it("busy() returns true during loading and false after completion", async () => {
    const { serviceClientValue } = createMockServiceClient();

    let resolveUsers!: (value: TestUser[]) => void;
    const fetchPromise = new Promise<TestUser[]>((resolve) => {
      resolveUsers = resolve;
    });

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: vi.fn(() => fetchPromise),
        getKey: (item) => item.id,
        orderBy: [],
      },
    };

    const result = render(() => (
      <NotificationContext.Provider value={createMockNotification()}>
        <ServiceClientContext.Provider value={serviceClientValue}>
          <SharedDataProvider>
            <ConfigureSharedData definitions={definitions}>
              <TestConsumer />
            </ConfigureSharedData>
          </SharedDataProvider>
        </ServiceClientContext.Provider>
      </NotificationContext.Provider>
    ));

    // During loading
    await vi.waitFor(() => {
      expect(result.getByTestId("busy").textContent).toBe("true");
    });

    // After loading completes
    resolveUsers([{ id: 1, name: "Alice" }]);

    await vi.waitFor(() => {
      expect(result.getByTestId("busy").textContent).toBe("false");
    });

    result.unmount();
  });

  it("can access meta functions in accessor when included in configure", async () => {
    const { serviceClientValue } = createMockServiceClient();

    const getKeyFn = (item: TestUser) => item.id;
    const itemSearchTextFn = (item: TestUser) => item.name;
    const isItemHiddenFn = (item: TestUser) => item.name === "hidden";
    const getParentKeyFn = (_item: TestUser) => undefined as number | undefined;

    let sharedRef: any;

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: vi.fn(() => Promise.resolve([{ id: 1, name: "Alice" }])),
        getKey: getKeyFn,
        orderBy: [[(item) => item.name, "asc"]],
        itemSearchText: itemSearchTextFn,
        isItemHidden: isItemHiddenFn,
        getParentKey: getParentKeyFn,
      },
    };

    const result = render(() => (
      <NotificationContext.Provider value={createMockNotification()}>
        <ServiceClientContext.Provider value={serviceClientValue}>
          <SharedDataProvider>
            <ConfigureSharedData definitions={definitions}>
              <TestConsumer
                onData={(s) => {
                  sharedRef = s;
                }}
              />
            </ConfigureSharedData>
          </SharedDataProvider>
        </ServiceClientContext.Provider>
      </NotificationContext.Provider>
    ));

    await vi.waitFor(() => {
      expect(result.getByTestId("count").textContent).toBe("1");
    });

    // Verify meta function references in accessor match definition
    expect(sharedRef!.user.getKey).toBe(getKeyFn);
    expect(sharedRef!.user.itemSearchText).toBe(itemSearchTextFn);
    expect(sharedRef!.user.isItemHidden).toBe(isItemHiddenFn);
    expect(sharedRef!.user.getParentKey).toBe(getParentKeyFn);

    // Verify actual call results
    const testItem: TestUser = { id: 42, name: "Test" };
    expect(sharedRef!.user.getKey(testItem)).toBe(42);
    expect(sharedRef!.user.itemSearchText(testItem)).toBe("Test");
    expect(sharedRef!.user.isItemHidden(testItem)).toBe(false);
    expect(sharedRef!.user.getParentKey(testItem)).toBeUndefined();

    result.unmount();
  });

  it("accessor returns undefined when meta functions are not specified", async () => {
    const { serviceClientValue } = createMockServiceClient();

    const getKeyFn = (item: TestUser) => item.id;

    let sharedRef: any;

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: vi.fn(() => Promise.resolve([{ id: 1, name: "Alice" }])),
        getKey: getKeyFn,
        orderBy: [[(item) => item.name, "asc"]],
        // itemSearchText, isItemHidden, getParentKey not specified
      },
    };

    const result = render(() => (
      <NotificationContext.Provider value={createMockNotification()}>
        <ServiceClientContext.Provider value={serviceClientValue}>
          <SharedDataProvider>
            <ConfigureSharedData definitions={definitions}>
              <TestConsumer
                onData={(s) => {
                  sharedRef = s;
                }}
              />
            </ConfigureSharedData>
          </SharedDataProvider>
        </ServiceClientContext.Provider>
      </NotificationContext.Provider>
    ));

    await vi.waitFor(() => {
      expect(result.getByTestId("count").textContent).toBe("1");
    });

    // getKey always exists
    expect(sharedRef!.user.getKey).toBe(getKeyFn);

    // Optional meta functions are undefined when not specified
    expect(sharedRef!.user.itemSearchText).toBeUndefined();
    expect(sharedRef!.user.isItemHidden).toBeUndefined();
    expect(sharedRef!.user.getParentKey).toBeUndefined();

    result.unmount();
  });

  it("retries initialization after error on next access", async () => {
    const { serviceClientValue } = createMockServiceClient();

    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce([{ id: 1, name: "Alice" }]);

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: fetchMock,
        getKey: (item) => item.id,
        orderBy: [[(item) => item.name, "asc"]],
      },
    };

    let sharedRef: any;

    const result = render(() => (
      <NotificationContext.Provider value={createMockNotification()}>
        <ServiceClientContext.Provider value={serviceClientValue}>
          <SharedDataProvider>
            <ConfigureSharedData definitions={definitions}>
              <TestConsumer
                onData={(s) => {
                  sharedRef = s;
                }}
              />
            </ConfigureSharedData>
          </SharedDataProvider>
        </ServiceClientContext.Provider>
      </NotificationContext.Provider>
    ));

    // First access triggers init; fetch fails -> state becomes "error"
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    // Items should still be empty after the failed fetch
    expect(sharedRef!.user.items()).toEqual([]);

    // Second access retries because state is "error"
    // Trigger re-access by calling items() again (which calls void initialize())
    sharedRef!.user.items();

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    // Now data should be available
    await vi.waitFor(() => {
      expect(sharedRef!.user.items().length).toBe(1);
    });

    expect(sharedRef!.user.items()[0]).toEqual({ id: 1, name: "Alice" });

    result.unmount();
  });

});
