//tslint:disable:no-null-keyword

import {ISdServiceRequest, ISdServiceResponse} from "../commons";
import * as WebSocket from "ws";
import * as fs from "fs-extra";
import * as crypto from "crypto";
import {JsonConvert, Logger, Type, Wait} from "@simplysm/sd-core";

export class SdServiceClient {
  private readonly _logger = new Logger("@simplysm/sd-service", "SdServiceClient");
  private _ws?: WebSocket;
  private readonly _eventListeners = new Map<number, (data: any) => (Promise<void> | void)>();
  private readonly _reqMap = new Map<number, (response: ISdServiceResponse) => void>();
  private _lastRequestId = 0;

  public get connected(): boolean {
    return !!this._ws && this._ws.readyState === WebSocket.OPEN;
  }

  public constructor(public port?: number,
                     public host?: string,
                     public ssl?: boolean,
                     public origin?: string) {
  }

  public get webUrl(): string {
    return `${this.ssl ? "https" : (location.protocol.startsWith("https") ? "https" : "http")}://${this.host || location.hostname}:${this.port || location.port}`;
  }

  public async connectAsync(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        if (process.versions.node) {
          if (!this.host || !this.port) {
            throw new Error("호스트와 포트가 반드시 입력되어야 합니다.");
          }
          this._ws = new WebSocket(`${this.ssl ? "wss" : "ws"}://${this.host}:${this.port}`, {origin: this.origin});
        }
        else {
          // @ts-ignore
          this._ws = new WebSocket(`${this.ssl ? "wss" : (location.protocol.startsWith("https") ? "wss" : "ws")}://${this.host || location.hostname}:${this.port || location.port}`);
        }

        this._ws.onopen = () => {
          if (this._ws) {
            // @ts-ignore
            this._ws.onopen = null;
          }
          resolve();
        };

        this._ws.onmessage = message => {
          const obj = JsonConvert.parse(String(message.data));

          if (obj.eventListenerId) {
            this._eventListeners.get(obj.eventListenerId)!(obj.data);
          }
          else {
            const response: ISdServiceResponse = obj;
            this._reqMap.get(response.requestId)!(response);
          }
        };

        this._ws.onerror = errEvt => {
          reject(errEvt.error);
        };

        this._ws.onclose = () => {
          if (this._ws) {
            // @ts-ignore
            this._ws!.onopen = null;
            // @ts-ignore
            this._ws!.onmessage = null;
            // @ts-ignore
            this._ws!.onerror = null;
            this._ws = undefined;
          }

          setTimeout(async () => {
            await this.connectAsync();
          }, 1000);
        };
      });
    }
    catch (err) {
      this._logger.error(err);

      setTimeout(async () => {
        await this.connectAsync();
      }, 1000);
    }
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(resolve => {
      this._ws!.onclose = () => {
        if (this._ws) {
          // @ts-ignore
          this._ws!.onopen = null;
          // @ts-ignore
          this._ws!.onmessage = null;
          // @ts-ignore
          this._ws!.onerror = null;
          this._ws = undefined;
        }

        resolve();
      };
      this._ws!.close();
    }).catch(err => {
      this._logger.warn(err);
      delete this._ws;
    });
  }

  public async addEventListenerAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => (Promise<void> | void)): Promise<number> {
    const id = await this.sendAsync("addEventListener", [eventType.name, info]);
    this._eventListeners.set(id, cb);
    return id;
  }

  public removeEventListener(id: number): void {
    this._eventListeners.delete(id);
  }

  public async emitAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): Promise<void> {
    const events: { id: number; info: object }[] = await this.sendAsync("getEventListeners", [eventType.name]);
    await this.sendAsync("emitEvent", [events.filter(item => infoSelector(item.info)).map(item => item.id), data]);
  }

  public async checkUploadFileSizeAsync(filePath: string, serverPath: string): Promise<number> {
    return await new Promise<number>(async (resolve, reject) => {
      try {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
          try {
            await Wait.true(() => !!this._ws && this._ws.readyState === WebSocket.OPEN, undefined, 3000);
          }
          catch (err) {
            throw new Error("웹 소켓이 연결되어있지 않습니다.");
          }
        }

        const requestId = this._lastRequestId++;
        this._reqMap.set(requestId, async response => {
          this._reqMap.delete(requestId);

          if (response.type === "error") {
            reject(new Error(response.body));
          }
          else if (response.type === "checkMd5") {
            resolve((await fs.lstat(filePath)).size);
          }
          else {
            resolve(0);
          }
        });

        const fileMd5 = await new Promise<string>((resolve1, reject1) => {
          try {
            const hash = crypto.createHash("md5").setEncoding("hex");
            fs.createReadStream(filePath)
              .on("error", err => {
                reject1(err);
              })
              .pipe(hash)
              .once("finish", () => {
                resolve1(hash.read());
              });
          }
          catch (err) {
            reject1(err);
          }
        });
        const checkMd5String = `!checkMd5(${requestId},${serverPath})!${fileMd5}`;
        this._ws!.send(checkMd5String);
      }
      catch (err) {
        reject(err);
      }
    });
  }

  public async uploadAsync(filePath: string, serverPath: string, sendProgressCallback?: (progress: { current: number; total: number }) => void, splitLength: number = 10000): Promise<any> {
    return await new Promise<any>(async (resolve, reject) => {
      try {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
          try {
            await Wait.true(() => !!this._ws && this._ws.readyState === WebSocket.OPEN, undefined, 3000);
          }
          catch (err) {
            throw new Error("웹 소켓이 연결되어있지 않습니다.");
          }
        }

        const requestId = this._lastRequestId++;
        const fileSize = (await fs.lstat(filePath)).size;

        let splitCompletedLength = 0;
        this._reqMap.set(requestId, response => {
          if (response.type === "error") {
            this._reqMap.delete(requestId);
            reject(new Error(response.body));
          }
          else if (response.type === "upload") {
            splitCompletedLength += response.body;
            if (sendProgressCallback) {
              sendProgressCallback({
                current: splitCompletedLength,
                total: fileSize
              });
            }
          }
          else {
            this._reqMap.delete(requestId);
            resolve(response.body);
          }
        });

        // 업로드 요청 보내기
        if (sendProgressCallback) {
          const fd = await fs.open(filePath, "r");
          let cursor = 0;
          while (cursor < fileSize) {
            const buffer = Buffer.alloc(Math.min(splitLength, fileSize - cursor));
            await fs.read(fd, buffer, 0, Math.min(splitLength, fileSize - cursor), cursor);
            const str = `!upload(${requestId},${serverPath},${cursor},${fileSize})!${JsonConvert.stringify(buffer)}`;
            this._ws!.send(str);
            cursor += splitLength;
          }

          await fs.close(fd);
        }
        else {
          const buffer = await fs.readFile(filePath);
          const str = `!upload(${requestId},${serverPath},${0},${fileSize})!${JsonConvert.stringify(buffer)}`;
          this._ws!.send(str);
        }
      }
      catch (err) {
        reject(err);
      }
    });
  }

  public async execAsync(cmd: string): Promise<void> {
    return await new Promise<any>(async (resolve, reject) => {
      try {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
          try {
            await Wait.true(() => !!this._ws && this._ws.readyState === WebSocket.OPEN, undefined, 3000);
          }
          catch (err) {
            throw new Error("웹 소켓이 연결되어있지 않습니다.");
          }
        }

        const requestId = this._lastRequestId++;
        this._reqMap.set(requestId, response => {
          if (response.type === "error") {
            this._reqMap.delete(requestId);
            reject(new Error(response.body));
          }
          else {
            this._reqMap.delete(requestId);
            resolve(response.body);
          }
        });

        this._ws!.send(`!exec(${requestId})!${cmd}`);
      }
      catch (err) {
        reject(err);
      }
    });
  }

  public async sendAsync(command: string,
                         params: any[],
                         headers: { [key: string]: any } = {},
                         sendProgressCallback?: (progress: { current: number; total: number }) => void,
                         splitLength: number = 10000): Promise<any> {
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
        id: requestId,
        url: "",
        headers,
        command,
        params
      };

      if (!process.versions.node && process.env.SD_PLATFORM !== "android") {
        // @ts-ignore
        request.url = `${location.protocol}//${location.host}${location.pathname}`;
      }

      const requestJson = JsonConvert.stringify(request)!;

      if ((requestJson.length > splitLength * 10) && sendProgressCallback) {
        sendProgressCallback({
          current: 0,
          total: requestJson.length
        });
      }

      let splitCompletedLength = 0;
      this._reqMap.set(requestId, response => {
        if (response.type === "error") {
          this._reqMap.delete(requestId);
          reject(new Error(response.body));
        }
        else if (response.type === "split") {
          splitCompletedLength += response.body;
          if (sendProgressCallback) {
            sendProgressCallback({
              current: splitCompletedLength,
              total: requestJson.length
            });
          }
        }
        else {
          this._reqMap.delete(requestId);
          resolve(response.body);
        }
      });

      // 요청 보내기
      if ((requestJson.length > splitLength * 10) && sendProgressCallback) {
        let i = 0;
        let cursor = 0;
        while (cursor < requestJson.length) {
          const str = `!split(${requestId},${i},${Math.ceil(requestJson.length / splitLength)})!${requestJson.slice(cursor, Math.min(cursor + splitLength, requestJson.length))}`;
          this._ws!.send(str);
          cursor += splitLength;
          i++;
        }
      }
      else {
        this._ws!.send(requestJson);
      }
    });
  }
}

export class SdServiceEventBase<I, O> {
  public info!: I;
  public data!: O;
}
