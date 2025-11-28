import path from "path";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import { ISdServiceServerOptions } from "./types";
import { EventEmitter } from "events";
import { JsonConvert, ObjectUtils, Type } from "@simplysm/sd-core-common";
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import { SdWebsocketController } from "./internal/SdWebsocketController";
import { SdStaticFileHandler } from "./internal/SdStaticFileHandler";
import { SdRequestHandler } from "./internal/SdRequestHandler";
import { SdUploadHandler } from "./internal/SdUploadHandler";
import fastify, { FastifyInstance } from "fastify";
import fastifyMiddie from "@fastify/middie";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import fastifyHttpProxy from "@fastify/http-proxy";
import fastifyMultipart from "@fastify/multipart";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";

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
    this.#fastify = fastify({ https: httpsConf, bodyLimit: 100 * 1024 * 1024 });

    // Websocket 플러그인
    await this.#fastify.register(fastifyWebsocket);

    // 보안 플러그인
    // XSS 방지, HSTS 설정, iframe 클릭재킹 방지 등의 필수 보안 헤더를 자동으로 설정해 줍니다.
    await this.#fastify.register(fastifyHelmet, {
      global: true,
      contentSecurityPolicy: {
        directives: {
          ...fastifyHelmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src-attr": ["'unsafe-inline'"], // 인라인 이벤트 핸들러 허용
          "script-src": ["'self'", "'unsafe-inline'"], // 인라인 스크립트(<script>내용) 허용
          ...(!!this.options.ssl
            ? {}
            : {
                "upgrade-insecure-requests": null, // HTTP -> HTTPS 강제 변환 끄기
              }),
        },
      },
      hsts: !!this.options.ssl, // HSTS(브라우저가 https 접속을 기억하는 기능) 비활성화
      crossOriginOpenerPolicy: !!this.options.ssl, // HTTP 환경에서 COOP 에러 제거
      originAgentCluster: false, // origin-keyed 경고 제거
    });

    // 업로드 플러그인
    await this.#fastify.register(fastifyMultipart);

    // 미들웨어 설정
    await this.#fastify.register(fastifyMiddie);
    if (this.options.middlewares) {
      for (const mdw of this.options.middlewares) {
        this.#fastify.use(mdw);
      }
    }

    // 포트 프록시 (pathProxy)
    // 파일경로 프록시는 되지 않음. 포트에 대한 프록시에만 해당함
    for (const [key, value] of Object.entries(this.pathProxy)) {
      if (typeof value === "number") {
        await this.#fastify.register(fastifyHttpProxy, {
          upstream: `http://localhost:${value}`,
          prefix: key, // 예: '/admin'으로 들어오면 해당 포트로 전달
          rewritePrefix: key, // 경로 유지 (필요에 따라 ''로 변경 가능)
          http2: false, // 필요시 설정
        });
        this.#logger.debug(`프록시 등록: ${key} -> http://localhost:${value}`);
      }
    }

    // @fastify/static 등록
    // 기본적으로 www 폴더를 루트로 잡지만, wildcard: false로 설정하여
    // 자동 라우팅을 끄고 우리가 직접 제어합니다.
    await this.#fastify.register(fastifyStatic, {
      root: path.resolve(this.options.rootPath, "www"),
      wildcard: false,
      serve: false, // 자동 서빙 방지 (수동 제어)
    });

    // CORS 설정
    await this.#fastify.register(fastifyCors, {
      origin: (origin, cb) => {
        cb(null, true); // AllowALL
        // 개발 환경이면 localhost 허용, 운영이면 특정 도메인만 허용하는 로직
        /*if (origin == null || origin.includes("://localhost")) {
          cb(null, true);
          return;
        }
        cb(new Error("Not allowed"), false);*/
      },
      credentials: true, // 쿠키/인증 정보 포함 시 필요
    });

    // JSON 파서
    this.#fastify.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (req, body, done) => {
        try {
          const json = JsonConvert.parse(body as string);
          done(null, json);
        } catch (err: any) {
          err.statusCode = 400;
          done(err, undefined);
        }
      },
    );

    // API 라우트
    this.#fastify.all("/api/:service/:method", async (req, reply) => {
      await this.#requestHandler.handleAsync(req, reply);
    });

    // 업로드 라우트
    this.#fastify.all("/upload", async (req, reply) => {
      await this.#uploadHandler.handleAsync(req, reply);
    });

    // WebSocket 라우트
    this.#fastify.get("/ws", { websocket: true }, async (socket, req) => {
      await this.#ws?.addClient(socket, req.raw);
    });

    // 정적 파일 와일드카드 핸들러
    this.#fastify.route({
      method: ["GET", "HEAD"],
      url: "/*",
      handler: async (req, reply) => {
        // 'http://localhost'는 상대 경로 파싱을 위한 dummy base (Fastify req.url은 path만 오므로)
        const urlObj = new URL(req.raw.url!, "http://localhost");
        const urlPath = decodeURI(urlObj.pathname.slice(1));
        await this.#staticFileHandler.handleAsync(req, reply, urlPath);
      },
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

    // 리슨
    await this.#fastify.listen({ port: this.options.port, host: "0.0.0.0" });

    // Graceful Shutdown 핸들러 등록
    this.#registerGracefulShutdown();

    this.isOpen = true;
    this.#logger.debug("서버 시작됨");
    this.emit("ready");
  }

  async closeAsync(): Promise<void> {
    this.#ws?.close();
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

  // 종료 시그널 감지 및 처리
  #registerGracefulShutdown() {
    const shutdownHandler = async (signal: string) => {
      this.#logger.info(`${signal} 시그널 감지. 서버 종료 프로세스 시작...`);

      // 안전 장치: 10초가 지나도 안 꺼지면 강제 종료
      const forceExitTimer = setTimeout(() => {
        this.#logger.error("서버 종료 시간 초과 (10초). 강제 종료합니다.");
        process.exit(1);
      }, 10000); // 10초 (필요에 따라 조절)

      try {
        if (this.isOpen) {
          await this.closeAsync();
        }
        this.#logger.info("서버가 안전하게 종료되었습니다.");
        clearTimeout(forceExitTimer); // 정상 종료되면 타이머 해제
        process.exit(0);
      } catch (err) {
        this.#logger.error("서버 종료 중 오류 발생", err);
        process.exit(1);
      }
    };

    // 프로세스 시그널 리스너 등록
    // 중복 등록 방지를 위해 process.listenerCount 체크를 할 수도 있으나,
    // 보통 서버 인스턴스는 하나만 띄우므로 간단하게 처리했습니다.
    process.on("SIGINT", () => shutdownHandler("SIGINT"));
    process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
  }
}
