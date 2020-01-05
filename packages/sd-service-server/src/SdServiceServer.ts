import {EventEmitter} from "events";
import * as https from "https";
import * as http from "http";
import * as fs from "fs-extra";
import * as WebSocket from "ws";
import {Logger} from "@simplysm/sd-core-node";
import {NotImplementError} from "@simplysm/sd-core-common";

export class SdServiceServer extends EventEmitter {
  private readonly _logger: Logger;

  public constructor(private readonly _options?: { port?: number; ssl?: { pfx: string; passphrase: string }; }) {
    super();
    this._logger = Logger.get(["simplysm", "sd-service-server"]);
  }

  public async listenAsync(): Promise<void> {
    const httpServer = this._options?.ssl
      ? https.createServer({
        pfx: await fs.readFile(this._options.ssl.pfx),
        passphrase: this._options.ssl.passphrase
      })
      : http.createServer();

    const wsServer = new WebSocket.Server({
      server: httpServer
    });

    wsServer.on("connection", async (conn, connReq) => {
      try {
        await this._onSocketConnectionAsync(conn, connReq);
      }
      catch (err) {
        this._logger.error(`클라이언트와 연결할 수 없습니다.`, err);
      }
    });

    httpServer.on("request", (req, res) => {
      this._onWebRequest(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      wsServer.on("error", (err) => {
        reject(err);
      });

      httpServer.on("error", (err) => {
        reject(err);
      });

      httpServer.listen(this._options?.port, () => {
        resolve();
      });
    });
  }

  private async _onSocketConnectionAsync(conn: WebSocket, connReq: http.IncomingMessage): Promise<void> {
    throw new NotImplementError();
  }

  private _onWebRequest(req: any, res: any): void {
    throw new NotImplementError();
  }
}
