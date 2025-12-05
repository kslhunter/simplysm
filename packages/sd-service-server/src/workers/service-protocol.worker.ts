import { createSdWorker } from "@simplysm/sd-core-node";
import { SdServiceProtocol } from "@simplysm/sd-service-common";
import { ISdServiceProtocolWorker } from "../internal/protocol/protocol.worker-types";

const protocol = new SdServiceProtocol();

createSdWorker<ISdServiceProtocolWorker>({
  encode: (uuid, message) => {
    return protocol.encode(uuid, message);
  },
  decode: (bufferData) => {
    return protocol.decode(Buffer.from(bufferData));
  },
});
