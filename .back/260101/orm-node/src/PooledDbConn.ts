import { EventEmitter } from "events";
import type { Pool } from "generic-pool";
import type { IQueryColumnDef } from "@simplysm/orm-common";
import type { IDbConn } from "./IDbConn";
import type { ISOLATION_LEVEL, TDbConnConf } from "./types";

/**
 * 커넥션 풀에서 관리되는 DB 연결 래퍼
 *
 * 실제 물리 연결을 풀에서 빌려와서 사용하고,
 * closeAsync() 호출 시 풀에 반환합니다 (실제 연결을 끊지 않음).
 */
export class PooledDbConn extends EventEmitter implements IDbConn {
  private _rawConn?: IDbConn;

  constructor(
    private readonly _pool: Pool<IDbConn>,
    private readonly _initialConfig: TDbConnConf,
  ) {
    super();
  }

  // ============================================
  // Properties
  // ============================================

  get config(): TDbConnConf {
    return this._rawConn?.config ?? this._initialConfig;
  }

  get isConnected(): boolean {
    return this._rawConn?.isConnected ?? false;
  }

  get isOnTransaction(): boolean {
    return this._rawConn?.isOnTransaction ?? false;
  }

  // ============================================
  // 연결 관리
  // ============================================

  async connectAsync(): Promise<void> {
    if (this._rawConn) {
      throw new Error("이미 연결되어 있습니다.");
    }

    // 풀에서 커넥션 획득
    this._rawConn = await this._pool.acquire();

    // 물리 연결이 끊어질 경우를 대비해 리스너 등록
    this._rawConn.on("close", this._handleRawConnClose);
  }

  async closeAsync(): Promise<void> {
    if (!this._rawConn) {
      return;
    }

    // 리스너 해제 (풀에 반환 후 다른 곳에서 재사용될 때 영향 주지 않도록)
    this._rawConn.off("close", this._handleRawConnClose);

    // 풀에 커넥션 반환 (실제로 끊지 않음)
    await this._pool.release(this._rawConn);
    this._rawConn = undefined;

    // 소비자에게 논리적으로 연결이 닫혔음을 알림
    this.emit("close");
  }

  // ============================================
  // 트랜잭션 (위임)
  // ============================================

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    this._assertConnected();
    await this._rawConn!.beginTransactionAsync(isolationLevel);
  }

  async commitTransactionAsync(): Promise<void> {
    this._assertConnected();
    await this._rawConn!.commitTransactionAsync();
  }

  async rollbackTransactionAsync(): Promise<void> {
    this._assertConnected();
    await this._rawConn!.rollbackTransactionAsync();
  }

  // ============================================
  // 쿼리 실행 (위임)
  // ============================================

  async executeAsync(queries: string[]): Promise<any[][]> {
    this._assertConnected();
    return await this._rawConn!.executeAsync(queries);
  }

  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]> {
    this._assertConnected();
    return await this._rawConn!.executeParametrizedAsync(query, params);
  }

  // ============================================
  // Bulk 연산 (위임)
  // ============================================

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    this._assertConnected();
    await this._rawConn!.bulkInsertAsync(tableName, columnDefs, records);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    this._assertConnected();
    await this._rawConn!.bulkUpsertAsync(tableName, columnDefs, records);
  }

  // ============================================
  // Private 헬퍼
  // ============================================

  private _assertConnected(): void {
    if (!this._rawConn) {
      throw new Error("DB에 연결되어 있지 않습니다. (Pool에서 커넥션이 획득되지 않음)");
    }
  }

  private readonly _handleRawConnClose = (): void => {
    // 물리 연결이 끊겼으므로 참조 제거
    this._rawConn = undefined;
    // 소비자에게 알림
    this.emit("close");
  };
}