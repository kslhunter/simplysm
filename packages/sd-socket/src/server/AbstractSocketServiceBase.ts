import { ISocketRequest } from "../common/ISocketRequest";
import { SocketServer } from "./SocketServer";

export abstract class AbstractSocketServiceBase {
  public request!: ISocketRequest;
  public server!: SocketServer;
}