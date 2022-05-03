import { SdServiceServer } from "./SdServiceServer";
import { ISdServiceRequest } from "../commons";
import { Socket } from "socket.io";

export class SdServiceBase {
  public server!: SdServiceServer;
  public socket!: Socket;
  public request!: ISdServiceRequest;
}
