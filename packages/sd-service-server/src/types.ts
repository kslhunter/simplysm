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

  protected async getConfig<T>(section: string): Promise<T> {
    const config = (await this.server.getConfigAsync(this.request?.clientName))[section] as
      | T
      | undefined;
    if (config == null) {
      throw new Error(`설정 섹션을 찾을 수 없습니다: ${section}`);
    }
    return config;
  }

  protected getClientPath() {
    if (!this.request) throw new Error("요청정보가 없습니다.");
    return this.server.getClientPath(this.request.clientName);
  }
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
