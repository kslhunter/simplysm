import * as WebSocket from "ws";
import * as http from "http";
import {EventEmitter} from "events";
import {JsonConvert, Logger, optional} from "@simplysm/sd-core";
import * as fs from "fs-extra";
import * as crypto from "crypto";
import * as child_process from "child_process";
import {ISdServiceEmitResponse, ISdServiceRequest, ISdServiceResponse} from "../commons";
import * as path from "path";

export class SdServiceServerConnection extends EventEmitter {
  private readonly _logger = new Logger("@simplysm/sd-service", "SdServiceServerConnection");
  private readonly _splitRequestMap = new Map<number, { timer: NodeJS.Timer; bufferStrings: string[] }>();
  private readonly _uploadRequestMap = new Map<number, { timer: NodeJS.Timer; fd: number; filePath: string; completedLength: number }>();
  private readonly origin: string;

  public get isOpen(): boolean {
    return this._conn.readyState === WebSocket.OPEN;
  }

  public constructor(private readonly _conn: WebSocket, req: http.IncomingMessage) {
    super();
    this.origin = optional(() => req.headers.origin!.toString()) || "";

    this._conn.on("message", async (msg: string) => {
      try {
        await this._onMessageAsync(msg);
      }
      catch (err) {
        this._logger.error(err);
      }
    });

    this._conn.on("close", () => {
      this._splitRequestMap.clear();
      this._uploadRequestMap.clear();
      this.emit("close");
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

  public async sendAsync(data: ISdServiceResponse | ISdServiceEmitResponse): Promise<void> {
    if (!this.isOpen) {
      return;
    }

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
    const execRegexp = /^!exec\(([0-9]*)\)!(.*)/;

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

      const splitRequestValue = this._splitRequestMap.get(requestId);

      if (splitRequestValue) {
        splitRequestValue.bufferStrings[i] = str;

        clearTimeout(splitRequestValue.timer);
        splitRequestValue.timer = setTimeout(() => {
          this._logger.warn(`분할요청중에 타임아웃이 발생했습니다. : ${this.origin}`);
          this._splitRequestMap.delete(requestId);
        }, 30000);

        const res: ISdServiceResponse = {
          requestId,
          type: "split",
          body: str.length
        };

        await this.sendAsync(res);


        const receivedLength = splitRequestValue.bufferStrings.filterExists().length;
        if (receivedLength !== length) {
          clearTimeout(splitRequestValue.timer);
          splitRequestValue.timer = setTimeout(() => {
            this._logger.warn(`분할요청중에 타임아웃이 발생했습니다. : ${this.origin}`);
            this._splitRequestMap.delete(requestId);
          }, 30000);
          return;
        }

        const currentLength = splitRequestValue.bufferStrings.filterExists().length;
        this._logger.log(`분할된 요청을 받았습니다 : ${this.origin} - ${i.toString().toLocaleString().padStart(length.toString().toLocaleString().length)}번째 /${length.toLocaleString()}`);

        if (!this._splitRequestMap.has(requestId)) return; // 동시작업이 있어, 동시 Request가 뜨는 경우가 있음. 이 문제 해결

        if (currentLength !== length) {
          this._splitRequestMap.set(requestId, splitRequestValue);
          return;
        }

        this._splitRequestMap.delete(requestId);
        message = splitRequestValue.bufferStrings.join("");
        this._logger.log(`분할요청 처리 : ${JsonConvert.parse(message)}`);
      }
    }
    // MD5 확인 요청 처리
    else if (checkMd5Regexp.test(msg)) {
      const match = msg.match(checkMd5Regexp)!;
      const requestId = Number(match[1]);
      const filePath = path.posix.join(process.cwd(), match[2]);
      const md5 = match[3];

      try {
        const fileMd5 = await fs.pathExists(filePath)
          ? await new Promise<string>((resolve1, reject1) => {
            const hash = crypto.createHash("md5").setEncoding("hex");
            fs.createReadStream(filePath)
              .on("error", err => {
                reject1(err);
              })
              .pipe(hash)
              .once("finish", () => {
                resolve1(hash.read());
              });
          })
          : undefined;

        if (fileMd5 === md5) {
          const endRes: ISdServiceResponse = {
            requestId,
            type: "response"
          };
          await this.sendAsync(endRes);
        }
        else {
          const endRes: ISdServiceResponse = {
            requestId,
            type: "checkMd5"
          };
          await this.sendAsync(endRes);
        }
      }
      catch (err) {
        this._logger.error(err, filePath);
        await this.sendAsync({
          requestId,
          type: "error",
          body: err.message
        });
      }
      return;
    }
    // 업로드 요청시 파일쓰기
    else if (uploadRegexp.test(msg)) {
      const match = msg.match(uploadRegexp)!;
      const requestId = Number(match[1]);
      const filePath = path.posix.join(process.cwd(), match[2]);
      const offset = Number(match[3]);
      const length = Number(match[4]);
      const buf = JsonConvert.parse(match[5]) as Buffer;

      if (!this._uploadRequestMap.has(requestId)) {
        fs.mkdirsSync(path.dirname(filePath));
        const fd = fs.openSync(filePath, "w");
        const newUploadRequestValue = {
          timer: setTimeout(() => {
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

      const res: ISdServiceResponse = {
        requestId,
        type: "upload",
        body: buf.length
      };

      await this.sendAsync(res);

      const completedLength = uploadRequestValue.completedLength;
      this._logger.log(`업로드 요청을 처리했습니다 : ${this.origin} - ${completedLength.toLocaleString()} /${length.toLocaleString()}`);

      if (uploadRequestValue.completedLength !== length) {
        return;
      }

      clearTimeout(uploadRequestValue.timer);
      fs.closeSync(uploadRequestValue.fd);
      this._uploadRequestMap.delete(requestId);

      const endRes: ISdServiceResponse = {
        requestId,
        type: "response"
      };
      await this.sendAsync(endRes);
      return;
    }
    else if (execRegexp.test(msg)) {
      const match = msg.match(execRegexp)!;
      const requestId = Number(match[1]);
      const cmd = match[2];

      const cmds = cmd.split(" ");
      child_process.spawnSync(cmds[0], cmds.slice(1), {
        shell: true,
        stdio: "inherit"
      });

      const endRes: ISdServiceResponse = {
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
    const request: ISdServiceRequest = JsonConvert.parse(message);
    this.emit("request", request);
  }
}
