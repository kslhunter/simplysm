//#region Types

/**
 * Worker 모듈 타입 (기본 구조).
 */
export interface SdWorkerModule {
  default: {
    __methods: Record<string, (...args: any[]) => unknown>;
    __events: Record<string, unknown>;
  };
}

/**
 * 메서드를 Promise 반환 타입으로 변환.
 */
export type PromisifyMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => infer R
    ? (...args: P) => Promise<Awaited<R>>
    : never;
};

/**
 * SdWorker.create()가 반환하는 Proxy 타입.
 * Promisified 메서드들 + on() + terminate() 제공.
 */
export type SdWorkerProxy<TModule extends SdWorkerModule> = PromisifyMethods<
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
   * 워커 종료.
   */
  terminate(): Promise<void>;
};

/**
 * Worker 내부 요청 메시지.
 */
export interface SdWorkerRequest {
  id: string;
  method: string;
  params: unknown[];
}

/**
 * Worker 내부 응답 메시지.
 */
export type SdWorkerResponse =
  | {
      request: SdWorkerRequest;
      type: "return";
      body?: unknown;
    }
  | {
      request: SdWorkerRequest;
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
