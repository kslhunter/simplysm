import { DbConnFactory } from "@simplysm/sd-orm-node";
import {
  IDbConn,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  QueryBuilder,
  SdOrmUtils,
  TDbConnConf,
  TDbContextOption,
  TQueryDef,
} from "@simplysm/sd-orm-common";
import { SdLogger } from "@simplysm/sd-core-node";
import { SdServiceBase } from "../types";
import { TDbConnOptions } from "@simplysm/sd-service-common";

export class SdOrmService extends SdServiceBase {
  #logger = SdLogger.get(["simplysm", "sd-service-server", this.constructor.name]);

  static #conns = new Map<number, IDbConn>();
  static #wsCloseListenerMap = new Map<number, (code: number) => Promise<void>>();

  static getConfAsync(service: SdOrmService, opt: TDbConnOptions): Promise<TDbConnConf> {
    const config: TDbConnConf | undefined =
      opt.configName !== undefined
        ? service.server.getConfig(service.request?.clientName)["orm"]?.[opt.configName]
        : undefined;
    if (config === undefined) {
      throw new Error("서버에서 ORM 설정을 찾을 수 없습니다.");
    }

    return Promise.resolve({ ...config, ...opt.config });
  }

  async getInfo(opt: Record<string, any>): Promise<{
    dialect: TDbContextOption["dialect"];
    database?: string;
    schema?: string;
  }> {
    const config = await SdOrmService.getConfAsync(this, opt);
    return {
      dialect: config.dialect,
      ...(config.dialect === "sqlite"
        ? {}
        : {
            database: config.database,
            schema: config.schema,
          }),
    };
  }

  async connect(opt: Record<string, any>): Promise<number> {
    const config = await SdOrmService.getConfAsync(this, opt);

    const dbConn = DbConnFactory.create(config);

    const lastConnId = Array.from(SdOrmService.#conns.keys()).max() ?? 0;
    const connId = lastConnId + 1;
    SdOrmService.#conns.set(connId, dbConn);

    await dbConn.connectAsync();

    const closeEventListener = async (code: number): Promise<void> => {
      // 클라이언트 창이 닫히거나 RELOAD 될때
      if (code === 1001) {
        await dbConn.closeAsync();
        this.#logger.warn("소켓연결이 끊어져, DB 연결이 중지되었습니다.");
      }
    };
    SdOrmService.#wsCloseListenerMap.set(connId, closeEventListener);
    this.client?.on("close", closeEventListener);

    dbConn.on("close", () => {
      SdOrmService.#conns.delete(connId);
      SdOrmService.#wsCloseListenerMap.delete(connId);
      this.client?.off("close", closeEventListener);
    });

    return connId;
  }

  async close(connId: number): Promise<void> {
    const conn = SdOrmService.#conns.get(connId);
    if (conn) {
      await conn.closeAsync();
    }
  }

  async beginTransaction(connId: number, isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    const conn = SdOrmService.#conns.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.beginTransactionAsync(isolationLevel);
  }

  async commitTransaction(connId: number): Promise<void> {
    const conn = SdOrmService.#conns.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.commitTransactionAsync();
  }

  async rollbackTransaction(connId: number): Promise<void> {
    const conn = SdOrmService.#conns.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.rollbackTransactionAsync();
  }

  async execute(connId: number, queries: string[]): Promise<any[][]> {
    const conn = SdOrmService.#conns.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await conn.executeAsync(queries);
  }

  async executeDefs(
    connId: number,
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    const conn = SdOrmService.#conns.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    // 가져올데이터가 없는것으로 옵션 설정을 했을때, 하나의 쿼리로 한번의 요청보냄
    if (options && options.every((item) => item == null)) {
      return await conn.executeAsync([
        defs.map((def) => new QueryBuilder(conn.config.dialect).query(def)).join("\n"),
      ]);
    } else {
      const queries = defs.mapMany((def) => {
        const query = new QueryBuilder(conn.config.dialect).query(def);
        return Array.isArray(query) ? query : [query];
      });
      const result = await conn.executeAsync(queries);
      return result.map((item, i) =>
        SdOrmUtils.parseQueryResult(item, options ? options[i] : undefined),
      );
    }
  }

  async bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ) {
    const conn = SdOrmService.#conns.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.bulkInsertAsync(tableName, columnDefs, records);
  }

  async bulkUpsert(
    connId: number,
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ) {
    const conn = SdOrmService.#conns.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.bulkUpsertAsync(tableName, columnDefs, records);
  }
}
