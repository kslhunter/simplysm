import { SdServiceServer } from "./SdServiceServer";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import { SdServiceServerConnection } from "./SdServiceServerConnection";

export class SdServiceBase {
  public server!: SdServiceServer;
  public conn!: SdServiceServerConnection;
  public request!: ISdServiceRequest;
}
