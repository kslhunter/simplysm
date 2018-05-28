import {WebSocketServer} from "./WebSocketServer";
import {IWebSocketRequest} from "@simplism/websocket-common";

export abstract class WebSocketServiceBase {
  public request!: IWebSocketRequest;
  public server!: WebSocketServer;
}