import consola from "consola";
import {
  DateOnly,
  DateTime,
  jsonStringify,
  SdError,
  EventEmitter,
  strIsNullOrEmpty,
  Time,
  Uuid,
  waitUntil,
} from "@simplysm/core-common";
import type { ColumnMeta, DataType, IsolationLevel } from "@simplysm/orm-common";
import {
  DB_CONN_CONNECT_TIMEOUT,
  DB_CONN_DEFAULT_TIMEOUT,
  DB_CONN_ERRORS,
  type DbConn,
  type MssqlDbConnConfig,
} from "../types/db-conn";
import type tediousType from "tedious";
import type { DataType as TediousDataType } from "tedious/lib/data-type";

const logger = consola.withTag("mssql-db-conn");

/**
 * MSSQL database connection class
 *
 * Manages MSSQL/Azure SQL connections using the tedious library.
 */
export class MssqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  private readonly _timeout = DB_CONN_DEFAULT_TIMEOUT;

  private _conn?: tediousType.Connection;
  private _connTimeout?: ReturnType<typeof setTimeout>;
  private _requests: tediousType.Request[] = [];

  isConnected = false;
  isInTransaction = false;

  constructor(
    private readonly _tedious: typeof import("tedious"),
    readonly config: MssqlDbConnConfig,
  ) {
    super();
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      throw new SdError(DB_CONN_ERRORS.ALREADY_CONNECTED);
    }

    const conn = new this._tedious.Connection({
      server: this.config.host,
      authentication: {
        type: "default",
        options: {
          userName: this.config.username,
          password: this.config.password,
        },
      },
      options: {
        database: this.config.database,
        port: this.config.port,
        rowCollectionOnDone: true,
        useUTC: false,
        encrypt: this.config.dialect === "mssql-azure",
        requestTimeout: this._timeout,
        trustServerCertificate: true,
        connectTimeout: DB_CONN_CONNECT_TIMEOUT,
      } as tediousType.ConnectionOptions,
    });

    conn.on("infoMessage", (info) => {
      logger.debug("info", info.message);
    });

    conn.on("errorMessage", (error) => {
      logger.error("errorMessage", error.message);
    });

    conn.on("error", (error) => {
      logger.error("error", error.message);
    });

    conn.on("end", () => {
      this.emit("close");
      this._resetState();
    });

    await new Promise<void>((resolve, reject) => {
      conn.connect((err: Error | undefined) => {
        if (err != null) {
          reject(new SdError(err));
          return;
        }

        this._startTimeout();
        this.isConnected = true;
        this.isInTransaction = false;
        resolve();
      });
    });

    this._conn = conn;
  }

  async close(): Promise<void> {
    this._stopTimeout();

    if (this._conn == null || !this.isConnected) {
      return;
    }

    const conn = this._conn;

    // Cancel in-progress requests
    conn.cancel();
    await waitUntil(() => this._requests.length < 1, 30000, 100);

    // Wait for connection termination
    await new Promise<void>((resolve) => {
      conn.on("end", () => {
        waitUntil(() => this._conn == null, 30000, 100)
          .then(() => resolve())
          .catch(() => resolve());
      });
      conn.close();
    });
  }

  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
    this._assertConnected();
    this._startTimeout();

    const conn = this._conn!;

    await new Promise<void>((resolve, reject) => {
      conn.beginTransaction(
        (err) => {
          if (err != null) {
            reject(new SdError(err));
            return;
          }

          this.isInTransaction = true;
          resolve();
        },
        "",
        this._tedious.ISOLATION_LEVEL[
          isolationLevel ?? this.config.defaultIsolationLevel ?? "READ_UNCOMMITTED"
        ],
      );
    });
  }

  async commitTransaction(): Promise<void> {
    this._assertConnected();
    this._startTimeout();

    const conn = this._conn!;

    await new Promise<void>((resolve, reject) => {
      conn.commitTransaction((err) => {
        if (err != null) {
          reject(new SdError(err));
          return;
        }

        this.isInTransaction = false;
        resolve();
      });
    });
  }

  async rollbackTransaction(): Promise<void> {
    this._assertConnected();
    this._startTimeout();

    const conn = this._conn!;

    await new Promise<void>((resolve, reject) => {
      conn.rollbackTransaction((err) => {
        if (err != null) {
          reject(new SdError(err));
          return;
        }

        this.isInTransaction = false;
        resolve();
      });
    });
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
    this._startTimeout();

    const conn = this._conn!;

    const results: Record<string, unknown>[][] = [];

    logger.debug("Query execution", { queryLength: query.length, params });
    await new Promise<void>((resolve, reject) => {
      let rejected = false;
      const queryRequest = new this._tedious.Request(query, (err) => {
        if (err != null) {
          rejected = true;
          this._requests = this._requests.filter((r) => r !== queryRequest);

          const errRec = err as unknown as Record<string, unknown>;
          if (errRec["code"] === "ECANCEL") {
            reject(new SdError(err, "Query was cancelled."));
          } else {
            const lineNumber = errRec["lineNumber"] as number | undefined;
            if (lineNumber != null && lineNumber > 0) {
              const splitQuery = query.split("\n");
              splitQuery[lineNumber - 1] = "==> " + splitQuery[lineNumber - 1];
              reject(
                new SdError(err, `Error executing query\n-- query\n${splitQuery.join("\n")}\n--`),
              );
            } else {
              reject(new SdError(err, `Error executing query\n-- query\n${query}\n--`));
            }
          }
        }
      });

      queryRequest
        .on("done", (_rowCount, _more, rst) => {
          this._startTimeout();

          if (rejected) {
            return;
          }

          results.push(this._parseRowsToRecords(rst));
        })
        .on("doneInProc", (_rowCount, _more, rst) => {
          this._startTimeout();

          if (rejected) {
            return;
          }

          results.push(this._parseRowsToRecords(rst));
        })
        .on("error", (err) => {
          this._startTimeout();

          if (rejected) {
            return;
          }

          rejected = true;
          this._requests = this._requests.filter((r) => r !== queryRequest);
          reject(new SdError(err, `Error executing query\n-- query\n${query}\n--`));
        })
        .on("requestCompleted", () => {
          this._startTimeout();

          if (rejected) {
            return;
          }

          this._requests = this._requests.filter((r) => r !== queryRequest);
          resolve();
        });

      this._requests.push(queryRequest);

      if (params != null) {
        for (let i = 0; i < params.length; i++) {
          const paramValue = params[i];
          const paramName = `p${i}`;
          const type = this._guessTediousType(paramValue);

          queryRequest.addParameter(paramName, type, paramValue);
        }

        conn.execSql(queryRequest);
      } else {
        conn.execSqlBatch(queryRequest);
      }
    });

    return results;
  }

  async bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void> {
    if (records.length === 0) return;

    this._assertConnected();
    this._startTimeout();

    const tediousColumnDefs = Object.entries(columnMetas).map(([name, meta]) =>
      this._convertColumnMetaToTediousBulkColumnDef(name, meta),
    );

    await new Promise<void>((resolve, reject) => {
      const bulkLoad = this._conn!.newBulkLoad(tableName, (err) => {
        if (err != null) {
          reject(
            new SdError(
              err,
              `Bulk Insert error\n${jsonStringify(tediousColumnDefs)}\n-- data\n${jsonStringify(records).substring(0, 10000)}...\n--`,
            ),
          );
          return;
        }
        resolve();
      });

      const colNames = Object.keys(columnMetas);

      for (const tediousColumnDef of tediousColumnDefs) {
        bulkLoad.addColumn(tediousColumnDef.name, tediousColumnDef.type, tediousColumnDef.options);
      }

      // Convert records to row arrays (maintain column order, include value conversion)
      const rows = records.map((record) =>
        colNames.map((colName) => {
          const val = record[colName];
          if (val instanceof Uuid) return val.toString();
          // eslint-disable-next-line no-restricted-globals -- tedious library requires Buffer
          if (val instanceof Uint8Array) return Buffer.from(val);
          if (val instanceof DateTime) return val.date;
          if (val instanceof DateOnly) return val.date;
          if (val instanceof Time) return val.toFormatString("HH:mm:ss");
          return val;
        }),
      );

      this._conn!.execBulkLoad(bulkLoad, rows);
    });
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private _assertConnected(): void {
    if (this._conn == null || !this.isConnected) {
      throw new SdError(DB_CONN_ERRORS.NOT_CONNECTED);
    }
  }

  private _parseRowsToRecords(
    rows: Array<Array<{ metadata: { colName: string }; value: unknown }>> | undefined,
  ): Record<string, unknown>[] {
    return (rows ?? []).map((item) => {
      const resultItem: Record<string, unknown> = {};
      for (const col of item) {
        resultItem[col.metadata.colName] = col.value;
      }
      return resultItem;
    });
  }

  private _resetState(): void {
    this.isConnected = false;
    this.isInTransaction = false;
    this._conn = undefined;
    this._requests = [];
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

  private _convertColumnMetaToTediousBulkColumnDef(
    name: string,
    meta: ColumnMeta,
  ): {
    name: string;
    type: TediousDataType;
    options: TediousColumnOptions;
  } {
    const tediousDataType = this._convertDataTypeToTediousBulkColumnType(meta.dataType);
    return {
      name,
      type: tediousDataType.type,
      options: {
        length: tediousDataType.length,
        nullable: meta.nullable ?? false,
        precision: tediousDataType.precision,
        scale: tediousDataType.scale,
      },
    };
  }

  private _convertDataTypeToTediousBulkColumnType(dataType: DataType): {
    type: TediousDataType;
    length?: number;
    precision?: number;
    scale?: number;
  } {
    switch (dataType.type) {
      case "int":
        return { type: this._tedious.TYPES.Int };
      case "bigint":
        return { type: this._tedious.TYPES.BigInt };
      case "float":
        return { type: this._tedious.TYPES.Real };
      case "double":
        return { type: this._tedious.TYPES.Float };
      case "decimal":
        return {
          type: this._tedious.TYPES.Decimal,
          precision: dataType.precision,
          scale: dataType.scale,
        };
      case "varchar":
        return { type: this._tedious.TYPES.NVarChar, length: dataType.length };
      case "char":
        return { type: this._tedious.TYPES.NChar, length: dataType.length };
      case "text":
        return { type: this._tedious.TYPES.NText };
      case "binary":
        return { type: this._tedious.TYPES.VarBinary, length: Infinity };
      case "boolean":
        return { type: this._tedious.TYPES.Bit };
      case "datetime":
        return { type: this._tedious.TYPES.DateTime2 };
      case "date":
        return { type: this._tedious.TYPES.Date };
      case "time":
        return { type: this._tedious.TYPES.Time };
      case "uuid":
        return { type: this._tedious.TYPES.UniqueIdentifier };
      default:
        throw new SdError(`Unsupported DataType: ${JSON.stringify(dataType)}`);
    }
  }

  /**
   * Infer the type of a value and return Tedious data type
   *
   * @param value - Value whose type is to be inferred (error if null/undefined is passed)
   * @throws Error if null/undefined is passed
   */
  private _guessTediousType(value: unknown): TediousDataType {
    if (value == null) {
      throw new SdError("_guessTediousType: null/undefined values are not supported.");
    }
    if (typeof value === "string") {
      return this._tedious.TYPES.NVarChar;
    }
    if (typeof value === "number") {
      return Number.isInteger(value) ? this._tedious.TYPES.BigInt : this._tedious.TYPES.Decimal;
    }
    if (typeof value === "boolean") return this._tedious.TYPES.Bit;
    if (value instanceof DateTime) return this._tedious.TYPES.DateTime2;
    if (value instanceof DateOnly) return this._tedious.TYPES.Date;
    if (value instanceof Time) return this._tedious.TYPES.Time;
    if (value instanceof Uuid) return this._tedious.TYPES.UniqueIdentifier;
    if (value instanceof Uint8Array) return this._tedious.TYPES.VarBinary;

    throw new SdError(`Unknown value type: ${typeof value}`);
  }
}

interface TediousColumnOptions {
  length?: number;
  precision?: number;
  scale?: number;
  nullable?: boolean;
}
