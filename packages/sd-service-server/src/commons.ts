import { Type } from "@simplysm/sd-core-common";
import { NextHandleFunction } from "connect";
import { SdServiceServer } from "./SdServiceServer";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import * as http from "http";

export interface ISdServiceServerOptions {
  rootPath: string;
  services: Type<SdServiceBase>[];
  port: number | string;
  middlewares?: NextHandleFunction[];
  ssl?: {
    pfxBuffer: Buffer | (() => (Promise<Buffer> | Buffer));
    passphrase: string;
  };
}

export class SdServiceBase {
  public server!: SdServiceServer;
  public socketId?: string; // API로 접근한 경우 undefined
  public request?: ISdServiceRequest; // API로 접근한 경우 undefined
  public apiHeaders?: http.IncomingHttpHeaders; // Socket로 접근한 경우 undefined
}
