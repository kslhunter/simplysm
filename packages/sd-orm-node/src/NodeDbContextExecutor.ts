import {
  IDbContextExecutor,
  IQueryResultParseOption,
  QueryBuilder,
  QueryUtils,
  TQueryDef
} from "@simplysm/sd-orm-common";
import {DbConnection} from "./DbConnection";
import {IDbConnectionConfig} from "./commons";

export class NodeDbContextExecutor implements IDbContextExecutor {
  private _conn?: DbConnection;

  public constructor(private readonly _config: IDbConnectionConfig) {
  }

  public async connectAsync(): Promise<void> {
    this._conn = new DbConnection(this._config);
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
      defs.map(def => QueryBuilder.query(def))
    );
    return result.map((item, i) => QueryUtils.parseQueryResult(item, options ? options[i] : undefined));
  }
}
