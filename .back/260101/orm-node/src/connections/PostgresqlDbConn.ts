import { SdLogger } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import { StringUtils } from "@simplysm/sd-core-common";
import type { IQueryColumnDef } from "@simplysm/orm-common";
import type { IDbConn } from "../IDbConn";
import type { IPostgresqlDbConnConf, ISOLATION_LEVEL } from "../types";
import { QueryValueConverter } from "../utils/QueryValueConverter";
import type { Pool, PoolClient } from "pg";

export class PostgresqlDbConn extends EventEmitter implements IDbConn {
  private readonly _logger = SdLogger.get(["simplysm", "orm-node", this.constructor.name]);
  private readonly _queryTimeout = 5 * 60 * 1000; // 5분
  private readonly _valueConverter = new QueryValueConverter("postgresql");

  private _pool?: Pool;
  private _client?: PoolClient;
  private _idleTimeout?: NodeJS.Timeout;

  isConnected = false;
  isOnTransaction = false;

  constructor(
    private readonly _pg: typeof import("pg"),
    readonly config: IPostgresqlDbConnConf,
  ) {
    super();
  }

  // ============================================
  // 연결 관리
  // ============================================

  async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 연결되어 있습니다.");
    }

    this._pool = new this._pg.Pool({
      host: this.config.host,
      port: this.config.port ?? 5432,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      connectionTimeoutMillis: this._queryTimeout,
      idleTimeoutMillis: this._queryTimeout * 2,
    });

    this._pool.on("error", (err) => {
      this._logger.error("Pool 오류: " + err.message);
    });

    // 풀에서 클라이언트 획득
    this._client = await this._pool.connect();

    this._client.on("error", (err) => {
      this._logger.error("Client 오류: " + err.message);
      this._handleDisconnect();
    });

    this._resetIdleTimeout();
    this.isConnected = true;
  }

  async closeAsync(): Promise<void> {
    this._clearIdleTimeout();

    if (this._client) {
      this._client.release();
      this._client = undefined;
    }

    if (this._pool) {
      await this._pool.end();
      this._pool = undefined;
    }

    if (this.isConnected) {
      this._handleDisconnect();
    }
  }

  // ============================================
  // 트랜잭션
  // ============================================

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    const client = this._getClient();

    const level = this._mapIsolationLevel(
      isolationLevel ?? this.config.defaultIsolationLevel ?? "READ_COMMITTED",
    );

    await client.query(`BEGIN TRANSACTION ISOLATION LEVEL ${level}`);
    this.isOnTransaction = true;
  }

  async commitTransactionAsync(): Promise<void> {
    const client = this._getClient();
    await client.query("COMMIT");
    this.isOnTransaction = false;
  }

  async rollbackTransactionAsync(): Promise<void> {
    const client = this._getClient();
    await client.query("ROLLBACK");
    this.isOnTransaction = false;
  }

  // ============================================
  // 쿼리 실행
  // ============================================

  async executeAsync(queries: string[]): Promise<any[][]> {
    const results: any[][] = [];

    for (const query of queries) {
      if (StringUtils.isNullOrEmpty(query)) continue;

      const resultItems = await this.executeParametrizedAsync(query);
      results.push(...resultItems);
    }

    return results;
  }

  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]> {
    const client = this._getClient();

    this._logger.debug(`쿼리 실행 (${query.length.toLocaleString()} chars)`);

    try {
      // PostgreSQL은 세미콜론으로 구분된 여러 쿼리를 한번에 실행 가능
      // 하지만 각각 별도 결과를 받으려면 개별 실행 필요
      const queryConfig = {
        text: query,
        values: params,
        // query_timeout은 ms 단위
        query_timeout: this._queryTimeout,
      };
      const result = await client.query(queryConfig);

      this._resetIdleTimeout();

      // 단일 쿼리 결과
      if (!Array.isArray(result)) {
        return [result.rows];
      }

      // 다중 쿼리 결과 (pg에서는 기본적으로 마지막 결과만 반환)
      return [result.rows];
    } catch (err: any) {
      this._resetIdleTimeout();
      throw new Error(`쿼리 수행 중 오류 발생: ${err.message}\n-- query\n${query}\n--`);
    }
  }

  // ============================================
  // Bulk 연산
  // ============================================

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (records.length === 0) return;

    const query = this._buildBulkInsertQuery(tableName, columnDefs, records);
    await this.executeAsync([query]);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (records.length === 0) return;

    // PostgreSQL ON CONFLICT DO UPDATE 사용
    const pkColumns = columnDefs.filter((col) => col.autoIncrement);
    if (pkColumns.length === 0) {
      throw new Error("Upsert에는 PRIMARY KEY 또는 UNIQUE 컬럼이 필요합니다.");
    }

    const insertPart = this._buildBulkInsertQuery(tableName, columnDefs, records);

    const conflictCols = pkColumns.map((col) => `"${col.name}"`).join(", ");
    const updateCols = columnDefs
      .filter((col) => !col.autoIncrement)
      .map((col) => `"${col.name}" = EXCLUDED."${col.name}"`);

    const query = `${insertPart}\nON CONFLICT (${conflictCols}) DO UPDATE SET\n${updateCols.join(",\n")}`;
    await this.executeAsync([query]);
  }

  // ============================================
  // Private 헬퍼
  // ============================================

  private _getClient(): PoolClient {
    if (!this._client || !this.isConnected) {
      throw new Error("DB에 연결되어 있지 않습니다.");
    }
    this._resetIdleTimeout();
    return this._client;
  }

  private _handleDisconnect(): void {
    this.isConnected = false;
    this.isOnTransaction = false;
    this._client = undefined;
    this.emit("close");
  }

  private _mapIsolationLevel(level: ISOLATION_LEVEL): string {
    switch (level) {
      case "READ_UNCOMMITTED":
        // PostgreSQL에서는 READ UNCOMMITTED를 READ COMMITTED로 처리
        return "READ COMMITTED";
      case "READ_COMMITTED":
        return "READ COMMITTED";
      case "REPEATABLE_READ":
        return "REPEATABLE READ";
      case "SERIALIZABLE":
        return "SERIALIZABLE";
    }
  }

  private _buildBulkInsertQuery(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): string {
    const colNames = columnDefs.map((def) => def.name);
    const colNamesStr = colNames.map((c) => `"${c}"`).join(", ");

    const valueRows = records.map((record) => {
      const values = colNames.map((c) => this._valueConverter.convert(record[c]));
      return `(${values.join(", ")})`;
    });

    return `INSERT INTO ${tableName} (${colNamesStr})\nVALUES\n${valueRows.join(",\n")}`;
  }

  private _clearIdleTimeout(): void {
    if (this._idleTimeout) {
      clearTimeout(this._idleTimeout);
      this._idleTimeout = undefined;
    }
  }

  private _resetIdleTimeout(): void {
    this._clearIdleTimeout();
    this._idleTimeout = setTimeout(async () => {
      await this.closeAsync();
    }, this._queryTimeout * 2);
  }
}
