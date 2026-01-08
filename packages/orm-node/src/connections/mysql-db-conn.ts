import { EventEmitter } from "events";
import fs from "fs";
import os from "os";
import path from "path";
import type { Connection } from "mysql2/promise";
import pino from "pino";
import { DateOnly, DateTime, SdError, StringUtils, Time, Uuid } from "@simplysm/core-common";
import type { ColumnMeta, DataType, IsolationLevel } from "@simplysm/orm-common";
import type { IDbConn, MysqlDbConnConfig } from "../types/db-conn";

const logger = pino({ name: "mysql-db-conn" });

/**
 * MySQL 데이터베이스 연결 클래스
 *
 * mysql2/promise 라이브러리를 사용하여 MySQL 연결을 관리합니다.
 */
export class MysqlDbConn extends EventEmitter implements IDbConn {
  private static readonly ERR_NOT_CONNECTED = "'Connection'이 연결되어있지 않습니다.";
  private static readonly ERR_ALREADY_CONNECTED = "이미 'Connection'이 연결되어있습니다.";

  private readonly _timeout = 10 * 60 * 1000;

  private _conn?: Connection;
  private _connTimeout?: ReturnType<typeof setTimeout>;

  isConnected = false;
  isOnTransaction = false;

  constructor(
    private readonly _mysql2: typeof import("mysql2/promise"),
    readonly config: MysqlDbConnConfig,
  ) {
    super();
  }

  async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error(MysqlDbConn.ERR_ALREADY_CONNECTED);
    }

    const conn = await this._mysql2.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.username === "root" ? undefined : this.config.database,
      multipleStatements: true,
      charset: "utf8mb4",
      infileStreamFactory: (filePath: string) => fs.createReadStream(filePath), // LOAD DATA LOCAL INFILE 지원
    } as Parameters<typeof this._mysql2.createConnection>[0]);

    conn.on("end", () => {
      this.emit("close");
      this._resetState();
    });

    conn.on("error", (error) => {
      logger.error({ err: error.message }, "DB 연결 오류");
    });

    this._conn = conn;
    this._startTimeout();
    this.isConnected = true;
  }

  async closeAsync(): Promise<void> {
    this._stopTimeout();

    if (this._conn == null || !this.isConnected) {
      return;
    }

    await this._conn.end();

    this.emit("close");
    this._resetState();
  }

  async beginTransactionAsync(isolationLevel?: IsolationLevel): Promise<void> {
    const conn = this._assertConnected();

    await conn.beginTransaction();

    const level = (isolationLevel ?? this.config.defaultIsolationLevel ?? "READ_UNCOMMITTED").replace(
      /_/g,
      " ",
    );
    await conn.query({
      sql: `SET SESSION TRANSACTION ISOLATION LEVEL ${level}`,
      timeout: this._timeout,
    });

    this.isOnTransaction = true;
  }

  async commitTransactionAsync(): Promise<void> {
    const conn = this._assertConnected();
    await conn.commit();
    this.isOnTransaction = false;
  }

  async rollbackTransactionAsync(): Promise<void> {
    const conn = this._assertConnected();
    await conn.rollback();
    this.isOnTransaction = false;
  }

  async executeAsync(queries: string[]): Promise<unknown[][]> {
    const results: unknown[][] = [];
    for (const query of queries.filter((item) => !StringUtils.isNullOrEmpty(item))) {
      const resultItems = await this.executeParametrizedAsync(query);
      results.push(...resultItems);
    }
    return results;
  }

  async executeParametrizedAsync(query: string, params?: unknown[]): Promise<unknown[][]> {
    const conn = this._assertConnected();

    logger.debug({ queryLength: query.length, params }, "쿼리 실행");

    try {
      const [queryResults] = await conn.query({
        sql: query,
        timeout: this._timeout,
        values: params,
      });

      this._startTimeout();

      const result: unknown[] = [];
      if (queryResults instanceof Array) {
        for (const queryResult of queryResults.filter(
          (item: unknown) =>
            !(
              typeof item === "object" &&
              item !== null &&
              "affectedRows" in item &&
              "fieldCount" in item
            ),
        )) {
          result.push(queryResult);
        }
      }

      return [result];
    } catch (err) {
      this._startTimeout();
      const error = err as Error & { sql?: string };
      throw new SdError(
        error,
        "쿼리 수행중 오류발생" +
          (error.sql != null ? "\n-- query\n" + error.sql.trim() + "\n--" : ""),
      );
    }
  }

  async bulkInsertAsync(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void> {
    const conn = this._assertConnected();

    if (records.length === 0) return;

    const colNames = Object.keys(columnMetas);

    // 임시 CSV 파일 생성
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `mysql_bulk_${Date.now()}_${Math.random().toString(36).slice(2)}.csv`);

    try {
      // CSV 데이터 생성
      const csvLines: string[] = [];
      for (const record of records) {
        const row = colNames.map((colName) =>
          this._escapeForCsv(record[colName], columnMetas[colName].dataType),
        );
        csvLines.push(row.join("\t"));
      }
      const csvContent = csvLines.join("\n");

      // 파일 쓰기
      await fs.promises.writeFile(tmpFile, csvContent, "utf8");

      // LOAD DATA LOCAL INFILE 실행
      const wrappedCols = colNames.map((c) => `\`${c}\``).join(", ");
      const query = `LOAD DATA LOCAL INFILE ? INTO TABLE ${tableName} FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n' (${wrappedCols})`;

      await conn.query({ sql: query, timeout: this._timeout, values: [tmpFile] });
    } finally {
      // 임시 파일 삭제
      try {
        await fs.promises.unlink(tmpFile);
      } catch {
        // 삭제 실패 무시
      }
    }
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  /**
   * MySQL LOAD DATA INFILE용 값 이스케이프
   */
  private _escapeForCsv(value: unknown, dataType: DataType): string {
    if (value == null) {
      return "\\N"; // MySQL NULL 표현
    }

    switch (dataType.type) {
      case "int":
      case "bigint":
      case "float":
      case "double":
      case "decimal":
        return String(value);

      case "boolean":
        return (value as boolean) ? "1" : "0";

      case "varchar":
      case "char":
      case "text": {
        const str = value as string;
        // 탭, 줄바꿈, 백슬래시 이스케이프
        return str.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
      }

      case "datetime":
        return (value as DateTime).toFormatString("yyyy-MM-dd HH:mm:ss.fff");

      case "date":
        return (value as DateOnly).toFormatString("yyyy-MM-dd");

      case "time":
        return (value as Time).toFormatString("HH:mm:ss");

      case "uuid":
        return (value as Uuid).toString().replace(/-/g, ""); // BINARY(16) 저장용 hex

      case "binary":
        return (value as Buffer).toString("hex");

      default:
        throw new Error(`지원하지 않는 DataType: ${JSON.stringify(dataType)}`);
    }
  }

  private _assertConnected(): Connection {
    if (this._conn == null || !this.isConnected) {
      throw new Error(MysqlDbConn.ERR_NOT_CONNECTED);
    }
    this._startTimeout();
    return this._conn;
  }

  private _resetState(): void {
    this.isConnected = false;
    this.isOnTransaction = false;
    this._conn = undefined;
  }

  private _stopTimeout(): void {
    if (this._connTimeout != null) {
      clearTimeout(this._connTimeout);
    }
  }

  private _startTimeout(): void {
    this._stopTimeout();
    this._connTimeout = setTimeout(async () => {
      await this.closeAsync();
    }, this._timeout * 2);
  }
}
