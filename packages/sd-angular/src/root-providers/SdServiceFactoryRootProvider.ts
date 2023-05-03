import { Injectable } from "@angular/core";
import { ObjectUtil } from "@simplysm/sd-core-common";
import { ISdServiceClientConnectionConfig, SdServiceClient } from "@simplysm/sd-service-client";
import { ISdProgressToast, SdToastProvider } from "../providers/SdToastProvider";

@Injectable({ providedIn: "root" })
export class SdServiceFactoryRootProvider {
  private readonly _clientMap = new Map<string, SdServiceClient>();
  private readonly _reqProgToastMap = new Map<string, ISdProgressToast>();
  private readonly _resProgToastMap = new Map<string, ISdProgressToast>();

  public constructor(private readonly _toast: SdToastProvider) {
  }

  public async connectAsync(clientName: string, key: string, options: Partial<ISdServiceClientConnectionConfig> = {}): Promise<void> {
    if (this._clientMap.has(key)) {
      if (!this._clientMap.get(key)!.connected) {
        throw new Error("이미 연결이 끊긴 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
      else {
        throw new Error("이미 연결된 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
    }

    const client = new SdServiceClient(clientName, ObjectUtil.merge({
      port: location.port,
      host: location.hostname,
      ssl: location.protocol.startsWith("https")
    }, options));

    client.on("request-progress", (state) => {
      if (!this._reqProgToastMap.has(state.uuid)) {
        this._reqProgToastMap.set(state.uuid, this._toast.info("요청을 전송하는 중입니다.", true));
      }
      const progressToast = this._reqProgToastMap.get(state.uuid)!;
      progressToast.progress((state.completedSize / state.fullSize) * 100);
    });

    client.on("response-progress", (state) => {
      if (!this._resProgToastMap.has(state.reqUuid)) {
        this._resProgToastMap.set(state.reqUuid, this._toast.info("응답을 전송받는 중입니다.", true));
      }
      const progressToast = this._resProgToastMap.get(state.reqUuid)!;
      progressToast.progress((state.completedSize / state.fullSize) * 100);
    });

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
