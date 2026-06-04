import { OrmClientDbContextExecutor } from "./orm-client-db-context-executor";
import type { OrmConnectOptions } from "./orm-connect-options";
import { type DbContext } from "@simplysm/orm-common";
import type { ServiceClient } from "../../service-client";
import { SdError } from "@simplysm/core-common";

export interface OrmClientConnector {
  connect<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R>;
  connectWithoutTransaction<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R>;
}

export function createOrmClientConnector(serviceClient: ServiceClient): OrmClientConnector {
  async function _createConfiguredDb<T extends DbContext>(
    config: OrmConnectOptions<T>,
  ): Promise<T> {
    const executor = new OrmClientDbContextExecutor(serviceClient, config.connOpt);
    const info = await executor.getInfo();
    const database = config.dbContextOpt?.database ?? info.database;
    if (database == null || database === "") {
      throw new Error("database는 필수입니다.");
    }
    return new config.DbClass(executor, {
      database,
      schema: config.dbContextOpt?.schema ?? info.schema,
    });
  }

  async function connect<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R> {
    const db = await _createConfiguredDb(config);
    return db.connect(async () => {
      try {
        return await callback(db);
      } catch (err) {
        if (
          err instanceof Error &&
          (err.message.includes("a parent row: a foreign key constraint") || // MySQL
            err.message.includes("conflicted with the REFERENCE") || // MSSQL
            err.message.includes("violates foreign key constraint")) // PostgreSQL
        ) {
          throw new SdError(
            err,
            "경고! 연관된 작업으로 인해 작업이 거부되었습니다. 후속 작업을 확인해 주세요.",
          );
        }

        throw err;
      }
    });
  }

  async function connectWithoutTransaction<T extends DbContext, R>(
    config: OrmConnectOptions<T>,
    callback: (db: T) => Promise<R> | R,
  ): Promise<R> {
    const db = await _createConfiguredDb(config);
    return db.connectWithoutTransaction(async () => callback(db));
  }

  return {
    connect,
    connectWithoutTransaction,
  };
}
