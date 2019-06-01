import {Injectable, OnDestroy} from "@angular/core";
import {Logger, Type} from "@simplysm/sd-core";
import {ISdProgressToast, SdToastProvider} from "./SdToastProvider";
import {SdServiceClient} from "@simplysm/sd-service";

@Injectable()
export class SdServiceProvider implements OnDestroy {
  private readonly _logger = new Logger("@simplysm/sd-angular", "SdServiceProvider");
  public readonly client = new SdServiceClient();

  public headers: { [key: string]: any } = {};

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

  public on<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => (Promise<void> | void)): void {
    this.client.addEventListenerAsync(eventType, info, cb).catch(err => {
      this._logger.error(err);
    });
  }

  public emit<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): void {
    this.client.emitAsync(eventType, infoSelector, data).catch(err => {
      this._logger.error(err);
    });
  }

  public async sendAsync(command: string, params: any[]): Promise<any> {
    let currToast: ISdProgressToast;

    return await this.client.sendAsync(command, params, this.headers, progress => {
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
