import { createSdWorker } from "@simplysm/core-node";
import { ServiceProtocol } from "@simplysm/service-common";
import type { ServiceProtocolWorker } from "../protocol/protocol.worker-types";

const protocol = new ServiceProtocol();

createSdWorker<ServiceProtocolWorker>({
  encode: (uuid, message) => {
    return protocol.encode(uuid, message);
  },
  decode: (bufferData) => {
    return protocol.decode(Buffer.from(bufferData));
  },
});
