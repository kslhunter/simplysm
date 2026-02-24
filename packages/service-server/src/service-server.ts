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

    // SSL configuration (synchronous)
    // Note: Fastify HTTPS requires Buffer type (Uint8Array not directly usable)
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
    logger.info(`Server starting... ${env.VER ?? ""}`);

    // WebSocket plugin
    await this.fastify.register(fastifyWebsocket);

    // Security plugin
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

    // Upload plugin
    await this.fastify.register(fastifyMultipart);

    // Register @fastify/static
    await this.fastify.register(fastifyStatic, {
      root: path.resolve(this.options.rootPath, "www"),
      wildcard: false,
      serve: false,
    });

    // CORS configuration
    await this.fastify.register(fastifyCors, {
      origin: (_origin, cb) => {
        cb(null, true);
      },
      allowedHeaders: ["Content-Type", "Authorization", "x-sd-client-name"],
      exposedHeaders: ["Content-Disposition", "Content-Length"],
    });

    // JSON parser
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

    // JSON serializer
    this.fastify.setSerializerCompiler(() => (data) => jsonStringify(data));

    // API routes
    this.fastify.all("/api/:service/:method", async (req, reply) => {
      await handleHttpRequest(req, reply, this.options.auth?.jwtSecret, (def) =>
        runServiceMethod(this, def),
      );
    });

    // Upload route
    this.fastify.all("/upload", async (req, reply) => {
      await handleUpload(req, reply, this.options.rootPath, this.options.auth?.jwtSecret);
    });

    // WebSocket route
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
        // V1 legacy support (auto-update only)
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

    // Static file wildcard handler
    this.fastify.route({
      method: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"],
      url: "/*",
      handler: async (req, reply) => {
        const urlObj = new URL(req.raw.url!, "http://localhost");
        const urlPath = decodeURI(urlObj.pathname.slice(1));

        await handleStaticFile(req, reply, this.options.rootPath, urlPath);
      },
    });

    // HTTP server-level error handling
    this.fastify.server.on("error", (err) => {
      logger.error("HTTP server error", err);
    });

    // Listen
    await this.fastify.listen({ port: this.options.port, host: "0.0.0.0" });

    // Register graceful shutdown handler
    this._registerGracefulShutdown();

    this.isOpen = true;
    logger.info(`Server started (port: ${this.options.port})`);
    this.emit("ready");
  }

  async close(): Promise<void> {
    this._wsHandler.closeAll();
    await this.fastify.close();

    this.isOpen = false;
    logger.debug("Server closed");
    this.emit("close");
  }

  async broadcastReload(clientName: string | undefined, changedFileSet: Set<string>) {
    logger.debug("Broadcasting RELOAD to all server clients");
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
      logger.info(`${signal} signal received. Starting server shutdown...`);

      const forceExitTimer = setTimeout(() => {
        logger.error("Server shutdown timed out (10s). Forcing exit.");
        process.exit(1);
      }, 10000);

      try {
        if (this.isOpen) {
          await this.close();
        }
        logger.info("Server shut down gracefully.");
        clearTimeout(forceExitTimer);
        process.exit(0);
      } catch (err) {
        logger.error("Error during server shutdown", err);
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
