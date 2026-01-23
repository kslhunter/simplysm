import { parentPort } from "worker_threads";
import { SdError, TransferableConvert } from "@simplysm/core-common";
import type { SdWorkerRequest, SdWorkerResponse } from "./types";

//#region createSdWorker

/**
 * 워커 스레드에서 사용할 워커 팩토리.
 *
 * @example
 * // 이벤트 없는 워커
 * export default createSdWorker({
 *   add: (a: number, b: number) => a + b,
 * });
 *
 * // 이벤트 있는 워커
 * interface MyEvents { progress: number; }
 * const methods = {
 *   calc: (x: number) => { sender.send("progress", 50); return x * 2; },
 * };
 * const sender = createSdWorker<typeof methods, MyEvents>(methods);
 * export default sender;
 */
export function createSdWorker<
  TMethods extends Record<string, (...args: any[]) => unknown>,
  TEvents extends Record<string, unknown> = Record<string, never>,
>(methods: TMethods): {
  send<K extends keyof TEvents & string>(event: K, data?: TEvents[K]): void;
  __methods: TMethods;
  __events: TEvents;
} {
  if (parentPort === null) {
    throw new SdError("This script must be run as a worker thread (parentPort required).");
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
    const response: SdWorkerResponse = { type: "log", body };
    const serialized = TransferableConvert.encode(response);
    port.postMessage(serialized.result, serialized.transferList);

    const cb = typeof encodingOrCallback === "function" ? encodingOrCallback : callback;
    if (cb) {
      queueMicrotask(() => cb());
    }

    return true;
  };

  port.on("message", async (serializedRequest: unknown) => {
    const decoded = TransferableConvert.decode(serializedRequest);

    // 요청 구조 검증
    if (
      decoded == null ||
      typeof decoded !== "object" ||
      !("id" in decoded) ||
      !("method" in decoded) ||
      !("params" in decoded)
    ) {
      const errorResponse: SdWorkerResponse = {
        type: "error",
        request: { id: "unknown", method: "unknown", params: [] },
        body: new SdError(`잘못된 형식의 워커 요청 수신: ${JSON.stringify(decoded)}`),
      };
      const serialized = TransferableConvert.encode(errorResponse);
      port.postMessage(serialized.result, serialized.transferList);
      return;
    }
    const request = decoded as SdWorkerRequest;

    const methodFn = methods[request.method] as ((...args: unknown[]) => unknown) | undefined;

    if (methodFn == null) {
      const response: SdWorkerResponse = {
        request,
        type: "error",
        body: new SdError(`알 수 없는 메서드: ${request.method}`),
      };

      const serialized = TransferableConvert.encode(response);
      port.postMessage(serialized.result, serialized.transferList);
      return;
    }

    try {
      const result = await methodFn(...(request.params));

      const response: SdWorkerResponse = {
        request,
        type: "return",
        body: result,
      };

      const serialized = TransferableConvert.encode(response);
      port.postMessage(serialized.result, serialized.transferList);
    } catch (err) {
      const response: SdWorkerResponse = {
        request,
        type: "error",
        body: err instanceof Error ? err : new Error(String(err)),
      };

      const serialized = TransferableConvert.encode(response);
      port.postMessage(serialized.result, serialized.transferList);
    }
  });

  return {
    __methods: methods,
    __events: {} as TEvents,
    send<K extends keyof TEvents & string>(event: K, data?: TEvents[K]) {
      const response: SdWorkerResponse = {
        type: "event",
        event,
        body: data,
      };

      const serialized = TransferableConvert.encode(response);
      port.postMessage(serialized.result, serialized.transferList);
    },
  };
}

//#endregion
