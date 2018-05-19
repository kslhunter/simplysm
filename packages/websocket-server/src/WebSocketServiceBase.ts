import {WebSocketServer} from "./WebSocketServer";
import {IWebSocketRequest} from "@simplism/websocket-client";

export abstract class WebSocketServiceBase {
  public request!: IWebSocketRequest;
  public server!: WebSocketServer;
}