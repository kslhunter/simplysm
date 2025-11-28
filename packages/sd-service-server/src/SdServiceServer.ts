import https from "https";
import http from "http";
import url from "url";
import path from "path";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { ISdServiceServerOptions } from "./types";
import { EventEmitter } from "events";
import { ObjectUtils, Type } from "@simplysm/sd-core-common";
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import { SdWebRequestError } from "./SdWebRequestError";
import { SdWebsocketController } from "./internal/SdWebsocketController";
import { SdStaticFileHandler } from "./internal/SdStaticFileHandler";
import { SdRequestHandler } from "./internal/SdRequestHandler";
import { SdUploadHandler } from "./internal/SdUploadHandler";

export class SdServiceServer extends EventEmitter {
  isOpen = false;

  /***
   * 경로 프록시 (브라우저에 입력된 경로를 기본 파일경로가 아닌 다른 파일경로로 바꾸어 리턴함)
   *
   * * from: 서버내 'www' 이후의 상대경로 (절대경로 입력 불가)
   * * to: 서버내 파일의  절대경로 혹은 DEVSERVER의 port
   * * 'from'에 'api'로 시작하는 경로 사용 불가
   *
   */
  pathProxy: Record</* from */ string, /* to */ string | number> = {};

  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", this.constructor.name]);
  #httpServer?: http.Server | https.Server;
  #ws?: SdWebsocketController;

  // 핸들러 인스턴스
  #requestHandler = new SdRequestHandler(this);
  #staticFileHandler = new SdStaticFileHandler(this);
  #uploadHandler = new SdUploadHandler(this);

  constructor(readonly options: ISdServiceServerOptions) {
    super();
  }

  async getConfigAsync(clientName?: string): Promise<Record<string, any | undefined>> {
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(this.options.rootPath, ".config.json");
    if (FsUtils.exists(rootFilePath)) {
      result = await FsUtils.readJsonAsync(rootFilePath);
    }

    if (clientName != null) {
      const targetPath = this.getClientPath(clientName);

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtils.exists(filePath)) {
        result = ObjectUtils.merge(result, await FsUtils.readJsonAsync(filePath));
      }
    }

    return result;
  }

  getClientPath(clientName: string): string {
    return typeof this.pathProxy[clientName] === "string"
      ? this.pathProxy[clientName]
      : path.resolve(this.options.rootPath, "www", clientName);
  }

  async listenAsync(): Promise<void> {
    await new Promise<void>(async (resolve) => {
      this.#logger.debug("서버 시작..." + process.env["SD_VERSION"]);

      if (this.options.ssl) {
        const pfx =
          typeof this.options.ssl.pfxBuffer === "function"
            ? await this.options.ssl.pfxBuffer()
            : this.options.ssl.pfxBuffer;
        this.#httpServer = https.createServer({
          pfx,
          passphrase: this.options.ssl.passphrase,
        });
      } else {
        this.#httpServer = http.createServer();
      }
      // 요청 처리 로직 간소화
      this.#httpServer.on("request", async (req, res) => {
        await this.#onWebRequestAsync(req, res);
      });

      // HTTP 서버 수준의 에러 핸들링
      this.#httpServer.on("error", (err) => {
        this.#logger.error("HTTP 서버 오류 발생", err);
      });

      // WebSocket 컨트롤러에 RequestHandler의 메소드 전달
      this.#ws = new SdWebsocketController(
        this.#httpServer,
        async (def) => await this.#requestHandler.runMethodAsync(def),
      );

      this.#httpServer.listen(this.options.port, () => {
        resolve();
      });
    });

    this.isOpen = true;
    this.#logger.debug("서버 시작됨");
    this.emit("ready");
  }

  async closeAsync(): Promise<void> {
    await this.#ws?.closeAsync();

    await new Promise<void>((resolve, reject) => {
      if (!this.#httpServer || !this.#httpServer.listening) {
        resolve();
        return;
      }

      this.#httpServer.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });

    this.isOpen = false;
    this.#logger.debug("서버 종료됨");
    this.emit("close");
  }

  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): void {
    this.#logger.debug("서버내 모든 클라이언트 RELOAD 명령 전송");
    this.#ws?.broadcastReload(clientName, changedFileSet);
  }

  emitEvent<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ) {
    this.#ws?.emit(eventType, infoSelector, data);
  }

  async #onWebRequestAsync(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      if (this.options.middlewares) {
        for (const optMdw of this.options.middlewares) {
          await new Promise<void>((resolve, reject) => {
            optMdw(req, res, (err) => {
              if (err != null) {
                reject(err);
                return;
              }

              resolve();
            });
          });
          if (res.writableEnded) return;
        }
      }

      const urlObj = url.parse(req.url!, true, false);
      const urlPath = decodeURI(urlObj.pathname!.slice(1));
      const urlPathChain = urlPath.split("/");

      // 라우팅 로직
      if (urlPathChain[0] === "ws") {
        if (req.headers.upgrade?.toLowerCase() !== "websocket") {
          res.writeHead(426, { "Content-Type": "text/plain" });
          res.end("Upgrade Required");
          return;
        }
      }

      if (urlPathChain[0] === "api") {
        const handled = await this.#requestHandler.handleRequestAsync(
          req,
          res,
          urlObj,
          urlPathChain,
        );
        if (handled) return;
      }

      if (urlPathChain[0] === "upload") {
        await this.#uploadHandler.handleAsync(req, res);
        return;
      }

      this.#staticFileHandler.handle(req, res, urlPath);
    } catch (err) {
      if (err instanceof SdWebRequestError) {
        res.writeHead(err.statusCode);
        res.end(err.message);
        this.#logger.error(`[${err.statusCode}]\n${err.message}`, err);
      } else {
        const errorMessage = "요청 처리중 오류가 발생하였습니다.";
        this.#responseErrorHtml(res, 405, errorMessage);
        this.#logger.error(`[405] ${errorMessage}`, err);
      }
    }
  }

  #responseErrorHtml(res: http.ServerResponse, code: number, message: string): void {
    res.writeHead(code);
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="UTF-8">
    <title>${code}: ${message}</title>
</head>
<body>${code}: ${message}</body>
</html>`);
  }
}
