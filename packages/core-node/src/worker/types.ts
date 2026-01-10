//#region Types

/**
 * 워커 타입 정의 인터페이스.
 * 메서드와 이벤트의 타입을 정의.
 *
 * @example
 * interface MyWorkerType extends SdWorkerType {
 *   methods: {
 *     calculate: { params: [number, number]; returnType: number };
 *   };
 *   events: {
 *     progress: number;
 *   };
 * }
 */
export interface SdWorkerType {
  methods: Record<
    string,
    {
      params: unknown[];
      returnType: unknown;
    }
  >;
  events: Record<string, unknown>;
}

/**
 * 워커 요청 메시지.
 */
export interface SdWorkerRequest<T extends SdWorkerType, K extends keyof T["methods"]> {
  id: string;
  method: K;
  params: T["methods"][K]["params"];
}

/**
 * 워커 응답 메시지.
 */
export type SdWorkerResponse<T extends SdWorkerType, K extends keyof T["methods"]> =
  | {
      request: SdWorkerRequest<T, K>;
      type: "return";
      body?: T["methods"][K]["returnType"];
    }
  | {
      request: SdWorkerRequest<T, K>;
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
