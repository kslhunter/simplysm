import { SdLogger } from "@simplysm/sd-core-node";
import { EventEmitter } from "events";
import type { Type } from "@simplysm/sd-core-common";
import {
  DateOnly,
  DateTime,
  JsonConvert,
  NeverEntryError,
  StringUtils,
  Time,
  Uuid,
  Wait,
} from "@simplysm/sd-core-common";
import type {
  IDbConn,
  IDefaultDbConnConf,
  IQueryColumnDef,
  ISOLATION_LEVEL,
  TQueryValue,
  TSdOrmDataType,
} from "@simplysm/sd-orm-common";
import type { DataType } from "tedious/lib/data-type";
import type tediousType from "tedious";

export class MssqlDbConn extends EventEmitter implements IDbConn {
  private readonly _logger = SdLogger.get(["simplysm", "sd-orm-node", this.constructor.name]);

  private readonly _timeout = 10 * 60 * 1000;

  private _conn?: tediousType.Connection;
  private _connTimeout?: NodeJS.Timeout;
  private _requests: tediousType.Request[] = [];

  isConnected = false;
  isOnTransaction = false;

  constructor(
    private readonly _tedious: typeof import("tedious"),
    readonly config: IDefaultDbConnConf,
  ) {
    super();
  }

  async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
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
        // validateBulkLoadParameters: false,
        connectTimeout: this._timeout * 5,
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
      this.emit("close");
      this._requests = [];
      this.isConnected = false;
      this.isOnTransaction = false;
      this._conn = undefined;
    });

    await new Promise<void>((resolve, reject) => {
      conn.connect((err: Error | undefined) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this._startTimeout();
        this.isConnected = true;
        this.isOnTransaction = false;
        resolve();
      });
    });

    this._conn = conn;
  }

  async closeAsync(): Promise<void> {
    await new Promise<void>(async (resolve) => {
      this._stopTimeout();

      if (!this._conn || !this.isConnected) {
        // reject(new Error("'Connection'이 연결되어있지 않습니다."));
        return;
      }

      this._conn.on("end", async () => {
        await Wait.until(() => this._conn == null, undefined, 10000);
        resolve();
      });

      this._conn.cancel();
      await Wait.until(() => this._requests.length < 1, undefined, 10000);
      this._conn.close();
    });
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

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
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

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
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

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

  async executeAsync(queries: string[]): Promise<any[][]> {
    const results: any[][] = [];
    for (const query of queries.filter((item) => !StringUtils.isNullOrEmpty(item))) {
      const resultItems = await this.executeParametrizedAsync(query);
      results.push(...resultItems);
    }

    return results;
  }

  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    const results: any[][] = [];

    this._logger.debug(`쿼리 실행(${query.length.toLocaleString()}): ${query}, ${params}`);
    await new Promise<void>((resolve, reject) => {
      let rejected = false;
      const queryRequest = new this._tedious.Request(query, (err) => {
        if (err != null) {
          rejected = true;
          this._requests.remove(queryRequest);

          const errRec = err as Record<string, any>;
          if (errRec["code"] === "ECANCEL") {
            reject(new Error("쿼리가 취소되었습니다."));
          } else {
            if (errRec["lineNumber"] > 0) {
              const splitQuery = query.split("\n");
              splitQuery[errRec["lineNumber"] - 1] = "==> " + splitQuery[errRec["lineNumber"] - 1];
              reject(
                new Error(
                  `[${errRec["code"] as string}] ${err.message}\n-- query\n${splitQuery.join("\n")}\n--`,
                ),
              );
            } else {
              reject(
                new Error(`[${errRec["code"] as string}] ${err.message}\n-- query\n${query}\n--`),
              );
            }
          }
        }
      });

      queryRequest
        .on("done", (rowCount, more, rst) => {
          this._startTimeout();

          if (rejected) {
            return;
          }

          const doneResult = (rst ?? []).map((item) => {
            const resultItem: Record<string, any> = {};
            for (const col of item) {
              resultItem[col.metadata.colName] = col.value;
            }
            return resultItem;
          });

          results.push(doneResult);
        })
        .on("doneInProc", (rowCount, more, rst) => {
          this._startTimeout();

          if (rejected) {
            return;
          }

          const doneResult = (rst ?? []).map((item) => {
            const resultItem: Record<string, any> = {};
            for (const col of item) {
              resultItem[col.metadata.colName] = col.value;
            }
            return resultItem;
          });

          results.push(doneResult);
        })
        .on("error", (err) => {
          this._startTimeout();

          if (rejected) {
            return;
          }

          rejected = true;
          this._requests.remove(queryRequest);
          reject(new Error(err.message));
        })
        .on("requestCompleted", () => {
          this._startTimeout();

          if (rejected) {
            return;
          }

          this._requests.remove(queryRequest);
          resolve();
        });

      this._requests.push(queryRequest);

      if (params) {
        // 파라미터 주입 로직 추가
        // 쿼리 내의 파라미터 명(@p0, @p1 등)과 순서가 맞아야 합니다.
        for (let i = 0; i < params.length; i++) {
          const paramValue = params[i];
          const paramName = `p${i}`; // @p0, @p1 ... (클라이언트 쿼리 빌더가 생성하는 이름 규칙에 따름)
          const type = this._guessTediousType(paramValue); // 타입 추론 헬퍼 필요

          queryRequest.addParameter(paramName, type, paramValue);
        }

        conn.execSql(queryRequest);
      } else {
        conn.execSqlBatch(queryRequest);
      }
    });

    return results;
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this._conn === undefined || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const tediousColumnDefs = columnDefs.map((item) =>
      this._convertColumnDefToTediousBulkColumnDef(item),
    );

    await new Promise<void>((resolve, reject) => {
      const bulkLoad = this._conn?.newBulkLoad(tableName, (err) => {
        if (err != null) {
          const errRec = err as Record<string, any>;
          reject(
            new Error(
              `[${errRec["code"] as string}] ${err.message}\n${JsonConvert.stringify(tediousColumnDefs)}\n-- query\n\n${JsonConvert.stringify(records).substring(0, 10000)}...\n--`,
            ),
          );
          return;
        }
        resolve();
      });
      if (bulkLoad === undefined) throw new NeverEntryError();

      for (const tediousColumnDef of tediousColumnDefs) {
        bulkLoad.addColumn(tediousColumnDef.name, tediousColumnDef.type, tediousColumnDef.options);
      }

      this._conn?.execBulkLoad(bulkLoad, records);
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkUpsertAsync(
    _tableName: string,
    _columnDefs: IQueryColumnDef[],
    _records: Record<string, any>[],
  ): Promise<void> {
    throw new Error("'bulk upsert'는 'MSSQL'에서 지원되지 않는 기능입니다.");
  }

  private _stopTimeout(): void {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
  }

  private _startTimeout(): void {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
    this._connTimeout = setTimeout(async () => {
      await this.closeAsync();
    }, this._timeout * 2);
  }

  private _convertColumnDefToTediousBulkColumnDef(columnDef: IQueryColumnDef): {
    name: string;
    type: DataType;
    options: ITediousColumnOptions;
  } {
    const tediousDataType = this._convertColumnDataTypeToTediousBulkColumnType(columnDef.dataType);
    return {
      name: columnDef.name,
      type: tediousDataType.type,
      options: {
        length: tediousDataType.length,
        nullable: columnDef.nullable ?? false,
        precision: tediousDataType.precision,
        scale: tediousDataType.scale,
      },
    };
  }

  private _convertColumnDataTypeToTediousBulkColumnType(
    type: Type<TQueryValue> | TSdOrmDataType | string,
  ): {
    type: DataType;
    length?: number;
    precision?: number;
    scale?: number;
  } {
    const typeRec = type as Record<string, any>;
    if (typeRec["type"] !== undefined) {
      const currType = type as TSdOrmDataType;
      switch (currType.type) {
        case "TEXT":
          return { type: this._tedious.TYPES.NText };
        case "DECIMAL":
          return {
            type: this._tedious.TYPES.Decimal,
            precision: currType.precision,
            scale: currType.digits,
          };
        case "STRING":
          return {
            type: this._tedious.TYPES.NVarChar,
            length: currType.length === "MAX" ? Infinity : (currType.length ?? 255),
          };
        case "FIXSTRING":
          return { type: this._tedious.TYPES.NChar, length: currType.length };
        case "BINARY":
          return {
            type: this._tedious.TYPES.VarBinary,
            length: currType.length === "MAX" ? Infinity : (currType.length ?? 255),
          };
        default:
          throw new TypeError();
      }
    } else if (typeof type === "string") {
      const split = type.split(/[(,)]/);
      const typeStr = split[0];
      const length =
        split[1] === "MAX"
          ? Infinity
          : typeof split[1] !== "undefined"
            ? Number.parseInt(split[1], 10)
            : undefined;
      const digits = typeof split[2] !== "undefined" ? Number.parseInt(split[2], 10) : undefined;

      const typeKey = Object.keys(this._tedious.TYPES).single(
        (item) => item.toLocaleLowerCase() === typeStr.toLowerCase(),
      );
      if (typeKey === undefined) {
        throw new NeverEntryError();
      }
      const dataType = (this._tedious.TYPES as Record<string, DataType>)[typeKey];

      if (dataType === this._tedious.TYPES.Decimal) {
        return { type: dataType, precision: length, scale: digits };
      } else {
        return { type: dataType, length };
      }
    } else {
      const currType = type as Type<TQueryValue>;
      switch (currType) {
        case String:
          return { type: this._tedious.TYPES.NVarChar, length: 255 };
        case Number:
          return { type: this._tedious.TYPES.BigInt };
        case Boolean:
          return { type: this._tedious.TYPES.Bit };
        case DateTime:
          return { type: this._tedious.TYPES.DateTime2 };
        case DateOnly:
          return { type: this._tedious.TYPES.Date };
        case Time:
          return { type: this._tedious.TYPES.Time };
        case Uuid:
          return { type: this._tedious.TYPES.UniqueIdentifier };
        case Buffer:
          return { type: this._tedious.TYPES.Binary, length: Infinity };
        default:
          throw new TypeError(typeof currType !== "undefined" ? currType.name : "undefined");
      }
    }
  }

  // JS 값으로 Tedious Type을 추론하는 헬퍼
  private _guessTediousType(value: any): DataType {
    /*const currType = type as Type<TQueryValue> | undefined;
    switch (currType) {
      case String:
        if (this._dialect === "mysql") {
          return "VARCHAR(255)";
        } else {
          return "NVARCHAR(255)";
        }
      case Number:
        return this._dialect === "sqlite" ? "INTEGER" : "BIGINT";
      case Boolean:
        return this._dialect === "mysql" ? "BOOLEAN" : "BIT";
      case DateTime:
        return this._dialect === "mysql" ? "DATETIME" : "DATETIME2";
      case DateOnly:
        return "DATE";
      case Time:
        return "TIME";
      case Uuid:
        return this._dialect === "mysql" ? "CHAR(38)" : "UNIQUEIDENTIFIER";
      case Buffer:
        return this.type({ type: "BINARY", length: "MAX" });
      default:
        throw new TypeError(currType != null ? currType.name : "undefined");
    }*/

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
    if (Buffer.isBuffer(value)) return this._tedious.TYPES.VarBinary;

    throw new TypeError(value);
  }
}

interface ITediousColumnOptions {
  output?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  objName?: string;
  nullable?: boolean;
}
