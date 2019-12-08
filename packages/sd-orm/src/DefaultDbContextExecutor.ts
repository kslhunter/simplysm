import {IDbConnectionConfig, IDbContextExecutor, IQueryDef} from "./commons";
import {DbConnection} from "./DbConnection";

export class DefaultDbContextExecutor implements IDbContextExecutor {
  private _conn?: DbConnection;

  public constructor(private readonly _configObj: { [key: string]: IDbConnectionConfig }) {
  }

  public async getMainDbNameAsync(configName: string): Promise<string> {
    const config = this._configObj[configName];
    return config.database;
  }

  public async connectAsync(configName: string): Promise<void> {
    const config = this._configObj[configName];
    this._conn = new DbConnection(config);
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

  public async executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(queries: (string | IQueryDef)[], colDefs?: C, joinDefs?: { as: string; isSingle: boolean }[], dataQueryIndex?: number): Promise<undefined extends C ? any[][] : any[]> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    const result = await this._conn.executeAsync(queries);
    if (colDefs && joinDefs) {
      const realResult: any = [];
      for (let i = 0; i < result.length; i++) {
        if ((dataQueryIndex && i === dataQueryIndex) || (!dataQueryIndex && i === 0)) {
          realResult.push(this._conn.generateResult(result[i], colDefs!, joinDefs));
        }
        else {
          realResult.push(result[i]);
        }
      }

      return realResult;
    }
    else {
      return result as any;
    }
  }
}