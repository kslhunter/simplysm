import { parentPort } from "worker_threads";
import { SdError, transferableDecode, transferableEncode } from "@simplysm/core-common";
import type { WorkerRequest, WorkerResponse } from "./types";

//#region createSdWorker

/**
 * 워커 스레드에서 사용할 워커 팩토리.
 *
 * @example
 * // 이벤트 없는 워커
 * export default createWorker({
 *   add: (a: number, b: number) => a + b,
 * });
 *
 * // 이벤트 있는 워커
 * interface MyEvents { progress: number; }
 * const methods = {
 *   calc: (x: number) => { sender.send("progress", 50); return x * 2; },
 * };
 * const sender = createWorker<typeof methods, MyEvents>(methods);
 * export default sender;
 */
export function createWorker<
  TMethods extends Record<string, (...args: any[]) => unknown>,
  TEvents extends Record<string, unknown> = Record<string, never>,
>(
  methods: TMethods,
): {
  send<K extends keyof TEvents & string>(event: K, data?: TEvents[K]): void;
  __methods: TMethods;
  __events: TEvents;
} {
  if (parentPort === null) {
    throw new SdError("This script must be executed in a worker thread (parentPort required).");
  }

  const port = parentPort;

  // Worker 스레드의 stdout은 메인 스레드로 자동 전달되지 않음
  // stdout.write를 가로채서 메시지 프로토콜을 통해 메인 스레드로 전달
  process.stdout.write = (
    chunk: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((err?: Error) => void),
    callback?: (err?: Error) => void,
  ): boolean => {
    const body = typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);
    const response: WorkerResponse = { type: "log", body };
    const serialized = transferableEncode(response);
    port.postMessage(serialized.result, serialized.transferList);

    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (cb) {
      queueMicrotask(() => cb());
    }

    return true;
  };

  port.on("message", async (serializedRequest: unknown) => {
    const decoded = transferableDecode(serializedRequest);

    // 요청 구조 검증
    if (
      decoded == null ||
      typeof decoded !== "object" ||
      !("id" in decoded) ||
      !("method" in decoded) ||
      !("params" in decoded)
    ) {
      let decodedStr: string;
      try {
        decodedStr = JSON.stringify(decoded);
      } catch {
        decodedStr = String(decoded);
      }
      const errorResponse: WorkerResponse = {
        type: "error",
        request: { id: "unknown", method: "unknown", params: [] },
        body: new SdError(`Invalid worker request format: ${decodedStr}`),
      };
      const serialized = transferableEncode(errorResponse);
      port.postMessage(serialized.result, serialized.transferList);
      return;
    }
    const request = decoded as WorkerRequest;

    const methodFn = methods[request.method] as ((...args: unknown[]) => unknown) | undefined;

    if (methodFn == null) {
      const response: WorkerResponse = {
        request,
        type: "error",
        body: new SdError(`Unknown method: ${request.method}`),
      };

      const serialized = transferableEncode(response);
      port.postMessage(serialized.result, serialized.transferList);
      return;
    }

    try {
      const result = await methodFn(...request.params);

      const response: WorkerResponse = {
        request,
        type: "return",
        body: result,
      };

      const serialized = transferableEncode(response);
      port.postMessage(serialized.result, serialized.transferList);
    } catch (err) {
      const response: WorkerResponse = {
        request,
        type: "error",
        body: err instanceof Error ? err : new Error(String(err)),
      };

      const serialized = transferableEncode(response);
      port.postMessage(serialized.result, serialized.transferList);
    }
  });

  return {
    __methods: methods,
    __events: {} as TEvents,
    send<K extends keyof TEvents & string>(event: K, data?: TEvents[K]) {
      const response: WorkerResponse = {
        type: "event",
        event,
        body: data,
      };

      const serialized = transferableEncode(response);
      port.postMessage(serialized.result, serialized.transferList);
    },
  };
}

//#endregion
