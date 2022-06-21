import { DbConnectionFactory } from "@simplysm/sd-orm-node";
import {
  IDbConnection,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  QueryBuilder,
  SdOrmUtil,
  TDbConnectionConfig,
  TDbContextOption,
  TQueryDef
} from "@simplysm/sd-orm-common";
import { Logger } from "@simplysm/sd-core-node";
import { SdServiceBase } from "../commons";
import { TDbConnOptions } from "@simplysm/sd-service-common";
import { SdServiceServerConfigUtil } from "../utils/SdServiceServerConfigUtil";

export class SdOrmService extends SdServiceBase {
  private readonly _logger = Logger.get(["simplysm", "sd-service-server", this.constructor.name]);

  private static readonly _connections = new Map<number, IDbConnection>();
  private static readonly _wsConnectionCloseListenerMap = new Map<number, (code: number) => Promise<void>>();

  public static getDbConnConfigAsync = async (rootPath: string, clientName: string | undefined, opt: TDbConnOptions): Promise<TDbConnectionConfig> => {
    const config: TDbConnectionConfig | undefined = opt.configName !== undefined ? (await SdServiceServerConfigUtil.getConfigAsync(rootPath, clientName))["orm"]?.[opt.configName] : undefined;
    if (config === undefined) {
      throw new Error("서버에서 ORM 설정을 찾을 수 없습니다.");
    }

    return { ...config, ...opt.config };
  };

  public async getInfoAsync(opt: Record<string, any>): Promise<{
    dialect: TDbContextOption["dialect"];
    database?: string;
    schema?: string;
  }> {
    const config = await SdOrmService.getDbConnConfigAsync(this.server.options.rootPath, this.request?.clientName, opt);
    return {
      dialect: config.dialect,
      ...config.dialect === "sqlite" ? {} : {
        database: config.database,
        schema: config.schema
      }
    };
  }

  public async connectAsync(opt: Record<string, any>): Promise<number> {
    const config = await SdOrmService.getDbConnConfigAsync(this.server.options.rootPath, this.request?.clientName, opt);

    const dbConn = await DbConnectionFactory.createAsync(config);

    const lastConnId = Array.from(SdOrmService._connections.keys()).max() ?? 0;
    const connId = lastConnId + 1;
    SdOrmService._connections.set(connId, dbConn);

    await dbConn.connectAsync();

    const closeEventListener = async (code: number): Promise<void> => {
      // 클라이언트 창이 닫히거나 RELOAD 될때
      if (code === 1001) {
        await dbConn.closeAsync();
        this._logger.warn("소켓연결이 끊어져, DB 연결이 중지되었습니다.");
      }
    };
    SdOrmService._wsConnectionCloseListenerMap.set(connId, closeEventListener);
    if (this.socketId !== undefined) {
      this.server.getWsClient(this.socketId)?.on("close", closeEventListener);
    }

    dbConn.on("close", () => {
      SdOrmService._connections.delete(connId);
      SdOrmService._wsConnectionCloseListenerMap.delete(connId);
      if (this.socketId !== undefined) {
        this.server.getWsClient(this.socketId)?.off("close", closeEventListener);
      }
    });

    return connId;
  }

  public async closeAsync(connId: number): Promise<void> {
    const conn = SdOrmService._connections.get(connId);
    if (conn) {
      await conn.closeAsync();
    }
  }

  public async beginTransactionAsync(connId: number, isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.beginTransactionAsync(isolationLevel);
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


  public async executeAsync(connId: number, queries: string[]): Promise<any[][]> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await conn.executeAsync(queries);
  }

  public async executeDefsAsync(connId: number, defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    // 가져올데이터가 없는것으로 옵션 설정을 했을때, 하나의 쿼리로 한번의 요청보냄
    if (options && options.every((item) => item == null)) {
      return await conn.executeAsync([defs.map((def) => new QueryBuilder(conn.config.dialect).query(def)).join("\n")]);
    }
    else {
      const result = await conn.executeAsync(defs.map((def) => new QueryBuilder(conn.config.dialect).query(def)));
      return result.map((item, i) => SdOrmUtil.parseQueryResult(item, options ? options[i] : undefined));
    }
  }

  public async bulkInsertAsync(connId: number, tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
    const conn = SdOrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.bulkInsertAsync(tableName, columnDefs, records);
  }
}
