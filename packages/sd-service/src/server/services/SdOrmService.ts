import {SdServiceBase} from "../SdServiceBase";
import {Logger} from "@simplysm/sd-core";
import {DbConnection, IDbConnectionConfig, IQueryDef} from "@simplysm/sd-orm";
import {SdServiceServerUtil} from "../SdServiceServerUtil";

export class SdOrmService extends SdServiceBase {
  private readonly _logger = new Logger("@simplysm/sd-service", "SdOrmService");
  private static readonly _connections = new Map<number, DbConnection>();
  private static readonly _wsConnectionCloseListenerMap = new Map<number, () => Promise<void>>();

  public async getMainDbNameAsync(configName: string): Promise<string> {
    const config: IDbConnectionConfig =
      (await SdServiceServerUtil.getConfigAsync(this.rootPath, this.request.url))["orm"][configName] as IDbConnectionConfig;
    return config.database;
  }

  public async connectAsync(configName: string): Promise<number> {
    const config: IDbConnectionConfig =
      (await SdServiceServerUtil.getConfigAsync(this.rootPath, this.request.url))["orm"][configName] as IDbConnectionConfig;
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

    conn.on("close", async () => {
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

  public async executeAsync(connId: number, queries: (string | IQueryDef)[], colDefs?: { name: string; dataType: string | undefined }[], joinDefs?: { as: string; isSingle: boolean }[]): Promise<any[][]> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    const result = await conn.executeAsync(queries);
    return (colDefs && joinDefs) ? conn.generateResult(result[0], colDefs, joinDefs) : result;
  }
}