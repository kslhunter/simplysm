import {
  IDbConn,
  IDbContextExecutor,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  QueryBuilder,
  SdOrmUtils,
  TDbConnConf,
  TDbContextOption,
  TQueryDef,
} from "@simplysm/sd-orm-common";
import { DbConnFactory } from "./db-conn.factory";

export class NodeDbContextExecutor implements IDbContextExecutor {
  #conn?: IDbConn;

  constructor(private readonly _config: TDbConnConf) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async getInfoAsync(): Promise<{
    dialect: TDbContextOption["dialect"];
    database?: string;
    schema?: string;
  }> {
    return {
      dialect: this._config.dialect,
      ...(this._config.dialect === "sqlite"
        ? {}
        : {
            database: this._config.database,
            schema: this._config.schema,
          }),
    };
  }

  async connectAsync(): Promise<void> {
    this.#conn = await DbConnFactory.createAsync(this._config);
    await this.#conn.connectAsync();
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (!this.#conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }
    await this.#conn.beginTransactionAsync(isolationLevel);
  }

  async commitTransactionAsync(): Promise<void> {
    if (!this.#conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.#conn.commitTransactionAsync();
  }

  async rollbackTransactionAsync(): Promise<void> {
    if (!this.#conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.#conn.rollbackTransactionAsync();
  }

  async closeAsync(): Promise<void> {
    if (!this.#conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.#conn.closeAsync();
  }

  async executeAsync(queries: string[]): Promise<any[][]> {
    if (!this.#conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this.#conn.executeAsync(queries);
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (!this.#conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.#conn.bulkInsertAsync(tableName, columnDefs, records);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (!this.#conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this.#conn.bulkUpsertAsync(tableName, columnDefs, records);
  }

  async executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    if (!this.#conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    // 가져올데이터가 없는것으로 옵션 설정을 했을때, 하나의 쿼리로 한번의 요청보냄
    if (options && options.every((item) => item == null)) {
      return await this.#conn.executeAsync([
        defs.map((def) => new QueryBuilder(this.#conn!.config.dialect).query(def)).join("\n"),
      ]);
    } else {
      const queries = defs.mapMany((def) => {
        const query = new QueryBuilder(this.#conn!.config.dialect).query(def);
        return Array.isArray(query) ? query : [query];
      });
      const result = await this.#conn.executeAsync(queries);
      return result.map((item, i) => SdOrmUtils.parseQueryResult(item, options ? options[i] : undefined));
    }
  }
}
