import { ISdWorkerRequest, ISdWorkerType, TSdWorkerResponse } from "./sd-worker.types";
import { JsonConvert } from "@simplysm/sd-core-common";

export function createSdWorker<T extends ISdWorkerType>(methods: {
  [P in keyof T["methods"]]: (
    ...args: T["methods"][P]["params"]
  ) => T["methods"][P]["returnType"] | Promise<T["methods"][P]["returnType"]>;
}) {
  process.on("message", async (requestJson: string) => {
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
          process.send!(JsonConvert.stringify(response));
        } catch (err) {
          const response: TSdWorkerResponse<T, any> = {
            request,
            type: "error",
            body: err,
          };
          process.send!(JsonConvert.stringify(response));
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
      process.send!(JsonConvert.stringify(response));
    },
  };
}
