import {SocketServer} from "./SocketServer";
import {ISocketRequest} from "../common/ISocketRequest";

export interface ISocketServiceBase {
    request: ISocketRequest;
    server: SocketServer;
}
