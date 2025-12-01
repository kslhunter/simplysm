import { IDbConn, TDbConnConf } from "@simplysm/sd-orm-common";
import { SqliteDbConn } from "./connections/SqliteDbConn";
import { MysqlDbConn } from "./connections/MysqlDbConn";
import { MssqlDbConn } from "./connections/MssqlDbConn";
import { createPool, Pool } from "generic-pool";
import { PooledDbConn } from "./PooledDbConn";

export class DbConnFactory {
  // 설정별 커넥션 풀 캐싱
  private static readonly _poolMap = new Map<string, Pool<IDbConn>>();

  static create(config: TDbConnConf): IDbConn {
    // SQLite는 파일 락 등의 이유로 풀링에서 제외 (기존대로 새 인스턴스 반환)
    if (config.dialect === "sqlite") {
      return new SqliteDbConn(config);
    }

    // 1. 풀 가져오기 (없으면 생성)
    const pool = this.#getOrCreatePool(config);

    // 2. 래퍼 객체 반환
    return new PooledDbConn(pool, config);
  }

  static #getOrCreatePool(config: TDbConnConf): Pool<IDbConn> {
    // 객체를 키로 쓰기 위해 문자열 변환
    const configKey = JSON.stringify(config);

    if (!this._poolMap.has(configKey)) {
      const pool = createPool<IDbConn>(
        {
          create: async () => {
            const conn = this.#createRawConnection(config);
            await conn.connectAsync(); // 풀에 담기 전 미리 연결
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

  static #createRawConnection(config: TDbConnConf): IDbConn {
    if (config.dialect === "sqlite") {
      return new SqliteDbConn(config);
    } else if (config.dialect === "mysql") {
      return new MysqlDbConn(config);
    } else {
      return new MssqlDbConn(config);
    }
  }
}
