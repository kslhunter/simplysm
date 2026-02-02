import type { ServiceServer } from "../service-server";
import type { ServiceSocket } from "../transport/socket/service-socket";
import type { AuthTokenPayload } from "../auth/auth-token-payload";
import { objMerge } from "@simplysm/core-common";
import { ConfigManager } from "../utils/config-manager";
import path from "path";

export abstract class ServiceBase<TAuthInfo = unknown> {
  server!: ServiceServer<TAuthInfo>;
  socket?: ServiceSocket;

  http?: {
    clientName: string;
    authTokenPayload?: AuthTokenPayload<TAuthInfo>;
  };

  // V1 legacy 컨텍스트 (auto-update용)
  legacy?: {
    clientName?: string;
  };

  get authInfo(): TAuthInfo | undefined {
    return (this.socket?.authTokenPayload?.data ?? this.http?.authTokenPayload?.data) as
      | TAuthInfo
      | undefined;
  }

  get clientName(): string | undefined {
    const clientName = this.socket?.clientName ?? this.http?.clientName ?? this.legacy?.clientName;
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

  async getConfig<T>(section: string): Promise<T> {
    let configParent: Record<string, T | undefined> = {};

    // 1. Root Config
    const rootFilePath = path.resolve(this.server.options.rootPath, ".config.json");
    const rootConfig = await ConfigManager.getConfig<Record<string, T>>(rootFilePath);
    if (rootConfig != null) {
      configParent = rootConfig;
    }

    // 2. Client Config
    const targetPath = this.clientPath;
    if (targetPath != null) {
      const clientFilePath = path.resolve(targetPath, ".config.json");
      const clientConfig = await ConfigManager.getConfig<Record<string, T>>(clientFilePath);
      if (clientConfig != null) {
        configParent = objMerge(configParent, clientConfig);
      }
    }

    const config = configParent[section];
    if (config == null) throw new Error(`설정 섹션을 찾을 수 없습니다: ${section}`);
    return config;
  }
}
