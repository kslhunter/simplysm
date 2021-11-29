import {
  IDbConnectionConfig,
  IDbContextExecutor,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  QueryBuilder,
  SdOrmUtil,
  TDbDialect,
  TQueryDef
} from "@simplysm/sd-orm-common";
import { IDbConnection } from "./IDbConnection";
import { DbConnectionFactory } from "./DbConnectionFactory";

export class NodeDbContextExecutor implements IDbContextExecutor {
  private _conn?: IDbConnection;

  public constructor(private readonly _config: IDbConnectionConfig) {
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getInfoAsync(): Promise<{
    dialect: TDbDialect;
    database?: string;
    schema?: string;
  }> {
    return {
      dialect: this._config.dialect,
      database: this._config.database,
      schema: this._config.schema
    };
  }

  public async connectAsync(): Promise<void> {
    this._conn = DbConnectionFactory.create(this._config);
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

  public async executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    const result = await this._conn.executeAsync(
      defs.map((def) => new QueryBuilder(this._conn!.config.dialect).query(def))
    );
    return result.map((item, i) => SdOrmUtil.parseQueryResult(item, options ? options[i] : undefined));
  }
}
