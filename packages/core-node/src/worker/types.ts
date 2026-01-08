//#region Types

/**
 * 워커 타입 정의 인터페이스.
 * 메서드와 이벤트의 타입을 정의.
 *
 * @example
 * interface IMyWorkerType extends ISdWorkerType {
 *   methods: {
 *     calculate: { params: [number, number]; returnType: number };
 *   };
 *   events: {
 *     progress: number;
 *   };
 * }
 */
export interface ISdWorkerType {
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
export interface ISdWorkerRequest<T extends ISdWorkerType, K extends keyof T["methods"]> {
  id: string;
  method: K;
  params: T["methods"][K]["params"];
}

/**
 * 워커 응답 메시지.
 */
export type TSdWorkerResponse<T extends ISdWorkerType, K extends keyof T["methods"]> =
  | {
      request: ISdWorkerRequest<T, K>;
      type: "return";
      body?: T["methods"][K]["returnType"];
    }
  | {
      request: ISdWorkerRequest<T, K>;
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
