import { SdLogger } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import type { SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import { SdWebSocketHandlerV1 } from "./legacy/SdWebSocketHandlerV1";
import { SdStaticFileHandler } from "./transport/http/SdStaticFileHandler";
import { SdHttpRequestHandler } from "./transport/http/SdHttpRequestHandler";
import { SdServiceExecutor } from "./core/SdServiceExecutor";
import type { Type } from "@simplysm/sd-core-common";
import { JsonConvert } from "@simplysm/sd-core-common";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fastify from "fastify";
import fastifyMiddie from "@fastify/middie";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import fastifyReplyFrom from "@fastify/reply-from";
import path from "path";
import { SdUploadHandler } from "./transport/http/SdUploadHandler";
import { SdWebSocketHandler } from "./transport/socket/SdWebSocketHandler";
import type { WebSocket } from "ws";
import { SdServiceJwtManager } from "./auth/SdServiceJwtManager";
import type { IAuthTokenPayload } from "./auth/IAuthTokenPayload";
import type { ISdServiceServerOptions } from "./types/ISdServiceServerOptions";

export class SdServiceServer<TAuthInfo = any> extends EventEmitter {
  isOpen = false;

  private readonly _logger = SdLogger.get(["simplysm", "sd-service-server", this.constructor.name]);

  // 기능
  private readonly _serviceExecutor = new SdServiceExecutor(this);
  private readonly _jwt = new SdServiceJwtManager<TAuthInfo>(this);

  // 핸들러 인스턴스
  private readonly _httpRequestHandler = new SdHttpRequestHandler(
    this,
    this._serviceExecutor,
    this._jwt,
  );
  private readonly _staticFileHandler = new SdStaticFileHandler(this);
  private readonly _uploadHandler = new SdUploadHandler(this, this._jwt);

  private readonly _wsHandlerV1 = new SdWebSocketHandlerV1(this._serviceExecutor);
  private readonly _wsHandlerV2 = new SdWebSocketHandler(this._serviceExecutor, this._jwt);

  private _fastify?: FastifyInstance;

  constructor(readonly options: ISdServiceServerOptions) {
    super();
  }

  async listenAsync(): Promise<void> {
    this._logger.debug("서버 시작..." + process.env["SD_VERSION"]);

    const httpsConf = this.options.ssl
      ? {
          pfx:
            typeof this.options.ssl.pfxBuffer === "function"
              ? await this.options.ssl.pfxBuffer()
              : this.options.ssl.pfxBuffer,
          passphrase: this.options.ssl.passphrase,
        }
      : null;
    this._fastify = fastify({ https: httpsConf });

    // Websocket 플러그인
    await this._fastify.register(fastifyWebsocket);

    // 보안 플러그인
    // XSS 방지, HSTS 설정, iframe 클릭재킹 방지 등의 필수 보안 헤더를 자동으로 설정해 줍니다.
    // IP로 접속하는 고객사가 있으므로 이에 관한 보안은 지정할 수 없음.
    await this._fastify.register(fastifyHelmet, {
      global: true,
      contentSecurityPolicy: {
        directives: {
          ...fastifyHelmet.contentSecurityPolicy.getDefaultDirectives(),
          "default-src": ["'self'", "data:", "blob:", "*"],
          "script-src-attr": ["'unsafe-inline'"], // 인라인 이벤트 핸들러 허용
          "script-src": ["'self'", "'unsafe-inline'", "data:", "blob:", "*"], // 인라인 스크립트(<script>내용) 허용
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
    await this._fastify.register(fastifyMultipart);

    // 미들웨어 설정
    await this._fastify.register(fastifyMiddie);
    if (this.options.middlewares) {
      for (const mdw of this.options.middlewares) {
        this._fastify.use(mdw);
      }
    }

    await this._fastify.register(fastifyReplyFrom);

    // @fastify/static 등록
    // 기본적으로 www 폴더를 루트로 잡지만, wildcard: false로 설정하여
    // 자동 라우팅을 끄고 우리가 직접 제어합니다.
    await this._fastify.register(fastifyStatic, {
      root: path.resolve(this.options.rootPath, "www"),
      wildcard: false,
      serve: false, // 자동 서빙 방지 (수동 제어)
    });

    // CORS 설정
    await this._fastify.register(fastifyCors, {
      origin: (origin, cb) => {
        cb(null, true); // AllowALL
      },
      // 클라이언트가 보낼 수 있는 헤더 명시
      allowedHeaders: ["Content-Type", "Authorization", "x-sd-client-name"],
      // 클라이언트가 응답에서 읽을 수 있는 헤더 명시 (파일 다운로드 시 필요)
      exposedHeaders: ["Content-Disposition", "Content-Length"],
    });

    // JSON 파서
    this._fastify.addContentTypeParser(
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

    // JSON 생성기
    this._fastify.setSerializerCompiler(() => (data) => JsonConvert.stringify(data));

    // API 라우트
    this._fastify.all("/api/:service/:method", async (req, reply) => {
      await this._httpRequestHandler.handleAsync(req, reply);
    });

    // 업로드 라우트
    this._fastify.all("/upload", async (req, reply) => {
      await this._uploadHandler.handleAsync(req, reply);
    });

    // WebSocket 라우트
    const onWebSocketConnected = async (socket: WebSocket, req: FastifyRequest) => {
      const { ver, clientId, clientName } = req.query as {
        ver: string | undefined;
        clientId: string | undefined;
        clientName: string | undefined;
      };
      if (ver === "2") {
        if (clientId == null || clientName == null) {
          socket.close(1008, "Missing Client ID/NAME");
          return;
        }

        this._wsHandlerV2.addSocket(socket, clientId, clientName, req);
      } else {
        await this._wsHandlerV1.addSocket(socket, req.socket.remoteAddress);
      }
    };
    this._fastify.get("/", { websocket: true }, onWebSocketConnected.bind(this));
    this._fastify.get("/ws", { websocket: true }, onWebSocketConnected.bind(this));

    // 정적 파일 와일드카드 핸들러
    this._fastify.route({
      method: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
      url: "/*",
      handler: async (req, reply) => {
        // 'http://localhost'는 상대 경로 파싱을 위한 dummy base (Fastify req.url은 path만 오므로)
        const urlObj = new URL(req.raw.url!, "http://localhost");
        const urlPath = decodeURI(urlObj.pathname.slice(1));

        // portProxy
        if (this.options.portProxy) {
          const proxyKey = Object.keys(this.options.portProxy).find((key) =>
            urlPath.startsWith(key),
          );
          if (proxyKey != null) {
            const targetPort = this.options.portProxy[proxyKey];
            const target = `http://127.0.0.1:${targetPort}${req.raw.url}`;
            return await reply.from(target);
          }
        }

        await this._staticFileHandler.handleAsync(req, reply, urlPath);
      },
    });

    // HTTP 서버 수준의 에러 핸들링
    this._fastify.server.on("error", (err) => {
      this._logger.error("HTTP 서버 오류 발생", err);
    });

    // 리슨
    await this._fastify.listen({ port: this.options.port, host: "0.0.0.0" });

    // Graceful Shutdown 핸들러 등록
    this._registerGracefulShutdown();

    this.isOpen = true;
    this._logger.debug("서버 시작됨");
    this.emit("ready");
  }

  async closeAsync(): Promise<void> {
    this._wsHandlerV1.closeAll();
    this._wsHandlerV2.closeAll();
    await this._fastify?.close();

    this.isOpen = false;
    this._logger.debug("서버 종료됨");
    this.emit("close");
  }

  async broadcastReloadAsync(clientName: string | undefined, changedFileSet: Set<string>) {
    this._logger.debug("서버내 모든 클라이언트 RELOAD 명령 전송");
    this._wsHandlerV1.broadcastReload(clientName, changedFileSet);
    await this._wsHandlerV2.broadcastReloadAsync(clientName, changedFileSet);
  }

  async emitEvent<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ) {
    this._wsHandlerV1.emit(eventType, infoSelector, data);
    await this._wsHandlerV2.emitAsync(eventType, infoSelector, data);
  }

  async generateAuthTokenAsync(payload: IAuthTokenPayload<TAuthInfo>) {
    return await this._jwt.signAsync(payload);
  }

  async verifyAuthTokenAsync(token: string): Promise<IAuthTokenPayload<TAuthInfo>> {
    return await this._jwt.verifyAsync(token);
  }

  // 종료 시그널 감지 및 처리
  private _registerGracefulShutdown() {
    const shutdownHandler = async (signal: string) => {
      this._logger.info(`${signal} 시그널 감지. 서버 종료 프로세스 시작...`);

      // 안전 장치: 10초가 지나도 안 꺼지면 강제 종료
      const forceExitTimer = setTimeout(() => {
        this._logger.error("서버 종료 시간 초과 (10초). 강제 종료합니다.");
        process.exit(1);
      }, 10000); // 10초 (필요에 따라 조절)

      try {
        if (this.isOpen) {
          await this.closeAsync();
        }
        this._logger.info("서버가 안전하게 종료되었습니다.");
        clearTimeout(forceExitTimer); // 정상 종료되면 타이머 해제
        process.exit(0);
      } catch (err) {
        this._logger.error("서버 종료 중 오류 발생", err);
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
