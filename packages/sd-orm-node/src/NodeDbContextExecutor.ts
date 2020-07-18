import {
  IDbContextExecutor,
  IQueryResultParseOption,
  QueryBuilder,
  SdOrmUtils,
  TQueryDef
} from "@simplysm/sd-orm-common";
import { IDbConnectionConfig } from "./commons";
import { IDbConnection } from "./IDbConnection";
import { DbConnectionFactory } from "./DbConnectionFactory";

export class NodeDbContextExecutor implements IDbContextExecutor {
  private _conn?: IDbConnection;
  public dialect: "mysql" | "mssql";

  public constructor(private readonly _config: IDbConnectionConfig) {
    this.dialect = this._config.dialect ?? "mssql";
  }

  public async connectAsync(): Promise<void> {
    this._conn = DbConnectionFactory.create(this._config);
    await this._conn.connectAsync();
  }

  public async beginTransactionAsync(): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._conn.beginTransactionAsync();
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

  public async executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    const result = await this._conn.executeAsync(
      defs.map(def => new QueryBuilder(this._config.dialect).query(def))
    );
    return result.map((item, i) => SdOrmUtils.parseQueryResult(item, options ? options[i] : undefined));
  }
}
