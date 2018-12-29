import {Injectable, OnDestroy} from "@angular/core";
import {SocketClient} from "@simplism/socket-client";
import {Logger, Type} from "@simplism/core";
import {SdToastProvider} from "./SdToastProvider";

export class SocketEventBase<I, O> {
  public info!: I;
  public data!: O;
}

@Injectable()
export class SdSocketProvider implements OnDestroy {
  private readonly _logger = new Logger("@simplism/angular", "socket:");
  public socket = new SocketClient();

  public constructor(private readonly _toast: SdToastProvider) {
  }

  public get connected(): boolean {
    return this.socket.connected;
  }

  public async connectAsync(port?: number, host?: string): Promise<void> {
    await this.socket.connectAsync(port, host);
  }

  public async closeAsync(): Promise<void> {
    await this.socket.closeAsync();
  }

  public on<T extends SocketEventBase<any, any>>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => Promise<void> | void): void {
    // tslint:disable-next-line:no-floating-promises
    this.socket.addEventListenerAsync(eventType.name, info, cb)
      .catch(err => {
        this._logger.error(err);
        throw err;
      });
  }

  public emit<T extends SocketEventBase<any, any>>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): void {
    // tslint:disable-next-line:no-floating-promises
    this.socket.emitEventAsync(eventType.name, infoSelector, data)
      .catch(err => {
        this._logger.error(err);
        throw err;
      });
  }

  public async sendAsync(command: string, params: any[]): Promise<any> {
    let currToast: any;
    return await this.socket.sendAsync(command, params, progress => {
      const percent = progress.current * 100 / progress.total;
      const message = `업로드: ${progress.current} / ${progress.total} (${Math.ceil(percent)}%)`;

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
    await this.closeAsync();
  }
}
