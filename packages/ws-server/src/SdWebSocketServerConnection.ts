import * as WebSocket from "ws";
import * as http from "http";
import {EventEmitter} from "events";
import {JsonConvert, Logger, optional} from "@simplysm/common";
import {ISdWebSocketEmitResponse, ISdWebSocketRequest, ISdWebSocketResponse} from "@simplysm/ws-common";
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from "crypto";

export class SdWebSocketServerConnection extends EventEmitter {
  private readonly _logger = new Logger("@simplysm/ws-server", "SdWebSocketServerConnection");
  private readonly _splitRequestMap = new Map<number, { timer: NodeJS.Timer; bufferStrings: string[] }>();
  private readonly _uploadRequestMap = new Map<number, { timer: NodeJS.Timer; fd: number; filePath: string; completedLength: number }>();
  private readonly origin: string;

  public get isOpen(): boolean {
    return this._conn.readyState === WebSocket.OPEN;
  }

  public constructor(private readonly _conn: WebSocket, req: http.IncomingMessage) {
    super();
    this.origin = optional(req.headers.origin, o => o.toString()) || "";

    this._conn.on("close", async () => {
      this._splitRequestMap.clear();
      this._uploadRequestMap.clear();
      this.emit("close");
    });

    this._conn.on("message", async (msg: string) => {
      try {
        await this._onMessageAsync(msg);
      }
      catch (err) {
        this._logger.error(err);
      }
    });
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(resolve => {
      this._conn.on("close", () => {
        resolve();
      });

      this._conn.close();
    });
  }

  public async sendAsync(data: ISdWebSocketResponse | ISdWebSocketEmitResponse): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this._conn.send(JsonConvert.stringify(data), err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private async _onMessageAsync(msg: string): Promise<void> {
    let message;

    const splitRegexp = /^!split\(([0-9]*),([0-9]*),([0-9]*)\)!(.*)/;
    const checkMd5Regexp = /^!checkMd5\(([0-9]*),([^,]*)\)!(.*)/;
    const uploadRegexp = /^!upload\(([0-9]*),([^,]*),([0-9]*),([0-9]*)\)!(.*)/;

    // 부분 요청 합치
    if (splitRegexp.test(msg)) {
      const match = msg.match(splitRegexp)!;
      const requestId = Number(match[1]);
      const i = Number(match[2]);
      const length = Number(match[3]);
      const str = match[4];

      if (!this._splitRequestMap.has(requestId)) {
        this._splitRequestMap.set(requestId, {
          timer: setTimeout(() => {
            this._logger.warn(`분할요청중에 타임아웃이 발생했습니다. : ${this.origin}`);
            this._splitRequestMap.delete(requestId);
          }, 30000),
          bufferStrings: []
        });
      }

      const splitRequestValue = this._splitRequestMap.get(requestId)!;
      splitRequestValue.bufferStrings[i] = str;

      clearTimeout(splitRequestValue.timer);
      splitRequestValue.timer = setTimeout(() => {
        this._logger.warn(`분할요청중에 타임아웃이 발생했습니다. : ${this.origin}`);
        this._splitRequestMap.delete(requestId);
      }, 30000);

      const res: ISdWebSocketResponse = {
        requestId,
        type: "split",
        body: str.length
      };

      if (this.isOpen) {
        await this.sendAsync(res);
      }

      const currentLength = splitRequestValue.bufferStrings.filterExists().length;
      this._logger.log(`분할된 요청을 받았습니다 : ${this.origin} - ${i.toString().toLocaleString().padStart(length.toString().toLocaleString().length)}번째 /${length.toLocaleString()}`);

      if (currentLength !== length) {
        this._splitRequestMap.set(requestId, splitRequestValue);
        return;
      }

      clearTimeout(this._splitRequestMap.get(requestId)!.timer);
      this._splitRequestMap.delete(requestId);
      message = splitRequestValue.bufferStrings.join("");
    }
    // MD5 확인 요청 처리
    else if (checkMd5Regexp.test(msg)) {
      const match = msg.match(checkMd5Regexp)!;
      const requestId = Number(match[1]);
      const filePath = match[2];
      const md5 = match[3];

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

      if (fileMd5 === md5) {
        const endRes: ISdWebSocketResponse = {
          requestId,
          type: "response"
        };
        await this.sendAsync(endRes);
      }
      else {
        const endRes: ISdWebSocketResponse = {
          requestId,
          type: "checkMd5"
        };
        await this.sendAsync(endRes);
      }
    }
    // 업로드 요청시 파일쓰기
    else if (uploadRegexp.test(msg)) {
      const match = msg.match(uploadRegexp)!;
      const requestId = Number(match[1]);
      const filePath = match[2];
      const offset = Number(match[3]);
      const length = Number(match[4]);
      const buf = JsonConvert.parse(match[5]) as Buffer;

      if (!this._uploadRequestMap.has(requestId)) {
        fs.mkdirsSync(path.dirname(filePath));
        const fd = fs.openSync(filePath, "w");
        const newUploadRequestValue = {
          timer: setTimeout(async () => {
            this._logger.warn(`업로드중에 타임아웃이 발생했습니다. : ${this.origin}`);
            fs.closeSync(fd);
            fs.unlinkSync(filePath);
            this._uploadRequestMap.delete(requestId);
          }, 30000),
          fd,
          filePath,
          completedLength: 0
        };
        this._uploadRequestMap.set(requestId, newUploadRequestValue);
      }

      const uploadRequestValue = this._uploadRequestMap.get(requestId)!;
      fs.writeSync(uploadRequestValue.fd, buf, 0, buf.length, offset);
      uploadRequestValue.completedLength += buf.length;

      clearTimeout(uploadRequestValue.timer);
      uploadRequestValue.timer = setTimeout(() => {
        this._logger.warn(`업로드중에 타임아웃이 발생했습니다. : ${this.origin}`);
        fs.closeSync(uploadRequestValue.fd);
        fs.unlinkSync(uploadRequestValue.filePath);
        this._uploadRequestMap.delete(requestId);
      }, 30000);

      const res: ISdWebSocketResponse = {
        requestId,
        type: "upload",
        body: buf.length
      };

      if (this.isOpen) {
        await this.sendAsync(res);
      }

      const completedLength = uploadRequestValue.completedLength;
      this._logger.log(`업로드 요청을 처리했습니다 : ${this.origin} - ${completedLength.toLocaleString()} /${length.toLocaleString()}`);

      if (uploadRequestValue.completedLength !== length) {
        return;
      }

      clearTimeout(uploadRequestValue.timer);
      fs.closeSync(uploadRequestValue.fd);
      this._uploadRequestMap.delete(requestId);

      const endRes: ISdWebSocketResponse = {
        requestId,
        type: "response"
      };
      await this.sendAsync(endRes);
      return;
    }
    else {
      message = msg;
    }

    // Request 파싱
    const request: ISdWebSocketRequest = JsonConvert.parse(message);

    this.emit("request", request);
  }
}
