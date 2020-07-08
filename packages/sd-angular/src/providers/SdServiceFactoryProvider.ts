import {Injectable, OnDestroy} from "@angular/core";
import {ISdProgressToast, SdToastProvider} from "./SdToastProvider";
import {SdServiceClient} from "@simplysm/sd-service-browser";
import {NeverEntryError, Type} from "@simplysm/sd-core-common";
import {SdRootProvider} from "../root-providers/SdRootProvider";
import {SdSystemLogRootProvider} from "../root-providers/SdSystemLogRootProvider";

@Injectable()
export class SdServiceFactoryProvider implements OnDestroy {
  public get clientObjMap(): { [key: string]: SdNgServiceClient | undefined } {
    this._root.data.service = this._root.data.service ?? {};
    this._root.data.service.clientObjMap = this._root.data.service.clientObjMap ?? {};
    return this._root.data.service.clientObjMap;
  }

  public set clientObjMap(value: { [key: string]: SdNgServiceClient | undefined }) {
    this._root.data.service = this._root.data.service ?? {};
    this._root.data.service.clientObjMap = value;
  }

  public constructor(private readonly _toast: SdToastProvider,
                     private readonly _root: SdRootProvider,
                     private readonly _systemLog: SdSystemLogRootProvider) {
  }

  public async connectAsync(key: string, options?: IServiceClientOptions): Promise<void> {
    if (this.clientObjMap[key]) {
      if (!this.clientObjMap[key]?.connected) {
        throw new Error("이미 연결이 끊긴 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
      else {
        throw new Error("이미 연결된 클라이언트와 같은 키로 연결을 시도하였습니다.");
      }
    }

    const client = new SdNgServiceClient(options, this._toast, this._systemLog);
    await client.connectAsync();
    this.clientObjMap[key] = client;
  }

  public get(key: string): SdNgServiceClient {
    if (!this.clientObjMap[key]) {
      throw new Error(`연결하지 않은 클라이언트 키입니다. ${key}`);
    }

    return this.clientObjMap[key]!;
  }

  public async ngOnDestroy(): Promise<void> {
    await Object.values(this.clientObjMap).parallelAsync(async client => {
      if (client === undefined) throw new NeverEntryError();
      await client.closeAsync();
    });

    this.clientObjMap = {};
  }
}

export class SdNgServiceClient {
  public client: SdServiceClient;

  public get connected(): boolean {
    return this.client.connected;
  }

  public constructor(options: IServiceClientOptions | undefined,
                     private readonly _toast: SdToastProvider,
                     private readonly _systemLog: SdSystemLogRootProvider) {
    this.client = new SdServiceClient(options?.port, options?.host, options?.ssl);
  }

  public async connectAsync(): Promise<void> {
    await this.client.connectAsync();
    this.client.on("error", async err => {
      await this._systemLog.writeAsync("error", err);
    });
  }

  public async on<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => (Promise<void> | void)): Promise<number | undefined> {
    return await this.client.addEventListenerAsync(eventType, info, cb);
  }

  public async off(id: number): Promise<void> {
    await this.client.removeEventListenerAsync(id);
  }

  public emit<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): void {
    this.client.emitAsync(eventType, infoSelector, data).catch(async err => {
      await this._systemLog.writeAsync("error", err);
    });
  }

  public async sendAsync<S, R>(serviceType: Type<S>, action: (s: S) => Promise<R>): Promise<R> {
    return await action(new serviceType(this));
  }

  public async sendCommandAsync(command: string, params: any[]): Promise<any> {
    let currToast: ISdProgressToast | undefined;

    return await this.client.sendAsync(command, params, {
      progressCallback: progress => {
        const totalTextLength = progress.total.toLocaleString().length;
        const currentText = progress.current.toLocaleString().padStart(totalTextLength, " ");
        const totalText = progress.total.toLocaleString();
        const percent = progress.current * 100 / progress.total;
        const message = `전송 : ${currentText} / ${totalText} (${Math.ceil(percent)}%)`;

        if (currToast === undefined) {
          currToast = this._toast.info(message, true);
          currToast.progress(percent);
        }
        else {
          currToast.message(message);
          currToast.progress(percent);
        }
      }
    });
  }

  public async closeAsync(): Promise<void> {
    await this.client.closeAsync();
  }
}

export class SdServiceEventBase<I, O> {
  public info!: I;
  public data!: O;
}

export interface IServiceClientOptions {
  port?: number;
  host?: string;
  ssl?: boolean;
}
