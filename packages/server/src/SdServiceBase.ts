import {ISdServerRequest} from "@simplysm/common";
import {SdServer} from "./SdServer";
import {SdServerConnection} from "./SdServerConnection";

export abstract class SdServiceBase {
  public server!: SdServer;
  public conn!: SdServerConnection;
  public request!: ISdServerRequest;
}
