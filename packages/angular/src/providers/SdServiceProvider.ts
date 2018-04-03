import {Injectable, Type} from "@angular/core";
import {SocketClient} from "@simplism/socket-client";
import {JsonConvert, Uuid} from "@simplism/core";
import {SdBusyProvider} from "./SdBusyProvider";
import {SdToastProvider} from "./SdToastProvider";
import {SdLocalStorageProvider} from "./SdLocalStorageProvider";
import {ISocketEvent} from "@simplism/socket-common";

@Injectable()
export class SdServiceProvider {
    private _errorListeners: ((err: Error) => Promise<boolean>)[] = [];
    private _client: SocketClient = new SocketClient();

    get connected(): boolean {
        return this._client.connected;
    }

    constructor(private _busy: SdBusyProvider,
                private _toast: SdToastProvider,
                private _localStorage: SdLocalStorageProvider) {
    }

    async connect(url: string): Promise<void> {
        await this._client.connect(url);
    }

    setGlobalHeaderItem(key: string, value: any): void {
        const globalHeaderJson = this._localStorage.get("simgular.global-headers");
        const globalHeader = globalHeaderJson ? JsonConvert.parse(globalHeaderJson) : {};
        globalHeader[key] = value;
        this._localStorage.set("simgular.global-headers", JsonConvert.stringify(globalHeader));
    }

    getGlobalHeaderItem(key: string): any {
        return this.getGlobalHeader()[key];
    }

    getGlobalHeader(): { [key: string]: any } {
        const globalHeadersJson = this._localStorage.get("simgular.global-headers");
        return globalHeadersJson ? JsonConvert.parse(globalHeadersJson) : {};
    }

    clearGlobalHeader(): void {
        this._localStorage.remove("simgular.global-headers");
    }

    removeGlobalHeaderItem(key: string): void {
        const globalHeader = this.getGlobalHeader();
        delete globalHeader[key];
        this._localStorage.set("simgular.global-headers", JsonConvert.stringify(globalHeader));
    }

    /**
     * 언제든 오류가 발생하면 수행되는 callback을 등록합니다.
     * @param {(err: Error) => Promise<boolean>} cb 오류가 발생되면 수행되는 callback입니다.
     */
    addGlobalErrorHandler(cb: (err: Error) => Promise<boolean>): void {
        this._errorListeners.push(cb);
    }

    async send<S, R>(serviceType: Type<S>, methodFunc: (service: S) => Promise<R>, options: { showBusy: boolean } = {showBusy: true}): Promise<R> {
        const serviceName = serviceType.name;

        const matches = methodFunc
            .toString()
            .match(/function\s?\(([^)]*)\)\s?{((?!return).)*return\s+([^(]*)\(((.|\n|\r)*)\);?\s?}$/);
        const fieldName = matches![1];
        const method = matches![3];
        const methodName = method.replace(fieldName + ".", "");

        const serviceObj: S = {} as any;
        serviceObj[methodName] = async (...args: any[]) => {
            return await this.sendCommand.apply(this, [options, serviceName + "." + methodName].concat(args));
        };
        return await methodFunc(serviceObj);
    }

    async sendCommand(options: { showBusy: boolean }, cmd: string, ...args: any[]): Promise<any> {
        try {
            if (options.showBusy) await this._busy.show();
            const result = await this._client.send(cmd, args, this.getGlobalHeader());
            if (options.showBusy) this._busy.hide();
            return result;
        }
        catch (e) {
            this._toast.danger(e.message);
            if (options.showBusy) this._busy.hide();
            for (const callback of this._errorListeners) {
                const reload = await callback(e);
                if (reload) {
                    return await this.sendCommand.apply(this, [options, cmd].concat(args));
                }
            }
            throw e;
        }
    }

    async on<T extends ISocketEvent<any, any>>(eventType: Type<T>, info: T["info"], callback: (result: T["data"]) => void | Promise<void>): Promise<Uuid> {
        return await this._client.on(eventType, info, callback);
    }

    async off(id: Uuid): Promise<void> {
        return await this._client.off(id);
    }

    async downloadApk(packageName: string, options: { showBusy: boolean } = {showBusy: true}): Promise<void> {
        await this.sendCommand(options, "downloadApk", packageName);
    }
}