import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import type { Connection } from "mysql2/promise";
import consola from "consola";
import {
  bytes,
  str,
  DateOnly,
  DateTime,
  SdError,
  EventEmitter,
  Time,
  Uuid,
} from "@simplysm/core-common";
import type { ColumnMeta, DataType, IsolationLevel } from "@simplysm/orm-common";
import {
  DB_CONN_DEFAULT_TIMEOUT,
  DB_CONN_ERRORS,
  type DbConn,
  type MysqlDbConnConfig,
} from "../types/db-conn";

const logger = consola.withTag("mysql-db-conn");

/**
 * MySQL 데이터베이스 연결 클래스
 *
 * mysql2/promise 라이브러리를 사용하여 MySQL 연결을 관리한다.
 */
export class MysqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  private readonly _timeout = DB_CONN_DEFAULT_TIMEOUT;

  private _conn?: Connection;
  private _connTimeout?: ReturnType<typeof setTimeout>;

  isConnected = false;
  isInTransaction = false;

  constructor(
    private readonly _mysql2: typeof import("mysql2/promise"),
    readonly config: MysqlDbConnConfig,
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new SdError(DB_CONN_ERRORS.ALREADY_CONNECTED);
    }

    const conn = await this._mysql2.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      multipleStatements: true,
      charset: "utf8mb4_bin",
      infileStreamFactory: (filePath: string) => fs.createReadStream(filePath), // LOAD DATA LOCAL INFILE 지원
    } as Parameters<typeof this._mysql2.createConnection>[0]);

    conn.on("end", () => {
      this.emit("close");
      this._resetState();
    });

    conn.on("error", (error) => {
      logger.error("DB 연결 오류", error.message);
    });

    this._conn = conn;
    this._startTimeout();
    this.isConnected = true;
  }

  async close(): Promise<void> {
    this._stopTimeout();

    if (this._conn == null || !this.isConnected) {
      return;
    }

    await this._conn.end();

    this.emit("close");
    this._resetState();
  }

  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
    const conn = this._assertConnected();

    const level = (
      isolationLevel ??
      this.config.defaultIsolationLevel ??
      "READ_UNCOMMITTED"
    ).replace(/_/g, " ");

    // 격리 수준을 먼저 설정 (다음 트랜잭션에 적용)
    await conn.query({
      sql: `SET SESSION TRANSACTION ISOLATION LEVEL ${level}`,
      timeout: this._timeout,
    });

    // 그 후 트랜잭션 시작
    await conn.beginTransaction();

    this.isInTransaction = true;
  }

  async commitTransaction(): Promise<void> {
    const conn = this._assertConnected();
    await conn.commit();
    this.isInTransaction = false;
  }

  async rollbackTransaction(): Promise<void> {
    const conn = this._assertConnected();
    await conn.rollback();
    this.isInTransaction = false;
  }

  async execute(queries: string[]): Promise<Record<string, unknown>[][]> {
    const results: Record<string, unknown>[][] = [];
    for (const query of queries.filter((item) => !str.isNullOrEmpty(item))) {
      const resultItems = await this.executeParametrized(query);
      results.push(...resultItems);
    }
    return results;
  }

  async executeParametrized(
    query: string,
    params?: unknown[],
  ): Promise<Record<string, unknown>[][]> {
    const conn = this._assertConnected();

    logger.debug("쿼리 실행", { queryLength: query.length, params });

    try {
      const [queryResults] = await conn.query({
        sql: query,
        timeout: this._timeout,
        values: params,
      });

      this._startTimeout();

      // mysql2 반환 형식:
      // - single SELECT: queryResults = [RowDataPacket, ...] (flat 배열)
      // - single INSERT/UPDATE/DELETE: queryResults = ResultSetHeader (객체)
      // - multi-statement: queryResults = [(ResultSetHeader | RowDataPacket[]), ...] (중첩 배열)
      if (!(queryResults instanceof Array)) {
        // single INSERT/UPDATE/DELETE → ResultSetHeader → 빈 result set
        return [[]];
      }

      const first = queryResults[0] as Record<string, unknown> | unknown[] | undefined;
      const isMultiStatement =
        first != null &&
        (Array.isArray(first) ||
          (typeof first === "object" &&
            "affectedRows" in first &&
            "fieldCount" in first));

      if (isMultiStatement) {
        // multi-statement: 각 statement 결과를 별도 result set으로 분리
        // ResultSetHeader → 빈 배열, RowDataPacket[] → 해당 배열
        return (queryResults as unknown[]).map((item) =>
          Array.isArray(item) ? (item as Record<string, unknown>[]) : [],
        );
      }

      // single SELECT: flat RowDataPacket 배열
      return [queryResults as Record<string, unknown>[]];
    } catch (err) {
      this._startTimeout();
      const error = err as Error & { sql?: string };
      throw new SdError(
        error,
        "쿼리 실행 오류" +
          (error.sql != null ? "\n-- query\n" + error.sql.trim() + "\n--" : ""),
      );
    }
  }

  async bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void> {
    const conn = this._assertConnected();

    if (records.length === 0) return;

    const colNames = Object.keys(columnMetas);

    // 임시 CSV 파일 생성
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `mysql_bulk_${randomUUID()}.csv`);

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

      // UUID/binary 컬럼은 임시 변수로 읽어들인 후 SET 절에서 UNHEX()로 변환
      const binaryColNames = colNames.filter((c) => {
        const dt = columnMetas[c].dataType.type;
        return dt === "uuid" || dt === "binary";
      });
      const normalCols = colNames.map((c) => {
        if (binaryColNames.includes(c)) return `@_${c}`;
        return `\`${c}\``;
      });
      const setClauses = binaryColNames.map((c) => `\`${c}\` = UNHEX(@_${c})`);

      // LOAD DATA LOCAL INFILE 실행
      let query = `LOAD DATA LOCAL INFILE ? INTO TABLE ${tableName} FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n' (${normalCols.join(", ")})`;
      if (setClauses.length > 0) {
        query += ` SET ${setClauses.join(", ")}`;
      }

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
  // 내부 헬퍼
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
        const strVal = value as string;
        // 탭, 줄바꿈, 백슬래시 이스케이프
        return strVal
          .replace(/\\/g, "\\\\")
          .replace(/\0/g, "\\0")
          .replace(/\t/g, "\\t")
          .replace(/\n/g, "\\n")
          .replace(/\r/g, "\\r");
      }

      case "datetime":
        return (value as DateTime).toFormatString("yyyy-MM-dd HH:mm:ss.fff");

      case "date":
        return (value as DateOnly).toFormatString("yyyy-MM-dd");

      case "time":
        return (value as Time).toFormatString("HH:mm:ss");

      case "uuid":
        return (value as Uuid).toString().replace(/-/g, ""); // BINARY(16) 저장용 Hex

      case "binary":
        return bytes.toHex(value as Uint8Array);

      default:
        throw new SdError(`지원하지 않는 DataType: ${JSON.stringify(dataType)}`);
    }
  }

  private _assertConnected(): Connection {
    if (this._conn == null || !this.isConnected) {
      throw new SdError(DB_CONN_ERRORS.NOT_CONNECTED);
    }
    this._startTimeout();
    return this._conn;
  }

  private _resetState(): void {
    this.isConnected = false;
    this.isInTransaction = false;
    this._conn = undefined;
  }

  private _stopTimeout(): void {
    if (this._connTimeout != null) {
      clearTimeout(this._connTimeout);
    }
  }

  private _startTimeout(): void {
    this._stopTimeout();
    this._connTimeout = setTimeout(() => {
      this.close().catch((err) => {
        logger.error("연결 종료 오류", err instanceof Error ? err.message : String(err));
      });
    }, this._timeout * 2);
  }
}
