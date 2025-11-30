import {
  ISdServiceErrorBody,
  ISdServiceRequest,
  SdServiceProtocol,
  TSdServiceC2SMessage,
  TSdServiceCommand,
  TSdServiceResponse,
  TSdServiceS2CMessage,
} from "@simplysm/sd-service-common";
import { JsonConvert, Uuid } from "@simplysm/sd-core-common";
import { SdWebSocket } from "./SdWebSocket";
import { ISdServiceProgress } from "../types/progress.types";

export class SdServiceTransport {
  readonly #protocol = new SdServiceProtocol();

  constructor(
    private readonly _ws: SdWebSocket,
    private readonly _clientName: string,
  ) {}

  async sendCommandAsync(
    command: TSdServiceCommand,
    params: any[],
    progress?: ISdServiceProgress,
  ): Promise<any> {
    const uuid = Uuid.new().toString();
    const req: ISdServiceRequest = {
      name: "request",
      clientName: this._clientName,
      reqUuid: uuid,
      command,
      params,
    };

    // 1. 응답 대기 시작 (요청 보내기 전에 리스너를 먼저 등록해야 안전함)
    const responsePromise = this.#waitForResponseAsync(uuid, progress);

    // 2. 요청 전송
    await this.#sendRequestAsync(req, progress);

    // 3. 응답 결과 반환
    return await responsePromise;
  }

  async sendMessageAsync(msg: TSdServiceC2SMessage) {
    const encoded = this.#protocol.encode(msg);

    for (const chunk of encoded.chunks) {
      await this._ws.sendAsync(chunk);
    }
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  /**
   * 응답이 올 때까지 기다리는 Promise를 반환
   */
  async #waitForResponseAsync(
    uuid: string,
    progress: ISdServiceProgress | undefined,
  ): Promise<any> {
    return await new Promise<any>((resolve, reject) => {
      const listener = (msgJson: string) => {
        try {
          const msg = JsonConvert.parse(msgJson) as TSdServiceS2CMessage;

          // 내 요청에 대한 응답이 아니면 무시
          if (!("reqUuid" in msg) || msg.reqUuid !== uuid) return;

          const decoded = this.#protocol.decode(msgJson);

          if (decoded.type === "accumulating") {
            if (msg.name === "response-split") {
              progress?.response?.({
                uuid,
                fullSize: decoded.fullSize,
                completedSize: decoded.completedSize,
              });
            }
          } else {
            if (msg.name === "response-for-split") {
              progress?.request?.({
                uuid,
                fullSize: msg.fullSize,
                completedSize: msg.completedSize,
              });
            } else if (decoded.message.name === "response") {
              this._ws.off("message", listener);
              this.#resolveResponse(decoded.message, resolve, reject);
            }
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
    req: ISdServiceRequest,
    progress: ISdServiceProgress | undefined,
  ): Promise<void> {
    const encoded = this.#protocol.encode(req);

    if (encoded.chunks.length > 1) {
      progress?.request?.({
        uuid: req.reqUuid,
        fullSize: encoded.json.length,
        completedSize: 0,
      });
    }

    for (const chunk of encoded.chunks) {
      await this._ws.sendAsync(chunk);
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
