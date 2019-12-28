import {NextHandleFunction} from "connect";
import * as express from "express";
import * as http from "http";
import * as https from "https";
import {EventEmitter} from "events";

export class SdServiceServer extends EventEmitter {
  private _express!: express.Express;
  private _httpServer?: http.Server | https.Server;

  public constructor(public port: number) {
    super();
  }

  public async listenAsync(): Promise<void> {
    this._express = express();

    this._httpServer = http.createServer(this._express);

    this._httpServer.listen(this.port, () => {
      this.emit("ready");
    });
  }

  public addMiddleware(middleware: NextHandleFunction) {
    this._express.use(middleware);
  }
}
