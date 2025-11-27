import * as http from "http";
import { SdLogger } from "@simplysm/sd-core-node";
import { JsonConvert, Type } from "@simplysm/sd-core-common";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import { SdServiceServer } from "../SdServiceServer";
import { ISdServiceActivationContext, ISdServiceActivator, SdServiceBase } from "../types";
import { WebSocket } from "ws";
import { FastifyReply, FastifyRequest } from "fastify";

export class SdRequestHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdRequestHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  async handleAsync(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const params = req.params as { service: string; method: string };
    const serviceName = params.service;
    const methodName = params.method;

    // 파라미터 파싱
    let args: any[] | undefined;
    if (req.method === "GET") {
      const query = req.query as { json?: string };
      if (typeof query.json !== "string") {
        throw new Error("JSON query parameter required");
      }
      args = JsonConvert.parse(query.json);
    } else if (req.method === "POST") {
      // SdServiceServer에서 addContentTypeParser를 통해 JsonConvert로 이미 파싱됨
      args = req.body as any[];
    }

    // 서비스 실행 및 응답
    if (args) {
      const serviceResult = await this.runMethodAsync({
        serviceName: serviceName,
        methodName,
        params: args,
        webHeaders: req.headers,
      });

      const result = serviceResult != null ? JsonConvert.stringify(serviceResult) : "undefined";

      // Fastify 방식의 응답 전송
      reply.header("Content-Type", "application/json");
      reply.send(result);
    }
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
