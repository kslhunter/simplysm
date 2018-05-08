import {ISocketRequest} from "@simplism/sd-socket-common";
import {SocketServer} from "./SocketServer";

export abstract class AbstractSocketServiceBase {
  public request!: ISocketRequest;
  public server!: SocketServer;
}
