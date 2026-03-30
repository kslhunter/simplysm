import type { DbConn, DbConnConfig } from "./types/db-conn";
import { MysqlDbConn } from "./connections/mysql-db-conn";
import { MssqlDbConn } from "./connections/mssql-db-conn";
import { PostgresqlDbConn } from "./connections/postgresql-db-conn";

/**
 * DB 연결 팩토리
 *
 * 데이터베이스 연결 인스턴스를 생성한다.
 * MSSQL, MySQL, PostgreSQL을 지원한다.
 */

// 지연 로딩 모듈 캐시
const modules: {
  tedious?: typeof import("tedious");
  mysql?: typeof import("mysql2/promise");
  pg?: typeof import("pg");
  pgCopyStreams?: typeof import("pg-copy-streams");
} = {};

/**
 * DB 연결 생성
 *
 * @param config - 데이터베이스 연결 설정
 * @returns DB 연결 객체 (아직 연결되지 않음 - connect()를 별도로 호출해야 함)
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
