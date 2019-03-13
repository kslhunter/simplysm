//tslint:disable:no-null-keyword

import {JsonConvert, Logger, Type, Wait} from "@simplysm/sd-common";
import {ISdWebSocketRequest, ISdWebSocketResponse} from "./commons";
import * as WebSocket from "ws";
import * as fs from "fs-extra";
import * as crypto from "crypto";

export class SdWebSocketClient {
  private readonly _logger = new Logger("@simplysm/sd-service-client", "SdWebSocketClient");
  private _ws?: WebSocket;
  private readonly _eventListeners = new Map<number, (data: any) => (Promise<void> | void)>();
  private readonly _reqMap = new Map<number, (response: ISdWebSocketResponse) => void>();
  private _lastRequestId = 0;

  public get connected(): boolean {
    return !!this._ws && this._ws.readyState === WebSocket.OPEN;
  }

  public constructor(private readonly _port?: number,
                     private readonly _host?: string) {
  }

  public async connectAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (process.versions.node) {
        if (!this._host || !this._port) {
          throw new Error("호스트와 포트가 반드시 입력되어야 합니다.");
        }
      }

      // @ts-ignore
      this._ws = new WebSocket(`ws://${this._host || location.hostname}:${this._port || location.port}`);

      this._ws.onopen = () => {
        // @ts-ignore
        this._ws!.onopen = null;
        resolve();
      };

      this._ws.onmessage = message => {
        const obj = JsonConvert.parse(String(message.data));

        if (obj.eventListenerId) {
          this._eventListeners.get(obj.eventListenerId)!(obj.data);
        }
        else {
          const response: ISdWebSocketResponse = obj;
          this._reqMap.get(response.requestId)!(response);
        }
      };

      this._ws.onerror = errEvt => {
        reject(errEvt.error);
      };

      this._ws.onclose = () => {
        // @ts-ignore
        this._ws!.onopen = null;
        // @ts-ignore
        this._ws!.onmessage = null;
        // @ts-ignore
        this._ws!.onerror = null;
        this._ws = undefined;

        setTimeout(async () => {
          await this.connectAsync();
        }, 1000);
      };
    });
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(resolve => {
      this._ws!.onclose = () => {
        // @ts-ignore
        this._ws!.onopen = null;
        // @ts-ignore
        this._ws!.onmessage = null;
        // @ts-ignore
        this._ws!.onerror = null;
        this._ws = undefined;

        resolve();
      };
      this._ws!.close();
    }).catch(err => {
      this._logger.warn(err);
      delete this._ws;
    });
  }

  public async addEventListenerAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, info: T["info"], cb: (data: T["data"]) => (Promise<void> | void)): Promise<void> {
    const id = await this.sendAsync("addEventListener", [eventType.name, info]);
    this._eventListeners.set(id, cb);
  }

  public async emitAsync<T extends SdServiceEventBase<any, any>>(eventType: Type<T>, infoSelector: (item: T["info"]) => boolean, data: T["data"]): Promise<void> {
    const events: { id: number; info: object }[] = await this.sendAsync("getEventListeners", [eventType.name]);
    await this.sendAsync("emitEvent", [events.filter(item => infoSelector(item.info)).map(item => item.id), data]);
  }

  public async uploadAsync(filePath: string, serverPath: string, sendProgressCallback?: (progress: { current: number; total: number }) => void, splitLength: number = 10000): Promise<void> {
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
      const fileSize = (await fs.lstat(filePath)).size;

      let splitCompletedLength = 0;
      this._reqMap.set(requestId, async response => {
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
        else if (response.type === "checkMd5") {
          // 업로드 요청 보내기
          if (sendProgressCallback) {
            sendProgressCallback({
              current: 0,
              total: fileSize
            });

            const fd = await fs.open(filePath, "r");
            let cursor = 0;
            while (cursor < fileSize) {
              const buffer = Buffer.alloc(Math.min(splitLength, fileSize - cursor));
              await fs.read(fd, buffer, 0, Math.min(splitLength, fileSize - cursor), cursor);
              const str = `!upload(${requestId},${serverPath},${cursor},${fileSize})!${JsonConvert.stringify(buffer)}`;
              this._ws!.send(str);
              cursor += splitLength;
            }
          }
          else {
            const buffer = await fs.readFile(filePath);
            const str = `!upload(${requestId},${serverPath},${0},${fileSize})!${JsonConvert.stringify(buffer)}`;
            this._ws!.send(str);
          }
        }
        else {
          this._reqMap.delete(requestId);
          resolve(response.body);
        }
      });

      // 업로드가 필요한지 먼저 확인 필요
      const fileMd5 = await new Promise<string>((resolve1, reject1) => {
        const output = crypto.createHash("md5");
        const input = fs.createReadStream(filePath);

        input.on("error", err => {
          reject1(err);
        });

        output.once("readable", () => {
          resolve1(output.read().toString("hex"));
        });

        input.pipe(output);
      });
      const checkMd5String = `!checkMd5(${requestId},${serverPath})!${fileMd5}`;
      this._ws!.send(checkMd5String);
    });
  }

  public async sendAsync(command: string, params: any[], sendProgressCallback?: (progress: { current: number; total: number }) => void, splitLength: number = 10000): Promise<any> {
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
      const request: ISdWebSocketRequest = {
        id: requestId,
        url: "",
        command,
        params
      };

      if (!process.versions.node) {
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
