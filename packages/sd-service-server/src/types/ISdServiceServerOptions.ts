import { Type } from "@simplysm/sd-core-common";
import { SdServiceBase } from "../core/SdServiceBase";
import http from "http";

export interface ISdServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?: {
    pfxBuffer: Buffer | (() => Promise<Buffer> | Buffer);
    passphrase: string;
  };
  auth?: {
    jwtSecret: string;
  };
  pathProxy?: Record<string, string>;
  portProxy?: Record<string, number>;
  services: Type<SdServiceBase>[];
  middlewares?: ((
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err?: any) => void,
  ) => void)[];
}
