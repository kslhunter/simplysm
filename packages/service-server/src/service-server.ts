import type { ServiceEventListener } from "@simplysm/service-common";
import { StaticFileHandler } from "./transport/http/static-file-handler";
import { HttpRequestHandler } from "./transport/http/http-request-handler";
import { ServiceExecutor } from "./core/service-executor";
import type { Type } from "@simplysm/core-common";
import { jsonStringify, jsonParse, EventEmitter } from "@simplysm/core-common";
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
import { UploadHandler } from "./transport/http/upload-handler";
import { WebSocketHandler } from "./transport/socket/websocket-handler";
import type { WebSocket } from "ws";
import { JwtManager } from "./auth/jwt-manager";
import type { AuthTokenPayload } from "./auth/auth-token-payload";
import type { ServiceServerOptions } from "./types/server-options";
import { handleV1Connection } from "./legacy/v1-auto-update-handler";
import { AutoUpdateService } from "./services/auto-update-service";
import { createConsola } from "consola";

const logger = createConsola().withTag("service-server:ServiceServer");

export class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{
  ready: void;
  close: void;
}> {
  isOpen = false;

  private readonly _serviceExecutor = new ServiceExecutor(this);
  private readonly _jwt = new JwtManager<TAuthInfo>(this);

  private readonly _httpRequestHandler = new HttpRequestHandler(
    this,
    this._serviceExecutor,
    this._jwt,
  );
  private readonly _staticFileHandler = new StaticFileHandler(this);
  private readonly _uploadHandler = new UploadHandler(this, this._jwt);

  private readonly _wsHandler = new WebSocketHandler(this._serviceExecutor, this._jwt);

  private _fastify?: FastifyInstance;

  constructor(readonly options: ServiceServerOptions) {
    super();
  }

  async listen(): Promise<void> {
    logger.debug(`서버 시작... ${process.env["SD_VERSION"] ?? ""}`);

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
    await this._fastify.register(fastifyHelmet, {
      global: true,
      contentSecurityPolicy: {
        directives: {
          ...fastifyHelmet.contentSecurityPolicy.getDefaultDirectives(),
          "default-src": ["'self'", "data:", "blob:", "*"],
          "script-src-attr": ["'unsafe-inline'"],
          "script-src": ["'self'", "'unsafe-inline'", "data:", "blob:", "*"],
          ...(this.options.ssl != null
            ? {}
            : {
                "upgrade-insecure-requests": null,
              }),
        },
      },
      hsts: this.options.ssl != null,
      crossOriginOpenerPolicy: this.options.ssl != null,
      originAgentCluster: false,
    });

    // 업로드 플러그인
    await this._fastify.register(fastifyMultipart);

    // 미들웨어 설정
    await this._fastify.register(fastifyMiddie);
    if (this.options.middlewares != null) {
      for (const mdw of this.options.middlewares) {
        this._fastify.use(mdw);
      }
    }

    await this._fastify.register(fastifyReplyFrom);

    // @fastify/static 등록
    await this._fastify.register(fastifyStatic, {
      root: path.resolve(this.options.rootPath, "www"),
      wildcard: false,
      serve: false,
    });

    // CORS 설정
    await this._fastify.register(fastifyCors, {
      origin: (_origin, cb) => {
        cb(null, true);
      },
      allowedHeaders: ["Content-Type", "Authorization", "x-sd-client-name"],
      exposedHeaders: ["Content-Disposition", "Content-Length"],
    });

    // JSON 파서
    this._fastify.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (req, body, done) => {
        try {
          const json = jsonParse(body as string);
          done(null, json);
        } catch (err: unknown) {
          const error = err as Error & { statusCode?: number };
          error.statusCode = 400;
          done(error, undefined);
        }
      },
    );

    // JSON 생성기
    this._fastify.setSerializerCompiler(() => (data) => jsonStringify(data));

    // API 라우트
    this._fastify.all("/api/:service/:method", async (req, reply) => {
      await this._httpRequestHandler.handle(req, reply);
    });

    // 업로드 라우트
    this._fastify.all("/upload", async (req, reply) => {
      await this._uploadHandler.handle(req, reply);
    });

    // WebSocket 라우트
    const onWebSocketConnected = (socket: WebSocket, req: FastifyRequest) => {
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
        this._wsHandler.addSocket(socket, clientId, clientName, req);
      } else {
        // V1 레거시 지원 (auto-update만)
        const autoUpdateService = new AutoUpdateService();
        autoUpdateService.server = this;
        handleV1Connection(socket, autoUpdateService);
      }
    };
    this._fastify.get("/", { websocket: true }, onWebSocketConnected.bind(this));
    this._fastify.get("/ws", { websocket: true }, onWebSocketConnected.bind(this));

    // 정적 파일 와일드카드 핸들러
    this._fastify.route({
      method: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
      url: "/*",
      handler: async (req, reply) => {
        const urlObj = new URL(req.raw.url!, "http://localhost");
        const urlPath = decodeURI(urlObj.pathname.slice(1));

        // portProxy
        if (this.options.portProxy != null) {
          const proxyKey = Object.keys(this.options.portProxy).find((key) =>
            urlPath.startsWith(key),
          );
          if (proxyKey != null) {
            const targetPort = this.options.portProxy[proxyKey];
            const target = `http://127.0.0.1:${targetPort}${req.raw.url}`;
            return reply.from(target);
          }
        }

        await this._staticFileHandler.handle(req, reply, urlPath);
      },
    });

    // HTTP 서버 수준의 에러 핸들링
    this._fastify.server.on("error", (err) => {
      logger.error("HTTP 서버 오류 발생", err);
    });

    // 리슨
    await this._fastify.listen({ port: this.options.port, host: "0.0.0.0" });

    // Graceful Shutdown 핸들러 등록
    this._registerGracefulShutdown();

    this.isOpen = true;
    logger.debug("서버 시작됨");
    this.emit("ready");
  }

  async close(): Promise<void> {
    this._wsHandler.closeAll();
    await this._fastify?.close();

    this.isOpen = false;
    logger.debug("서버 종료됨");
    this.emit("close");
  }

  async broadcastReload(clientName: string | undefined, changedFileSet: Set<string>) {
    logger.debug("서버내 모든 클라이언트 RELOAD 명령 전송");
    await this._wsHandler.broadcastReload(clientName, changedFileSet);
  }

  async emitEvent<T extends ServiceEventListener<unknown, unknown>>(
    eventType: Type<T>,
    infoSelector: (item: T["$info"]) => boolean,
    data: T["$data"],
  ) {
    await this._wsHandler.emitToServer(eventType, infoSelector, data);
  }

  async generateAuthToken(payload: AuthTokenPayload<TAuthInfo>) {
    return this._jwt.sign(payload);
  }

  async verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>> {
    return this._jwt.verify(token);
  }

  private _registerGracefulShutdown() {
    const shutdownHandler = async (signal: string) => {
      logger.info(`${signal} 시그널 감지. 서버 종료 프로세스 시작...`);

      const forceExitTimer = setTimeout(() => {
        logger.error("서버 종료 시간 초과 (10초). 강제 종료합니다.");
        process.exit(1);
      }, 10000);

      try {
        if (this.isOpen) {
          await this.close();
        }
        logger.info("서버가 안전하게 종료되었습니다.");
        clearTimeout(forceExitTimer);
        process.exit(0);
      } catch (err) {
        logger.error("서버 종료 중 오류 발생", err);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdownHandler("SIGINT"));
    process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
  }
}
