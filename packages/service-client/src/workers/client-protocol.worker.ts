/// <reference lib="webworker" />

import { createServiceProtocol } from "@simplysm/service-common";
import { transferableEncode } from "@simplysm/core-common";

const protocol = createServiceProtocol();

self.onmessage = (event: MessageEvent) => {
  const { id, type, data } = event.data as {
    id: string;
    type: "encode" | "decode";
    data: unknown;
  };

  try {
    let result: unknown;
    let transferList: Transferable[] = [];

    if (type === "encode") {
      // [Main -> Worker] Encode request (data: { uuid, message })
      // message is already a Plain Object (via Structured Clone)
      const { uuid, message } = data as {
        uuid: string;
        message: Parameters<typeof protocol.encode>[1];
      };
      const { chunks } = protocol.encode(uuid, message);

      // Buffer[] is transferable, return as result
      result = chunks;
      // Add internal ArrayBuffers of result chunks to transfer list
      transferList = chunks.map((chunk) => chunk.buffer as ArrayBuffer);
    } else {
      // [Main -> Worker] Decode request (data: Uint8Array)
      // data arrives as Uint8Array
      const bytes = new Uint8Array(data as ArrayBuffer);
      const decodeResult = protocol.decode(bytes);

      // Convert result object to transferable form (prepare for zero-copy)
      const encoded = transferableEncode(decodeResult);
      result = encoded.result;
      transferList = encoded.transferList;
    }

    // [Worker -> Main] Success response
    self.postMessage({ id, type: "success", result }, { transfer: transferList });
  } catch (err) {
    // [Worker -> Main] Error response
    self.postMessage({
      id,
      type: "error",
      error:
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : { message: String(err) },
    });
  }
};
