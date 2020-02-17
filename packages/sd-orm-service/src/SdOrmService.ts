import {SdServiceBase, SdServiceServerConfigUtils} from "@simplysm/sd-service-server";
import {Logger} from "@simplysm/sd-core-node";
import {DbConnection, IDbConnectionConfig} from "@simplysm/sd-orm-node";
import {IQueryResultParseOption, QueryBuilder, QueryUtil, TQueryDef} from "@simplysm/sd-orm-common";
import * as url from "url";

export class SdOrmService extends SdServiceBase {
  private readonly _logger = Logger.get(["simplysm", "sd-orm-service", "SdOrmService"]);
  private static readonly _connections = new Map<number, DbConnection>();
  private static readonly _wsConnectionCloseListenerMap = new Map<number, () => Promise<void>>();

  public async connectAsync(configName: string): Promise<number> {
    const urlObj = url.parse(this.request.url!, true, false);
    const clientPath = decodeURI(urlObj.pathname!.slice(1));

    const config: IDbConnectionConfig =
      (await SdServiceServerConfigUtils.getConfigAsync(this.server.rootPath, clientPath))["orm"][configName] as IDbConnectionConfig;
    const conn = new DbConnection(config);

    const lastConnId = Array.from(SdOrmService._connections.keys()).max() || 0;
    const connId = lastConnId + 1;
    SdOrmService._connections.set(connId, conn);

    await conn.connectAsync();

    const closeEventListener = async () => {
      await conn.closeAsync();
      this._logger.warn("소켓연결이 끊어져, DB 연결이 중지되었습니다.");
    };
    SdOrmService._wsConnectionCloseListenerMap.set(connId, closeEventListener);
    this.conn.on("close", closeEventListener);

    conn.on("close", () => {
      SdOrmService._connections.delete(connId);
      SdOrmService._wsConnectionCloseListenerMap.delete(connId);
      this.conn.off("close", closeEventListener);
    });

    return connId;
  }

  public async closeAsync(connId: number): Promise<void> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.closeAsync();
  }

  public async beginTransactionAsync(connId: number): Promise<void> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.beginTransactionAsync();
  }

  public async commitTransactionAsync(connId: number): Promise<void> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.commitTransactionAsync();
  }

  public async rollbackTransactionAsync(connId: number): Promise<void> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.rollbackTransactionAsync();
  }

  public async executeAsync(connId: number, defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    const result = await conn.executeAsync(defs.map(def => QueryBuilder.query(def)));
    return result.map((item, i) => QueryUtil.parseQueryResult(item, options ? options[i] : undefined));
  }
}
