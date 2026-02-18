import { JsonConvert } from "@simplysm/sd-core-common";
import type { SdServiceServer } from "../../SdServiceServer";
import type { SdServiceExecutor } from "../../core/SdServiceExecutor";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SdServiceJwtManager } from "../../auth/SdServiceJwtManager";

export class SdHttpRequestHandler {
  constructor(
    private readonly _server: SdServiceServer,
    private readonly _executor: SdServiceExecutor,
    private readonly _jwt: SdServiceJwtManager,
  ) {}

  async handleAsync(req: FastifyRequest, reply: FastifyReply) {
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
        if (token) {
          authTokenPayload = await this._jwt.verifyAsync(token);
        }
      }
    } catch (err) {
      // 토큰이 있는데 유효하지 않으면 401
      reply
        .status(401)
        .send({ error: "Unauthorized", message: err instanceof Error ? err.message : String(err) });
      return;
    }

    // 파라미터 파싱
    let params: any[] | undefined;
    if (req.method === "GET") {
      const query = req.query as { json?: string };
      if (typeof query.json !== "string") {
        throw new Error("JSON query parameter required");
      }
      params = JsonConvert.parse(query.json);
    } else if (req.method === "POST") {
      if (!Array.isArray(req.body)) {
        reply.status(400).send({
          error: "Bad Request",
          message: "Request body must be an array.",
        });
        return;
      }

      params = req.body;
    }

    // 서비스 실행 및 응답
    if (params) {
      const serviceResult = await this._executor.runMethodAsync({
        serviceName: service,
        methodName: method,
        params,
        http: { clientName, authTokenPayload },
      });

      reply.send(serviceResult);
    }
  }
}
