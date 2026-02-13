import consola from "consola";
import { SdError, EventEmitter } from "@simplysm/core-common";
import type { Pool } from "generic-pool";
import type { ColumnMeta, IsolationLevel } from "@simplysm/orm-common";
import { DB_CONN_ERRORS, type DbConn, type DbConnConfig } from "./types/db-conn";

const logger = consola.withTag("pooled-db-conn");

/**
 * 커넥션 풀에서 관리되는 DB 연결 래퍼
 *
 * generic-pool 라이브러리를 사용하여 커넥션 풀링을 지원한다.
 * 실제 물리 연결은 풀에서 획득하고 반환한다.
 */
export class PooledDbConn extends EventEmitter<{ close: void }> implements DbConn {
  // 풀에서 빌려온 실제 물리 커넥션
  private _rawConn?: DbConn;

  constructor(
    private readonly _pool: Pool<DbConn>,
    private readonly _initialConfig: DbConnConfig,
  ) {
    super();
  }

  // [Property] config
  get config(): DbConnConfig {
    return this._rawConn?.config ?? this._initialConfig;
  }

  // [Property] isConnected
  get isConnected(): boolean {
    return this._rawConn?.isConnected ?? false;
  }

  // [Property] isOnTransaction
  get isOnTransaction(): boolean {
    return this._rawConn?.isOnTransaction ?? false;
  }

  /**
   * 풀에서 DB 연결을 획득한다.
   *
   * @throws {SdError} 이미 연결된 상태일 때
   */
  async connect(): Promise<void> {
    if (this._rawConn != null) {
      throw new SdError(DB_CONN_ERRORS.ALREADY_CONNECTED);
    }

    // 1. 풀에서 커넥션 획득
    this._rawConn = await this._pool.acquire();

    // 2. 물리 연결이 (타임아웃 등으로) 끊어질 경우를 대비해 리스너 등록
    //    만약 사용 중에 끊기면 PooledDbConn도 close 이벤트를 발생시켜야 함
    this._rawConn.on("close", this._onRawConnClose);
  }

  /**
   * 풀에 DB 연결을 반환한다. (실제 연결을 종료하지 않음)
   */
  async close(): Promise<void> {
    if (this._rawConn != null) {
      // 1. 트랜잭션 진행 중이면 롤백하여 깨끗한 상태로 풀에 반환
      if (this._rawConn.isOnTransaction) {
        try {
          await this._rawConn.rollbackTransaction();
        } catch (err) {
          // 롤백 실패 시 로그만 남기고 계속 진행 (연결이 이미 끊긴 경우 등)
          logger.warn("풀 반환 시 롤백 실패", err instanceof Error ? err.message : String(err));
        }
      }

      // 2. 리스너 해제 (Pool에 돌아가서 다른 래퍼에 의해 재사용될 때 영향 주지 않도록)
      this._rawConn.off("close", this._onRawConnClose);

      // 3. 풀에 커넥션 반환 (실제로 끊지 않음)
      await this._pool.release(this._rawConn);
      this._rawConn = undefined;

      // 4. 소비자에게 논리적으로 연결이 닫혔음을 알림
      this.emit("close");
    }
  }

  // 물리 연결이 끊겼을 때 처리 핸들러
  private readonly _onRawConnClose = () => {
    // 물리 연결이 끊겼으므로 참조 제거 (Pool에서는 validate 시점에 걸러낼 것임)
    this._rawConn = undefined;
    // 소비자에게 알림
    this.emit("close");
  };

  // --- 아래는 위임(Delegation) 메소드 ---

  /**
   * 트랜잭션 시작
   *
   * @param isolationLevel - 트랜잭션 격리 수준
   * @throws {SdError} 연결이 획득되지 않은 상태일 때
   */
  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
    const conn = this._requireRawConn();
    await conn.beginTransaction(isolationLevel);
  }

  /**
   * 트랜잭션 커밋
   *
   * @throws {SdError} 연결이 획득되지 않은 상태일 때
   */
  async commitTransaction(): Promise<void> {
    const conn = this._requireRawConn();
    await conn.commitTransaction();
  }

  /**
   * 트랜잭션 롤백
   *
   * @throws {SdError} 연결이 획득되지 않은 상태일 때
   */
  async rollbackTransaction(): Promise<void> {
    const conn = this._requireRawConn();
    await conn.rollbackTransaction();
  }

  /**
   * SQL 쿼리 실행
   *
   * @param queries - 실행할 SQL 쿼리 배열
   * @returns 각 쿼리의 결과 배열
   * @throws {SdError} 연결이 획득되지 않은 상태일 때
   */
  async execute(queries: string[]): Promise<unknown[][]> {
    const conn = this._requireRawConn();
    return conn.execute(queries);
  }

  /**
   * 파라미터화된 SQL 쿼리 실행
   *
   * @param query - SQL 쿼리 문자열
   * @param params - 쿼리 파라미터 배열
   * @returns 쿼리 결과 배열
   * @throws {SdError} 연결이 획득되지 않은 상태일 때
   */
  async executeParametrized(query: string, params?: unknown[]): Promise<unknown[][]> {
    const conn = this._requireRawConn();
    return conn.executeParametrized(query, params);
  }

  /**
   * 대량 데이터 삽입 (네이티브 벌크 API 사용)
   *
   * @param tableName - 대상 테이블명
   * @param columnMetas - 컬럼 메타데이터
   * @param records - 삽입할 레코드 배열
   * @throws {SdError} 연결이 획득되지 않은 상태일 때
   */
  async bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void> {
    const conn = this._requireRawConn();
    await conn.bulkInsert(tableName, columnMetas, records);
  }

  private _requireRawConn(): DbConn {
    if (this._rawConn == null) {
      throw new SdError(`${DB_CONN_ERRORS.NOT_CONNECTED} (Pool Connection is not acquired)`);
    }
    return this._rawConn;
  }
}
