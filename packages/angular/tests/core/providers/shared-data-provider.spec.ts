import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { ErrorHandler } from "@angular/core";
import {
  TestSharedDataProvider,
  type ITestUser,
} from "./sd-shared-data-test.fixture";
import { SdServiceClientFactoryProvider } from "../../../src/core/providers/sd-service-client-factory.provider";
import "@simplysm/core-common";

// 이벤트 수신/발행을 위한 ServiceClient 모의 객체
class MockServiceClient {
  private readonly _listeners = new Map<string, { info: any; cb: (data: any) => PromiseLike<void> }>();
  private _listenerKeyCounter = 0;
  connected = true;

  addListener(_eventDef: any, info: any, cb: (data: any) => PromiseLike<void>): Promise<string> {
    const key = `listener-${++this._listenerKeyCounter}`;
    this._listeners.set(key, { info, cb });
    return Promise.resolve(key);
  }

  removeListener(key: string): Promise<void> {
    this._listeners.delete(key);
    return Promise.resolve();
  }

  async emitEvent(_eventDef: any, infoSelector: (item: any) => boolean, data: any): Promise<void> {
    for (const [, entry] of this._listeners) {
      if (infoSelector(entry.info)) {
        await entry.cb(data);
      }
    }
  }

  get listenerCount() {
    return this._listeners.size;
  }
}

let mockClient: MockServiceClient;

function setup() {
  mockClient = new MockServiceClient();

  TestBed.configureTestingModule({
    providers: [
      TestSharedDataProvider,
      {
        provide: SdServiceClientFactoryProvider,
        useValue: {
          get: () => mockClient,
        },
      },
    ],
  });

  return {
    provider: TestBed.inject(TestSharedDataProvider),
  };
}

describe("FIX-1 Slice 4: SdSharedDataProvider getter 에러 처리", () => {
  it("getter의 Promise가 reject되면 에러가 ErrorHandler로 전달된다", async () => {
    mockClient = new MockServiceClient();

    const errorHandlerSpy = { handleError: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        TestSharedDataProvider,
        {
          provide: SdServiceClientFactoryProvider,
          useValue: { get: () => mockClient },
        },
        {
          provide: ErrorHandler,
          useValue: errorHandlerSpy,
        },
      ],
    });

    const provider = TestBed.inject(TestSharedDataProvider);

    provider.register("users", {
      serviceKey: "main",
      getter: () => Promise.reject(new Error("getter failed")),
    });

    provider.getHandle("users");

    // loadingCount가 0이 될 때까지 대기 (finally가 실행되므로)
    await provider.wait();

    expect(errorHandlerSpy.handleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "getter failed" }),
    );
  });
});

describe("Feature 3.5 Slice 2: SdSharedDataProvider + SharedDataHandle", () => {
  // Acceptance: 데이터 등록 후 첫 조회
  it("register 후 getHandle()을 호출하면 데이터가 비동기 로드되고 SharedDataHandle이 반환된다", async () => {
    const { provider } = setup();
    const mockData: ITestUser[] = [
      { __valueKey: 1, name: "Alice", sortOrder: 1 },
      { __valueKey: 2, name: "Bob", sortOrder: 2 },
    ];

    provider.register("users", {
      serviceKey: "main",
      getter: () => Promise.resolve(mockData),
    });

    const handle = provider.getHandle("users");
    await provider.wait();

    expect(handle.items()).toEqual(mockData);
    expect(handle.get(1)).toEqual(mockData[0]);
    expect(handle.get(2)).toEqual(mockData[1]);
  });

  // Acceptance: 이미 로드된 데이터 재조회
  it("getHandle()을 다시 호출하면 기존 핸들이 반환된다 (데이터 리로드 없음)", async () => {
    const { provider } = setup();
    let callCount = 0;
    const mockData: ITestUser[] = [{ __valueKey: 1, name: "Alice", sortOrder: 1 }];

    provider.register("users", {
      serviceKey: "main",
      getter: () => {
        callCount++;
        return Promise.resolve(mockData);
      },
    });

    const handle1 = provider.getHandle("users");
    await provider.wait();
    const handle2 = provider.getHandle("users");

    expect(handle1).toBe(handle2);
    expect(callCount).toBe(1);
  });

  // Acceptance: 미등록 이름으로 조회
  it("등록되지 않은 이름으로 getHandle()을 호출하면 에러가 발생한다", () => {
    const { provider } = setup();

    expect(() => provider.getHandle("users")).toThrow();
  });

  // Acceptance: 키로 단건 조회
  it("handle.get(key)으로 단건 조회하면 해당 항목이 반환되고, 없으면 undefined를 반환한다", async () => {
    const { provider } = setup();
    const mockData: ITestUser[] = [
      { __valueKey: 1, name: "Alice", sortOrder: 1 },
      { __valueKey: 2, name: "Bob", sortOrder: 2 },
    ];

    provider.register("users", {
      serviceKey: "main",
      getter: () => Promise.resolve(mockData),
    });

    const handle = provider.getHandle("users");
    await provider.wait();

    expect(handle.get(1)?.name).toBe("Alice");
    expect(handle.get(999)).toBeUndefined();
  });

  // Acceptance: register 재호출로 getter 변경
  it("새로운 getter로 register()를 재호출하면 기존 리스너가 초기화되고 새 getter로 리로드된다", async () => {
    const { provider } = setup();
    const oldData: ITestUser[] = [{ __valueKey: 1, name: "Old", sortOrder: 1 }];
    const newData: ITestUser[] = [{ __valueKey: 2, name: "New", sortOrder: 1 }];

    provider.register("users", {
      serviceKey: "main",
      getter: () => Promise.resolve(oldData),
    });

    const handle = provider.getHandle("users");
    await provider.wait();
    expect(handle.items()).toEqual(oldData);

    // 이전 리스너 수 기록
    const _prevListenerCount = mockClient.listenerCount;

    // 새 getter로 재등록
    provider.register("users", {
      serviceKey: "main",
      getter: () => Promise.resolve(newData),
    });

    // getHandle 재호출하여 리로드 트리거
    provider.getHandle("users");
    await provider.wait();
    expect(handle.items()).toEqual(newData);
  });

  // Acceptance: 전체 데이터 리로드 이벤트
  it("changeKeys 없이 이벤트가 수신되면 전체 데이터를 리로드한다", async () => {
    const { provider } = setup();
    let callCount = 0;
    const data1: ITestUser[] = [{ __valueKey: 1, name: "Alice", sortOrder: 1 }];
    const data2: ITestUser[] = [
      { __valueKey: 1, name: "Alice Updated", sortOrder: 1 },
      { __valueKey: 2, name: "Bob", sortOrder: 2 },
    ];

    provider.register("users", {
      serviceKey: "main",
      getter: () => {
        callCount++;
        return Promise.resolve(callCount === 1 ? data1 : data2);
      },
    });

    const handle = provider.getHandle("users");
    await provider.wait();
    expect(handle.items()).toEqual(data1);

    // 이벤트 발행 (changeKeys 없음 = 전체 리로드)
    await provider.emitAsync("users");
    await provider.wait();

    expect(handle.items()).toEqual(data2);
  });

  // Acceptance: 부분 업데이트 이벤트
  it("changeKeys로 이벤트가 수신되면 해당 키만 교체하고 재정렬한다", async () => {
    const { provider } = setup();
    const initialData: ITestUser[] = [
      { __valueKey: 1, name: "Alice", sortOrder: 1 },
      { __valueKey: 2, name: "Bob", sortOrder: 2 },
      { __valueKey: 3, name: "Charlie", sortOrder: 3 },
    ];

    let callCount = 0;
    provider.register("users", {
      serviceKey: "main",
      getter: (_changeKeys?: (string | number)[]) => {
        callCount++;
        if (callCount === 1) return Promise.resolve(initialData);
        // 부분 로드: key 2만 반환
        return Promise.resolve([{ __valueKey: 2, name: "Bob Updated", sortOrder: 0 }] as ITestUser[]);
      },
      orderBy: (a, b) => a.sortOrder - b.sortOrder,
    });

    const handle = provider.getHandle("users");
    await provider.wait();
    expect(handle.items().length).toBe(3);

    // 부분 업데이트 이벤트
    await provider.emitAsync("users", [2]);
    await provider.wait();

    const items = handle.items();
    expect(items.length).toBe(3);
    // Bob Updated는 sortOrder=0이므로 첫 번째
    expect(items[0].name).toBe("Bob Updated");
    expect(items[0].sortOrder).toBe(0);
    // 나머지는 원래 순서
    expect(items[1].name).toBe("Alice");
    expect(items[2].name).toBe("Charlie");
  });

  // Acceptance: 필터 기반 이벤트 전파
  it("emitAsync는 동일 filter를 가진 리스너에만 이벤트를 전파한다", async () => {
    const { provider } = setup();
    let loadCount = 0;

    provider.register("users", {
      serviceKey: "main",
      filter: { group: "admin" },
      getter: () => {
        loadCount++;
        return Promise.resolve([{ __valueKey: 1, name: "A", sortOrder: 1 }] as ITestUser[]);
      },
    });

    provider.getHandle("users");
    await provider.wait();
    expect(loadCount).toBe(1);

    // emitAsync 호출 시 infoSelector가 filter를 비교한다
    // MockServiceClient.emitEvent는 infoSelector(entry.info)를 호출하여
    // filter가 일치하는 리스너의 콜백만 실행하므로, 리로드가 발생해야 한다
    await provider.emitAsync("users");
    await provider.wait();

    expect(loadCount).toBe(2);
  });

  // Acceptance: 모든 로딩 완료 대기
  it("loadingCount가 0이 될 때까지 wait()가 대기한다", async () => {
    const { provider } = setup();

    provider.register("users", {
      serviceKey: "main",
      getter: async () => {
        // slow loading
        await new Promise((r) => setTimeout(r, 50));
        return [{ __valueKey: 1, name: "Alice", sortOrder: 1 }] as ITestUser[];
      },
    });

    provider.getHandle("users");

    expect(provider.loadingCount()).toBeGreaterThan(0);
    await provider.wait();
    expect(provider.loadingCount()).toBe(0);
  });

  // Unit: handle.get(undefined)은 undefined를 반환한다
  it("handle.get(undefined)은 undefined를 반환한다", async () => {
    const { provider } = setup();
    provider.register("users", {
      serviceKey: "main",
      getter: () => Promise.resolve([{ __valueKey: 1, name: "Alice", sortOrder: 1 }] as ITestUser[]),
    });

    const handle = provider.getHandle("users");
    await provider.wait();

    expect(handle.get(undefined)).toBeUndefined();
  });

  // Unit: 초기 loadingCount는 0이다
  it("초기 loadingCount는 0이다", () => {
    const { provider } = setup();
    expect(provider.loadingCount()).toBe(0);
  });

  // Unit: emitAsync는 미등록 이름에 대해 에러를 발생시킨다
  it("미등록 이름으로 emitAsync()를 호출하면 에러가 발생한다", async () => {
    const { provider } = setup();

    await expect(provider.emitAsync("users")).rejects.toThrow("등록되지 않은 공유 데이터");
  });
});
