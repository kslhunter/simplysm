import type { Pool } from "generic-pool";
import { createPool } from "generic-pool";
import type { DbConn, DbConnConfig } from "./types/db-conn";
import { PooledDbConn } from "./pooled-db-conn";
import { MysqlDbConn } from "./connections/mysql-db-conn";
import { MssqlDbConn } from "./connections/mssql-db-conn";
import { PostgresqlDbConn } from "./connections/postgresql-db-conn";

/**
 * DB connection factory
 *
 * Creates database connection instances and manages pooling.
 * Supports MSSQL, MySQL, and PostgreSQL.
 */

// Cache connection pools by configuration
const poolMap = new Map<string, Pool<DbConn>>();

// Cache last error when pool creation fails (by configKey)
const poolLastErrorMap = new Map<string, Error>();

// Lazy-loaded module cache
const modules: {
  tedious?: typeof import("tedious");
  mysql?: typeof import("mysql2/promise");
  pg?: typeof import("pg");
  pgCopyStreams?: typeof import("pg-copy-streams");
} = {};

/**
 * Create DB connection
 *
 * Acquires and returns a connection from the connection pool.
 * Creates a new pool if one does not exist.
 *
 * @param config - Database connection configuration
 * @returns Pooled DB connection object
 */
export function createDbConn(config: DbConnConfig): Promise<DbConn> {
  // 1. Get pool (create if not exists)
  const { pool, getLastCreateError } = getOrCreatePool(config);

  // 2. Return wrapper object
  return Promise.resolve(new PooledDbConn(pool, config, getLastCreateError));
}

function getOrCreatePool(config: DbConnConfig): {
  pool: Pool<DbConn>;
  getLastCreateError: () => Error | undefined;
} {
  // Convert object to string key (sort nested objects to ensure consistent keys for identical configurations)
  const configKey = JSON.stringify(config, (_, value: unknown) =>
    value != null && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value,
  );

  if (!poolMap.has(configKey)) {
    const pool = createPool<DbConn>(
      {
        create: async () => {
          const conn = await createRawConnection(config);
          await conn.connect();
          return conn;
        },
        destroy: async (conn) => {
          await conn.close(); // Close actual connection when removed from pool
        },
        validate: (conn) => {
          // Check connection status on acquisition (Pool will dispose and recreate if disconnected)
          return Promise.resolve(conn.isConnected);
        },
      },
      {
        min: config.pool?.min ?? 1,
        max: config.pool?.max ?? 10,
        acquireTimeoutMillis: config.pool?.acquireTimeoutMillis ?? 30000,
        idleTimeoutMillis: config.pool?.idleTimeoutMillis ?? 30000,
        testOnBorrow: true, // [IMPORTANT] Whether to run validate when borrowing
      },
    );

    pool.on("factoryCreateError", (err: Error) => {
      poolLastErrorMap.set(configKey, err);
    });

    poolMap.set(configKey, pool);
  }

  return {
    pool: poolMap.get(configKey)!,
    getLastCreateError: () => poolLastErrorMap.get(configKey),
  };
}

async function createRawConnection(config: DbConnConfig): Promise<DbConn> {
  if (config.dialect === "mysql") {
    const mysql = await ensureModule("mysql");
    return new MysqlDbConn(mysql, config);
  } else if (config.dialect === "postgresql") {
    const pg = await ensureModule("pg");
    const pgCopyStreams = await ensureModule("pgCopyStreams");
    return new PostgresqlDbConn(pg, pgCopyStreams, config);
  } else {
    // mssql, mssql-azure
    const tedious = await ensureModule("tedious");
    return new MssqlDbConn(tedious, config);
  }
}

async function ensureModule<K extends keyof typeof modules>(
  name: K,
): Promise<NonNullable<(typeof modules)[K]>> {
  if (modules[name] == null) {
    if (name === "mysql") {
      modules.mysql = await import("mysql2/promise");
    } else if (name === "pg") {
      modules.pg = await import("pg");
    } else if (name === "pgCopyStreams") {
      modules.pgCopyStreams = await import("pg-copy-streams");
    } else {
      modules.tedious = await import("tedious");
    }
  }
  return modules[name]!;
}
