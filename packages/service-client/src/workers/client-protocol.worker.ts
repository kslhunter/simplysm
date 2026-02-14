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
      // [Main -> Worker] 인코딩 요청 (data: { uuid, message })
      // message는 이미 Plain Object로 넘어옴 (Structured Clone)
      const { uuid, message } = data as {
        uuid: string;
        message: Parameters<typeof protocol.encode>[1];
      };
      const { chunks } = protocol.encode(uuid, message);

      // Buffer[]는 전송 가능하므로 결과로 반환
      result = chunks;
      // 결과물 청크들의 내부 ArrayBuffer를 소유권 이전 목록에 추가
      transferList = chunks.map((chunk) => chunk.buffer as ArrayBuffer);
    } else {
      // [Main -> Worker] 디코딩 요청 (data: Uint8Array)
      // data는 Uint8Array로 넘어옴
      const bytes = new Uint8Array(data as ArrayBuffer);
      const decodeResult = protocol.decode(bytes);

      // 결과물(객체)을 전송 가능한 형태로 변환 (Zero-Copy 준비)
      const encoded = transferableEncode(decodeResult);
      result = encoded.result;
      transferList = encoded.transferList;
    }

    // [Worker -> Main] 성공 응답
    self.postMessage({ id, type: "success", result }, { transfer: transferList });
  } catch (err) {
    // [Worker -> Main] 에러 응답
    self.postMessage({
      id,
      type: "error",
      error: err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) },
    });
  }
};
