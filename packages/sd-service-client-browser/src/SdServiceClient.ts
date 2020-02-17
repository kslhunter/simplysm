import {FileUtil, Logger} from "@simplysm/sd-core-browser";
import {JsonConvert, Type, Wait} from "@simplysm/sd-core-common";
import {
  ISdServiceRequest,
  ISdServiceSplitRawRequest,
  ISdServiceUploadRawRequest,
  TSdServiceRawResponse
} from "@simplysm/sd-service-common";
import {EventEmitter} from "events";
import {SdServiceEventBase} from "./SdServiceEventBase";

export class SdServiceClient {
  private readonly _logger: Logger;
  private _ws?: WebSocket;
  private readonly _eventEmitter = new EventEmitter();
  private readonly _eventListeners = new Map<number, (message: MessageEvent) => (Promise<void> | void)>();

  private _lastRequestId = 0;

  public constructor(public port?: number,
                     public host?: string,
                     public ssl?: boolean) {
    this._logger = Logger.get(["simplysm", "sd-service-client-browser"]);
  }

  public async connectAsync(): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      if (this._ws) {
        await this.closeAsync();
      }

      const protocol = this.ssl ? "wss" : (location.protocol.startsWith("https") ? "wss" : "ws");
      const host = this.host || location.hostname;
      const port = this.port || location.port;
      this._ws = new WebSocket(`${protocol}://${host}:${port}`);

      this._ws.onopen = () => {
        resolve();
      };

      this._ws.onerror = errEvt => {
        if (this._ws?.readyState !== WebSocket.OPEN) {
          reject(new Error(`웹소켓을 연결하는 중에 오류가 발생했습니다.`));
        }
        else {
          this._logger.error(`웹소켓을 연결하는 중에 오류가 발생했습니다.`, errEvt);
        }
      };

      this._ws!.onmessage = message => {
        this._eventEmitter.emit("message", message);
      };

      this._ws.onclose = () => {
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
        delete this._ws.onopen;
        delete this._ws.onerror;
        delete this._ws.onclose;
        if (this._ws?.readyState !== WebSocket.CLOSED) {
          this._ws.onclose = () => {
            delete this._ws!.onclose;
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
                         splitOptions?: {
                           progressCallback: (progress: { current: number; total: number }) => void;
                           splitLength?: number;
                         }): Promise<any> {
    return await new Promise<any>(async (resolve, reject) => {
      if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
        try {
          await Wait.true(() => !!this._ws && this._ws.readyState === WebSocket.OPEN, undefined, 3000);
        }
        catch (err) {
          throw new Error("웹 소켓이 연결되어있지 않습니다.");
        }
      }

      const requestId = this._lastRequestId++;
      const request: ISdServiceRequest = {
        type: "request",
        id: requestId,
        url: `${location.protocol}//${location.host}${location.pathname}`,
        command,
        params
      };

      const requestJson = JsonConvert.stringify(request);

      let splitCompletedLength = 0;

      const messageEventListener = (message: MessageEvent) => {
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
    const messageEventListener = async (message: MessageEvent) => {
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

  public async uploadAsync(file: File | Blob,
                           serverFilePath: string,
                           splitOptions?: {
                             progressCallback: (progress: { current: number; total: number }) => void;
                             splitLength?: number;
                           }): Promise<void> {
    const fileMd5 = await FileUtil.getMd5Async(file);
    const serverFileMd5 = await this.sendAsync("md5", [serverFilePath]);

    if (fileMd5 === serverFileMd5) {
      return;
    }

    await new Promise<void>(async (resolve, reject) => {
      const requestId = this._lastRequestId++;

      let splitCompletedLength = 0;

      const messageEventListener = (message: MessageEvent) => {
        const response: TSdServiceRawResponse = JsonConvert.parse(String(message.data));

        if (response.type === "upload" && response.requestId === requestId) {
          splitCompletedLength += response.length;
          if (splitOptions?.progressCallback) {
            splitOptions?.progressCallback({
              current: splitCompletedLength,
              total: file.size
            });
          }
        }
        else if (response.type === "response") {
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
      await new Promise<void>((resolve1, reject1) => {
        if (splitOptions && (file.size > splitOptions.splitLength! * 10)) {
          splitOptions.progressCallback({
            current: 0,
            total: file.size
          });

          let cursor = 0;

          const fileReader = new FileReader();
          const loadNext = () => {
            const start = cursor;
            const end = Math.min(cursor + splitOptions.splitLength!, file.size);
            fileReader.readAsArrayBuffer(file.slice(start, end));
          };
          fileReader.onload = () => {
            const arrBuff = fileReader.result as ArrayBuffer;

            const realReq: ISdServiceUploadRawRequest = {
              type: "upload",
              id: requestId,
              url: `${location.protocol}//${location.host}${location.pathname}`,
              filePath: serverFilePath,
              buffer: Buffer.from(arrBuff),
              length: file.size,
              offset: cursor
            };

            this._ws!.send(JsonConvert.stringify(realReq));
            cursor += splitOptions.splitLength!;

            if (cursor < file.size) {
              loadNext();
            }
            else {
              resolve1();
            }
          };
          loadNext();
        }
        else {
          const fileReader = new FileReader();

          fileReader.onload = () => {
            const arrBuff = fileReader.result as ArrayBuffer;

            const realReq: ISdServiceUploadRawRequest = {
              type: "upload",
              id: requestId,
              url: `${location.protocol}//${location.host}${location.pathname}`,
              filePath: serverFilePath,
              buffer: Buffer.from(arrBuff),
              length: file.size,
              offset: 0
            };
            this._ws!.send(JsonConvert.stringify(realReq));

            resolve1();
          };
          fileReader.readAsArrayBuffer(file);
        }
      });
    });
  }
}
