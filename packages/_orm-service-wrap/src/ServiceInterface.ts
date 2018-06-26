import {OrmServiceInterface} from "./service-interface/OrmServiceInterface";
import {SocketClient} from "@simplism/socket-client";

export class ServiceInterface {
  private readonly _client: SocketClient = new SocketClient();

  public orm: OrmServiceInterface = new OrmServiceInterface(this._client);

  public async connectAsync(port?: number, host?: string): Promise<void> {
    await this._client.connectAsync(port, host);
  }

  public async closeAsync(): Promise<void> {
    if (!this._client) {
      return;
    }

    await this._client.closeAsync();
  }
}