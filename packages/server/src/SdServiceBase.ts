import {SdSocketServer} from "./SdSocketServer";
import {ISdServerRequest} from "@simplysm/common";

export abstract class SdServiceBase {
  public server!: SdSocketServer;
  public request!: ISdServerRequest;
}
