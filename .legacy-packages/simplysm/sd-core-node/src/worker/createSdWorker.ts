import { parentPort } from "worker_threads";
import type { ISdWorkerRequest, ISdWorkerType, TSdWorkerResponse } from "./types";
import { TransferableConvert } from "@simplysm/sd-core-common";

export function createSdWorker<T extends ISdWorkerType>(methods: {
  [P in keyof T["methods"]]: (
    ...args: T["methods"][P]["params"]
  ) => T["methods"][P]["returnType"] | Promise<T["methods"][P]["returnType"]>;
}) {
  if (!parentPort)
    throw new Error("This script must be run as a worker thread (parentPort required).");

  process.stdout.write = (chunk) => {
    const serialized = TransferableConvert.encode({ type: "log", body: chunk });
    parentPort!.postMessage(serialized.result, serialized.transferList);
    return true;
  };

  parentPort.on("message", async (serializedRequest: any) => {
    const request: ISdWorkerRequest<T, any> = TransferableConvert.decode(serializedRequest);
    for (const methodName of Object.keys(methods)) {
      if (request.method === methodName) {
        try {
          const result = await methods[methodName](...request.params);
          const response: TSdWorkerResponse<T, any> = {
            request,
            type: "return",
            body: result,
          };

          const serialized = TransferableConvert.encode(response);
          parentPort!.postMessage(serialized.result, serialized.transferList);
        } catch (err) {
          const response: TSdWorkerResponse<T, any> = {
            request,
            type: "error",
            body: err instanceof Error ? err : new Error(String(err)),
          };

          const serialized = TransferableConvert.encode(response);
          parentPort!.postMessage(serialized.result, serialized.transferList);
        }
        return;
      }
    }
  });

  return {
    send<K extends keyof T["events"] & string>(event: K, body?: T["events"][K]) {
      const response: TSdWorkerResponse<T, any> = {
        type: "event",
        event,
        body,
      };

      const serialized = TransferableConvert.encode(response);
      parentPort!.postMessage(serialized.result, serialized.transferList);
    },
  };
}
