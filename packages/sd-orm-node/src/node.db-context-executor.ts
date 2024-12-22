import {
  type IDbConn,
  type IDbContextExecutor,
  type IQueryColumnDef,
  type IQueryResultParseOption,
  type ISOLATION_LEVEL,
  QueryBuilder,
  SdOrmUtils,
  type TDbConnConf,
  type TDbContextOption,
  type TQueryDef
} from "@simplysm/sd-orm-common";
import {DbConnFactory} from "./db-conn.factory";

export class NodeDbContextExecutor implements IDbContextExecutor {
  private _conn?: IDbConn;

  public constructor(private readonly _config: TDbConnConf) {
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getInfoAsync(): Promise<{
    dialect: TDbContextOption["dialect"];
    database?: string;
    schema?: string;
  }> {
    return {
      dialect: this._config.dialect,
      ...this._config.dialect === "sqlite" ? {} : {
        database: this._config.database,
        schema: this._config.schema
      }
    };
  }

  public async connectAsync(): Promise<void> {
    this._conn = await DbConnFactory.createAsync(this._config);
    await this._conn.connectAsync();
  }

  public async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }
    await this._conn.beginTransactionAsync(isolationLevel);
  }

  public async commitTransactionAsync(): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._conn.commitTransactionAsync();
  }

  public async rollbackTransactionAsync(): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._conn.rollbackTransactionAsync();
  }

  public async closeAsync(): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._conn.closeAsync();
  }

  public async executeAsync(queries: string[]): Promise<any[][]> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._conn.executeAsync(queries);
  }

  public async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._conn.bulkInsertAsync(tableName, columnDefs, records);
  }


  public async bulkUpsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._conn.bulkUpsertAsync(tableName, columnDefs, records);
  }

  public async executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    // 가져올데이터가 없는것으로 옵션 설정을 했을때, 하나의 쿼리로 한번의 요청보냄
    if (options && options.every((item) => item == null)) {
      return await this._conn.executeAsync([defs.map((def) => new QueryBuilder(this._conn!.config.dialect).query(def)).join("\n")]);
    }
    else {
      const result = await this._conn.executeAsync(defs.map((def) => new QueryBuilder(this._conn!.config.dialect).query(def)));
      return result.map((item, i) => SdOrmUtils.parseQueryResult(item, options ? options[i] : undefined));
    }
  }
}
