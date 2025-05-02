import { Type } from "@simplysm/sd-core-common";
import { SdServiceServer } from "./sd-service-server";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import * as http from "http";

export interface ISdServiceServerOptions {
  rootPath: string;
  services: Type<SdServiceBase>[];
  port: number;
  middlewares?: ((
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err?: any) => void,
  ) => void)[];
  ssl?: {
    pfxBuffer: Buffer | (() => Promise<Buffer> | Buffer);
    passphrase: string;
  };
}

export class SdServiceBase {
  public server!: SdServiceServer;
  public socketId?: string; // API로 접근한 경우 undefined
  public request?: ISdServiceRequest; // API로 접근한 경우 undefined
  public webHeaders?: http.IncomingHttpHeaders; // Socket로 접근한 경우 undefined
}
