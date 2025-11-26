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

  /**
   * 명령 전송 (name이 request인 메시지)
   */
  async sendCommandAsync(
    command: TSdServiceCommand,
    params: any[],
    progress?: {
      request?: (state: ISdServiceProgressState) => void;
      response?: (state: ISdServiceProgressState) => void;
    },
  ): Promise<any> {
    const uuid = Uuid.new().toString();

    return await new Promise<any>(async (resolve, reject) => {
      const req: TSdServiceC2SMessage = {
        name: "request",
        clientName: this._clientName,
        uuid,
        command,
        params,
      };

      const reqText = JsonConvert.stringify(req);

      const splitAccumulator = new SdServiceSplitMessageAccumulator();

      // 응답처리 이벤트 리스너
      const resFn = (msgJson: string): void => {
        const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;
        if (
          msg.name !== "response" &&
          msg.name !== "response-for-split" &&
          msg.name !== "response-split"
        ) {
          return;
        }
        if (msg.reqUuid !== req.uuid) return;

        // 분할요청한것에 대한 응답을 받으면 progress 이벤트 발생
        if (msg.name === "response-for-split") {
          progress?.request?.({
            uuid: req.uuid,
            fullSize: reqText.length,
            completedSize: msg.completedSize,
          });
        }
        // 분할된 응답을 받으면 합치기 수행 (마지막 건인 경우 완료처리)
        else if (msg.name === "response-split") {
          const splitResInfo = splitAccumulator.push(
            msg.reqUuid,
            msg.fullSize,
            msg.index,
            msg.body,
          );

          progress?.response?.({
            uuid: msg.reqUuid,
            fullSize: msg.fullSize,
            completedSize: splitResInfo.completedSize,
          });

          if (splitResInfo.isCompleted && splitResInfo.fullText != null) {
            const res = JsonConvert.parse(splitResInfo.fullText) as TSdServiceResponse;

            this._ws.off("message", resFn);

            if (res.state === "error") {
              reject(this.#toError(res.body));
              return;
            }

            resolve(res.body);
          }
        }
        // (response) 온전한 응답에 대한 처리
        else {
          this._ws.off("message", resFn);

          if (msg.state === "error") {
            reject(this.#toError(msg.body));
            return;
          }

          resolve(msg.body);
        }
      };
      this._ws.on(`message`, resFn);

      // 분할요청
      if (reqText.length > SD_SERVICE_MAX_MESSAGE_SIZE) {
        progress?.request?.({
          uuid: req.uuid,
          fullSize: reqText.length,
          completedSize: 0,
        });

        const chunks = splitServiceMessage(reqText, SD_SERVICE_SPLIT_MESSAGE_CHUNK_SIZE);

        for (let index = 0; index < chunks.length; index++) {
          const splitBody = chunks[index];
          const splitReq = {
            name: "request-split",
            uuid: req.uuid,
            fullSize: reqText.length,
            index,
            body: splitBody,
          };
          await this._ws.sendAsync(JsonConvert.stringify(splitReq));
        }
      }
      // 일반요청
      else {
        await this._ws.sendAsync(reqText);
      }
    });
  }

  /**
   * 메시지 전송
   */
  async sendMessageAsync(msg: TSdServiceC2SMessage) {
    await this._ws.sendAsync(JsonConvert.stringify(msg));
  }

  /**
   * 에러 응답을 Error로 변환
   */
  #toError(body: ISdServiceErrorBody): Error {
    const err = new Error(body.message);
    (err as any).code = body.code;
    if (body.stack != null) err.stack = body.stack;
    return err;
  }
}
