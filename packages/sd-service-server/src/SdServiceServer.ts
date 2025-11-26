import https from "https";
import http from "http";
import url from "url";
import path from "path";
import { FsUtils, SdLogger } from "@simplysm/sd-core-node";
import {
  ISdServiceActivationContext,
  ISdServiceActivator,
  ISdServiceServerOptions,
  SdServiceBase,
} from "./types";
import { EventEmitter } from "events";
import { JsonConvert, ObjectUtils, Type } from "@simplysm/sd-core-common";
import { ISdServiceRequest, SdServiceEventListenerBase } from "@simplysm/sd-service-common";
import mime from "mime";
import { SdWebRequestError } from "./SdWebRequestError";
import { SdServiceServerConfUtils } from "./utils/SdServiceServerConfUtils";
import { SdWebsocketController } from "./features/SdWebsocketController";
import { WebSocket } from "ws";

export class SdServiceServer extends EventEmitter {
  isOpen = false;

  /***
   * 경로 프록시 (브라우저에 입력된 경로를 기본 파일경로가 아닌 다른 파일경로로 바꾸어 리턴함)
   *
   * * from: 서버내 'www' 이후의 상대경로 (절대경로 입력 불가)
   * * to: 서버내 파일의  절대경로 혹은 DEVSERVER의 port
   * * 'from'에 'api'로 시작하는 경로 사용 불가
   *
   */
  pathProxy: Record</* from */ string, /* to */ string | number> = {};

  readonly #logger = SdLogger.get(["simplysm", "sd-service-server", this.constructor.name]);
  #httpServer?: http.Server | https.Server;

  #ws?: SdWebsocketController;

  constructor(readonly options: ISdServiceServerOptions) {
    super();
  }

  #activateService<T extends SdServiceBase>(
    serviceClass: Type<T>,
    ctx: ISdServiceActivationContext,
  ): T {
    const activator: ISdServiceActivator | undefined = this.options.serviceActivator;

    if (activator) {
      return activator.create(serviceClass, ctx);
    }

    // 기본 구현: 기존 코드와 동일하게 new 해서 필드 세팅
    const service = new serviceClass();
    service.server = ctx.server;
    service.client = ctx.client;
    service.request = ctx.request;
    service.webHeaders = ctx.webHeaders;
    return service;
  }

  getConfig(clientName?: string): Record<string, any | undefined> {
    SdServiceServerConfUtils.getConfig(this.options.rootPath, clientName, this.pathProxy);
    let result: Record<string, any | undefined> = {};

    const rootFilePath = path.resolve(this.options.rootPath, ".config.json");
    if (FsUtils.exists(rootFilePath)) {
      result = FsUtils.readJson(rootFilePath);
    }

    if (clientName !== undefined) {
      const targetPath =
        typeof this.pathProxy[clientName] === "string"
          ? this.pathProxy[clientName]
          : path.resolve(this.options.rootPath, "www", clientName);

      const filePath = path.resolve(targetPath, ".config.json");
      if (FsUtils.exists(filePath)) {
        result = ObjectUtils.merge(result, FsUtils.readJson(filePath));
      }
    }

    return result;
  }

  async listenAsync(): Promise<void> {
    await new Promise<void>(async (resolve) => {
      this.#logger.debug("서버 시작..." + process.env["SD_VERSION"]);

      if (this.options.ssl) {
        const pfx =
          typeof this.options.ssl.pfxBuffer === "function"
            ? await this.options.ssl.pfxBuffer()
            : this.options.ssl.pfxBuffer;
        this.#httpServer = https.createServer({
          pfx,
          passphrase: this.options.ssl.passphrase,
        });
      } else {
        this.#httpServer = http.createServer();
      }

      this.#httpServer.on("request", async (req, res) => {
        await this.#onWebRequestAsync(req, res);
      });

      this.#ws = new SdWebsocketController(
        this.#httpServer,
        async (def) => await this.#runServiceMethodAsync(def),
      );

      this.#httpServer.listen(this.options.port, () => {
        resolve();
      });
    });

    this.isOpen = true;
    this.#logger.debug("서버 시작됨");
    this.emit("ready");
  }

  async closeAsync(): Promise<void> {
    await this.#ws?.closeAsync();

    await new Promise<void>((resolve, reject) => {
      if (!this.#httpServer || !this.#httpServer.listening) {
        resolve();
        return;
      }

      this.#httpServer.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });

    this.isOpen = false;
    this.#logger.debug("서버 종료됨");
    this.emit("close");
  }

  broadcastReload(clientName: string | undefined, changedFileSet: Set<string>): void {
    this.#logger.debug("서버내 모든 클라이언트 RELOAD 명령 전송");
    this.#ws?.broadcastReload(clientName, changedFileSet);
  }

  emitEvent<T extends SdServiceEventListenerBase<any, any>>(
    eventType: Type<T>,
    infoSelector: (item: T["info"]) => boolean,
    data: T["data"],
  ) {
    this.#ws?.emit(eventType, infoSelector, data);
  }

  async #runServiceMethodAsync(def: {
    client?: WebSocket;
    request?: ISdServiceRequest;
    serviceName: string;
    methodName: string;
    params: any[];
    webHeaders?: http.IncomingHttpHeaders;
  }): Promise<any> {
    // 서비스 가져오기
    const serviceClass = this.options.services.last((item) => item.name === def.serviceName);
    if (!serviceClass) {
      throw new Error(`서비스[${def.serviceName}]를 찾을 수 없습니다.`);
    }

    const service = this.#activateService(serviceClass, {
      server: this,
      client: def.client,
      request: def.request,
      webHeaders: def.webHeaders,
    });

    // 메소드 가져오기
    const method = service[def.methodName];
    if (method === undefined) {
      throw new Error(`메소드[${def.serviceName}.${def.methodName}]를 찾을 수 없습니다.`);
    }

    // 실행
    return await method.apply(service, def.params);
  }

  async #onWebRequestAsync(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      if (this.options.middlewares) {
        for (const optMdw of this.options.middlewares) {
          await new Promise<void>((resolve, reject) => {
            optMdw(req, res, (err) => {
              if (err != null) {
                reject(err);
                return;
              }

              resolve();
            });
          });
          if (res.writableEnded) return;
        }
      }

      const urlObj = url.parse(req.url!, true, false);
      const urlPath = decodeURI(urlObj.pathname!.slice(1));
      const urlPathChain = urlPath.split("/");

      if (urlPathChain[0] === "ws") {
        if (req.headers.upgrade?.toLowerCase() !== "websocket") {
          res.writeHead(426, { "Content-Type": "text/plain" });
          res.end("Upgrade Required");
          return;
        }
      } else if (urlPathChain[0] === "api") {
        if (req.headers.origin?.includes("://localhost") && req.method === "OPTIONS") {
          res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
          res.end();
          return;
        }

        const serviceName = urlPathChain[1];
        const methodName = urlPathChain[2];

        let params: any[] | undefined;
        if (req.method === "GET") {
          if (typeof urlObj.query["json"] !== "string") throw new Error();
          params = JsonConvert.parse(urlObj.query["json"]);
          /*if (req.headers["content-type"]?.toLowerCase().includes("json")) {
            params = JsonConvert.parse(urlObj.query["json"]);
          }
          else {
            params = [urlObj.query];
          }*/
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
          /*if (req.headers["content-type"]?.toLowerCase().includes("json")) {
            params = JsonConvert.parse(body.toString());
          }
          else {
            params = [body.toString()];
          }*/
        }

        if (params) {
          const serviceResult = await this.#runServiceMethodAsync({
            serviceName: serviceName,
            methodName,
            params,
            webHeaders: req.headers,
          });

          const result = serviceResult != null ? JsonConvert.stringify(serviceResult) : "undefined";
          /*const result = req.headers["content-type"]?.toLowerCase().includes("json")
            ? JsonConvert.stringify(serviceResult)
            : serviceResult;*/

          /*res.writeHead(200, {
            "Content-Length": Buffer.from(result).length,
            "Content-Type": req.headers["content-type"]?.toLowerCase(),
          });*/
          res.writeHead(200, {
            "Content-Length": Buffer.from(result).length,
            "Content-Type": "application/json",
          });
          res.end(result);

          return;
        }
      }

      if (req.method === "GET") {
        let targetFilePath: string;
        const currPathProxyFrom = Object.keys(this.pathProxy).single((from) =>
          urlPath.startsWith(from),
        );
        if (currPathProxyFrom !== undefined) {
          if (typeof this.pathProxy[currPathProxyFrom] === "number") {
            const proxyReq = http.request(
              {
                port: this.pathProxy[currPathProxyFrom],
                path: req.url,
                method: req.method,
                headers: req.headers,
              },
              (proxyRes) => {
                if (proxyRes.statusCode === 404) {
                  res.writeHead(404, { "Content-Type": "text/html" });
                  res.end("<h1>A custom 404 page</h1>");
                  return;
                }

                res.writeHead(proxyRes.statusCode!, proxyRes.headers);
                proxyRes.pipe(res, { end: true });
              },
            );
            req.pipe(proxyReq, { end: true });
            return;
          } else {
            targetFilePath = path.resolve(
              this.pathProxy[currPathProxyFrom] + urlPath.substring(currPathProxyFrom.length),
            );
          }
        } else {
          targetFilePath = path.resolve(this.options.rootPath, "www", urlPath);
        }
        targetFilePath =
          FsUtils.exists(targetFilePath) && FsUtils.stat(targetFilePath).isDirectory()
            ? path.resolve(targetFilePath, "index.html")
            : targetFilePath;

        if (!FsUtils.exists(targetFilePath)) {
          const errorMessage = "파일을 찾을 수 없습니다.";
          this.#responseErrorHtml(res, 404, errorMessage);
          this.#logger.warn(`[404] ${errorMessage} (${targetFilePath})`);
          return;
        }

        if (path.basename(targetFilePath).startsWith(".")) {
          const errorMessage = "파일을 사용할 권한이 없습니다.";
          this.#responseErrorHtml(res, 403, errorMessage);
          this.#logger.warn(`[403] ${errorMessage} (${targetFilePath})`);
          return;
        }

        const fileStream = FsUtils.createReadStream(targetFilePath);
        const targetFileSize = (await FsUtils.lstatAsync(targetFilePath)).size;

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Length", targetFileSize);
        res.setHeader("Content-Type", mime.getType(targetFilePath)!);
        res.writeHead(200);
        fileStream.pipe(res);
      } else {
        const errorMessage = "요청이 잘못되었습니다.";
        this.#responseErrorHtml(res, 405, errorMessage);
        this.#logger.warn(`[405] ${errorMessage} (${req.method!.toUpperCase()})`);
        return;
      }
    } catch (err) {
      if (err instanceof SdWebRequestError) {
        res.writeHead(err.statusCode);
        res.end(err.message);
        this.#logger.error(`[${err.statusCode}]\n${err.message}`, err);
      } else {
        const errorMessage = "요청 처리중 오류가 발생하였습니다.";
        this.#responseErrorHtml(res, 405, errorMessage);
        this.#logger.error(`[405] ${errorMessage}`, err);
      }
    }
  }

  #responseErrorHtml(res: http.ServerResponse, code: number, message: string): void {
    res.writeHead(code);
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="UTF-8">
    <title>${code}: ${message}</title>
</head>
<body>${code}: ${message}</body>
</html>`);
  }
}
