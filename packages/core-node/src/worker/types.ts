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
 * 메서드 반환값을 Promise로 감싸는 매핑 타입.
 * 워커 메서드는 postMessage 기반으로 동작하여 항상 비동기이므로,
 * 동기 메서드 타입도 `Promise<Awaited<R>>`로 변환된다.
 */
export type PromisifyMethods<TMethods> = {
  [K in keyof TMethods]: TMethods[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};

/**
 * Worker.create()가 반환하는 프록시 타입.
 * Promise화된 메서드 + on() + terminate()을 제공한다.
 */
export type WorkerProxy<TModule extends WorkerModule> = PromisifyMethods<
  TModule["default"]["__methods"]
> & {
  /**
   * 워커 이벤트 리스너를 등록한다.
   */
  on<TEventName extends keyof TModule["default"]["__events"] & string>(
    event: TEventName,
    listener: (data: TModule["default"]["__events"][TEventName]) => void,
  ): void;

  /**
   * 워커 이벤트 리스너를 해제한다.
   */
  off<TEventName extends keyof TModule["default"]["__events"] & string>(
    event: TEventName,
    listener: (data: TModule["default"]["__events"][TEventName]) => void,
  ): void;

  /**
   * 워커를 종료한다.
   */
  terminate(): Promise<void>;
};

/**
 * 내부 워커 요청 메시지.
 */
export interface WorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}

/**
 * 내부 워커 응답 메시지.
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
