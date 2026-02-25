import { describe, expect, it, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import "@simplysm/core-common";
import {
  useSharedData,
  type SharedDataDefinition,
  ServiceClientContext,
  type ServiceClientContextValue,
  NotificationContext,
  type NotificationContextValue,
} from "../../../src";
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
    addEventListener: vi.fn(
      (_type: unknown, _info: unknown, cb: (data: unknown) => PromiseLike<void>) => {
        const key = String(listenerCounter++);
        listeners.set(key, cb);
        return Promise.resolve(key);
      },
    ),
    removeEventListener: vi.fn((_key: string) => Promise.resolve()),
    emitToServer: vi.fn(() => Promise.resolve()),
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
    const getSearchTextFn = (item: TestUser) => item.name;
    const getIsHiddenFn = (item: TestUser) => item.name === "hidden";
    const getParentKeyFn = (_item: TestUser) => undefined as number | undefined;

    let sharedRef: any;

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: vi.fn(() => Promise.resolve([{ id: 1, name: "Alice" }])),
        getKey: getKeyFn,
        orderBy: [[(item) => item.name, "asc"]],
        getSearchText: getSearchTextFn,
        getIsHidden: getIsHiddenFn,
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
    expect(sharedRef!.user.getSearchText).toBe(getSearchTextFn);
    expect(sharedRef!.user.getIsHidden).toBe(getIsHiddenFn);
    expect(sharedRef!.user.getParentKey).toBe(getParentKeyFn);

    // Verify actual call results
    const testItem: TestUser = { id: 42, name: "Test" };
    expect(sharedRef!.user.getKey(testItem)).toBe(42);
    expect(sharedRef!.user.getSearchText(testItem)).toBe("Test");
    expect(sharedRef!.user.getIsHidden(testItem)).toBe(false);
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
        // getSearchText, getIsHidden, getParentKey not specified
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
    expect(sharedRef!.user.getSearchText).toBeUndefined();
    expect(sharedRef!.user.getIsHidden).toBeUndefined();
    expect(sharedRef!.user.getParentKey).toBeUndefined();

    result.unmount();
  });

  it("does not fetch immediately after configure(), fetches lazily when items() is accessed", async () => {
    const { serviceClientValue, mockClient } = createMockServiceClient();
    const mockUsers: TestUser[] = [{ id: 1, name: "Alice" }];

    const fetchFn = vi.fn(() => Promise.resolve(mockUsers));

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        fetch: fetchFn,
        getKey: (item) => item.id,
        orderBy: [[(item) => item.name, "asc"]],
      },
    };

    // Component that only calls configure() and does not access items()
    function ConfigureOnly() {
      const shared = useTestSharedData();
      shared.configure(() => definitions);
      return <div data-testid="configured">configured</div>;
    }

    const result = render(() => (
      <NotificationContext.Provider value={createMockNotification()}>
        <ServiceClientContext.Provider value={serviceClientValue}>
          <SharedDataProvider>
            <ConfigureOnly />
          </SharedDataProvider>
        </ServiceClientContext.Provider>
      </NotificationContext.Provider>
    ));

    // After configure: fetch and addEventListener should not be called
    await vi.waitFor(() => {
      expect(result.getByTestId("configured").textContent).toBe("configured");
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(mockClient.addEventListener).not.toHaveBeenCalled();

    result.unmount();
  });
});
