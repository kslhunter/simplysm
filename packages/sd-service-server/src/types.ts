import { SdServiceServer } from "./SdServiceServer";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import * as http from "http";
import { SdServiceSocket } from "./internal/SdServiceSocket";
import path from "path";
import { FsUtils } from "@simplysm/sd-core-node";
import { ObjectUtils, Type } from "@simplysm/sd-core-common";

export interface ISdServiceServerOptions {
  rootPath: string;
  port: number;
  ssl?: {
    pfxBuffer: Buffer | (() => Promise<Buffer> | Buffer);
    passphrase: string;
  };

  /***
   * 경로 프록시 (브라우저에 입력된 경로를 기본 파일경로가 아닌 다른 파일경로로 바꾸어 리턴함)
   *
   * * key(from): 서버내 'www' 이후의 상대경로 (절대경로 입력 불가, "/"로 시작되어선 안됨)
   * * value(to): 서버내 파일의  절대경로 (portproxy의 경우, DEVSERVER의 port)
   * * 'from'에 'api'나 'ws'로 시작하는 경로 사용 불가
   *
   */
  pathProxy?: Record<string, string>;
  portProxy?: Record<string, number>;

  services: Type<SdServiceBase>[];
  middlewares?: ((
    req: http.IncomingMessage,
    res: http.ServerResponse,
    next: (err?: any) => void,
  ) => void)[];
}

// export type TSdServiceClass = new (ctx: SdServiceContext) => any;

export class SdServiceBase {
  server!: SdServiceServer;
  socketClient?: SdServiceSocket;
  request?: ISdServiceRequest;

  async getConfig<T>(section: string): Promise<T> {
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(this.server.options.rootPath, ".config.json");
    if (FsUtils.exists(rootFilePath)) {
      result = await FsUtils.readJsonAsync(rootFilePath);
    }

    const clientName = this.request?.clientName;
    if (clientName != null) {
      const targetPath = this.getClientPath();

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtils.exists(filePath)) {
        result = ObjectUtils.merge(result, await FsUtils.readJsonAsync(filePath));
      }
    }

    const config = result[section] as T | undefined;
    if (config == null) throw new Error(`설정 섹션을 찾을 수 없습니다: ${section}`);
    return config;
  }

  getClientPath(): string {
    const clientName = this.request?.clientName;
    if (clientName == null) throw new Error("api로 사용할 수 없는 서비스입니다.");

    return (
      this.server.options.pathProxy?.[clientName] ??
      path.resolve(this.server.options.rootPath, "www", clientName)
    );
  }
}
