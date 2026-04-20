/// <reference lib="webworker" />

import { createServiceProtocol } from "@simplysm/service-common";
import { transfer } from "@simplysm/core-common";

const protocol = createServiceProtocol();

interface WorkerRequest {
  id: string;
  type: "encode" | "decode";
  data: unknown;
}

function handleRequest(msg: WorkerRequest): {
  response: { id: string; type: "success" | "error"; result?: unknown; error?: { message: string; stack?: string } };
  transferList: Transferable[];
} {
  try {
    let result: unknown;
    let transferList: Transferable[] = [];

    if (msg.type === "encode") {
      const { uuid, message } = msg.data as {
        uuid: string;
        message: Parameters<typeof protocol.encode>[1];
      };
      const { chunks } = protocol.encode(uuid, message);
      result = chunks;
      transferList = chunks.map((chunk) => chunk.buffer as ArrayBuffer);
    } else {
      const bytes = new Uint8Array(msg.data as ArrayBuffer);
      const decodeResult = protocol.decode(bytes);
      const encoded = transfer.encode(decodeResult);
      result = encoded.result;
      transferList = encoded.transferList;
    }

    return { response: { id: msg.id, type: "success", result }, transferList };
  } catch (err) {
    return {
      response: {
        id: msg.id,
        type: "error",
        error: err instanceof Error
          ? { message: err.message, stack: err.stack }
          : { message: String(err) },
      },
      transferList: [],
    };
  }
}

if (typeof self !== "undefined" && typeof self.postMessage === "function") {
  // Browser Worker
  self.onmessage = (event: MessageEvent) => {
    const { response, transferList } = handleRequest(event.data as WorkerRequest);
    self.postMessage(response, transferList);
  };
} else {
  // Node.js worker_threads
  const workerThreadsId = "worker_threads";
  const { parentPort } = await import(workerThreadsId);
  if (parentPort != null) {
    parentPort.on("message", (data: unknown) => {
      const { response, transferList } = handleRequest(data as WorkerRequest);
      parentPort.postMessage(response, transferList as ArrayBuffer[]);
    });
  }
}
