import { parentPort } from "worker_threads";
import { TransferableConvert } from "@simplysm/core-common";
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
    throw new Error("This script must be run as a worker thread (parentPort required).");
  }

  const port = parentPort;

  // stdout.write를 가로채서 메인 스레드로 전달
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
    const request: SdWorkerRequest = TransferableConvert.decode(
      serializedRequest,
    ) as SdWorkerRequest;

    const methodFn = methods[request.method];

    try {
      const result = await methodFn(...(request.params as Parameters<typeof methodFn>));

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
