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
import fastifyMultipart from "@fastify/multipart";

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

  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", this.constructor.name]); // Fastify 인스턴스

  #server?: FastifyInstance;
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

    // 1. Fastify 인스턴스 생성 (SSL 옵션 처리)
    const httpsOptions = this.options.ssl
      ? {
          pfx:
            typeof this.options.ssl.pfxBuffer === "function"
              ? await this.options.ssl.pfxBuffer()
              : this.options.ssl.pfxBuffer,
          passphrase: this.options.ssl.passphrase,
        }
      : null;
    this.#server = fastify({
      https: httpsOptions,
    });

    // 2. 미들웨어 플러그인 등록 (기존 options.middlewares 호환)
    await this.#server.register(fastifyMiddie);
    if (this.options.middlewares) {
      for (const mdw of this.options.middlewares) {
        this.#server.use(mdw);
      }
    }

    // 3. Multipart(업로드) 플러그인 등록
    await this.#server.register(fastifyMultipart);

    // 4. 각 핸들러 바인딩 (라우트 등록)
    this.#uploadHandler.bind(this.#server);
    this.#requestHandler.bind(this.#server);
    this.#staticFileHandler.bind(this.#server); // 정적 파일은 가장 마지막에 (우선순위)

    // 5. 에러 핸들링
    this.#server.setErrorHandler((error, request, reply) => {
      this.#logger.error("Server Error", error);
      reply.status(500).send({ error: "Internal Server Error", message: error?.["message"] });
    });

    // 6. 서버 시작
    await this.#server.listen({ port: this.options.port });

    // 7. 웹소켓 컨트롤러 연결 (Fastify의 raw Node Server 객체 전달)
    this.#ws = new SdWebsocketController(
      this.#server.server,
      async (def) => await this.#requestHandler.runMethodAsync(def),
    );

    this.isOpen = true;
    this.#logger.debug("서버 시작됨");
    this.emit("ready");
  }

  async closeAsync(): Promise<void> {
    await this.#ws?.closeAsync();
    await this.#server?.close();
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
