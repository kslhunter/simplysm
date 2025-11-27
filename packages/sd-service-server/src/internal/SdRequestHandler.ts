import * as http from "http";
import * as url from "url";
import { SdLogger } from "@simplysm/sd-core-node";
import { JsonConvert, Type } from "@simplysm/sd-core-common";
import { ISdServiceRequest } from "@simplysm/sd-service-common";
import { SdServiceServer } from "../SdServiceServer";
import { ISdServiceActivationContext, ISdServiceActivator, SdServiceBase } from "../types";
import { WebSocket } from "ws";

export class SdRequestHandler {
  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", "SdRequestHandler"]);

  constructor(private readonly _server: SdServiceServer) {}

  async handleRequestAsync(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    urlObj: url.UrlWithParsedQuery,
    urlPathChain: string[],
  ): Promise<boolean> {
    // 1. CORS Preflight (OPTIONS)
    if (req.headers.origin?.includes("://localhost") && req.method === "OPTIONS") {
      res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
      res.end();
      return true;
    }

    const serviceName = urlPathChain[1];
    const methodName = urlPathChain[2];

    // 2. 파라미터 파싱
    let params: any[] | undefined;
    if (req.method === "GET") {
      if (typeof urlObj.query["json"] !== "string")
        throw new Error("JSON query parameter required");
      params = JsonConvert.parse(urlObj.query["json"]);
    } else if (req.method === "POST") {
      const body = await new Promise<Buffer>((resolve) => {
        let tmp = Buffer.from([]);
        req.on("data", (chunk) => {
          tmp = Buffer.concat([tmp, chunk]);
        });
        req.on("end", () => {
          resolve(tmp);
        });
      });
      params = JsonConvert.parse(body.toString());
    }

    // 3. 서비스 실행 및 응답
    if (params) {
      const serviceResult = await this.runMethodAsync({
        serviceName: serviceName,
        methodName,
        params,
        webHeaders: req.headers,
      });

      const result = serviceResult != null ? JsonConvert.stringify(serviceResult) : "undefined";
      res.writeHead(200, {
        "Content-Length": Buffer.from(result).length,
        "Content-Type": "application/json",
      });
      res.end(result);

      return true;
    }

    return false;
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
