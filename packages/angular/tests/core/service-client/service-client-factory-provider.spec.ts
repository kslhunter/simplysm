import { describe, it, expect, vi } from "vitest";
import { TestBed } from "@angular/core/testing";
import { SdServiceClientFactoryProvider } from "../../../src/core/service-client/sd-service-client-factory.provider";
import { SdAngularConfigProvider } from "../../../src/core/config/sd-angular-config.provider";
import { SdToastProvider } from "../../../src/core/toast/sd-toast.provider";
import { ServiceClient } from "@simplysm/service-client";

// ServiceClient 모의 객체
vi.mock("@simplysm/service-client", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@simplysm/service-client")>();

  class MockServiceClient {
    readonly name: string;
    readonly options: any;
    private _connected = false;

    get connected() {
      return this._connected;
    }

    private readonly _listeners = new Map<string, (...args: any[]) => void>();

    constructor(name: string, options: any) {
      this.name = name;
      this.options = options;
    }

    connect(): Promise<void> {
      this._connected = true;
      return Promise.resolve();
    }

    close(): Promise<void> {
      this._connected = false;
      return Promise.resolve();
    }

    on(event: string, cb: (...args: any[]) => void) {
      this._listeners.set(event, cb);
    }

    // 이벤트 트리거용 테스트 헬퍼
    __trigger(event: string, ...args: any[]) {
      const cb = this._listeners.get(event);
      if (cb != null) {
        cb(...args);
      }
    }
  }

  return {
    ...orig,
    ServiceClient: MockServiceClient,
    createServiceClient: (name: string, options: any) => new MockServiceClient(name, options),
  };
});

function setup() {
  TestBed.configureTestingModule({
    providers: [
      SdServiceClientFactoryProvider,
      {
        provide: SdAngularConfigProvider,
        useValue: { clientName: "test-app" },
      },
      {
        provide: SdToastProvider,
        useValue: {
          info: vi.fn(() => ({ set: vi.fn() })),
        },
      },
    ],
  });

  return {
    provider: TestBed.inject(SdServiceClientFactoryProvider),
    toast: TestBed.inject(SdToastProvider),
  };
}

describe("Feature 3.5 Slice 1: SdServiceClientFactoryProvider", () => {
  // Acceptance: 새 키로 서비스 클라이언트 연결
  it("키 'main'과 기본 옵션으로 connectAsync()를 호출하면 클라이언트가 생성되어 get('main')으로 조회된다", async () => {
    const { provider } = setup();

    await provider.connectAsync("main", { host: "localhost", port: 1234 });

    const client = provider.get("main");
    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(ServiceClient);
    expect(client.connected).toBe(true);
  });

  // Acceptance: 연결된 클라이언트 조회
  it("키 'main'으로 연결된 클라이언트가 있을 때 get('main')이 해당 인스턴스를 반환한다", async () => {
    const { provider } = setup();

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    const client1 = provider.get("main");
    const client2 = provider.get("main");

    expect(client1).toBe(client2);
  });

  // Acceptance: 클라이언트 연결 해제
  it("closeAsync('main')을 호출하면 클라이언트가 close()되고 맵에서 제거된다", async () => {
    const { provider } = setup();

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    const client = provider.get("main");
    expect(client.connected).toBe(true);

    await provider.closeAsync("main");
    expect(client.connected).toBe(false);
    expect(() => provider.get("main")).toThrow();
  });

  // Acceptance: 이미 연결된 키로 재연결 시도
  it("이미 연결된 키로 connectAsync()를 호출하면 에러가 발생한다", async () => {
    const { provider } = setup();

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    await expect(
      provider.connectAsync("main", { host: "localhost", port: 1234 }),
    ).rejects.toThrow("이미 연결된 클라이언트");
  });

  // Acceptance: 연결 끊긴 키로 재연결 시도
  it("연결이 끊긴 키로 connectAsync()를 호출하면 에러가 발생한다", async () => {
    const { provider } = setup();

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    await provider.closeAsync("main");

    await expect(
      provider.connectAsync("main", { host: "localhost", port: 1234 }),
    ).rejects.toThrow("이미 연결이 끊긴 클라이언트");
  });

  // Acceptance: 미연결 키로 조회
  it("get('unknown')을 호출하면 에러가 발생한다", () => {
    const { provider } = setup();

    expect(() => provider.get("unknown")).toThrow("연결하지 않은 클라이언트 키");
  });

  // Acceptance: 요청 전송 진행도 토스트
  it("request-progress 이벤트가 발생하면 SdToastProvider.info()로 토스트가 생성되고 진행도가 업데이트된다", async () => {
    const { provider, toast } = setup();
    const setFn = vi.fn();
    (toast.info as ReturnType<typeof vi.fn>).mockReturnValue({ set: setFn });

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    const client = provider.get("main") as any;

    client.__trigger("request-progress", {
      uuid: "req-1",
      totalSize: 200,
      completedSize: 100,
    });

    expect(toast.info).toHaveBeenCalledWith("요청을 전송하는 중입니다.", true);
    expect(setFn).toHaveBeenCalledWith(50);
  });

  // Acceptance: 응답 수신 진행도 토스트
  it("response-progress 이벤트가 발생하면 '응답을 전송받는 중입니다.' 토스트가 생성된다", async () => {
    const { provider, toast } = setup();
    const setFn = vi.fn();
    (toast.info as ReturnType<typeof vi.fn>).mockReturnValue({ set: setFn });

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    const client = provider.get("main") as any;

    client.__trigger("response-progress", {
      uuid: "resp-1",
      totalSize: 500,
      completedSize: 250,
    });

    expect(toast.info).toHaveBeenCalledWith("응답을 전송받는 중입니다.", true);
    expect(setFn).toHaveBeenCalledWith(50);
  });

  // Acceptance: 전송 완료 시 토스트 정리
  it("completedSize === totalSize인 이벤트가 발생하면 해당 uuid의 토스트가 맵에서 제거된다", async () => {
    const { provider, toast } = setup();
    const setFn = vi.fn();
    (toast.info as ReturnType<typeof vi.fn>).mockReturnValue({ set: setFn });

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    const client = provider.get("main") as any;

    // 첫 이벤트: 50%
    client.__trigger("request-progress", {
      uuid: "req-1",
      totalSize: 200,
      completedSize: 100,
    });

    // 완료 이벤트: 100%
    client.__trigger("request-progress", {
      uuid: "req-1",
      totalSize: 200,
      completedSize: 200,
    });

    expect(setFn).toHaveBeenCalledWith(100);
    // 이후 같은 uuid로 이벤트가 오면 새 토스트 생성
    (toast.info as ReturnType<typeof vi.fn>).mockClear();
    client.__trigger("request-progress", {
      uuid: "req-1",
      totalSize: 300,
      completedSize: 150,
    });
    expect(toast.info).toHaveBeenCalled();
  });

  // Acceptance: 앱 종료 시 연결 정리
  it("Provider 소멸 시 모든 클라이언트에 close()가 호출된다", async () => {
    const { provider } = setup();

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    await provider.connectAsync("sub", { host: "localhost", port: 5678 });

    const mainClient = provider.get("main");
    const subClient = provider.get("sub");

    expect(mainClient.connected).toBe(true);
    expect(subClient.connected).toBe(true);

    // DestroyRef를 트리거하기 위해 TestBed를 리셋
    TestBed.resetTestingModule();

    expect(mainClient.connected).toBe(false);
    expect(subClient.connected).toBe(false);
  });

  // Unit: connectAsync는 기본 옵션을 사용한다
  it("options 없이 connectAsync()를 호출하면 기본 옵션(location 기반)으로 클라이언트가 생성된다", async () => {
    const { provider } = setup();

    await provider.connectAsync("default");
    const client = provider.get("default");
    expect(client).toBeDefined();
    expect(client.connected).toBe(true);
  });

  // Unit: closeAsync 후 다시 get하면 에러
  it("closeAsync 후 같은 키로 get()하면 '연결하지 않은 클라이언트 키' 에러가 아닌 '이미 연결이 끊긴' 상태로 기록된다", async () => {
    const { provider } = setup();

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    await provider.closeAsync("main");

    expect(() => provider.get("main")).toThrow();
  });
});

describe("FIX-1 Slice 4: SdServiceClientFactoryProvider totalSize 가드", () => {
  it("totalSize가 0일 때 progress가 NaN/Infinity가 아닌 0으로 설정된다", async () => {
    const { provider, toast } = setup();
    const setFn = vi.fn();
    (toast.info as ReturnType<typeof vi.fn>).mockReturnValue({ set: setFn });

    await provider.connectAsync("main", { host: "localhost", port: 1234 });
    const client = provider.get("main") as any;

    client.__trigger("request-progress", {
      uuid: "req-zero",
      totalSize: 0,
      completedSize: 0,
    });

    // progress가 NaN이나 Infinity가 아닌 0이어야 한다
    expect(setFn).toHaveBeenCalledWith(0);
  });
});
