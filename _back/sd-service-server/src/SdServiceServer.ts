import {NextHandleFunction} from "connect";
import * as express from "express";
import * as http from "http";
import * as https from "https";
import {EventEmitter} from "events";
import * as path from "path";

export class SdServiceServer extends EventEmitter {
  private _express!: express.Express;
  private _httpServer?: http.Server | https.Server;

  public constructor(public port: number) {
    super();
  }

  public async listenAsync(): Promise<void> {
    this._express = express();
    const ppp = path.resolve(process.cwd(), "packages/client-admin/dist/server/main");
    const {AppServerModuleNgFactory, LAZY_MODULE_MAP, ngExpressEngine, provideModuleMap} = eval(`require(ppp)`);
    console.log(ppp);
    this._express.engine("html", ngExpressEngine({
      bootstrap: AppServerModuleNgFactory,
      providers: [
        provideModuleMap(LAZY_MODULE_MAP)
      ]
    }));

    this._express.get("*", (req, res) => {
      res.render("index", {req});
    });

    this._httpServer = http.createServer(this._express);

    this._httpServer.listen(this.port, () => {
      this.emit("ready");
    });
  }

  public addMiddleware(middleware: NextHandleFunction): void {
    // this._express.use(middleware);
  }
}
