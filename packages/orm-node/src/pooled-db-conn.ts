import { EventEmitter } from "events";
import type { Pool } from "generic-pool";
import type { ColumnMeta, IsolationLevel } from "@simplysm/orm-common";
import type { DbConnConfig, IDbConn } from "./types/db-conn";

/**
 * 커넥션 풀에서 관리되는 DB 연결 래퍼
 *
 * generic-pool 라이브러리를 사용하여 커넥션 풀링을 지원합니다.
 * 실제 물리 연결은 풀에서 획득하고 반환합니다.
 */
export class PooledDbConn extends EventEmitter implements IDbConn {
  // 풀에서 빌려온 실제 물리 커넥션
  private _rawConn?: IDbConn;

  constructor(
    private readonly _pool: Pool<IDbConn>,
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

  // [Method] connectAsync
  async connectAsync(): Promise<void> {
    if (this._rawConn != null) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    // 1. 풀에서 커넥션 획득
    this._rawConn = await this._pool.acquire();

    // 2. 물리 연결이 (타임아웃 등으로) 끊어질 경우를 대비해 리스너 등록
    //    만약 사용 중에 끊기면 PooledDbConn도 close 이벤트를 발생시켜야 함
    this._rawConn.on("close", this._onRawConnClose);
  }

  // [Method] closeAsync
  async closeAsync(): Promise<void> {
    if (this._rawConn != null) {
      // 1. 리스너 해제 (Pool에 돌아가서 다른 래퍼에 의해 재사용될 때 영향 주지 않도록)
      this._rawConn.off("close", this._onRawConnClose);

      // 2. 풀에 커넥션 반환 (실제로 끊지 않음)
      await this._pool.release(this._rawConn);
      this._rawConn = undefined;

      // 3. 소비자에게 논리적으로 연결이 닫혔음을 알림
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

  async beginTransactionAsync(isolationLevel?: IsolationLevel): Promise<void> {
    this._checkConnected();
    await this._rawConn!.beginTransactionAsync(isolationLevel);
  }

  async commitTransactionAsync(): Promise<void> {
    this._checkConnected();
    await this._rawConn!.commitTransactionAsync();
  }

  async rollbackTransactionAsync(): Promise<void> {
    this._checkConnected();
    await this._rawConn!.rollbackTransactionAsync();
  }

  async executeAsync(queries: string[]): Promise<unknown[][]> {
    this._checkConnected();
    return await this._rawConn!.executeAsync(queries);
  }

  async executeParametrizedAsync(query: string, params?: unknown[]): Promise<unknown[][]> {
    this._checkConnected();
    return await this._rawConn!.executeParametrizedAsync(query, params);
  }

  async bulkInsertAsync(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void> {
    this._checkConnected();
    await this._rawConn!.bulkInsertAsync(tableName, columnMetas, records);
  }

  private _checkConnected() {
    if (this._rawConn == null) {
      throw new Error("'Connection'이 연결되어있지 않습니다. (Pool Connection is not acquired)");
    }
  }
}
