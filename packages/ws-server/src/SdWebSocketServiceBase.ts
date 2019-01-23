import {SdWebSocketServer} from "./SdWebSocketServer";
import {SdWebSocketServerConnection} from "./SdWebSocketServerConnection";
import {ISdWebSocketRequest} from "@simplysm/ws-common";

export abstract class SdWebSocketServiceBase {
  public server!: SdWebSocketServer;
  public conn!: SdWebSocketServerConnection;
  public request!: ISdWebSocketRequest;
}
