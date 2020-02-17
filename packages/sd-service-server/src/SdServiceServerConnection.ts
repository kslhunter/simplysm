import * as WebSocket from "ws";
import {EventEmitter} from "events";
import {JsonConvert} from "@simplysm/sd-core-common";
import * as path from "path";
import {
  ISdServiceRequest,
  ISdServiceSplitRawResponse,
  ISdServiceUploadRawResponse,
  TSdServiceRawRequest,
  TSdServiceRawResponse
} from "@simplysm/sd-service-common";
import {FsUtil} from "@simplysm/sd-core-node";

export class SdServiceServerConnection extends EventEmitter {
  private readonly _splitRequestMap = new Map<number, { timer: NodeJS.Timer; bufferStrings: string[] }>();
  private readonly _uploadRequestMap = new Map<number, { timer: NodeJS.Timer; fd: number; filePath: string; completedLength: number }>();

  public constructor(private readonly _conn: WebSocket,
                     private readonly _rootPath: string) {
    super();
    this._conn.on("message", async (msg: string) => {
      try {
        await this._onMessageAsync(msg);
      }
      catch (err) {
        this.emit("error", err);
      }
    });

    this._conn.on("close", () => {
      this._splitRequestMap.clear();
      this._uploadRequestMap.clear();
      this.emit("close");
    });
  }

  private async _onMessageAsync(msg: string): Promise<void> {
    const rawReq = JsonConvert.parse(msg) as TSdServiceRawRequest;

    // 분할 요청
    if (rawReq.type === "split") {
      if (!this._splitRequestMap.has(rawReq.id)) {
        this._splitRequestMap.set(rawReq.id, {
          timer: setTimeout(() => {
            this.emit("error", new Error(`분할요청중에 타임아웃이 발생했습니다.`));
            this._splitRequestMap.delete(rawReq.id);
          }, 10000),
          bufferStrings: []
        });
      }

      const splitRequestValue = this._splitRequestMap.get(rawReq.id)!;
      splitRequestValue.bufferStrings[rawReq.index] = rawReq.data;

      clearTimeout(splitRequestValue.timer);

      const res: ISdServiceSplitRawResponse = {
        type: "split",
        requestId: rawReq.id,
        length: rawReq.data.length
      };

      await this.sendAsync(res);

      const receivedLength = splitRequestValue.bufferStrings.filterExists().length;
      if (receivedLength !== rawReq.length) {
        clearTimeout(splitRequestValue.timer);
        splitRequestValue.timer = setTimeout(() => {
          this.emit("error", new Error(`분할요청중에 타임아웃이 발생했습니다.`));
          this._splitRequestMap.delete(rawReq.id);
        }, 10000);
        return;
      }

      this._splitRequestMap.delete(rawReq.id);
      const reqText = splitRequestValue.bufferStrings.join("");

      this.emit("request", JsonConvert.parse(reqText));
    }
    // 업로드
    else if (rawReq.type === "upload") {
      const filePath = path.resolve(this._rootPath, rawReq.filePath);

      if (!this._uploadRequestMap.has(rawReq.id)) {
        FsUtil.mkdirs(path.dirname(filePath));
        const fd = FsUtil.open(filePath, "w");
        const newUploadRequestValue = {
          timer: setTimeout(() => {
            this.emit("error", `업로드중에 타임아웃이 발생했습니다.`);
            FsUtil.close(fd);
            FsUtil.remove(filePath);
            this._uploadRequestMap.delete(rawReq.id);
          }, 20000),
          fd,
          filePath,
          completedLength: 0
        };
        this._uploadRequestMap.set(rawReq.id, newUploadRequestValue);
      }

      const uploadRequestValue = this._uploadRequestMap.get(rawReq.id)!;
      FsUtil.write(uploadRequestValue.fd, rawReq.buffer, 0, rawReq.buffer.length, rawReq.offset);
      uploadRequestValue.completedLength += rawReq.buffer.length;

      clearTimeout(uploadRequestValue.timer);

      const res: ISdServiceUploadRawResponse = {
        type: "upload",
        requestId: rawReq.id,
        length: rawReq.buffer.length
      };

      await this.sendAsync(res);

      if (uploadRequestValue.completedLength !== rawReq.length) {
        clearTimeout(uploadRequestValue.timer);
        uploadRequestValue.timer = setTimeout(() => {
          this.emit("error", new Error(`업로드중에 타임아웃이 발생했습니다.`));
          FsUtil.close(uploadRequestValue.fd);
          FsUtil.remove(uploadRequestValue.filePath);
          this._uploadRequestMap.delete(rawReq.id);
        }, 20000);
        return;
      }

      FsUtil.close(uploadRequestValue.fd);
      this._uploadRequestMap.delete(rawReq.id);

      const req: ISdServiceRequest = {
        type: "request",
        command: "upload",
        id: rawReq.id,
        url: rawReq.url,
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
      // TODO(편의성): 크면 분할
      this._conn.send(JsonConvert.stringify(res), err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}
