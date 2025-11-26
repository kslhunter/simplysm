import { Type } from "@simplysm/sd-core-common";
import { SdServiceServer } from "./SdServiceServer";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import * as http from "http";
import { WebSocket } from "ws";

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
  serviceActivator?: ISdServiceActivator;
}

export abstract class SdServiceBase {
  server!: SdServiceServer;

  client?: WebSocket; // API로 접근한 경우 undefined
  request?: ISdServiceRequest; // API로 접근한 경우 undefined

  webHeaders?: http.IncomingHttpHeaders; // Socket로 접근한 경우 undefined
}

export interface ISdServiceActivationContext {
  server: SdServiceServer;
  client?: WebSocket;
  request?: ISdServiceRequest;
  webHeaders?: http.IncomingHttpHeaders;
}

export interface ISdServiceActivator {
  create<T extends SdServiceBase>(serviceType: Type<T>, ctx: ISdServiceActivationContext): T;
}
