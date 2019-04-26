import { SdWebSocketServer } from "./SdWebSocketServer";
import { SdWebSocketServerConnection } from "./SdWebSocketServerConnection";
import { ISdWebSocketRequest } from "@simplysm/sd-service-client";

export abstract class SdWebSocketServiceBase {
  public server!: SdWebSocketServer;
  public conn!: SdWebSocketServerConnection;
  public request!: ISdWebSocketRequest;
  public rootPath!: string;
}
