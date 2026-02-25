import { randomUUID } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import type { Connection } from "mysql2/promise";
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
  DB_CONN_DEFAULT_TIMEOUT,
  DB_CONN_ERRORS,
  type DbConn,
  type MysqlDbConnConfig,
} from "../types/db-conn";

const logger = consola.withTag("mysql-db-conn");

/**
 * MySQL database connection class
 *
 * Manages MySQL connections using the mysql2/promise library.
 */
export class MysqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  private static readonly _ROOT_USER = "root";
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
      // Root user connects without binding to specific database
      // to allow access to all databases (for admin operations)
      database: this.config.username === MysqlDbConn._ROOT_USER ? undefined : this.config.database,
      multipleStatements: true,
      charset: "utf8mb4",
      infileStreamFactory: (filePath: string) => fs.createReadStream(filePath), // Support for LOAD DATA LOCAL INFILE
    } as Parameters<typeof this._mysql2.createConnection>[0]);

    conn.on("end", () => {
      this.emit("close");
      this._resetState();
    });

    conn.on("error", (error) => {
      logger.error("DB connection error", error.message);
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

    // Set isolation level first (applies to next transaction)
    await conn.query({
      sql: `SET SESSION TRANSACTION ISOLATION LEVEL ${level}`,
      timeout: this._timeout,
    });

    // Then start transaction
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
    const conn = this._assertConnected();

    logger.debug("Query execution", { queryLength: query.length, params });

    try {
      const [queryResults] = await conn.query({
        sql: query,
        timeout: this._timeout,
        values: params as ({} | null)[] | undefined,
      });

      this._startTimeout();

      // MySQL returns ResultSetHeader for INSERT/UPDATE/DELETE statements
      // Filter ResultSetHeader objects to extract only SELECT results
      // ResultSetHeader has fields like affectedRows, fieldCount, etc.
      const result: Record<string, unknown>[] = [];
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
          result.push(queryResult as Record<string, unknown>);
        }
      }

      return [result];
    } catch (err) {
      this._startTimeout();
      const error = err as Error & { sql?: string };
      throw new SdError(
        error,
        "Error executing query" +
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

    // Create temporary CSV file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `mysql_bulk_${randomUUID()}.csv`);

    try {
      // Generate CSV data
      const csvLines: string[] = [];
      for (const record of records) {
        const row = colNames.map((colName) =>
          this._escapeForCsv(record[colName], columnMetas[colName].dataType),
        );
        csvLines.push(row.join("\t"));
      }
      const csvContent = csvLines.join("\n");

      // Write file
      await fs.promises.writeFile(tmpFile, csvContent, "utf8");

      // UUID/binary columns are read as temporary variables and converted with UNHEX() in SET clause
      const binaryColNames = colNames.filter((c) => {
        const dt = columnMetas[c].dataType.type;
        return dt === "uuid" || dt === "binary";
      });
      const normalCols = colNames.map((c) => {
        if (binaryColNames.includes(c)) return `@_${c}`;
        return `\`${c}\``;
      });
      const setClauses = binaryColNames.map((c) => `\`${c}\` = UNHEX(@_${c})`);

      // Execute LOAD DATA LOCAL INFILE
      let query = `LOAD DATA LOCAL INFILE ? INTO TABLE ${tableName} FIELDS TERMINATED BY '\\t' LINES TERMINATED BY '\\n' (${normalCols.join(", ")})`;
      if (setClauses.length > 0) {
        query += ` SET ${setClauses.join(", ")}`;
      }

      await conn.query({ sql: query, timeout: this._timeout, values: [tmpFile] });
    } finally {
      // Delete temporary file
      try {
        await fs.promises.unlink(tmpFile);
      } catch {
        // Ignore deletion failure
      }
    }
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  /**
   * Escape value for MySQL LOAD DATA INFILE
   */
  private _escapeForCsv(value: unknown, dataType: DataType): string {
    if (value == null) {
      return "\\N"; // MySQL NULL representation
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
        // Escape tab, newline, backslash
        return str
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
        return (value as Uuid).toString().replace(/-/g, ""); // Hex for BINARY(16) storage

      case "binary":
        return bytesToHex(value as Uint8Array);

      default:
        throw new SdError(`Unsupported DataType: ${JSON.stringify(dataType)}`);
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
        logger.error("close error", err instanceof Error ? err.message : String(err));
      });
    }, this._timeout * 2);
  }
}
