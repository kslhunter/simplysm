import { parentPort } from "worker_threads";
import { TransferableConvert } from "@simplysm/core-common";
import type { ISdWorkerRequest, ISdWorkerType, TSdWorkerResponse } from "./types";

//#region createSdWorker

/**
 * 워커 스레드에서 사용할 워커 팩토리.
 * 메서드 핸들러를 등록하고 이벤트 발행 기능 제공.
 *
 * @example
 * // my-worker.ts
 * const sender = createSdWorker<IMyWorkerType>({
 *   calculate: async (a, b) => {
 *     sender.send("progress", 50);
 *     return a + b;
 *   }
 * });
 *
 * @param methods - 메서드 핸들러 맵
 * @returns 이벤트 발행 함수를 포함한 객체
 */
export function createSdWorker<T extends ISdWorkerType>(methods: {
  [P in keyof T["methods"]]: (
    ...args: T["methods"][P]["params"]
  ) => T["methods"][P]["returnType"] | Promise<T["methods"][P]["returnType"]>;
}): {
  /**
   * 메인 스레드로 이벤트 발행.
   */
  send: <K extends keyof T["events"] & string>(event: K, body?: T["events"][K]) => void;
} {
  if (parentPort === null) {
    throw new Error("This script must be run as a worker thread (parentPort required).");
  }

  const port = parentPort;

  // stdout.write를 가로채서 메인 스레드로 전달
  process.stdout.write = (chunk) => {
    const serialized = TransferableConvert.encode({ type: "log", body: chunk });
    port.postMessage(serialized.result, serialized.transferList);
    return true;
  };

  port.on("message", async (serializedRequest: unknown) => {
    const request: ISdWorkerRequest<T, keyof T["methods"]> = TransferableConvert.decode(
      serializedRequest,
    ) as ISdWorkerRequest<T, keyof T["methods"]>;

    const methodFn = methods[request.method];

    try {
      const result = await methodFn(...(request.params as Parameters<typeof methodFn>));

      const response: TSdWorkerResponse<T, keyof T["methods"]> = {
        request,
        type: "return",
        body: result,
      };

      const serialized = TransferableConvert.encode(response);
      port.postMessage(serialized.result, serialized.transferList);
    } catch (err) {
      const response: TSdWorkerResponse<T, keyof T["methods"]> = {
        request,
        type: "error",
        body: err instanceof Error ? err : new Error(String(err)),
      };

      const serialized = TransferableConvert.encode(response);
      port.postMessage(serialized.result, serialized.transferList);
    }
  });

  return {
    send<K extends keyof T["events"] & string>(event: K, body?: T["events"][K]) {
      const response: TSdWorkerResponse<T, keyof T["methods"]> = {
        type: "event",
        event,
        body,
      };

      const serialized = TransferableConvert.encode(response);
      port.postMessage(serialized.result, serialized.transferList);
    },
  };
}

//#endregion
