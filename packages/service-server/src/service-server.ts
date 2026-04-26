import type { ServiceEventDef } from "@simplysm/service-common";
import { handleStaticFile } from "./transport/http/static-file-handler";
import { handleHttpRequest } from "./transport/http/http-request-handler";
import { executeServiceMethod } from "./core/service-executor";
import { json, EventEmitter, env } from "@simplysm/core-common";
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
import { handleV1Connection, type V1AutoUpdateMethods } from "./legacy/v1-auto-update-handler";
import { createServiceContext } from "./core/define-service";
import consola from "consola";

const logger = consola.withTag("service-server:ServiceServer");

export interface ServerEventProxy<TEventDef extends ServiceEventDef> {
  emit(
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ): Promise<void>;
}

export class ServiceServer<TAuthInfo = unknown> extends EventEmitter<{
  ready: void;
  close: void;
}> {
  isOpen = false;

  private readonly _wsHandler: ReturnType<typeof createWebSocketHandler>;
  private readonly _jwtSecret: string | undefined;
  private _shutdownRegistered = false;

  readonly fastify: FastifyInstance;

  constructor(readonly options: ServiceServerOptions) {
    super();

    this._jwtSecret =
      options.auth != null && options.auth !== false ? options.auth.jwtSecret : undefined;

    // SSL 설정 (동기)
    // 참고: Fastify HTTPS는 Buffer 타입이 필요함 (Uint8Array를 직접 사용할 수 없음)
    const httpsConf = options.ssl
      ? { pfx: Buffer.from(options.ssl.pfxBytes), passphrase: options.ssl.passphrase }
      : null;

    this.fastify = fastify({ https: httpsConf });

    this._wsHandler = createWebSocketHandler(
      (def) => executeServiceMethod(this, def),
      this._jwtSecret,
    );
  }

  async listen(): Promise<void> {
    logger.info(`서버 시작 중... ${env("VER") ?? ""}`);

    // auth 설정 검증: auth 미설정(undefined)인데 auth 요구 서비스가 있으면 에러
    if (this.options.auth == null) {
      const authRequiredService = this.options.services.find((s) => s.authPermissions != null);
      if (authRequiredService != null) {
        throw new Error(
          `auth 설정이 필요합니다: 서비스 [${authRequiredService.name}]에 auth가 설정되어 있습니다.`,
        );
      }
    }

    // WebSocket 플러그인
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
          const parsed = json.parse(body as string);
          done(null, parsed);
        } catch (err: unknown) {
          const error = err as Error & { statusCode?: number };
          error.statusCode = 400;
          done(error, undefined);
        }
      },
    );

    // JSON 직렬화기
    this.fastify.setSerializerCompiler(() => (data) => json.stringify(data));

    // API 라우트
    this.fastify.all("/api/:service/:method", async (req, reply) => {
      await handleHttpRequest(req, reply, this._jwtSecret, (def) =>
        executeServiceMethod(this, def),
      );
    });

    // 업로드 라우트
    this.fastify.all("/upload", async (req, reply) => {
      await handleUpload(req, reply, this.options.rootPath, this._jwtSecret);
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
          socket.close(1008, "클라이언트 ID/NAME이 누락되었습니다");
          return;
        }
        this._wsHandler.addSocket(socket, clientId, clientName, req);
      } else {
        // V1 레거시 지원
        const autoUpdateDef = this.options.services.find((s) => s.name === "AutoUpdate");
        const legacyV1Handlers = this.options.legacyV1Handlers ?? [];
        if (autoUpdateDef == null && legacyV1Handlers.length < 1) {
          socket.close(1008, "AutoUpdate 서비스가 설정되지 않았습니다");
          return;
        }

        handleV1Connection(socket, {
          serviceContextFactory: (request) =>
            createServiceContext(this, undefined, undefined, { clientName: request.clientName }),
          handlers: legacyV1Handlers,
          autoUpdateMethodsFactory:
            autoUpdateDef == null
              ? undefined
              : ({ serviceContext }) =>
                  createV1AutoUpdateMethods(autoUpdateDef.factory(serviceContext)),
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

    // HTTP 서버 수준 에러 핸들링
    this.fastify.server.on("error", (err) => {
      logger.error("HTTP 서버 에러", err);
    });

    // 리슨
    await this.fastify.listen({ port: this.options.port, host: "0.0.0.0" });

    // 정상 종료 핸들러 등록
    this._registerGracefulShutdown();

    this.isOpen = true;
    logger.info(`서버 시작됨 (포트: ${this.options.port})`);
    this.emit("ready");
  }

  async close(): Promise<void> {
    this._wsHandler.closeAll();
    await this.fastify.close();

    this.isOpen = false;
    logger.debug("서버 종료됨");
    this.emit("close");
  }

  getEvent<TEventDef extends ServiceEventDef>(eventName: string): ServerEventProxy<TEventDef> {
    return {
      emit: (infoSelector, data) => this.emitEvent<TEventDef>(eventName, infoSelector, data),
    };
  }

  async emitEvent<TEventDef extends ServiceEventDef>(
    eventName: string,
    infoSelector: (item: TEventDef["$info"]) => boolean,
    data: TEventDef["$data"],
  ) {
    await this._wsHandler.emit<TEventDef>(eventName, infoSelector, data);
  }

  async signAuthToken(payload: AuthTokenPayload<TAuthInfo>) {
    if (this._jwtSecret == null) throw new Error("JWT Secret이 정의되지 않았습니다.");
    return signJwt(this._jwtSecret, payload);
  }

  async verifyAuthToken(token: string): Promise<AuthTokenPayload<TAuthInfo>> {
    if (this._jwtSecret == null) throw new Error("JWT Secret이 정의되지 않았습니다.");
    return verifyJwt(this._jwtSecret, token);
  }

  private _registerGracefulShutdown() {
    if (this._shutdownRegistered) return;
    this._shutdownRegistered = true;

    const shutdownHandler = async (signal: string) => {
      logger.info(`${signal} 시그널 수신됨. 서버 종료를 시작합니다...`);

      const forceExitTimer = setTimeout(() => {
        logger.error("서버 종료 시간 초과 (10초). 강제 종료합니다.");
        process.exit(1);
      }, 10000);

      try {
        if (this.isOpen) {
          await this.close();
        }
        logger.info("서버가 정상적으로 종료되었습니다.");
        clearTimeout(forceExitTimer);
        process.exit(0);
      } catch (err) {
        logger.error("서버 종료 중 에러 발생", err);
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

function createV1AutoUpdateMethods(
  methods: Record<string, ((...args: any[]) => any) | undefined>,
): V1AutoUpdateMethods {
  const getLastVersion = methods["getLastVersion"];
  if (getLastVersion == null) {
    throw new Error("AutoUpdate 서비스에 getLastVersion 메서드가 없습니다.");
  }

  return {
    getLastVersion: (platform) => getLastVersion(platform),
  };
}
