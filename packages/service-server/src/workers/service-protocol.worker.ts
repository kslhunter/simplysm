import { createWorker } from "@simplysm/core-node";
import type { Bytes } from "@simplysm/core-common";
import type { ServiceMessageDecodeResult, ServiceMessage } from "@simplysm/service-common";
import { ServiceProtocol } from "@simplysm/service-common";

const protocol = new ServiceProtocol();

export default createWorker({
  encode: (uuid: string, message: ServiceMessage): { chunks: Bytes[]; totalSize: number } => {
    return protocol.encode(uuid, message);
  },
  decode: (bytes: Bytes): ServiceMessageDecodeResult<ServiceMessage> => {
    return protocol.decode(bytes);
  },
});
