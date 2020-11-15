import { JsonConvert, Type, Wait } from "@simplysm/sd-core-common";
import {
  ISdServiceRequest,
  ISdServiceSplitRawRequest,
  ISdServiceUploadRawRequest,
  SdServiceEventBase,
  TSdServiceRawResponse
} from "@simplysm/sd-service-common";
import { EventEmitter } from "events";
import * as WebSocket from "ws";
import { FsUtils } from "@simplysm/sd-core-node";

export class SdServiceClient extends EventEmitter {
  private _ws?: WebSocket;
  private readonly _eventEmitter = new EventEmitter();
  private readonly _eventListeners = new Map<number, (message: MessageEvent) => (Promise<void> | void)>();

  private _lastRequestId = 0;

  public get connected(): boolean {
    return this._ws !== undefined && this._ws.readyState === WebSocket.OPEN;
  }

  public constructor(public readonly port: number,
                     public readonly host: string,
                     public readonly ssl?: boolean,
                     private readonly _password?: string) {
    super();
  }

  public async connectAsync(): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      if (this._ws) {
        await this.closeAsync();
      }

      this._ws = new WebSocket(`${this.ssl ? "wss" : "ws"}://${this.host}:${this.port}`);

      this._ws.onopen = (): void => {
        resolve();
      };

      this._ws.onerror = (errEvt): void => {
        if (this._ws?.readyState !== WebSocket.OPEN) {
          reject(new Error(`웹소켓을 연결하는 중에 오류가 발생했습니다: ${String(errEvt["message"])}`));
        }
        else {
          this.emit("error", new Error(`웹소켓을 연결하는 중에 오류가 발생했습니다: ${String(errEvt["message"])}`));
        }
      };

      this._ws.onmessage = (message): void => {
        this._eventEmitter.emit("message", message);
      };

      this._ws.onclose = (): void => {
        setTimeout(async () => {
          await this.connectAsync();
        }, 3000);
      };
    });
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(resolve => {
      if (this._ws) {
        this._eventEmitter.removeAllListeners();
        delete (this._ws as any).onopen;
        delete (this._ws as any).onerror;
        delete (this._ws as any).onclose;
        if (this._ws?.readyState !== WebSocket.CLOSED) {
          this._ws.onclose = (): void => {
            delete (this._ws as any).onclose;
            delete this._ws;
            resolve();
          };
          this._ws.close();
        }
        else {
          delete this._ws;
          resolve();
        }
      }
      else {
        resolve();
      }
    });
  }

  public async sendAsync(command: string,
                         params: any[],
                         splitOptions?: ISdServiceClientSplitOptions): Promise<any> {
    return await new Promise<any>(async (resolve, reject) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        try {
          await Wait.true(() => this._ws !== undefined && this._ws.readyState === WebSocket.OPEN, undefined, 3000);
        }
        catch (err) {
          throw new Error("웹 소켓이 연결되어있지 않습니다.");
        }
      }

      const requestId = this._lastRequestId++;
      const request: ISdServiceRequest = {
        type: "request",
        password: this._password,
        id: requestId,
        url: "",
        command,
        params
      };

      const requestJson = JsonConvert.stringify(request);

      let splitCompletedLength = 0;

      const messageEventListener = (message: MessageEvent): void => {
        const response: TSdServiceRawResponse = JsonConvert.parse(String(message.data));

        if (response.type === "split" && response.requestId === requestId) {
          splitCompletedLength += response.length;
          splitOptions?.progressCallback({
            current: splitCompletedLength,
            total: requestJson.length
          });
        }
        else if (response.type === "response" && response.requestId === requestId) {
          this._eventEmitter.off("message", messageEventListener);
          resolve(response.body);
        }
        else if (response.type === "error" && response.requestId === requestId) {
          this._eventEmitter.off("message", messageEventListener);
          reject(new Error(response.stack));
        }
      };

      this._eventEmitter.on("message", messageEventListener);

      if (splitOptions) {
        splitOptions.splitLength = splitOptions.splitLength ?? 10000;
      }

      // 요청 보내기
      if (splitOptions && (requestJson.length > splitOptions.splitLength! * 10)) {
        splitOptions.progressCallback({
          current: 0,
          total: requestJson.length
        });

        let i = 0;
        let cursor = 0;
        while (cursor < requestJson.length) {
          const realReq: ISdServiceSplitRawRequest = {
            type: "split",
            password: this._password,
            id: requestId,
            url: `${location.protocol}//${location.host}${location.pathname}`,
            index: i,
            data: requestJson.slice(cursor, Math.min(cursor + splitOptions.splitLength!, requestJson.length)),
            length: Math.ceil(requestJson.length / splitOptions.splitLength!)
          };
          this._ws!.send(JsonConvert.stringify(realReq));
          cursor += splitOptions.splitLength!;
          i++;
        }
      }
      else {
        this._ws!.send(requestJson);
      }
    });
  }

  public async addEventListenerAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>,
                                                                             info: T["info"],
                                                                             cb: (data: T["data"]) => (Promise<void> | void)): Promise<number> {
    const id = await this.sendAsync("addEventListener", [eventType.name, info]);
    const messageEventListener = async (message: MessageEvent): Promise<void> => {
      const response: TSdServiceRawResponse = JsonConvert.parse(String(message.data));
      if (response.type === "event" && response.eventListenerId === id) {
        await cb(response.body);
      }
    };
    this._eventEmitter.on("message", messageEventListener);
    this._eventListeners.set(id, messageEventListener);
    return id;
  }

  public async removeEventListenerAsync(id: number): Promise<void> {
    await this.sendAsync("removeEventListener", [id]);
    const messageEventListener = this._eventListeners.get(id);
    if (messageEventListener) {
      this._eventEmitter.off("message", messageEventListener);
      this._eventListeners.delete(id);
    }
  }

  public async emitAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>,
                                                                 infoSelector: (item: T["info"]) => boolean,
                                                                 data: T["data"]): Promise<void> {
    const events: { id: number; info: object }[] = await this.sendAsync("getEventListeners", [eventType.name]);
    const eventIds = events
      .filter(item => infoSelector(item.info))
      .map(item => item.id);

    await this.sendAsync("emitEvent", [eventIds, data]);
  }

  public async uploadAsync(filePath: string,
                           serverFilePath: string,
                           splitOptions?: ISdServiceClientSplitOptions): Promise<void> {
    if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
      try {
        await Wait.true(() => this._ws !== undefined && this._ws.readyState === WebSocket.OPEN, undefined, 3000);
      }
      catch (err) {
        throw new Error("웹 소켓이 연결되어있지 않습니다.");
      }
    }

    const md5s = await Promise.all([
      FsUtils.getMd5Async(filePath),
      this.sendAsync("md5", [serverFilePath])
    ]);
    const fileMd5 = md5s[0];
    const serverFileMd5 = md5s[1];

    if (fileMd5 === serverFileMd5) {
      return;
    }

    const fileSize = (await FsUtils.lstatAsync(filePath)).size;

    await new Promise<void>(async (resolve, reject) => {
      try {
        const requestId = this._lastRequestId++;

        let splitCompletedLength = 0;

        const messageEventListener = (message: MessageEvent): void => {
          const response: TSdServiceRawResponse = JsonConvert.parse(String(message.data));

          if (response.type === "upload" && response.requestId === requestId) {
            splitCompletedLength += response.length;
            if (splitOptions?.progressCallback) {
              splitOptions.progressCallback({
                current: splitCompletedLength,
                total: fileSize
              });
            }
          }
          else if (response.type === "response" && response.requestId === requestId) {
            this._eventEmitter.off("message", messageEventListener);
            resolve(response.body);
          }
          else if (response.type === "error" && response.requestId === requestId) {
            this._eventEmitter.off("message", messageEventListener);
            reject(new Error(response.stack));
          }
        };

        this._eventEmitter.on("message", messageEventListener);

        // 업로드 요청 보내기

        splitOptions?.progressCallback({
          current: 0,
          total: fileSize
        });

        if (splitOptions && (fileSize > splitOptions.splitLength! * 10)) {
          const fd = await FsUtils.openAsync(filePath, "r");
          let cursor = 0;
          while (cursor < fileSize) {
            const buffer = Buffer.alloc(Math.min(splitOptions.splitLength!, fileSize - cursor));
            await FsUtils.readAsync(fd, buffer, 0, Math.min(splitOptions.splitLength!, fileSize - cursor), cursor);

            const realReq: ISdServiceUploadRawRequest = {
              type: "upload",
              password: this._password,
              id: requestId,
              url: "",
              filePath: serverFilePath,
              buffer,
              length: fileSize,
              offset: cursor
            };

            this._ws!.send(JsonConvert.stringify(realReq));
            cursor += splitOptions.splitLength!;
          }

          await FsUtils.closeAsync(fd);
        }
        else {
          const buffer = await FsUtils.readFileBufferAsync(filePath);

          const realReq: ISdServiceUploadRawRequest = {
            type: "upload",
            password: this._password,
            id: requestId,
            url: "",
            filePath: serverFilePath,
            buffer,
            length: fileSize,
            offset: 0
          };

          this._ws!.send(JsonConvert.stringify(realReq));
        }
      }
      catch (err) {
        reject(err);
      }
    });
  }

  public async execAsync(cmd: string): Promise<void> {
    await this.sendAsync("exec", [cmd]);
  }
}


export interface ISdServiceClientSplitOptions {
  progressCallback: (progress: { current: number; total: number }) => void;
  splitLength?: number;
}