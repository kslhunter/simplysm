import * as http from "http";
import * as path from "path";
import { SdLogger } from "@simplysm/sd-core-node";
import { SdServiceServer } from "../SdServiceServer";
import { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";

export class SdStaticFileHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdStaticFileHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  bind(server: FastifyInstance) {
    // 1. Path Proxy 등록 (특정 경로를 다른 로컬 경로로 매핑)
    for (const [urlPath, target] of Object.entries(this._server.pathProxy)) {
      if (typeof target === "string") {
        // 별도의 정적 파일 서빙 인스턴스 등록
        server.register(fastifyStatic, {
          root: target,
          prefix: urlPath, // 예: /client1
          decorateReply: false, // 충돌 방지
          index: "index.html",
        });
      } else if (typeof target === "number") {
        // 포트 포워딩 (간단한 프록시 구현)
        server.all(urlPath + "/*", (req, reply) => {
          // Fastify req.raw, reply.raw를 사용하여 기존 http.request 프록시 로직 재사용 가능
          // 또는 @fastify/http-proxy 사용 권장
          const proxyReq = http.request(
            {
              port: target,
              path: req.url,
              method: req.method,
              headers: req.headers,
            },
            (proxyRes) => {
              reply.raw.writeHead(proxyRes.statusCode!, proxyRes.headers);
              proxyRes.pipe(reply.raw);
            },
          );
          req.raw.pipe(proxyReq);
        });
      }
    }

    // 2. 기본 정적 파일 서빙 (www 폴더)
    // 가장 마지막에 등록하여 fallback 처리
    server.register(fastifyStatic, {
      root: path.resolve(this._server.options.rootPath, "www"),
      prefix: "/",
      wildcard: true,
      index: "index.html",
    });

    // 3. SPA Fallback (파일이 없을 경우 index.html 반환) 처리
    // @fastify/static의 not found handler 등을 활용하거나
    // setNotFoundHandler를 통해 index.html을 서빙하도록 설정 가능
    server.setNotFoundHandler((req, reply) => {
      // API나 업로드가 아닌 경우 index.html 반환
      if (!req.url.startsWith("/api") && !req.url.startsWith("/upload")) {
        return reply.sendFile("index.html");
      }
      reply.status(404).send("Not Found");
      return reply;
    });
  }
}
