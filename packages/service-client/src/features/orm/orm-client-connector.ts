import { OrmClientDbContextExecutor } from "./orm-client-db-context-executor";
import type { OrmConnectOptions } from "./orm-connect-options";
import { createDbContext, type DbContextDef, type DbContextInstance } from "@simplysm/orm-common";
import type { ServiceClient } from "../../service-client";

export interface OrmClientConnector {
  connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectOptions<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectOptions<TDef>,
    callback: (db: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
}

export function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector {
  async function _createConfiguredDb<TDef extends DbContextDef<any, any, any>>(
    config: OrmConnectOptions<TDef>,
  ): Promise<DbContextInstance<TDef>> {
    const executor = new OrmClientDbContextExecutor(serviceClient, config.connOpt);
    const info = await executor.getInfo();
    const database = config.dbContextOpt?.database ?? info.database;
    if (database == null || database === "") {
      throw new Error("database는 필수입니다.");
    }
    return createDbContext(config.dbContextDef, executor, {
      database,
      schema: config.dbContextOpt?.schema ?? info.schema,
    });
  }

  async function connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectOptions<TDef>,
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
          throw new Error("경고! 연관된 작업으로 인해 작업이 거부되었습니다. 후속 작업을 확인해 주세요.", { cause: err });
        }

        throw err;
      }
    });
  }

  async function connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectOptions<TDef>,
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
