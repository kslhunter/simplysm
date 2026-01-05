import type { Pool } from "generic-pool";
import { createPool } from "generic-pool";
import type { IDbConn } from "./IDbConn";
import type { TDbConnConf } from "./types";
import { MysqlDbConn } from "./connections/MysqlDbConn";
import { MssqlDbConn } from "./connections/MssqlDbConn";
import { PostgresqlDbConn } from "./connections/PostgresqlDbConn";
import { PooledDbConn } from "./PooledDbConn";

/**
 * DB 커넥션 팩토리
 *
 * 설정별로 커넥션 풀을 관리하고, 풀에서 커넥션을 빌려주는 래퍼를 반환합니다.
 */
export class DbConnFactory {
  // 설정별 커넥션 풀 캐싱
  private static readonly _poolMap = new Map<string, Pool<IDbConn>>();

  // 동적 모듈 캐싱
  private static readonly _modules: {
    tedious?: typeof import("tedious");
    mysql?: typeof import("mysql2/promise");
    pg?: typeof import("pg");
  } = {};

  /**
   * DB 커넥션을 생성합니다.
   * 풀링이 적용된 래퍼 커넥션을 반환합니다.
   */
  static async createAsync(config: TDbConnConf): Promise<IDbConn> {
    const pool = this._getOrCreatePool(config);
    return await Promise.resolve(new PooledDbConn(pool, config));
  }

  /**
   * 풀링 없이 직접 커넥션을 생성합니다.
   * 테스트나 특수한 경우에 사용합니다.
   */
  static async createRawAsync(config: TDbConnConf): Promise<IDbConn> {
    return await this._createRawConnectionAsync(config);
  }

  /**
   * 모든 풀을 정리합니다.
   */
  static async drainAllAsync(): Promise<void> {
    for (const [, pool] of this._poolMap) {
      await pool.drain();
      await pool.clear();
    }
    this._poolMap.clear();
  }

  // ============================================
  // Private 헬퍼
  // ============================================

  private static _getOrCreatePool(config: TDbConnConf): Pool<IDbConn> {
    // 객체를 키로 쓰기 위해 문자열 변환
    const configKey = JSON.stringify(config);

    const existingPool = this._poolMap.get(configKey);
    if (existingPool) {
      return existingPool;
    }

    const pool = createPool<IDbConn>(
      {
        create: async () => {
          const conn = await this._createRawConnectionAsync(config);
          await conn.connectAsync();
          return conn;
        },
        destroy: async (conn) => {
          await conn.closeAsync();
        },
        validate: (conn) => {
          // 획득 시 연결 상태 확인 (끊겨있으면 Pool이 폐기하고 새로 만듦)
          return Promise.resolve(conn.isConnected);
        },
      },
      {
        min: 1,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        testOnBorrow: true, // 빌려줄 때 validate 실행
      },
    );

    this._poolMap.set(configKey, pool);
    return pool;
  }

  private static async _createRawConnectionAsync(config: TDbConnConf): Promise<IDbConn> {
    switch (config.dialect) {
      case "mysql": {
        const mysql = await this._loadModuleAsync("mysql");
        return new MysqlDbConn(mysql, config);
      }
      case "mssql": {
        const tedious = await this._loadModuleAsync("tedious");
        return new MssqlDbConn(tedious, config);
      }
      case "postgresql": {
        const pg = await this._loadModuleAsync("pg");
        return new PostgresqlDbConn(pg, config);
      }
    }
  }

  private static async _loadModuleAsync<K extends keyof typeof this._modules>(
    name: K,
  ): Promise<NonNullable<(typeof this._modules)[K]>> {
    if (!this._modules[name]) {
      switch (name) {
        case "mysql":
          this._modules.mysql = await import("mysql2/promise");
          break;
        case "tedious":
          this._modules.tedious = await import("tedious");
          break;
        case "pg":
          this._modules.pg = await import("pg");
          break;
      }
    }
    return this._modules[name]!;
  }
}
