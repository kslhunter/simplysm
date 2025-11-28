import path from "path";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { ISdServiceServerOptions } from "./types";
import { EventEmitter } from "events";
import { ObjectUtils, Type } from "@simplysm/sd-core-common";
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import { SdWebsocketController } from "./internal/SdWebsocketController";
import { SdStaticFileHandler } from "./internal/SdStaticFileHandler";
import { SdRequestHandler } from "./internal/SdRequestHandler";
import { SdUploadHandler } from "./internal/SdUploadHandler";
import fastify, { FastifyInstance } from "fastify";
import fastifyMiddie from "@fastify/middie";

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
  #fastify?: FastifyInstance;
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
    this.#logger.debug("서버 시작..." + process.env["SD_VERSION"]);

    const httpsConf = this.options.ssl
      ? {
          pfx:
            typeof this.options.ssl.pfxBuffer === "function"
              ? await this.options.ssl.pfxBuffer()
              : this.options.ssl.pfxBuffer,
          passphrase: this.options.ssl.passphrase,
        }
      : null;
    this.#fastify = fastify({ https: httpsConf });

    // 기존 미들웨어 호환성 레이어 (middie)
    await this.#fastify.register(fastifyMiddie);
    if (this.options.middlewares) {
      for (const mdw of this.options.middlewares) {
        this.#fastify.use(mdw);
      }
    }

    // CORS Preflight 처리 (localhost 개발용)
    this.#fastify.options("*", async (req, reply) => {
      if (req.headers.origin?.includes("://localhost")) {
        reply.header("Access-Control-Allow-Origin", "*");
        reply.status(204).send();
      }
    });

    this.#fastify.get("/api/:service/:method", async (req, reply) => {
      await this.#requestHandler.handleAsync(req, reply);
    });

    this.#fastify.post("/api/:service/:method", async (req, reply) => {
      await this.#requestHandler.handleAsync(req, reply);
    });

    this.#fastify.post("/upload", async (req, reply) => {
      // busboy는 raw request stream이 필요하므로 req.raw 전달
      await this.#uploadHandler.handleAsync(req.raw, reply.raw);
    });

    this.#fastify.setNotFoundHandler(async (req, reply) => {
      // Fastify Request/Reply에서 Raw 객체를 꺼내 기존 핸들러에 전달
      // req.url은 쿼리스트링을 포함한 전체 URL을 담고 있으므로 그대로 사용 가능
      this.#staticFileHandler.handle(req.raw, reply.raw, req.url);
    });

    // HTTP 서버 수준의 에러 핸들링
    this.#fastify.server.on("error", (err) => {
      this.#logger.error("HTTP 서버 오류 발생", err);
    });

    // WebSocket 컨트롤러에 RequestHandler의 메소드 전달
    await this.#fastify.ready(); // 서버가 준비된 후 raw server 접근 가능
    this.#ws = new SdWebsocketController(
      this.#fastify.server,
      async (def) => await this.#requestHandler.runMethodAsync(def),
    );

    await this.#fastify.listen({ port: this.options.port });

    this.isOpen = true;
    this.#logger.debug("서버 시작됨");
    this.emit("ready");
  }

  async closeAsync(): Promise<void> {
    await this.#ws?.closeAsync();
    await this.#fastify?.close();

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
}
