import type { SdServiceServer } from "../SdServiceServer";
import path from "path";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { SdConfigManager } from "../utils/SdConfigManager";
import type { SdServiceSocketV1 } from "../legacy/SdServiceSocketV1";
import type { SdServiceSocket } from "../transport/socket/SdServiceSocket";
import type { ISdServiceRequest } from "../legacy/protocol-v1.types";
import type { IAuthTokenPayload } from "../auth/IAuthTokenPayload";

export abstract class SdServiceBase<TAuthInfo = any> {
  server!: SdServiceServer<TAuthInfo>;
  socket?: SdServiceSocket;

  v1?: {
    socket: SdServiceSocketV1;
    request: ISdServiceRequest;
  };

  http?: {
    clientName: string;
    authTokenPayload?: IAuthTokenPayload;
  };

  get authInfo(): TAuthInfo | undefined {
    return this.socket?.authTokenPayload?.data ?? this.http?.authTokenPayload?.data;
  }

  get clientName(): string | undefined {
    const clientName =
      this.v1?.request.clientName ?? this.socket?.clientName ?? this.http?.clientName;
    if (clientName == null) return undefined;

    // Path Traversal 방지
    if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
      throw new Error(`유효하지 않은 클라이언트 명입니다: ${clientName}`);
    }

    return clientName;
  }

  get clientPath(): string | undefined {
    return this.clientName == null
      ? undefined
      : (this.server.options.pathProxy?.[this.clientName] ??
          path.resolve(this.server.options.rootPath, "www", this.clientName));
  }

  async getConfigAsync<T>(section: string): Promise<T> {
    let configParent: Record<string, T | undefined> = {};

    // 1. Root Config
    const rootFilePath = path.resolve(this.server.options.rootPath, ".config.json");
    // Manager에게 위임
    const rootConfig = await SdConfigManager.getConfigAsync<Record<string, T>>(rootFilePath);
    if (rootConfig) {
      configParent = rootConfig;
    }

    // 2. Client Config
    const targetPath = this.clientPath;
    if (targetPath != null) {
      const clientFilePath = path.resolve(targetPath, ".config.json");

      // Manager에게 위임
      const clientConfig = await SdConfigManager.getConfigAsync<Record<string, T>>(clientFilePath);
      if (clientConfig) {
        configParent = ObjectUtils.merge(configParent, clientConfig);
      }
    }

    const config = configParent[section];
    if (config == null) throw new Error(`설정 섹션을 찾을 수 없습니다: ${section}`);
    return config;
  }
}
