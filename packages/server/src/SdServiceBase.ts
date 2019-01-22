import {SdSocketServer} from "./SdSocketServer";
import {ISdSocketRequest} from "@simplysm/common";
import {SdSocketConnection} from "./SdSocketConnection";

export abstract class SdServiceBase {
  public server!: SdSocketServer;
  public request!: ISdSocketRequest;
  public conn!: SdSocketConnection;
}
