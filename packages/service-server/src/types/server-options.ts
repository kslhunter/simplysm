import type { Type } from "@simplysm/core-common";
import type { ServiceBase } from "../core/service-base";
import type http from "http";

export interface ServiceServerOptions {
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
  services: Type<ServiceBase>[];
  middlewares?: ((
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err?: unknown) => void,
  ) => void)[];
}
