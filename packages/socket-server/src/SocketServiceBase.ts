import {ISocketRequest} from "@simplism/socket-common";
import {SocketServer} from "./SocketServer";

export abstract class SocketServiceBase {
  public server!: SocketServer;
  public request!: ISocketRequest;
}