import type { ServiceEventDef } from "@simplysm/service-common";
import { handleStaticFile } from "./transport/http/static-file-handler";
import { handleHttpRequest } from "./transport/http/http-request-handler";
import { runServiceMethod } from "./core/service-executor";
import { jsonStringify, jsonParse, EventEmitter, env } from "@simplysm/core-common";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fastify from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fastifyStatic from "@fastify/static";
import fastifyMultipart from "@fastify/multipart";
import fastifyHelmet from "@fastify/helmet";
import fastifyCors from "@fastify/cors";
import path from "path";
import { Buffer } from "node:buffer";
import { handleUpload } from "./transport/http/upload-handler";
import { createWebSocketHandler } from "./transport/socket/websocket-handler";
import type { WebSocket } from "ws";
import { signJwt, verifyJwt } from "./auth/jwt-manager";
import type { AuthTokenPayload } from "./auth/auth-token-payload";
import type { ServiceServerOptions } from "./types/server-options";
import { handleV1Connection } from "./legacy/v1-auto-update-handler";
import { createServiceContext } from "./core/define-service";
import consola from "consola";

const logger = consola.withTag("service-server:ServiceServer");

export class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{
  ready: void;
  close: void;
}> {
  isOpen = false;

  private readonly _wsHandler: ReturnType<typeof createWebSocketHandler>;

  readonly fastify: FastifyInstance;

  constructor(readonly options: ServiceServerOptions) {
    super();

    // SSL 설정 (동기)
    // Note: Fastify HTTPS 설정은 Buffer 타입을 요구함 (Uint8Array 직접 사용 불가)
    const httpsConf = options.ssl
      ? { pfx: Buffer.from(options.ssl.pfxBytes), passphrase: options.ssl.passphrase }
      : null;

    this.fastify = fastify({ https: httpsConf });

    this._wsHandler = createWebSocketHandler(
      (def) => runServiceMethod(this, def),
      options.auth?.jwtSecret,
    );
  }

  async listen(): Promise<void> {
    logger.info(`서버 시작... ${env.VER ?? ""}`);

    // Websocket 플러그인
    await this.fastify.register(fastifyWebsocket);

    // 보안 플러그인
    await this.fastify.register(fastifyHelmet, {
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
    await this.fastify.register(fastifyMultipart);

    // @fastify/static 등록
    await this.fastify.register(fastifyStatic, {
      root: path.resolve(this.options.rootPath, "www"),
      wildcard: false,
      serve: false,
    });

    // CORS 설정
    await this.fastify.register(fastifyCors, {
      origin: (_origin, cb) => {
        cb(null, true);
      },
      allowedHeaders: ["Content-Type", "Authorization", "x-sd-client-name"],
      exposedHeaders: ["Content-Disposition", "Content-Length"],
    });

    // JSON 파서
    this.fastify.addContentTypeParser(
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
    this.fastify.setSerializerCompiler(() => (data) => jsonStringify(data));

    // API 라우트
    this.fastify.all("/api/:service/:method", async (req, reply) => {
      await handleHttpRequest(req, reply, this.options.auth?.jwtSecret, (def) =>
        runServiceMethod(this, def),
      );
    });

    // 업로드 라우트
    this.fastify.all("/upload", async (req, reply) => {
      await handleUpload(req, reply, this.options.rootPath, this.options.auth?.jwtSecret);
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
        const autoUpdateDef = this.options.services.find((s) => s.name === "AutoUpdate");
        if (autoUpdateDef == null) {
          socket.close(1008, "AutoUpdate service not configured");
          return;
        }

        const legacyCtx = createServiceContext(this, undefined, undefined, {});
        const autoUpdateMethods = autoUpdateDef.factory(legacyCtx) as {
          getLastVersion: (platform: string) => Promise<any>;
        };

        handleV1Connection(socket, autoUpdateMethods, (name) => {
          legacyCtx.legacy = { clientName: name };
        });
      }
    };
    this.fastify.get("/", { websocket: true }, onWebSocketConnected.bind(this));
    this.fastify.get("/ws", { websocket: true }, onWebSocketConnected.bind(this));

    // 정적 파일 와일드카드 핸들러
    this.fastify.route({
      method: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
      url: "/*",
      handler: async (req, reply) => {
        const urlObj = new URL(req.raw.url!, "http://localhost");
        const urlPath = decodeURI(urlObj.pathname.slice(1));

        await handleStaticFile(req, reply, this.options.rootPath, urlPath);
      },
    });

    // HTTP 서버 수준의 에러 핸들링
    this.fastify.server.on("error", (err) => {
      logger.error("HTTP 서버 오류 발생", err);
    });

    // 리슨
    await this.fastify.listen({ port: this.options.port, host: "0.0.0.0" });

    // Graceful Shutdown 핸들러 등록
    this._registerGracefulShutdown();

    this.isOpen = true;
    logger.info(`서버 시작됨 (port: ${this.options.port})`);
    this.emit("ready");
  }

  async close(): Promise<void> {
    this._wsHandler.closeAll();
    await this.fastify.close();

    this.isOpen = false;
    logger.debug("서버 종료됨");
    this.emit("close");
  }

  async broadcastReload(clientName: string | undefined, changedFileSet: Set<string>) {
    logger.debug("서버내 모든 클라이언트 RELOAD 명령 전송");
    await this._wsHandler.broadcastReload(clientName, changedFileSet);
  }

  async emitEvent<TInfo, TData>(
    eventDef: ServiceEventDef<TInfo, TData>,
    infoSelector: (item: TInfo) => boolean,
    data: TData,
  ) {
    await this._wsHandler.emitToServer(eventDef, infoSelector, data);
  }

  async generateAuthToken(payload: AuthTokenPayload<TAuthInfo>) {
    const jwtSecret = this.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret이 정의되지 않았습니다.");

    return signJwt(jwtSecret, payload);
  }

  async verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>> {
    const jwtSecret = this.options.auth?.jwtSecret;
    if (jwtSecret == null) throw new Error("JWT Secret이 정의되지 않았습니다.");

    return verifyJwt(jwtSecret, token);
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

export function createServiceServer<TAuthInfo = unknown>(
  options: ServiceServerOptions,
): ServiceServer<TAuthInfo> {
  return new ServiceServer<TAuthInfo>(options);
}
