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

/** SharedDataProvider 안에서 configure()를 호출한 뒤 children을 렌더하는 헬퍼 */
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
  it("초기 데이터를 로드하고 items()로 접근할 수 있다", async () => {
    const { serviceClientValue } = createMockServiceClient();
    const mockUsers: TestUser[] = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        serviceKey: "main",
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

  it("get()으로 O(1) 단일 항목 조회가 가능하다", async () => {
    const { serviceClientValue } = createMockServiceClient();
    const mockUsers: TestUser[] = [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ];

    let sharedRef: any;

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        serviceKey: "main",
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

  it("orderBy에 따라 정렬된 결과를 반환한다", async () => {
    const { serviceClientValue } = createMockServiceClient();
    const mockUsers: TestUser[] = [
      { id: 2, name: "Charlie" },
      { id: 1, name: "Alice" },
      { id: 3, name: "Bob" },
    ];

    let sharedRef: any;

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        serviceKey: "main",
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

  it("busy()은 로드 중 true, 완료 후 false", async () => {
    const { serviceClientValue } = createMockServiceClient();

    let resolveUsers!: (value: TestUser[]) => void;
    const fetchPromise = new Promise<TestUser[]>((resolve) => {
      resolveUsers = resolve;
    });

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        serviceKey: "main",
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

    // 로딩 중
    await vi.waitFor(() => {
      expect(result.getByTestId("busy").textContent).toBe("true");
    });

    // 로드 완료
    resolveUsers([{ id: 1, name: "Alice" }]);

    await vi.waitFor(() => {
      expect(result.getByTestId("busy").textContent).toBe("false");
    });

    result.unmount();
  });

  it("메타 함수를 포함한 configure 시 accessor에서 함수에 접근할 수 있다", async () => {
    const { serviceClientValue } = createMockServiceClient();

    const getKeyFn = (item: TestUser) => item.id;
    const getSearchTextFn = (item: TestUser) => item.name;
    const getIsHiddenFn = (item: TestUser) => item.name === "hidden";
    const getParentKeyFn = (_item: TestUser) => undefined as number | undefined;

    let sharedRef: any;

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        serviceKey: "main",
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

    // accessor에서 메타 함수 참조가 definition과 동일한지 확인
    expect(sharedRef!.user.getKey).toBe(getKeyFn);
    expect(sharedRef!.user.getSearchText).toBe(getSearchTextFn);
    expect(sharedRef!.user.getIsHidden).toBe(getIsHiddenFn);
    expect(sharedRef!.user.getParentKey).toBe(getParentKeyFn);

    // 실제 호출 결과 검증
    const testItem: TestUser = { id: 42, name: "Test" };
    expect(sharedRef!.user.getKey(testItem)).toBe(42);
    expect(sharedRef!.user.getSearchText(testItem)).toBe("Test");
    expect(sharedRef!.user.getIsHidden(testItem)).toBe(false);
    expect(sharedRef!.user.getParentKey(testItem)).toBeUndefined();

    result.unmount();
  });

  it("메타 함수 미지정 시 accessor에서 undefined로 접근된다", async () => {
    const { serviceClientValue } = createMockServiceClient();

    const getKeyFn = (item: TestUser) => item.id;

    let sharedRef: any;

    const definitions: { user: SharedDataDefinition<TestUser> } = {
      user: {
        serviceKey: "main",
        fetch: vi.fn(() => Promise.resolve([{ id: 1, name: "Alice" }])),
        getKey: getKeyFn,
        orderBy: [[(item) => item.name, "asc"]],
        // getSearchText, getIsHidden, getParentKey 미지정
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

    // getKey는 항상 존재
    expect(sharedRef!.user.getKey).toBe(getKeyFn);

    // 옵셔널 메타 함수는 미지정 시 undefined
    expect(sharedRef!.user.getSearchText).toBeUndefined();
    expect(sharedRef!.user.getIsHidden).toBeUndefined();
    expect(sharedRef!.user.getParentKey).toBeUndefined();

    result.unmount();
  });
});
