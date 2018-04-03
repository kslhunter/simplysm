import {ISocketRequest} from "@simplism/socket-common";
import {SocketServer} from "./SocketServer";

export class SocketServiceBase {
    request!: ISocketRequest;
    server!: SocketServer;
}
