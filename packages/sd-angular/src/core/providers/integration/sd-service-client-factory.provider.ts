import { inject, Injectable, type WritableSignal } from "@angular/core";
import { ObjectUtils } from "@simplysm/sd-core-common";
import { type ISdServiceConnectionConfig, SdServiceClient } from "@simplysm/sd-service-client";
import { SdToastProvider } from "../../../ui/overlay/toast/sd-toast.provider";
import { $effect } from "../../utils/bindings/$effect";
import { SdAngularConfigProvider } from "../app/sd-angular-config.provider";

@Injectable({ providedIn: "root" })
export class SdServiceClientFactoryProvider {
  private readonly _sdToast = inject(SdToastProvider);
  private readonly _sdNgConf = inject(SdAngularConfigProvider);

  private readonly _clientMap = new Map<string, SdServiceClient>();

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
    key: string,
    options: Partial<ISdServiceConnectionConfig> = {},
  ): Promise<void> {
    if (this._clientMap.has(key)) {
      if (!this._clientMap.get(key)!.connected) {
        throw new Error("이미 연결이 끊긴 클라이언트와 같은 키로 연결을 시도하였습니다.");
      } else {
        throw new Error("이미 연결된 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
    }

    const client = new SdServiceClient(
      this._sdNgConf.clientName,
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

    // 리로드 이벤트 핸들러 등록 (기존 SdServiceClient에 있던 로직 이동)
    client.on("reload", async (changedFileSet) => {
      // 모두 css인 경우, refresh없이 css 파일만 전환
      if (Array.from(changedFileSet).every((item) => item.endsWith(".css"))) {
        for (const changedFile of changedFileSet) {
          const href = "./" + changedFile.replace(/[\\/]/g, "/");
          const oldStyle = document.querySelector(`link[data-sd-style="${href}"]`) as
            | HTMLLinkElement
            | undefined;
          if (oldStyle) {
            oldStyle.href = `${href}?t=${Date.now()}`;
          }

          const oldGlobalStyle = document.querySelector(
            `link[data-sd-style="${changedFile}"],[href="${changedFile}"]`,
          ) as HTMLLinkElement | undefined;
          if (oldGlobalStyle) {
            oldGlobalStyle.setAttribute("data-sd-style", changedFile);
            oldGlobalStyle.href = `${changedFile}?t=${Date.now()}`;
          }
        }
      } else {
        // HMR refresh
        if ("__sd_hmr_destroy" in window && typeof window.__sd_hmr_destroy === "function") {
          window.__sd_hmr_destroy();

          const old = document.querySelector("app-root");
          if (old) old.remove();
          document.body.prepend(document.createElement("app-root"));

          await (
            await import(`${location.pathname}main.js?t=${Date.now()}`)
          ).default;
        }
        // 완전 reload
        else {
          location.reload();
        }
      }
    });

    const reqProgressToastMap = new Map<
      string,
      | {
          progress: WritableSignal<number>;
        }
      | undefined
    >();
    client.on("request-progress", (state) => {
      const toast = reqProgressToastMap.getOrCreate(state.uuid, () =>
        this._sdToast.info("요청을 전송하는 중입니다.", true),
      );
      toast?.progress.set((state.completedSize / state.totalSize) * 100);

      if (state.completedSize === state.totalSize) {
        reqProgressToastMap.delete(state.uuid);
      }
    });

    const resProgressToastMap = new Map<
      string,
      | {
          progress: WritableSignal<number>;
        }
      | undefined
    >();
    client.on("response-progress", (state) => {
      const toast = resProgressToastMap.getOrCreate(state.uuid, () =>
        this._sdToast.info("응답을 전송받는 중입니다.", true),
      );
      toast?.progress.set((state.completedSize / state.totalSize) * 100);

      if (state.completedSize === state.totalSize) {
        resProgressToastMap.delete(state.uuid);
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
