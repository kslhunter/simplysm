import {SdServiceDbContextExecutor} from "./SdOrmServiceDbContextExecutor";
import {ISdOrmServiceConnectConfig} from "./ISdOrmServiceConnectConfig";
import {DbContext} from "@simplysm/sd-orm-common";
import {SdServiceClient} from "../../SdServiceClient";

export class SdOrmServiceConnector {
  public constructor(private readonly _serviceClient: SdServiceClient) {
  }

  public async connectAsync<T extends DbContext, R>(config: ISdOrmServiceConnectConfig<T>,
                                                    callback: (conn: T) => Promise<R> | R): Promise<R> {
    const executor = new SdServiceDbContextExecutor(this._serviceClient, config.connOpt);
    const info = await executor.getInfoAsync();
    const db = new config.dbContextType(executor, {
      dialect: info.dialect,
      database: config.dbContextOpt?.database ?? info.database,
      schema: config.dbContextOpt?.schema ?? info.schema
    });
    return await db.connectAsync(async () => await callback(db));
  }

  public async connectWithoutTransactionAsync<T extends DbContext, R>(config: ISdOrmServiceConnectConfig<T>,
                                                                      callback: (conn: T) => Promise<R> | R): Promise<R> {
    const executor = new SdServiceDbContextExecutor(this._serviceClient, config.connOpt);
    const info = await executor.getInfoAsync();
    const db = new config.dbContextType(executor, {
      dialect: info.dialect,
      database: config.dbContextOpt?.database ?? info.database,
      schema: config.dbContextOpt?.schema ?? info.schema
    });
    return await db.connectWithoutTransactionAsync(async () => await callback(db));
  }
}
