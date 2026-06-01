import { createWorker } from "@simplysm/core-node";
import type { Bytes } from "@simplysm/core-common";
import type { ServiceMessage } from "@simplysm/service-common";
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();

export default createWorker({
  encode: (uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number } => {
    return protocol.encode(uuid, message);
  },
  // 재조립 완료된 raw 바이트의 무거운 JSON 파싱만 worker 에서 수행 (stateless)
  parseMessage: (resultBytes: Bytes): ServiceMessage => {
    return protocol.parseMessage(resultBytes);
  },
});
