import {ISocketRequest} from "../../sd-socket-common/src/ISocketRequest";
import {SocketServer} from "./SocketServer";

export abstract class AbstractSocketServiceBase {
  public request!: ISocketRequest;
  public server!: SocketServer;
}
