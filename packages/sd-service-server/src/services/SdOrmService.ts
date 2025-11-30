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
import { ISdOrmService, TDbConnOptions } from "@simplysm/sd-service-common";
import { SdServiceSocket } from "../internal/SdServiceSocket";

export class SdOrmService extends SdServiceBase implements ISdOrmService {
  #logger = SdLogger.get(["simplysm", "sd-service-server", this.constructor.name]);

  static #socketConns = new WeakMap<SdServiceSocket, Map<number, IDbConn>>();

  async #getConf(opt: TDbConnOptions & { configName: string }): Promise<TDbConnConf> {
    const config = (await this.getConfig<Record<string, TDbConnConf | undefined>>("orm"))[
      opt.configName
    ];
    if (config == null) {
      throw new Error(`ORM 설정을 찾을 수 없습니다: ${opt.configName}`);
    }
    return { ...config, ...opt.config };
  }

  #getConn(connId: number): IDbConn {
    if (!this.socketClient) throw new Error("소켓 연결 필요");

    const myConns = SdOrmService.#socketConns.get(this.socketClient);
    const conn = myConns?.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다. (Invalid Connection ID)");
    }

    return conn;
  }

  async getInfo(opt: TDbConnOptions & { configName: string }): Promise<{
    dialect: TDbContextOption["dialect"];
    database?: string;
    schema?: string;
  }> {
    const config = await this.#getConf(opt);
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

  async connect(opt: TDbConnOptions & { configName: string }): Promise<number> {
    if (!this.socketClient) {
      throw new Error("소켓 연결이 필요합니다.");
    }

    // 1. 현재 소켓에 매핑된 DB 연결 목록 가져오기 (없으면 생성)
    let myConns = SdOrmService.#socketConns.get(this.socketClient);
    if (!myConns) {
      myConns = new Map<number, IDbConn>();
      SdOrmService.#socketConns.set(this.socketClient, myConns);
    }

    const config = await this.#getConf(opt);
    const conn = DbConnFactory.create(config);
    await conn.connectAsync();

    const lastConnId = Array.from(myConns.keys()).max() ?? 0;
    const connId = lastConnId + 1;
    myConns.set(connId, conn);

    const closeEventListener = async (/*code: number*/): Promise<void> => {
      // 1001: 클라이언트 창이 닫히거나 RELOAD 될때
      // if (code === 1001) {
      try {
        await conn.closeAsync();
        this.#logger.warn("소켓연결이 끊어져, DB 연결이 중지되었습니다.");
      } catch (err) {
        this.#logger.warn("DB 연결 종료 중 오류 무시됨", err);
      }
      // }
    };
    this.socketClient.on("close", closeEventListener);

    conn.on("close", () => {
      myConns.delete(connId);
      this.socketClient?.off("close", closeEventListener);
    });

    return connId;
  }

  async close(connId: number): Promise<void> {
    try {
      const conn = this.#getConn(connId);
      await conn.closeAsync();
    } catch (err) {
      this.#logger.warn("DB 연결 종료 중 오류 무시됨", err);
    }
  }

  async beginTransaction(connId: number, isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    const conn = this.#getConn(connId);
    await conn.beginTransactionAsync(isolationLevel);
  }

  async commitTransaction(connId: number): Promise<void> {
    const conn = this.#getConn(connId);
    await conn.commitTransactionAsync();
  }

  async rollbackTransaction(connId: number): Promise<void> {
    const conn = this.#getConn(connId);
    await conn.rollbackTransactionAsync();
  }

  async execute(connId: number, queries: string[]): Promise<any[][]> {
    const conn = this.#getConn(connId);
    return await conn.executeAsync(queries);
  }

  async executeDefs(
    connId: number,
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    const conn = this.#getConn(connId);

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
  ): Promise<void> {
    const conn = this.#getConn(connId);
    await conn.bulkInsertAsync(tableName, columnDefs, records);
  }

  async bulkUpsert(
    connId: number,
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    const conn = this.#getConn(connId);
    await conn.bulkUpsertAsync(tableName, columnDefs, records);
  }
}
