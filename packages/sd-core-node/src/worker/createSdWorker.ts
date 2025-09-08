import { JsonConvert } from "@simplysm/sd-core-common";
import { parentPort } from "worker_threads";
import { ISdWorkerRequest, ISdWorkerType, TSdWorkerResponse } from "./types";

export function createSdWorker<T extends ISdWorkerType>(methods: {
  [P in keyof T["methods"]]: (
    ...args: T["methods"][P]["params"]
  ) => T["methods"][P]["returnType"] | Promise<T["methods"][P]["returnType"]>;
}) {
  if (!parentPort)
    throw new Error("This script must be run as a worker thread (parentPort required).");

  process.stdout.write = (chunk) => {
    parentPort!.postMessage(JsonConvert.stringify({ type: "log", body: chunk.toString() }));
    return true;
  };

  parentPort.on("message", async (requestJson: string) => {
    const request: ISdWorkerRequest<T, any> = JsonConvert.parse(requestJson);
    for (const methodName of Object.keys(methods)) {
      if (request.method === methodName) {
        try {
          const result = await methods[methodName](...request.params);
          const response: TSdWorkerResponse<T, any> = {
            request,
            type: "return",
            body: result,
          };

          parentPort!.postMessage(JsonConvert.stringify(response));
        } catch (err) {
          const response: TSdWorkerResponse<T, any> = {
            request,
            type: "error",
            body: err,
          };

          parentPort!.postMessage(JsonConvert.stringify(response));
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

      parentPort!.postMessage(JsonConvert.stringify(response));
    },
  };
}
