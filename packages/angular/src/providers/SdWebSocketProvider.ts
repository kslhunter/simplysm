import {Injectable, OnDestroy} from "@angular/core";
import {Logger, Type} from "@simplysm/common";
import {ISdProgressToast, SdToastProvider} from "./SdToastProvider";
import {SdWebSocketClient} from "@simplysm/ws-common";

@Injectable()
export class SdWebSocketProvider implements OnDestroy {
  private readonly _logger = new Logger("@simplysm/angular", "SdServiceProvider");
  public readonly socket = new SdWebSocketClient();

  public constructor(private readonly _toast: SdToastProvider) {
    this._connectAsync().catch(err => {
      this._logger.error(err);
    });
  }

  private async _connectAsync(): Promise<void> {
    await this.socket.connectAsync();
  }

  public on<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => (Promise<void> | void)): void {
    this.socket.addEventListenerAsync(eventType, info, cb).catch(err => {
      this._logger.error(err);
    });
  }

  public emit<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): void {
    this.socket.emitAsync(eventType, infoSelector, data).catch(err => {
      this._logger.error(err);
    });
  }

  public async sendAsync(command: string, params: any[]): Promise<any> {
    let currToast: ISdProgressToast;

    this.socket.sendAsync(command, params, progress => {
      const totalTextLength = progress.total.toLocaleString().length;
      const currentText = progress.current.toLocaleString().padStart(totalTextLength, " ");
      const totalText = progress.total.toLocaleString();
      const percent = progress.current * 100 / progress.total;
      const message = `업로드: ${currentText} / ${totalText} (${Math.ceil(percent)}%)`;

      if (!currToast) {
        currToast = this._toast.info(message, true);
        currToast.progress(percent);
      }
      else {
        currToast.message(message);
        currToast.progress(percent);
      }
    }).catch(err => {
      this._logger.error(err);
    });
  }

  public async ngOnDestroy(): Promise<void> {
    await this.socket.closeAsync();
  }
}

export class SdServiceEventBase<I, O> {
  public info!: I;
  public data!: O;
}
