import { inject, Injectable } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { ISdServiceClientConnectionConfig, SdServiceClient } from "@simplysm/sd-service-client";
import { ISdProgressToast, SdToastProvider } from "./sd-toast.provider";
import { $effect } from "../utils/hooks/hooks";

@Injectable({ providedIn: "root" })
export class SdServiceClientFactoryProvider {
  private _sdToast = inject(SdToastProvider);

  private _clientMap = new Map<string, SdServiceClient>();

  constructor() {
    $effect((onCleanup) => {
      onCleanup(async () => {
        for (const key of this._clientMap.keys()) {
          await this._clientMap.get(key)!.closeAsync();
          this._clientMap.delete(key);
        }
      });
    });
  }

  async connectAsync(
    clientName: string,
    key: string,
    options: Partial<ISdServiceClientConnectionConfig> = {},
  ): Promise<void> {
    if (this._clientMap.has(key)) {
      if (!this._clientMap.get(key)!.connected) {
        throw new Error("이미 연결이 끊긴 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
      else {
        throw new Error("이미 연결된 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
    }

    const client = new SdServiceClient(
      clientName,
      ObjectUtils.merge(
        {
          port: location.port,
          host: location.hostname,
          ssl: location.protocol.startsWith("https"),
          useReconnect: true,
        },
        options,
      ),
    );

    const reqProgressToastMap = new Map<string, ISdProgressToast | undefined>();
    client.on("request-progress", (state) => {
      const toast = reqProgressToastMap.getOrCreate(state.uuid, () =>
        this._sdToast.info("요청을 전송하는 중입니다.", true),
      );
      toast?.progress((state.completedSize / state.fullSize) * 100);

      if (state.completedSize === state.fullSize) {
        reqProgressToastMap.delete(state.uuid);
      }
    });

    const resProgressToastMap = new Map<string, ISdProgressToast | undefined>();
    client.on("response-progress", (state) => {
      const toast = resProgressToastMap.getOrCreate(state.reqUuid, () =>
        this._sdToast.info("응답을 전송받는 중입니다.", true),
      );
      toast?.progress((state.completedSize / state.fullSize) * 100);

      if (state.completedSize === state.fullSize) {
        resProgressToastMap.delete(state.reqUuid);
      }
    });

    await client.connectAsync();

    this._clientMap.set(key, client);
  }

  async closeAsync(key: string): Promise<void> {
    await this._clientMap.get(key)?.closeAsync();
    this._clientMap.delete(key);
  }

  get(key: string): SdServiceClient {
    if (!this._clientMap.has(key)) {
      throw new Error(`연결하지 않은 클라이언트 키입니다. ${key}`);
    }

    return this._clientMap.get(key)!;
  }
}
