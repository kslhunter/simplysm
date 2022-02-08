import { Type } from "@simplysm/sd-core-common";
import { NextHandleFunction } from "connect";
import { SdServiceServer } from "./SdServiceServer";
import { Socket } from "socket.io";
import { ISdServiceRequest } from "@simplysm/sd-service-common";

export interface ISdServiceServerOptions {
  rootPath: string;
  services: Type<SdServiceBase>[];
  port: number;
  middlewares?: NextHandleFunction[];
  ssl?: {
    pfxBuffer: Buffer;
    passphrase: string;
  };
}

export class SdServiceBase {
  public server!: SdServiceServer;
  public socket!: Socket;
  public request!: ISdServiceRequest;
}
