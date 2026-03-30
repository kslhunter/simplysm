import { DestroyRef, inject, Injectable, type WritableSignal } from "@angular/core";
import type { ServiceConnectionOptions, ServiceProgressState } from "@simplysm/service-client";
import { createServiceClient, ServiceClient } from "@simplysm/service-client";
import { SdAngularConfigProvider } from "./sd-angular-config.provider";
import { SdToastProvider } from "../../ui/overlay/toast/sd-toast.provider";

@Injectable({ providedIn: "root" })
export class SdServiceClientFactoryProvider {
  private readonly _toastProvider = inject(SdToastProvider);
  private readonly _configProvider = inject(SdAngularConfigProvider);
  private readonly _destroyRef = inject(DestroyRef);

  private readonly _clientMap = new Map<string, ServiceClient>();
  private readonly _closedKeys = new Set<string>();
  private readonly _progressMap = new Map<string, WritableSignal<number>>();

  constructor() {
    this._destroyRef.onDestroy(() => {
      for (const client of this._clientMap.values()) {
        void client.close();
      }
      this._clientMap.clear();
    });
  }

  async connectAsync(key: string, options?: Partial<ServiceConnectionOptions>): Promise<void> {
    if (this._closedKeys.has(key)) {
      throw new Error("이미 연결이 끊긴 클라이언트");
    }
    if (this._clientMap.has(key)) {
      throw new Error("이미 연결된 클라이언트");
    }

    const ssl = location.protocol.startsWith("https");
    const defaultOptions: ServiceConnectionOptions = {
      host: location.hostname,
      port: location.port !== "" ? Number(location.port) : ssl ? 443 : 80,
      ssl,
    };

    const mergedOptions: ServiceConnectionOptions = {
      ...defaultOptions,
      ...options,
    };

    const client = createServiceClient(this._configProvider.clientName, mergedOptions);

    client.on("request-progress", (state: ServiceProgressState) => {
      this._handleProgress("요청을 전송하는 중입니다.", state);
    });

    client.on("response-progress", (state: ServiceProgressState) => {
      this._handleProgress("응답을 전송받는 중입니다.", state);
    });

    await client.connect();
    this._clientMap.set(key, client);
  }

  async closeAsync(key: string): Promise<void> {
    const client = this._clientMap.get(key);
    if (client == null) {
      throw new Error("연결하지 않은 클라이언트 키");
    }

    await client.close();
    this._clientMap.delete(key);
    this._closedKeys.add(key);
  }

  get(key: string): ServiceClient {
    const client = this._clientMap.get(key);
    if (client == null) {
      if (this._closedKeys.has(key)) {
        throw new Error("이미 연결이 끊긴 클라이언트");
      }
      throw new Error("연결하지 않은 클라이언트 키");
    }
    return client;
  }

  private _handleProgress(message: string, state: ServiceProgressState): void {
    const { uuid, totalSize, completedSize } = state;
    const progress = totalSize === 0 ? 0 : Math.round((completedSize / totalSize) * 100);

    let progressSignal = this._progressMap.get(uuid);
    if (progressSignal == null) {
      progressSignal = this._toastProvider.info(message, true);
      this._progressMap.set(uuid, progressSignal);
    }

    progressSignal.set(progress);

    if (completedSize === totalSize) {
      this._progressMap.delete(uuid);
    }
  }
}
