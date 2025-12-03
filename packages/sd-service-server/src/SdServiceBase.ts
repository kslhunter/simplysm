import { SdServiceServer } from "./SdServiceServer";
import path from "path";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { SdConfigManager } from "./internal/SdConfigManager";
import { SdServiceSocketV1 } from "./v1/SdServiceSocketV1";
import { SdServiceSocket } from "./internal/SdServiceSocket";
import { ISdServiceRequest } from "./v1/protocol-v1.types";

export abstract class SdServiceBase {
  protected readonly server!: SdServiceServer;
  protected readonly socket?: SdServiceSocket;

  protected readonly v1?: {
    socket: SdServiceSocketV1;
    request: ISdServiceRequest;
  };

  protected get clientName(): string {
    const clientName = this.v1?.request.clientName ?? this.socket?.clientName;
    if (clientName == null) throw new Error("api로 사용할 수 없는 서비스입니다.");

    // Path Traversal 방지
    if (clientName.includes("..") || clientName.includes("/") || clientName.includes("\\")) {
      throw new Error(`유효하지 않은 클라이언트 명입니다: ${clientName}`);
    }

    return clientName;
  }

  protected get clientPath(): string {
    return (
      this.server.options.pathProxy?.[this.clientName] ??
      path.resolve(this.server.options.rootPath, "www", this.clientName)
    );
  }

  protected async getConfigAsync<T>(section: string): Promise<T> {
    let configParent: Record<string, T | undefined> = {};

    // 1. Root Config
    const rootFilePath = path.resolve(this.server.options.rootPath, ".config.json");
    // Manager에게 위임
    const rootConfig = await SdConfigManager.getConfigAsync<Record<string, T>>(rootFilePath);
    if (rootConfig) {
      configParent = rootConfig;
    }

    // 2. Client Config
    const clientName = this.v1?.request.clientName ?? this.socket?.clientName;
    if (clientName != null) {
      const targetPath = this.clientPath;
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
