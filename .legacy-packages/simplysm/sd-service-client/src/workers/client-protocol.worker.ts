/// <reference lib="webworker" />

import { SdServiceProtocol } from "@simplysm/sd-service-common";
import { TransferableConvert } from "@simplysm/sd-core-common";

const protocol = new SdServiceProtocol();

self.onmessage = (event: MessageEvent) => {
  const { id, type, data } = event.data;

  try {
    let result: any;
    let transferList: Transferable[] = [];

    if (type === "encode") {
      // [Main -> Worker] 인코딩 요청 (data: { uuid, message })
      // message는 이미 Plain Object로 넘어옴 (Structured Clone)
      const { uuid, message } = data;
      const { chunks } = protocol.encode(uuid, message);

      // Buffer[]는 전송 가능하므로 결과로 반환
      result = chunks;
      // 결과물 청크들의 내부 ArrayBuffer를 소유권 이전 목록에 추가
      transferList = chunks.map((chunk) => chunk.buffer);
    } else if (type === "decode") {
      // [Main -> Worker] 디코딩 요청 (data: Buffer)
      // data는 Uint8Array(Buffer)로 넘어옴
      const buffer = Buffer.from(data);
      const decodeResult = protocol.decode(buffer);

      // 결과물(객체)을 전송 가능한 형태로 변환 (Zero-Copy 준비)
      const encoded = TransferableConvert.encode(decodeResult);
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
      error:
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : { message: String(err) },
    });
  }
};
