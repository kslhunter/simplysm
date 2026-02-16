import type { Pool } from "generic-pool";
import { createPool } from "generic-pool";
import type { DbConn, DbConnConfig } from "./types/db-conn";
import { PooledDbConn } from "./pooled-db-conn";
import { MysqlDbConn } from "./connections/mysql-db-conn";
import { MssqlDbConn } from "./connections/mssql-db-conn";
import { PostgresqlDbConn } from "./connections/postgresql-db-conn";

/**
 * DB 연결 팩토리
 *
 * 데이터베이스 연결 인스턴스를 생성하고 풀링을 관리한다.
 * MSSQL, MySQL, PostgreSQL을 지원한다.
 */

// 설정별 커넥션 풀 캐싱
const poolMap = new Map<string, Pool<DbConn>>();

// 풀 생성 실패 시 마지막 에러 캐싱 (configKey 기준)
const poolLastErrorMap = new Map<string, Error>();

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
 * 커넥션 풀에서 연결을 획득하여 반환한다.
 * 풀이 없는 경우 새로 생성한다.
 *
 * @param config - 데이터베이스 연결 설정
 * @returns 풀링된 DB 연결 객체
 */
export function createDbConn(config: DbConnConfig): Promise<DbConn> {
  // 1. 풀 가져오기 (없으면 생성)
  const { pool, getLastCreateError } = getOrCreatePool(config);

  // 2. 래퍼 객체 반환
  return Promise.resolve(new PooledDbConn(pool, config, getLastCreateError));
}

function getOrCreatePool(config: DbConnConfig): { pool: Pool<DbConn>; getLastCreateError: () => Error | undefined } {
  // 객체를 키로 쓰기 위해 문자열 변환 (중첩 객체도 정렬하여 동일 설정의 일관된 키 보장)
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
          await conn.close(); // 풀에서 제거될 때 실제 연결 종료
        },
        validate: (conn) => {
          // 획득 시 연결 상태 확인 (끊겨있으면 Pool이 폐기하고 새로 만듦)
          return Promise.resolve(conn.isConnected);
        },
      },
      {
        min: config.pool?.min ?? 1,
        max: config.pool?.max ?? 10,
        acquireTimeoutMillis: config.pool?.acquireTimeoutMillis ?? 30000,
        idleTimeoutMillis: config.pool?.idleTimeoutMillis ?? 30000,
        testOnBorrow: true, // [중요] 빌려줄 때 validate 실행 여부
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
    return new PostgresqlDbConn(pg, pgCopyStreams.from, config);
  } else {
    // mssql, mssql-azure
    const tedious = await ensureModule("tedious");
    return new MssqlDbConn(tedious, config);
  }
}

async function ensureModule<K extends keyof typeof modules>(name: K): Promise<NonNullable<(typeof modules)[K]>> {
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
