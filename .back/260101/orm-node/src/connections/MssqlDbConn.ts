import { SdLogger } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import {
  DateOnly,
  DateTime,
  NeverEntryError,
  StringUtils,
  Time,
  Uuid,
  Wait,
} from "@simplysm/sd-core-common";
import type { IQueryColumnDef } from "@simplysm/orm-common";
import type { IDbConn } from "../IDbConn";
import type { IMssqlDbConnConf, ISOLATION_LEVEL } from "../types";
import type { DataType } from "tedious/lib/data-type";
import type tediousType from "tedious";

export class MssqlDbConn extends EventEmitter implements IDbConn {
  private readonly _logger = SdLogger.get(["simplysm", "orm-node", this.constructor.name]);
  private readonly _queryTimeout = 10 * 60 * 1000; // 10분

  private _conn?: tediousType.Connection;
  private _idleTimeout?: NodeJS.Timeout;
  private _pendingRequests: tediousType.Request[] = [];

  isConnected = false;
  isOnTransaction = false;

  constructor(
    private readonly _tedious: typeof import("tedious"),
    readonly config: IMssqlDbConnConf,
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
        encrypt: false,
        requestTimeout: this._queryTimeout,
        trustServerCertificate: true,
        connectTimeout: this._queryTimeout * 5,
      } as any,
    });

    conn.on("infoMessage", (info) => {
      this._logger.debug(info.message);
    });

    conn.on("errorMessage", (error) => {
      this._logger.error("errorMessage: " + error.message);
    });

    conn.on("error", (error) => {
      this._logger.error("error: " + error.message);
    });

    conn.on("end", () => {
      this._handleDisconnect();
    });

    await new Promise<void>((resolve, reject) => {
      conn.connect((err: Error | undefined) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this._resetIdleTimeout();
        this.isConnected = true;
        this.isOnTransaction = false;
        resolve();
      });
    });

    this._conn = conn;
  }

  async closeAsync(): Promise<void> {
    this._clearIdleTimeout();

    if (!this._conn || !this.isConnected) {
      return;
    }

    const conn = this._conn;

    await new Promise<void>(async (resolve) => {
      conn.on("end", async () => {
        await Wait.until(() => this._conn == null, undefined, 10000);
        resolve();
      });

      conn.cancel();
      await Wait.until(() => this._pendingRequests.length < 1, undefined, 10000);
      conn.close();
    });
  }

  // ============================================
  // 트랜잭션
  // ============================================

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    const conn = this._getConnection();

    await new Promise<void>((resolve, reject) => {
      conn.beginTransaction(
        (err) => {
          if (err) {
            reject(new Error(err.message));
            return;
          }

          this.isOnTransaction = true;
          resolve();
        },
        "",
        this._tedious.ISOLATION_LEVEL[
          isolationLevel ?? this.config.defaultIsolationLevel ?? "READ_COMMITTED"
        ],
      );
    });
  }

  async commitTransactionAsync(): Promise<void> {
    const conn = this._getConnection();

    await new Promise<void>((resolve, reject) => {
      conn.commitTransaction((err) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = false;
        resolve();
      });
    });
  }

  async rollbackTransactionAsync(): Promise<void> {
    const conn = this._getConnection();

    await new Promise<void>((resolve, reject) => {
      conn.rollbackTransaction((err) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = false;
        resolve();
      });
    });
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

    const results: any[][] = [];

    await new Promise<void>((resolve, reject) => {
      let rejected = false;

      const request = new this._tedious.Request(query, (err) => {
        if (err != null) {
          rejected = true;
          this._removeRequest(request);

          if (err["code"] === "ECANCEL") {
            reject(new Error("쿼리가 취소되었습니다."));
          } else {
            const errorMsg = this._formatQueryError(query, err);
            reject(new Error(errorMsg));
          }
        }
      });

      request
        .on("done", (rowCount, more, rows) => {
          this._resetIdleTimeout();
          if (!rejected) {
            results.push(this._parseRows(rows));
          }
        })
        .on("doneInProc", (rowCount, more, rows) => {
          this._resetIdleTimeout();
          if (!rejected) {
            results.push(this._parseRows(rows));
          }
        })
        .on("error", (err) => {
          this._resetIdleTimeout();
          if (!rejected) {
            rejected = true;
            this._removeRequest(request);
            reject(new Error(err.message));
          }
        })
        .on("requestCompleted", () => {
          this._resetIdleTimeout();
          if (!rejected) {
            this._removeRequest(request);
            resolve();
          }
        });

      this._pendingRequests.push(request);

      if (params) {
        for (let i = 0; i < params.length; i++) {
          const paramValue = params[i];
          const paramName = `p${i}`;
          const type = this._inferTediousType(paramValue);
          request.addParameter(paramName, type, paramValue);
        }
        conn.execSql(request);
      } else {
        conn.execSqlBatch(request);
      }
    });

    return results;
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

    const conn = this._getConnection();
    const tediousColumnDefs = columnDefs.map((col) => this._toTediousBulkColumn(col));

    await new Promise<void>((resolve, reject) => {
      const bulkLoad = conn.newBulkLoad(tableName, (err) => {
        if (err != null) {
          reject(new Error(`[${err["code"]}] ${err.message}`));
          return;
        }
        resolve();
      });

      for (const tediousCol of tediousColumnDefs) {
        bulkLoad.addColumn(tediousCol.name, tediousCol.type, tediousCol.options);
      }

      conn.execBulkLoad(bulkLoad, records);
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkUpsertAsync(
    _tableName: string,
    _columnDefs: IQueryColumnDef[],
    _records: Record<string, any>[],
  ): Promise<void> {
    throw new Error("MSSQL에서는 bulk upsert가 지원되지 않습니다. INSERT ... MERGE를 사용하세요.");
  }

  // ============================================
  // Private 헬퍼
  // ============================================

  private _getConnection(): tediousType.Connection {
    if (!this._conn || !this.isConnected) {
      throw new Error("DB에 연결되어 있지 않습니다.");
    }
    this._resetIdleTimeout();
    return this._conn;
  }

  private _handleDisconnect(): void {
    this._pendingRequests = [];
    this.isConnected = false;
    this.isOnTransaction = false;
    this._conn = undefined;
    this.emit("close");
  }

  private _removeRequest(request: tediousType.Request): void {
    const idx = this._pendingRequests.indexOf(request);
    if (idx !== -1) {
      this._pendingRequests.splice(idx, 1);
    }
  }

  private _parseRows(rows: any[] | undefined): any[] {
    return (rows ?? []).map((row) => {
      const resultItem: Record<string, any> = {};
      for (const col of row) {
        resultItem[col.metadata.colName] = col.value;
      }
      return resultItem;
    });
  }

  private _formatQueryError(query: string, err: any): string {
    const code = err["code"] as string;
    const lineNumber = err["lineNumber"] as number;

    if (lineNumber > 0) {
      const lines = query.split("\n");
      lines[lineNumber - 1] = "==> " + lines[lineNumber - 1];
      return `[${code}] ${err.message}\n-- query\n${lines.join("\n")}\n--`;
    }

    return `[${code}] ${err.message}\n-- query\n${query}\n--`;
  }

  private _inferTediousType(value: any): DataType {
    if (typeof value === "string") return this._tedious.TYPES.NVarChar;
    if (typeof value === "number") {
      return Number.isInteger(value) ? this._tedious.TYPES.BigInt : this._tedious.TYPES.Decimal;
    }
    if (typeof value === "boolean") return this._tedious.TYPES.Bit;
    if (value instanceof DateTime) return this._tedious.TYPES.DateTime2;
    if (value instanceof DateOnly) return this._tedious.TYPES.Date;
    if (value instanceof Time) return this._tedious.TYPES.Time;
    if (value instanceof Uuid) return this._tedious.TYPES.UniqueIdentifier;
    if (Buffer.isBuffer(value)) return this._tedious.TYPES.VarBinary;

    throw new Error(`지원하지 않는 파라미터 타입: ${typeof value}`);
  }

  private _toTediousBulkColumn(columnDef: IQueryColumnDef): {
    name: string;
    type: DataType;
    options: ITediousBulkColumnOptions;
  } {
    const { type, length, precision, scale } = this._parseDataType(columnDef.dataType);

    return {
      name: columnDef.name,
      type,
      options: {
        length,
        precision,
        scale,
        nullable: columnDef.nullable ?? false,
      },
    };
  }

  private _parseDataType(dataType: string): {
    type: DataType;
    length?: number;
    precision?: number;
    scale?: number;
  } {
    const match = dataType.match(/^(\w+)(?:\(([^)]+)\))?$/);
    if (!match) {
      throw new NeverEntryError(`Invalid dataType format: ${dataType}`);
    }

    const [, typeName, params] = match;
    const typeKey = Object.keys(this._tedious.TYPES).find(
      (k) => k.toLowerCase() === typeName.toLowerCase(),
    );

    if (typeKey == null) {
      throw new NeverEntryError(`Unknown MSSQL type: ${typeName}`);
    }

    const tediousType = this._tedious.TYPES[typeKey];

    if (!params) {
      return { type: tediousType };
    }

    const parts = params.split(",").map((p) => p.trim());

    if (tediousType === this._tedious.TYPES.Decimal) {
      return {
        type: tediousType,
        precision: parseInt(parts[0], 10),
        scale: parts[1] ? parseInt(parts[1], 10) : undefined,
      };
    }

    const length = parts[0] === "MAX" ? Infinity : parseInt(parts[0], 10);
    return { type: tediousType, length };
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

interface ITediousBulkColumnOptions {
  output?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  objName?: string;
  nullable?: boolean;
}
