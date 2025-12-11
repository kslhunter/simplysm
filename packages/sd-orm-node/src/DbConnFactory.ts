import { IDbConn, TDbConnConf } from "@simplysm/sd-orm-common";
import { SqliteDbConn } from "./connections/SqliteDbConn";
import { MysqlDbConn } from "./connections/MysqlDbConn";
import { MssqlDbConn } from "./connections/MssqlDbConn";
import { createPool, Pool } from "generic-pool";
import { PooledDbConn } from "./PooledDbConn";

export class DbConnFactory {
  // 설정별 커넥션 풀 캐싱
  private static readonly _poolMap = new Map<string, Pool<IDbConn>>();

  static async createAsync(config: TDbConnConf): Promise<IDbConn> {
    // SQLite는 파일 락 등의 이유로 풀링에서 제외 (기존대로 새 인스턴스 반환)
    if (config.dialect === "sqlite") {
      const sqlite = await this._ensureModuleAsync("sqlite");
      return new SqliteDbConn(sqlite, config);
    }

    // 1. 풀 가져오기 (없으면 생성)
    const pool = this._getOrCreatePool(config);

    // 2. 래퍼 객체 반환
    return new PooledDbConn(pool, config);
  }

  private static _getOrCreatePool(config: TDbConnConf): Pool<IDbConn> {
    // 객체를 키로 쓰기 위해 문자열 변환
    const configKey = JSON.stringify(config);

    if (!this._poolMap.has(configKey)) {
      const pool = createPool<IDbConn>(
        {
          create: async () => {
            const conn = await this._createRawConnectionAsync(config);
            await conn.connectAsync();
            return conn;
          },
          destroy: async (conn) => {
            await conn.closeAsync(); // 풀에서 제거될 때 실제 연결 종료
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
          testOnBorrow: true, // [중요] 빌려줄 때 validate 실행 여부
        },
      );

      this._poolMap.set(configKey, pool);
    }

    return this._poolMap.get(configKey)!;
  }

  private static async _createRawConnectionAsync(config: TDbConnConf): Promise<IDbConn> {
    if (config.dialect === "sqlite") {
      const sqlite = await this._ensureModuleAsync("sqlite");
      return new SqliteDbConn(sqlite, config);
    } else if (config.dialect === "mysql") {
      const mysql = await this._ensureModuleAsync("mysql");
      return new MysqlDbConn(mysql, config);
    } else {
      const tedious = await this._ensureModuleAsync("tedious");
      return new MssqlDbConn(tedious, config);
    }
  }

  private static readonly _modules: {
    tedious?: typeof import("tedious");
    mysql?: typeof import("mysql2/promise");
    sqlite?: typeof import("sqlite3");
  } = {};

  private static async _ensureModuleAsync<K extends keyof typeof this._modules>(
    name: K,
  ): Promise<NonNullable<(typeof this._modules)[K]>> {
    if (!this._modules[name]) {
      if (name === "mysql") {
        this._modules.mysql = await import("mysql2/promise");
      } else if (name === "sqlite") {
        this._modules.sqlite = await import("sqlite3");
      } else {
        this._modules.tedious = await import("tedious");
      }
    }
    return this._modules[name]!;
  }
}
