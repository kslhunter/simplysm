import {Injectable, OnDestroy} from "@angular/core";
import {Logger} from "@simplysm/sd-core-browser";
import {SdServiceClient} from "@simplysm/sd-service-client-browser";
import {ISdProgressToast, SdToastProvider} from "./SdToastProvider";
import {FunctionUtil, Type} from "@simplysm/sd-core-common";

@Injectable()
export class SdServiceProvider implements OnDestroy {
  private readonly _logger = Logger.get(["simplysm", "sd-angular", "SdServiceProvider"]);
  public readonly client = new SdServiceClient();

  public get connected(): boolean {
    return this.client.connected;
  }

  public constructor(private readonly _toast: SdToastProvider) {
    this._connectAsync().catch(err => {
      this._logger.error(err);
    });
  }

  private async _connectAsync(): Promise<void> {
    await this.client.connectAsync();
  }

  public async on<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => (Promise<void> | void)): Promise<number | undefined> {
    return await this.client.addEventListenerAsync(eventType, info, cb);
  }

  public async off(id: number): Promise<void> {
    await this.client.removeEventListenerAsync(id);
  }

  public emit<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): void {
    this.client.emitAsync(eventType, infoSelector, data).catch(err => {
      this._logger.error(err);
    });
  }

  public async sendAsync<S, R>(serviceType: Type<S>, action: (s: S) => Promise<R>): Promise<R> {
    const serviceName = serviceType.name;
    const parsed = FunctionUtil.parse(action);
    const methodName = parsed.returnContent.replace(/\(.*$/, "").replace(`${parsed.params[0]}.`, "");

    const serviceObj: S = {} as any;
    serviceObj[methodName] = async (...args: any[]) => await this.sendCommandAsync(`${serviceName}.${methodName}`, args);
    return await action(serviceObj);
  }

  public async sendCommandAsync(command: string, params: any[]): Promise<any> {
    let currToast: ISdProgressToast;

    return await this.client.sendAsync(command, params, {
      progressCallback: progress => {
        const totalTextLength = progress.total.toLocaleString().length;
        const currentText = progress.current.toLocaleString().padStart(totalTextLength, " ");
        const totalText = progress.total.toLocaleString();
        const percent = progress.current * 100 / progress.total;
        const message = `전송 : ${currentText} / ${totalText} (${Math.ceil(percent)}%)`;

        if (!currToast) {
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

  public async ngOnDestroy(): Promise<void> {
    await this.client.closeAsync();
  }
}

export class SdServiceEventBase<I, O> {
  public info!: I;
  public data!: O;
}
