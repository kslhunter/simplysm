import { Injectable, Type } from "@angular/core";
import {
  DbContext,
  IDbContextExecutor,
  IQueryColumnDef,
  IQueryResultParseOption,
  ISOLATION_LEVEL,
  TQueryDef
} from "@simplysm/sd-orm-common";
import { SdServiceClient } from "@simplysm/sd-service-browser";
import { SdServiceFactoryProvider } from "./SdServiceFactoryProvider";

@Injectable({ providedIn: null })
export class SdOrmServiceProvider {
  public constructor(private readonly _service: SdServiceFactoryProvider) {
  }

  public async connectAsync<T extends DbContext, R>(config: ISdOrmServiceProviderConnConfig<T>,
                                                    callback: (conn: T) => Promise<R> | R): Promise<R> {
    const service = this._service.get(config.serviceKey);
    /*try {
      await Wait.true(() => service.connected, undefined, 5000);
    }
    catch (err) {
      throw new Error("ORM 서비스에 연결할 수 없습니다.");
    }*/

    const executor = new SdServiceDbContextExecutor(service.client, config.connOpt);
    const info = await executor.getInfoAsync();
    const db = new config.dbContextType(executor, {
      dialect: info.dialect,
      database: config.dbContextOpt?.database ?? info.database,
      schema: config.dbContextOpt?.schema ?? info.schema
    });
    return await db.connectAsync(async () => await callback(db));
  }

  public async connectWithoutTransactionAsync<T extends DbContext, R>(config: ISdOrmServiceProviderConnConfig<T>,
                                                                      callback: (conn: T) => Promise<R> | R): Promise<R> {
    const service = this._service.get(config.serviceKey);
    /*try {
      await Wait.true(() => service.connected, undefined, 5000);
    }
    catch (err) {
      throw new Error("ORM 서비스에 연결할 수 없습니다.");
    }*/

    const executor = new SdServiceDbContextExecutor(service.client, config.connOpt);
    const info = await executor.getInfoAsync();
    const db = new config.dbContextType(executor, {
      dialect: info.dialect,
      database: config.dbContextOpt?.database ?? info.database,
      schema: config.dbContextOpt?.schema ?? info.schema
    });
    return await db.connectWithoutTransactionAsync(async () => await callback(db));
  }
}

export interface ISdOrmServiceProviderConnConfig<T> {
  serviceKey: string;
  dbContextType: Type<T>;
  connOpt: Record<string, any>;
  dbContextOpt?: {
    database: string;
    schema: string;
  };
}

export class SdServiceDbContextExecutor implements IDbContextExecutor {
  private _connId?: number;

  public constructor(private readonly _client: SdServiceClient,
                     private readonly _opt: Record<string, any>) {
  }

  public async getInfoAsync(): Promise<{
    dialect: "mssql" | "mysql" | "mssql-azure";
    database?: string;
    schema?: string;
  }> {
    return await this._client.sendAsync("SdOrmService.getInfoAsync", [this._opt]);
  }

  public async connectAsync(): Promise<void> {
    this._connId = await this._client.sendAsync("SdOrmService.connectAsync", [this._opt]);
  }

  public async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService.beginTransactionAsync", [this._connId, isolationLevel]);
  }

  public async commitTransactionAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService.commitTransactionAsync", [this._connId]);
  }

  public async rollbackTransactionAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService.rollbackTransactionAsync", [this._connId]);
  }

  public async closeAsync(): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await this._client.sendAsync("SdOrmService.closeAsync", [this._connId]);
  }

  public async executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService.executeDefsAsync", [this._connId, defs, options]);
  }

  public async executeAsync(queries: string[]): Promise<any[][]> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService.executeAsync", [this._connId, queries]);
  }

  public async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
    if (this._connId === undefined) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await this._client.sendAsync("SdOrmService.bulkInsertAsync", [this._connId, tableName, columnDefs, records]);
  }
}
