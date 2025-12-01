import {
  ISdServiceErrorBody,
  ISdServiceRequest,
  SdServiceMessageDecoder,
  SdServiceMessageEncoder,
  TSdServiceC2SMessage,
  TSdServiceCommand,
  TSdServiceS2CMessage,
} from "@simplysm/sd-service-common";
import { Uuid } from "@simplysm/sd-core-common";
import { SdWebSocket } from "./SdWebSocket";
import { ISdServiceProgress } from "../types/progress.types";

export class SdServiceTransport {
  readonly #decoder = new SdServiceMessageDecoder();
  readonly listenerMap = new Map<
    string,
    {
      resolve: (msg: TSdServiceS2CMessage) => void;
      reject: (err: Error) => void;
      progress?: ISdServiceProgress;
    }
  >();

  constructor(
    private readonly _ws: SdWebSocket,
    private readonly _clientName: string,
  ) {
    this._ws.on("message", this.#onMessage.bind(this));
  }

  async sendCommandAsync(
    command: TSdServiceCommand,
    params: any[],
    progress?: ISdServiceProgress,
  ): Promise<any> {
    const uuid = Uuid.new().toString();
    const req: ISdServiceRequest = {
      name: "request",
      clientName: this._clientName,
      uuid,
      command,
      params,
    };

    // 1. 응답 대기 시작 (요청 보내기 전에 리스너를 먼저 등록해야 안전함)
    const responsePromise = new Promise((resolve, reject) => {
      this.listenerMap.set(uuid, {
        resolve,
        reject,
        progress,
      });
    });

    // 2. 요청 전송
    await this.#sendRequestAsync(req, progress);

    // 3. 응답 결과 반환
    return await responsePromise;
  }

  async sendMessageAsync(msg: TSdServiceC2SMessage) {
    const chunks = SdServiceMessageEncoder.encode(
      "uuid" in msg ? msg.uuid : Uuid.new().toString(),
      msg,
    );

    for (const chunk of chunks) {
      await this._ws.sendAsync(chunk);
    }
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  #onMessage(buf: Buffer) {
    const decoded = this.#decoder.decode(buf);

    const listenerInfo = this.listenerMap.get(decoded.uuid);

    try {
      if (decoded.type === "progress") {
        listenerInfo?.progress?.response?.({
          uuid: decoded.uuid,
          totalSize: decoded.totalSize,
          completedSize: decoded.receivedSize,
        });
      } else {
        if (decoded.message.name === "response-for-split") {
          listenerInfo?.progress?.request?.({
            uuid: decoded.message.reqUuid,
            totalSize: decoded.message.totalSize,
            completedSize: decoded.message.completedSize,
          });
        } else if (decoded.message.name === "response") {
          if (decoded.message.state === "error") {
            listenerInfo?.reject(this.#toError(decoded.message.body));
          } else {
            listenerInfo?.resolve(decoded.message.body);
          }
        }
      }
    } catch (err) {
      listenerInfo?.reject(err);
    }
  }

  /**
   * 요청 메시지 전송
   */
  async #sendRequestAsync(
    req: ISdServiceRequest,
    progress: ISdServiceProgress | undefined,
  ): Promise<void> {
    const chunks = SdServiceMessageEncoder.encode(req.uuid, req);

    if (chunks.length > 1) {
      progress?.request?.({
        uuid: req.uuid,
        totalSize: chunks.sum((chunk) => chunk.length),
        completedSize: 0,
      });
    }

    for (const chunk of chunks) {
      await this._ws.sendAsync(chunk);
    }
  }

  #toError(body: ISdServiceErrorBody): Error {
    const err = new Error(body.message);
    (err as any).code = body.code;
    if (body.stack != null) err.stack = body.stack;
    return err;
  }
}
