//#region Types

/**
 * `createWorker()`가 반환하는 워커 모듈의 타입 구조.
 * `Worker.create<typeof import("./worker")>()`에서 타입 추론에 사용된다.
 *
 * @see createWorker - 워커 모듈 생성
 * @see Worker.create - 워커 프록시 생성
 */
export interface WorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}

/**
 * 메서드 타입의 반환값을 Promise로 래핑하는 매핑 타입.
 * 워커 메서드는 postMessage 기반으로 동작하여 항상 비동기이므로,
 * 동기 메서드 타입도 `Promise<Awaited<R>>`로 변환한다.
 */
export type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};

/**
 * SdWorker.create()가 반환하는 Proxy 타입.
 * Promisified 메서드들 + on() + terminate() 제공.
 */
export type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<
  TModule["default"]["__methods"]
> & {
  /**
   * 워커 이벤트 리스너 등록.
   */
  on<K extends keyof TModule["default"]["__events"] & string>(
    event: K,
    listener: (data: TModule["default"]["__events"][K]) => void,
  ): void;

  /**
   * 워커 이벤트 리스너 제거.
   */
  off<K extends keyof TModule["default"]["__events"] & string>(
    event: K,
    listener: (data: TModule["default"]["__events"][K]) => void,
  ): void;

  /**
   * 워커 종료.
   */
  terminate(): Promise<void>;
};

/**
 * Worker 내부 요청 메시지.
 */
export interface WorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}

/**
 * Worker 내부 응답 메시지.
 */
export type WorkerResponse =
  | {
      request: WorkerRequest;
      type: "return";
      body?: unknown;
    }
  | {
      request: WorkerRequest;
      type: "error";
      body: Error;
    }
  | {
      type: "event";
      event: string;
      body?: unknown;
    }
  | {
      type: "log";
      body: string;
    };

//#endregion
