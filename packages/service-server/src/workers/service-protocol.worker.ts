import { createSdWorker } from "@simplysm/core-node";
import { ServiceProtocol } from "@simplysm/service-common";
import type { IServiceProtocolWorker } from "../protocol/protocol.worker-types";

const protocol = new ServiceProtocol();

createSdWorker<IServiceProtocolWorker>({
  encode: (uuid, message) => {
    return protocol.encode(uuid, message);
  },
  decode: (bufferData) => {
    return protocol.decode(Buffer.from(bufferData));
  },
});
