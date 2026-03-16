import type { DbConn, DbConnConfig } from "./types/db-conn";
import { MysqlDbConn } from "./connections/mysql-db-conn";
import { MssqlDbConn } from "./connections/mssql-db-conn";
import { PostgresqlDbConn } from "./connections/postgresql-db-conn";

/**
 * DB connection factory
 *
 * Creates database connection instances.
 * Supports MSSQL, MySQL, and PostgreSQL.
 */

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
 * @param config - Database connection configuration
 * @returns DB connection object (not yet connected — call connect() separately)
 */
export async function createDbConn(config: DbConnConfig): Promise<DbConn> {
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
