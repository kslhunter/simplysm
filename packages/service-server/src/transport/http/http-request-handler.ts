import { jsonParse } from "@simplysm/core-common";
import type { ServiceServer } from "../../service-server";
import type { ServiceExecutor } from "../../core/service-executor";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { JwtManager } from "../../auth/jwt-manager";

export class HttpRequestHandler {
  constructor(
    private readonly _server: ServiceServer,
    private readonly _executor: ServiceExecutor,
    private readonly _jwt: JwtManager,
  ) {}

  async handle(req: FastifyRequest, reply: FastifyReply) {
    const { service, method } = req.params as { service: string; method: string };

    // ClientName 헤더
    const clientName = req.headers["x-sd-client-name"] as string | undefined;
    if (clientName == null) throw new Error("ClientName header is required");

    // Authorization 헤더 파싱 및 검증
    let authTokenPayload;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader != null) {
        const token = authHeader.split(" ")[1]; // "Bearer <token>"
        authTokenPayload = await this._jwt.verify(token);
      }
    } catch (err) {
      reply.status(401).send({
        error: "Unauthorized",
        message: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    // 파라미터 파싱
    let params: unknown[] | undefined;
    if (req.method === "GET") {
      const query = req.query as { json?: string };
      if (typeof query.json !== "string") {
        throw new Error("JSON query parameter required");
      }
      params = jsonParse(query.json);
    } else if (req.method === "POST") {
      if (!Array.isArray(req.body)) {
        reply.status(400).send({
          error: "Bad Request",
          message: "Request body must be an array.",
        });
        return;
      }

      params = req.body as unknown[];
    }

    // 서비스 실행 및 응답
    if (params != null) {
      const serviceResult = await this._executor.runMethod({
        serviceName: service,
        methodName: method,
        params,
        http: { clientName, authTokenPayload },
      });

      reply.send(serviceResult);
    }
  }
}
