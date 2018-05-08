import {Injectable, Type} from "@angular/core";
import {JsonConvert, Uuid} from "@simplism/sd-core";
import {SocketClient} from "@simplism/sd-socket-client";
import {SdBusyProvider} from "./SdBusyProvider";
import {SdLocalStorageProvider} from "./SdLocalStorageProvider";
import {SdToastProvider} from "./SdToastProvider";
import {ISocketEvent} from "@simplism/sd-socket-common";

@Injectable()
export class SdServiceProvider {
  private readonly _errorListeners: ((err: Error) => Promise<boolean>)[] = [];
  private readonly _client: SocketClient = new SocketClient();

  public constructor(private readonly _busy: SdBusyProvider,
                     private readonly _toast: SdToastProvider,
                     private readonly _localStorage: SdLocalStorageProvider) {
  }

  public get connected(): boolean {
    return this._client.connected;
  }

  public async connect(url?: string): Promise<void> {
    if (!this._client.connected) {
      await this._client.connect(url);
    }
  }

  public async close(): Promise<void> {
    if (this._client.connected) {
      await this._client.close();
    }
  }

  public setGlobalHeaderItem(key: string, value: any): void {
    const globalHeaderJson = this._localStorage.get("simgular.global-headers");
    const globalHeader = globalHeaderJson ? JsonConvert.parse(globalHeaderJson) : {};
    globalHeader[key] = value;
    this._localStorage.set("simgular.global-headers", JsonConvert.stringify(globalHeader));
  }

  public getGlobalHeaderItem(key: string): any {
    return this.getGlobalHeader()[key];
  }

  public getGlobalHeader(): { [key: string]: any } {
    const globalHeadersJson = this._localStorage.get("simgular.global-headers");
    return globalHeadersJson ? JsonConvert.parse(globalHeadersJson) : {};
  }

  public clearGlobalHeader(): void {
    this._localStorage.remove("simgular.global-headers");
  }

  public removeGlobalHeaderItem(key: string): void {
    const globalHeader = this.getGlobalHeader();
    delete globalHeader[key];
    this._localStorage.set("simgular.global-headers", JsonConvert.stringify(globalHeader));
  }

  public addGlobalErrorHandler(cb: (err: Error) => Promise<boolean>): void {
    this._errorListeners.push(cb);
  }

  public async send<S, R>(serviceType: Type<S>, methodFunc: (service: S) => Promise<R>, options: { showBusy: boolean } = {showBusy: true}): Promise<R> {
    const serviceName = serviceType.name;

    const matches = methodFunc
      .toString()
      .match(/function\s?\(([^)]*)\)\s?{((?!return).)*return\s+([^(]*)\(((.|\n|\r)*)\);?\s?}$/);
    const fieldName = matches![1];
    const method = matches![3];
    const methodName = method.replace(`${fieldName}.`, "");

    const serviceObj: S = {} as any;
    serviceObj[methodName] = async (...args: any[]) =>
      await this.sendCommand.apply(this, [options, `${serviceName}.${methodName}`].concat(args));
    return await methodFunc(serviceObj);
  }

  public async sendCommand(options: { showBusy: boolean }, cmd: string, ...args: any[]): Promise<any> {
    try {
      if (options.showBusy) {
        await this._busy.show();
      }
      const result = await this._client.send(cmd, args, this.getGlobalHeader());
      if (options.showBusy) {
        this._busy.hide();
      }
      return result;
    } catch (e) {
      if (e.code) {
        this._toast.danger(e.message);
        if (options.showBusy) {
          this._busy.hide();
        }
        for (const callback of this._errorListeners) {
          const reload = await callback(e);
          if (reload) {
            return await this.sendCommand.apply(this, [options, cmd].concat(args));
          }
        }
        e.handled = true;
      }
      throw e;
    }
  }

  public async on<T extends ISocketEvent<any, any>>(eventType: Type<T>, info: T["info"], callback: (result: T["data"]) => void | Promise<void>): Promise<Uuid> {
    return await this._client.on(eventType, info, callback);
  }

  public async off(id: Uuid): Promise<void> {
    await this._client.off(id);
  }

  public async downloadApk(packageName: string, options: { showBusy: boolean } = {showBusy: true}): Promise<void> {
    await this.sendCommand(options, "downloadApk", packageName);
  }
}
