import {
  ISdServiceErrorBody,
  SD_SERVICE_MAX_MESSAGE_SIZE,
  SD_SERVICE_SPLIT_MESSAGE_CHUNK_SIZE,
  SdServiceSplitMessageAccumulator,
  splitServiceMessage,
  TSdServiceC2SMessage,
  TSdServiceCommand,
  TSdServiceResponse,
  TSdServiceS2CMessage,
} from "@simplysm/sd-service-common";
import { JsonConvert, Uuid } from "@simplysm/sd-core-common";
import { SdWebSocket } from "./SdWebSocket";
import { ISdServiceProgressState } from "../types/ISdServiceProgressState";

export class SdServiceTransport {
  constructor(
    private readonly _ws: SdWebSocket,
    private readonly _clientName: string,
  ) {}

  async sendCommandAsync(
    command: TSdServiceCommand,
    params: any[],
    progress?: {
      request?: (state: ISdServiceProgressState) => void;
      response?: (state: ISdServiceProgressState) => void;
    },
  ): Promise<any> {
    const uuid = Uuid.new().toString();
    const req: TSdServiceC2SMessage = {
      name: "request",
      clientName: this._clientName,
      uuid,
      command,
      params,
    };
    const reqJson = JsonConvert.stringify(req);

    // 1. 응답 대기 시작 (요청 보내기 전에 리스너를 먼저 등록해야 안전함)
    const responsePromise = this.#waitForResponseAsync(uuid, reqJson.length, progress);

    // 2. 요청 전송
    await this.#sendRequestAsync(req.uuid, reqJson, progress);

    // 3. 응답 결과 반환
    return await responsePromise;
  }

  async sendMessageAsync(msg: TSdServiceC2SMessage) {
    await this._ws.sendAsync(JsonConvert.stringify(msg));
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * 응답이 올 때까지 기다리는 Promise를 반환
   */
  async #waitForResponseAsync(
    uuid: string,
    reqLength: number,
    progress:
      | {
          request?: (s: ISdServiceProgressState) => void;
          response?: (s: ISdServiceProgressState) => void;
        }
      | undefined,
  ): Promise<any> {
    return await new Promise<any>((resolve, reject) => {
      const splitAccumulator = new SdServiceSplitMessageAccumulator();

      const listener = (msgJson: string) => {
        try {
          const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;

          // 내 요청에 대한 응답이 아니면 무시
          if (!("reqUuid" in msg) || msg.reqUuid !== uuid) return;

          // 1. 분할 요청 진행률(ACK)
          if (msg.name === "response-for-split") {
            progress?.request?.({ uuid, fullSize: reqLength, completedSize: msg.completedSize });
          }
          // 2. 분할 응답 수신
          else if (msg.name === "response-split") {
            const splitResInfo = splitAccumulator.push(
              msg.reqUuid,
              msg.fullSize,
              msg.index,
              msg.body,
            );
            progress?.response?.({
              uuid,
              fullSize: msg.fullSize,
              completedSize: splitResInfo.completedSize,
            });

            if (splitResInfo.isCompleted && splitResInfo.fullText != null) {
              this._ws.off("message", listener);
              const res = JsonConvert.parse(splitResInfo.fullText) as TSdServiceResponse;
              this.#resolveResponse(res, resolve, reject);
            }
          }
          // 3. 일반 응답 수신
          else {
            this._ws.off("message", listener);
            this.#resolveResponse(msg, resolve, reject);
          }
        } catch (err) {
          this._ws.off("message", listener);
          reject(err);
        }
      };

      this._ws.on("message", listener);
    });
  }

  /**
   * 요청 메시지 전송
   */
  async #sendRequestAsync(
    uuid: string,
    reqJson: string,
    progress?: { request?: (state: ISdServiceProgressState) => void },
  ): Promise<void> {
    if (reqJson.length > SD_SERVICE_MAX_MESSAGE_SIZE) {
      progress?.request?.({ uuid, fullSize: reqJson.length, completedSize: 0 });

      const chunks = splitServiceMessage(reqJson, SD_SERVICE_SPLIT_MESSAGE_CHUNK_SIZE);
      for (let index = 0; index < chunks.length; index++) {
        const splitBody = chunks[index];
        const splitReq = {
          name: "request-split",
          uuid,
          fullSize: reqJson.length,
          index,
          body: splitBody,
        };
        await this._ws.sendAsync(JsonConvert.stringify(splitReq));
      }
    } else {
      await this._ws.sendAsync(reqJson);
    }
  }

  /**
   * 응답 결과 처리 (성공/실패 분기)
   */
  #resolveResponse(
    res: TSdServiceResponse,
    resolve: (value: any) => void,
    reject: (reason?: any) => void,
  ): void {
    if (res.state === "error") {
      reject(this.#toError(res.body));
    } else {
      resolve(res.body);
    }
  }

  #toError(body: ISdServiceErrorBody): Error {
    const err = new Error(body.message);
    (err as any).code = body.code;
    if (body.stack != null) err.stack = body.stack;
    return err;
  }
}
