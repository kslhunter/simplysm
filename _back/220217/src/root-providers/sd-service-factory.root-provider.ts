import { Injectable } from "@angular/core";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { ISdServiceClientConnectionConfig, SdServiceClient } from "@simplysm/sd-service-client";

@Injectable({ providedIn: "root" })
export class SdServiceFactoryRootProvider {
  private readonly _clientMap = new Map<string, SdServiceClient>();

  public async connectAsync(key: string, options: Partial<ISdServiceClientConnectionConfig> = {}): Promise<void> {
    if (this._clientMap.has(key)) {
      if (!this._clientMap.get(key)!.connected) {
        throw new Error("이미 연결이 끊긴 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
      else {
        throw new Error("이미 연결된 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
    }

    const client = new SdServiceClient(ObjectUtil.merge({
      port: location.port,
      host: location.hostname,
      ssl: location.protocol.startsWith("https")
    }, options));
    await client.connectAsync();

    this._clientMap.set(key, client);
  }

  public get(key: string): SdServiceClient {
    if (!this._clientMap.has(key)) {
      throw new Error(`연결하지 않은 클라이언트 키입니다. ${key}`);
    }

    return this._clientMap.get(key)!;
  }
}
