import {ISocketRequest} from "../common/ISocketRequest";
import {SocketServer} from "./SocketServer";

export interface ISocketServiceBase {
    request: ISocketRequest;
    server: SocketServer;
}
