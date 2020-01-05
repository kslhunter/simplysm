import * as WebSocket from "ws";
import {EventEmitter} from "events";
import {JsonConvert} from "@simplysm/sd-core-common";
import * as path from "path";
import * as fs from "fs-extra";
import {ISdServiceErrorResponse, ISdServiceRequest, ISdServiceResponse} from "./common";

export class SdServiceServerConnection extends EventEmitter {
  private readonly _splitRequestMap = new Map<number, { timer: NodeJS.Timer; bufferStrings: string[] }>();
  private readonly _uploadRequestMap = new Map<number, { timer: NodeJS.Timer; fd: number; filePath: string; completedLength: number }>();

  public constructor(private readonly _conn: WebSocket) {
    super();
    this._conn.on("message", async (msg: string) => {
      try {
        await this._onMessageAsync(msg);
      }
      catch (err) {
        this.emit("error", err);
      }
    });
  }

  private async _onMessageAsync(msg: string): Promise<void> {
    const rawReq = JsonConvert.parse(msg) as TSdServiceRawRequest;

    if (rawReq.type === "split") {
      if (!this._splitRequestMap.has(rawReq.id)) {
        this._splitRequestMap.set(rawReq.id, {
          timer: setTimeout(() => {
            this.emit("error", new Error(`분할요청중에 타임아웃이 발생했습니다.`));
            this._splitRequestMap.delete(rawReq.id);
          }, 3000),
          bufferStrings: []
        });
      }

      const splitRequestValue = this._splitRequestMap.get(rawReq.id)!;
      splitRequestValue.bufferStrings[rawReq.index] = rawReq.data;

      clearTimeout(splitRequestValue.timer);

      const res: ISdServiceSplitRawResponse = {
        type: "split",
        requestId: rawReq.id,
        index: rawReq.index
      };

      await this.sendAsync(res);

      const receivedLength = splitRequestValue.bufferStrings.filterExists().length;
      if (receivedLength !== rawReq.length) {
        splitRequestValue.timer = setTimeout(() => {
          this.emit("error", new Error(`분할요청중에 타임아웃이 발생했습니다.`));
          this._splitRequestMap.delete(rawReq.id);
        }, 3000);
        return;
      }

      this._splitRequestMap.delete(rawReq.id);
      const reqText = splitRequestValue.bufferStrings.join("");

      this.emit("request", JsonConvert.parse(reqText));
    }
    else if (rawReq.type === "upload") {
      if (!this._uploadRequestMap.has(rawReq.id)) {
        fs.mkdirsSync(path.dirname(rawReq.filePath));
        const fd = fs.openSync(rawReq.filePath, "w");
        const newUploadRequestValue = {
          timer: setTimeout(() => {
            this.emit("error", `업로드중에 타임아웃이 발생했습니다.`);
            fs.closeSync(fd);
            fs.unlinkSync(rawReq.filePath);
            this._uploadRequestMap.delete(rawReq.id);
          }, 3000),
          fd,
          filePath: rawReq.filePath,
          completedLength: 0
        };
        this._uploadRequestMap.set(rawReq.id, newUploadRequestValue);
      }

      const uploadRequestValue = this._uploadRequestMap.get(rawReq.id)!;
      fs.writeSync(uploadRequestValue.fd, rawReq.buffer, 0, rawReq.buffer.length, rawReq.offset);
      uploadRequestValue.completedLength += rawReq.length;

      clearTimeout(uploadRequestValue.timer);

      const res: ISdServiceUploadRawResponse = {
        type: "upload",
        requestId: rawReq.id,
        length: rawReq.buffer.length
      };

      await this.sendAsync(res);

      if (uploadRequestValue.completedLength !== rawReq.length) {
        uploadRequestValue.timer = setTimeout(() => {
          this.emit("error", new Error(`업로드중에 타임아웃이 발생했습니다.`));
          fs.closeSync(uploadRequestValue.fd);
          fs.unlinkSync(uploadRequestValue.filePath);
          this._uploadRequestMap.delete(rawReq.id);
        }, 3000);
        return;
      }

      clearTimeout(uploadRequestValue.timer);
      fs.closeSync(uploadRequestValue.fd);
      fs.unlinkSync(uploadRequestValue.filePath);
      this._uploadRequestMap.delete(rawReq.id);

      const req: ISdServiceRequest = {
        type: "request",
        command: "upload",
        id: rawReq.id,
        params: []
      };
      this.emit("request", req);
    }
    else {
      this.emit("request", rawReq);
    }
  }

  public async sendAsync(res: TSdServiceRawResponse): Promise<void> {
    if (this._conn.readyState !== WebSocket.OPEN) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this._conn.send(JsonConvert.stringify(res), (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}


type TSdServiceRawRequest =
  ISdServiceSplitRawRequest
  | ISdServiceUploadRawRequest
  | ISdServiceRequest;

interface ISdServiceSplitRawRequest {
  type: "split";
  id: number;
  index: number;
  length: number;
  data: string;
}

interface ISdServiceUploadRawRequest {
  type: "upload";
  id: number;
  filePath: string;
  offset: number;
  length: number;
  buffer: Buffer;
}

type TSdServiceRawResponse =
  ISdServiceSplitRawResponse
  | ISdServiceUploadRawResponse
  | ISdServiceResponse
  | ISdServiceErrorResponse;

interface ISdServiceSplitRawResponse {
  type: "split";
  requestId: number;
  index: number;
}

interface ISdServiceUploadRawResponse {
  type: "upload";
  requestId: number;
  length: number;
}
