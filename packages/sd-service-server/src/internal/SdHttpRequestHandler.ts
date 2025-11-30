import { JsonConvert } from "@simplysm/sd-core-common";
import { SdServiceServer } from "../SdServiceServer";
import { SdServiceExecutor } from "./SdServiceExecutor";
import { FastifyReply, FastifyRequest } from "fastify";

export class SdHttpRequestHandler {
  constructor(
    private readonly _server: SdServiceServer,
    private readonly _executor: SdServiceExecutor,
  ) {}

  async handleAsync(req: FastifyRequest, reply: FastifyReply) {
    const { service, method } = req.params as { service: string; method: string };

    // 파라미터 파싱
    let params: any[] | undefined;
    if (req.method === "GET") {
      const query = req.query as { json?: string };
      if (typeof query.json !== "string") {
        throw new Error("JSON query parameter required");
      }
      params = JsonConvert.parse(query.json);
    } else if (req.method === "POST") {
      params = req.body as any[];
    }

    // 서비스 실행 및 응답
    if (params) {
      const serviceResult = await this._executor.runMethodAsync({
        serviceName: service,
        methodName: method,
        params,
      });

      reply.send(serviceResult);
    }
  }
}
