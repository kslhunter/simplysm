import { SdLogger } from "@simplysm/sd-core-node";
import type { Connection } from "mysql2/promise";
import { EventEmitter } from "events";
import { SdError, StringUtils } from "@simplysm/sd-core-common";
import type { IQueryColumnDef } from "@simplysm/orm-common";
import type { IDbConn } from "../IDbConn";
import type { IMysqlDbConnConf, ISOLATION_LEVEL } from "../types";
import { QueryValueConverter } from "../utils/QueryValueConverter";

export class MysqlDbConn extends EventEmitter implements IDbConn {
  private readonly _logger = SdLogger.get(["simplysm", "orm-node", this.constructor.name]);
  private readonly _queryTimeout = 5 * 60 * 1000; // 5분
  private readonly _valueConverter = new QueryValueConverter("mysql");

  private _conn?: Connection;
  private _idleTimeout?: NodeJS.Timeout;

  isConnected = false;
  isOnTransaction = false;

  constructor(
    private readonly _mysql2: typeof import("mysql2/promise"),
    readonly config: IMysqlDbConnConf,
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

    const conn = await this._mysql2.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      multipleStatements: true,
      charset: "utf8mb4",
    });

    conn.on("end", () => {
      this._handleDisconnect();
    });

    conn.on("error", (error) => {
      this._logger.error("연결 오류: " + error.message);
    });

    this._conn = conn;
    this._resetIdleTimeout();
    this.isConnected = true;
  }

  async closeAsync(): Promise<void> {
    this._clearIdleTimeout();

    if (!this._conn || !this.isConnected) {
      return;
    }

    await this._conn.end();
    this._handleDisconnect();
  }

  // ============================================
  // 트랜잭션
  // ============================================

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    const conn = this._getConnection();

    const level = (isolationLevel ?? this.config.defaultIsolationLevel ?? "REPEATABLE_READ")
      .replace(/_/g, " ");

    await conn.query({
      sql: `SET SESSION TRANSACTION ISOLATION LEVEL ${level}`,
      timeout: this._queryTimeout,
    });

    await conn.beginTransaction();
    this.isOnTransaction = true;
  }

  async commitTransactionAsync(): Promise<void> {
    const conn = this._getConnection();
    await conn.commit();
    this.isOnTransaction = false;
  }

  async rollbackTransactionAsync(): Promise<void> {
    const conn = this._getConnection();
    await conn.rollback();
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
    const conn = this._getConnection();

    this._logger.debug(`쿼리 실행 (${query.length.toLocaleString()} chars)`);

    try {
      const [queryResults] = await conn.query({
        sql: query,
        timeout: this._queryTimeout,
        values: params,
      });

      this._resetIdleTimeout();

      // MySQL 결과에서 실제 데이터 행만 추출
      if (!(queryResults instanceof Array)) {
        return [[]];
      }

      const dataRows = queryResults.filter(
        (item: any) => !("affectedRows" in item && "fieldCount" in item),
      );

      return [dataRows];
    } catch (err: any) {
      this._resetIdleTimeout();
      throw new SdError(
        err,
        "쿼리 수행 중 오류 발생" + (err.sql != null ? `\n-- query\n${err.sql.trim()}\n--` : ""),
      );
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

    const insertPart = this._buildBulkInsertQuery(tableName, columnDefs, records);

    const updateCols = columnDefs
      .filter((col) => !col.autoIncrement)
      .map((col) => `\`${col.name}\` = VALUES(\`${col.name}\`)`);

    const query = `${insertPart}\nON DUPLICATE KEY UPDATE\n${updateCols.join(",\n")}`;
    await this.executeAsync([query]);
  }

  // ============================================
  // Private 헬퍼
  // ============================================

  private _getConnection(): Connection {
    if (!this._conn || !this.isConnected) {
      throw new Error("DB에 연결되어 있지 않습니다.");
    }
    this._resetIdleTimeout();
    return this._conn;
  }

  private _handleDisconnect(): void {
    this.isConnected = false;
    this.isOnTransaction = false;
    this._conn = undefined;
    this.emit("close");
  }

  private _buildBulkInsertQuery(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): string {
    const colNames = columnDefs.map((def) => def.name);
    const colNamesStr = colNames.map((c) => `\`${c}\``).join(", ");

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
    // 쿼리 타임아웃의 2배 동안 유휴 상태이면 자동 종료
    this._idleTimeout = setTimeout(async () => {
      await this.closeAsync();
    }, this._queryTimeout * 2);
  }
}