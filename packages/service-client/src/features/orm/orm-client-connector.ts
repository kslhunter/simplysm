import { OrmClientDbContextExecutor } from "./orm-client-db-context-executor";
import type { OrmConnectConfig } from "./orm-connect-config";
import { createDbContext, type DbContextDef, type DbContextInstance } from "@simplysm/orm-common";
import type { ServiceClient } from "../../service-client";

export interface OrmClientConnector {
  connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
}

export function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector {
  async function _createConfiguredDb<TDef extends DbContextDef<any, any, any>>(
    config: OrmConnectConfig<TDef>,
  ): Promise<DbContextInstance<TDef>> {
    const executor = new OrmClientDbContextExecutor(serviceClient, config.connOpt);
    const info = await executor.getInfo();
    const database = config.dbContextOpt?.database ?? info.database;
    if (database == null || database === "") {
      throw new Error("database is required");
    }
    return createDbContext(config.dbContextDef, executor, {
      database,
      schema: config.dbContextOpt?.schema ?? info.schema,
    });
  }

  async function connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R> {
    const db = await _createConfiguredDb(config);
    return db.connect(async () => {
      try {
        return await callback(db);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("a parent row: a foreign key constraint") ||
            err.message.includes("conflicted with the REFERENCE"))
        ) {
          throw new Error("Warning! Operation rejected due to related operations. Please check subsequent operations.", { cause: err });
        }

        throw err;
      }
    });
  }

  async function connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R> {
    const db = await _createConfiguredDb(config);
    return db.connectWithoutTransaction(async () => callback(db));
  }

  return {
    connect,
    connectWithoutTransaction,
  };
}
