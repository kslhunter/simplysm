import * as http from "http";
import { SdLogger } from "@simplysm/sd-core-node";
import { JsonConvert, Type } from "@simplysm/sd-core-common";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import { SdServiceServer } from "../SdServiceServer";
import { ISdServiceActivationContext, ISdServiceActivator, SdServiceBase } from "../types";
import { WebSocket } from "ws";
import { FastifyInstance } from "fastify";

export class SdRequestHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdRequestHandler"]);

  constructor(private readonly _server: SdServiceServer) {}
  // Fastify 라우트 등록
  bind(server: FastifyInstance) {
    // CORS Preflight (간단 처리) - 필요시 @fastify/cors 사용 권장
    server.options("/api/*", (req, reply) => {
      if (req.headers.origin?.includes("://localhost")) {
        reply.header("Access-Control-Allow-Origin", "*");
        return "OK";
      }

      // 모든 경로에서 값 반환
      return "Pass";
    });

    // API 라우트 정의
    server.all("/api/:serviceName/:methodName", async (req, reply) => {
      const { serviceName, methodName } = req.params as any;

      // 파라미터 파싱 (Fastify가 query/body 자동 파싱함)
      let params: any[] | undefined;
      if (req.method === "GET") {
        const jsonStr = (req.query as any)["json"];
        if (typeof jsonStr !== "string") throw new Error("JSON query parameter required");
        params = JsonConvert.parse(jsonStr);
      } else {
        // POST body는 이미 객체이거나 텍스트일 수 있음. 상황에 맞춰 조정
        params = Array.isArray(req.body) ? req.body : JsonConvert.parse(JSON.stringify(req.body));
      }

      if (params) {
        const result = await this.runMethodAsync({
          serviceName,
          methodName,
          params,
          webHeaders: req.raw.headers,
        });

        // 결과 반환
        reply.header("Content-Type", "application/json");
        return result !== undefined ? JsonConvert.stringify(result) : "undefined";
      }

      // params가 없는 경우(거의 없겠지만)에 대한 기본 반환
      reply.code(400);
      return "Bad Request";
    });
  }

  async runMethodAsync(def: {
    client?: WebSocket;
    request?: ISdServiceRequest;
    serviceName: string;
    methodName: string;
    params: any[];
    webHeaders?: http.IncomingHttpHeaders;
  }): Promise<any> {
    // 서비스 클래스 찾기
    const serviceClass = this._server.options.services.last(
      (item) => item.name === def.serviceName,
    );
    if (!serviceClass) {
      throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
    }

    // 서비스 인스턴스 활성화
    const service = this.#activateService(serviceClass, {
      server: this._server,
      client: def.client,
      request: def.request,
      webHeaders: def.webHeaders,
    });

    // 메소드 찾기
    const method = service[def.methodName];
    if (method === undefined) {
      throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
    }

    // 실행
    return await method.apply(service, def.params);
  }

  #activateService<T extends SdServiceBase>(
    serviceClass: Type<T>,
    ctx: ISdServiceActivationContext,
  ): T {
    const activator: ISdServiceActivator | undefined = this._server.options.serviceActivator;

    if (activator) {
      return activator.create(serviceClass, ctx);
    }

    const service = new serviceClass();
    service.server = ctx.server;
    service.client = ctx.client;
    service.request = ctx.request;
    service.webHeaders = ctx.webHeaders;
    return service;
  }
}
