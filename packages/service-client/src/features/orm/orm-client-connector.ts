import { OrmClientDbContextExecutor } from "./orm-client-db-context-executor";
import type { OrmConnectConfig } from "./orm-connect-config";
import { createDbContext, type DbContextDef, type DbContextInstance } from "@simplysm/orm-common";
import type { ServiceClient } from "../../service-client";

export interface OrmClientConnector {
  connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (conn: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (conn: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R>;
}

export function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector {
  async function connect<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (conn: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R> {
    const executor = new OrmClientDbContextExecutor(serviceClient, config.connOpt);
    const info = await executor.getInfo();
    const database = config.dbContextOpt?.database ?? info.database;
    if (database == null || database === "") {
      throw new Error("Database name is required");
    }
    const db = createDbContext(config.dbContextDef, executor, {
      database,
      schema: config.dbContextOpt?.schema ?? info.schema,
    });
    return db.connect(async () => {
      try {
        return await callback(db);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("a parent row: a foreign key constraint") ||
            err.message.includes("conflicted with the REFERENCE"))
        ) {
          err.message = "경고! 연결된 작업에 의한 처리 거부. 후속작업 확인요망";
        }

        throw err;
      }
    });
  }

  async function connectWithoutTransaction<TDef extends DbContextDef<any, any, any>, R>(
    config: OrmConnectConfig<TDef>,
    callback: (conn: DbContextInstance<TDef>) => Promise<R> | R,
  ): Promise<R> {
    const executor = new OrmClientDbContextExecutor(serviceClient, config.connOpt);
    const info = await executor.getInfo();
    const database = config.dbContextOpt?.database ?? info.database;
    if (database == null || database === "") {
      throw new Error("Database name is required");
    }
    const db = createDbContext(config.dbContextDef, executor, {
      database,
      schema: config.dbContextOpt?.schema ?? info.schema,
    });
    return db.connectWithoutTransaction(async () => callback(db));
  }

  return {
    connect,
    connectWithoutTransaction,
  };
}
