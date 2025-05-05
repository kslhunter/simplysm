import {SdOrmServiceClientDbContextExecutor} from "./sd-orm.service-client.db-context-executor";
import {ISdOrmServiceConnectConfig} from "./sd-orm.service-client.interfaces";
import {DbContext} from "@simplysm/sd-orm-common";
import {SdServiceClient} from "../../sd-service-client";

export class SdOrmServiceClientConnector {
  constructor(private readonly _serviceClient: SdServiceClient) {
  }

  async connectAsync<T extends DbContext, R>(config: ISdOrmServiceConnectConfig<T>,
                                                    callback: (conn: T) => Promise<R> | R): Promise<R> {
    const executor = new SdOrmServiceClientDbContextExecutor(this._serviceClient, config.connOpt);
    const info = await executor.getInfoAsync();
    const db = new config.dbContextType(executor, {
      dialect: info.dialect,
      database: config.dbContextOpt?.database ?? info.database,
      schema: config.dbContextOpt?.schema ?? info.schema
    });
    return await db.connectAsync(async () => await callback(db));
  }

  async connectWithoutTransactionAsync<T extends DbContext, R>(config: ISdOrmServiceConnectConfig<T>,
                                                                      callback: (conn: T) => Promise<R> | R): Promise<R> {
    const executor = new SdOrmServiceClientDbContextExecutor(this._serviceClient, config.connOpt);
    const info = await executor.getInfoAsync();
    const db = new config.dbContextType(executor, {
      dialect: info.dialect,
      database: config.dbContextOpt?.database ?? info.database,
      schema: config.dbContextOpt?.schema ?? info.schema
    });
    return await db.connectWithoutTransactionAsync(async () => await callback(db));
  }
}
