import * as http from "http";
import {SocketServer} from "@simplism/socket-server";
import {OrmService} from "./service/OrmService";

export class ServiceContainer {
  private _server?: SocketServer;

  public async startAsync(server?: http.Server): Promise<void>;
  public async startAsync(port?: number, host?: string): Promise<void>;
  public async startAsync(arg1?: number | http.Server, arg2?: string): Promise<void> {
    this._server = new SocketServer([
      OrmService
    ]);

    if (arg1 instanceof http.Server) {
      await this._server.startAsync(arg1);
    }
    else {
      await this._server.startAsync(arg1, arg2);
    }
  }

  public async closeAsync(): Promise<void> {
    await this._server!.closeAsync();
  }
}