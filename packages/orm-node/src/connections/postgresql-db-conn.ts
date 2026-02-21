import { Readable } from "stream";
import consola from "consola";
import {
  bytesToHex,
  DateOnly,
  DateTime,
  SdError,
  EventEmitter,
  strIsNullOrEmpty,
  Time,
  Uuid,
} from "@simplysm/core-common";
import type { ColumnMeta, DataType, IsolationLevel } from "@simplysm/orm-common";
import {
  DB_CONN_CONNECT_TIMEOUT,
  DB_CONN_DEFAULT_TIMEOUT,
  DB_CONN_ERRORS,
  type DbConn,
  type PostgresqlDbConnConfig,
} from "../types/db-conn";
import type { Client } from "pg";

const logger = consola.withTag("postgresql-db-conn");

/**
 * PostgreSQL 데이터베이스 연결 클래스
 *
 * pg 라이브러리를 사용하여 PostgreSQL 연결을 관리합니다.
 */
export class PostgresqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  private readonly _timeout = DB_CONN_DEFAULT_TIMEOUT;

  private _client?: Client;
  private _connTimeout?: ReturnType<typeof setTimeout>;

  isConnected = false;
  isInTransaction = false;

  constructor(
    private readonly _pg: typeof import("pg"),
    private readonly _pgCopyStreams: typeof import("pg-copy-streams"),
    readonly config: PostgresqlDbConnConfig,
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new SdError(DB_CONN_ERRORS.ALREADY_CONNECTED);
    }

    const client = new this._pg.Client({
      host: this.config.host,
      port: this.config.port ?? 5432,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      connectionTimeoutMillis: DB_CONN_CONNECT_TIMEOUT,
      query_timeout: this._timeout,
    });

    client.on("end", () => {
      this.emit("close");
      this._resetState();
    });

    client.on("error", (error) => {
      logger.error("DB 연결 오류", error.message);
    });

    await client.connect();

    this._client = client;
    this._startTimeout();
    this.isConnected = true;
  }

  async close(): Promise<void> {
    this._stopTimeout();

    if (this._client == null || !this.isConnected) {
      return;
    }

    await this._client.end();

    this.emit("close");
    this._resetState();
  }

  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
    this._assertConnected();

    const level = (
      isolationLevel ??
      this.config.defaultIsolationLevel ??
      "READ_UNCOMMITTED"
    ).replace(/_/g, " ");

    await this._client!.query("BEGIN");
    await this._client!.query(`SET TRANSACTION ISOLATION LEVEL ${level}`);

    this.isInTransaction = true;
  }

  async commitTransaction(): Promise<void> {
    this._assertConnected();
    await this._client!.query("COMMIT");
    this.isInTransaction = false;
  }

  async rollbackTransaction(): Promise<void> {
    this._assertConnected();
    await this._client!.query("ROLLBACK");
    this.isInTransaction = false;
  }

  async execute(queries: string[]): Promise<Record<string, unknown>[][]> {
    const results: Record<string, unknown>[][] = [];
    for (const query of queries.filter((item) => !strIsNullOrEmpty(item))) {
      const resultItems = await this.executeParametrized(query);
      results.push(...resultItems);
    }
    return results;
  }

  async executeParametrized(
    query: string,
    params?: unknown[],
  ): Promise<Record<string, unknown>[][]> {
    this._assertConnected();

    logger.debug("쿼리 실행", { queryLength: query.length, params });

    try {
      const result = await this._client!.query(query, params);

      this._startTimeout();

      // PostgreSQL은 단일 결과셋 반환
      return [result.rows];
    } catch (err) {
      this._startTimeout();
      const error = err instanceof Error ? err : new Error(String(err));
      throw new SdError(error, "쿼리 수행중 오류발생\n-- query\n" + query.trim() + "\n--");
    }
  }

  async bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void> {
    this._assertConnected();

    if (records.length === 0) return;

    const colNames = Object.keys(columnMetas);
    const wrappedCols = colNames.map((c) => `"${c}"`).join(", ");

    // COPY FROM STDIN 스트림 생성
    const copyQuery = `COPY ${tableName} (${wrappedCols}) FROM STDIN WITH (FORMAT csv, NULL '\\N')`;
    const stream = this._client!.query(this._pgCopyStreams.from(copyQuery));

    // CSV 데이터 생성
    const csvLines: string[] = [];
    for (const record of records) {
      const row = colNames.map((colName) =>
        this._escapeForCsv(record[colName], columnMetas[colName].dataType),
      );
      csvLines.push(row.join(","));
    }
    const csvContent = csvLines.join("\n") + "\n";

    // 스트림으로 데이터 전송
    await new Promise<void>((resolve, reject) => {
      const readable = Readable.from([csvContent]);

      readable.on("error", reject);
      stream.on("error", reject);
      stream.on("finish", resolve);

      readable.pipe(stream);
    });
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  /**
   * PostgreSQL COPY CSV용 값 이스케이프
   */
  private _escapeForCsv(value: unknown, dataType: DataType): string {
    if (value == null) {
      return "\\N"; // NULL 표현
    }

    switch (dataType.type) {
      case "int":
      case "bigint":
      case "float":
      case "double":
      case "decimal":
        return String(value);

      case "boolean":
        return (value as boolean) ? "true" : "false";

      case "varchar":
      case "char":
      case "text": {
        const str = value as string;
        // CSV 형식: 쌍따옴표로 감싸고, 내부 쌍따옴표는 두 번
        if (
          str.includes('"') ||
          str.includes(",") ||
          str.includes("\n") ||
          str.includes("\r") ||
          str.includes("\\")
        ) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      }

      case "datetime":
        return (value as DateTime).toFormatString("yyyy-MM-dd HH:mm:ss.fff");

      case "date":
        return (value as DateOnly).toFormatString("yyyy-MM-dd");

      case "time":
        return (value as Time).toFormatString("HH:mm:ss");

      case "uuid":
        return (value as Uuid).toString();

      case "binary":
        return '"\\x' + bytesToHex(value as Uint8Array) + '"'; // PostgreSQL bytea hex 형식 (CSV 쌍따옴표로 감쌈)

      default:
        throw new SdError(`지원하지 않는 DataType: ${JSON.stringify(dataType)}`);
    }
  }

  private _assertConnected(): void {
    if (this._client == null || !this.isConnected) {
      throw new SdError(DB_CONN_ERRORS.NOT_CONNECTED);
    }
    this._startTimeout();
  }

  private _resetState(): void {
    this.isConnected = false;
    this.isInTransaction = false;
    this._client = undefined;
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
        logger.error("close error", err instanceof Error ? err.message : String(err));
      });
    }, this._timeout * 2);
  }
}
