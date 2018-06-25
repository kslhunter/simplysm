import {ISocketRequest} from "@simplism/socket-common";

export abstract class SocketServiceBase {
  public request!: ISocketRequest;
}