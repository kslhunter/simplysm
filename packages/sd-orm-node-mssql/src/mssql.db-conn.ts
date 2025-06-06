import { SdLogger } from "@simplysm/sd-core-node";
import tedious from "tedious";
import { EventEmitter } from "events";
import {
  DateOnly,
  DateTime,
  JsonConvert,
  NeverEntryError,
  StringUtils,
  Time,
  Type,
  Uuid,
  Wait,
} from "@simplysm/sd-core-common";
import {
  IDbConn,
  IDefaultDbConnConf,
  IQueryColumnDef,
  ISOLATION_LEVEL,
  TQueryValue,
  TSdOrmDataType,
} from "@simplysm/sd-orm-common";
import { DataType } from "tedious/lib/data-type";

export class MssqlDbConn extends EventEmitter implements IDbConn {
  readonly #logger = SdLogger.get(["simplysm", "sd-orm-node", this.constructor.name]);

  readonly #timeout = 10 * 60 * 1000;

  #conn?: tedious.Connection;
  #connTimeout?: NodeJS.Timeout;
  #requests: tedious.Request[] = [];

  isConnected = false;
  isOnTransaction = false;

  constructor(readonly config: IDefaultDbConnConf) {
    super();
  }

  async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = new tedious.Connection({
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
        requestTimeout: this.#timeout,
        trustServerCertificate: true,
        // validateBulkLoadParameters: false,
        connectTimeout: this.#timeout * 5,
      } as any,
    });

    conn.on("infoMessage", (info) => {
      this.#logger.debug(info.message);
    });

    conn.on("errorMessage", (error) => {
      this.#logger.error("errorMessage: " + error.message);
    });

    conn.on("error", (error) => {
      this.#logger.error("error: " + error.message);
    });

    conn.on("end", () => {
      this.emit("close");
      this.#requests = [];
      this.isConnected = false;
      this.isOnTransaction = false;
      this.#conn = undefined;
    });

    await new Promise<void>((resolve, reject) => {
      conn.connect((err: Error | undefined) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.#startTimeout();
        this.isConnected = true;
        this.isOnTransaction = false;
        resolve();
      });
    });

    this.#conn = conn;
  }

  async closeAsync(): Promise<void> {
    await new Promise<void>(async (resolve) => {
      this.#stopTimeout();

      if (!this.#conn || !this.isConnected) {
        // reject(new Error("'Connection'이 연결되어있지 않습니다."));
        return;
      }

      this.#conn.on("end", async () => {
        await Wait.until(() => this.#conn == null, undefined, 10000);
        resolve();
      });

      this.#conn.cancel();
      await Wait.until(() => this.#requests.length < 1, undefined, 10000);
      this.#conn.close();
    });
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (!this.#conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this.#startTimeout();

    const conn = this.#conn;

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
        tedious.ISOLATION_LEVEL[isolationLevel ?? this.config.defaultIsolationLevel ?? "READ_COMMITTED"],
      );
    });
  }

  async commitTransactionAsync(): Promise<void> {
    if (!this.#conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this.#startTimeout();

    const conn = this.#conn;

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
    if (!this.#conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this.#startTimeout();

    const conn = this.#conn;

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
    if (!this.#conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this.#startTimeout();

    const conn = this.#conn;

    const results: any[][] = [];
    for (const query of queries.filter((item) => !StringUtils.isNullOrEmpty(item))) {
      const queryStrings = query.split(/\r?\nGO(\r?\n|$)/g);

      for (const queryString of queryStrings) {
        this.#logger.debug("쿼리 실행:\n" + queryString);
        await new Promise<void>((resolve, reject) => {
          let rejected = false;
          const queryRequest = new tedious.Request(queryString, (err) => {
            if (err != null) {
              rejected = true;
              this.#requests.remove(queryRequest);

              if (err["code"] === "ECANCEL") {
                reject(new Error("쿼리가 취소되었습니다."));
              } else {
                if (err["lineNumber"] > 0) {
                  const splitQuery = queryString.split("\n");
                  splitQuery[err["lineNumber"] - 1] = "==> " + splitQuery[err["lineNumber"] - 1];
                  reject(
                    new Error(`[${err["code"] as string}] ${err.message}\n-- query\n${splitQuery.join("\n")}\n--`),
                  );
                } else {
                  reject(new Error(`[${err["code"] as string}] ${err.message}\n-- query\n${queryString}\n--`));
                }
              }
            }
          })
            .on("done", (rowCount, more, rst) => {
              this.#startTimeout();

              if (rejected) {
                return;
              }

              const result = (rst ?? []).map((item) => {
                const resultItem = {};
                for (const col of item) {
                  resultItem[col.metadata.colName] = col.value;
                }
                return resultItem;
              });

              results.push(result);
            })
            .on("doneInProc", (rowCount, more, rst) => {
              this.#startTimeout();

              if (rejected) {
                return;
              }

              const result = (rst ?? []).map((item) => {
                const resultItem = {};
                for (const col of item) {
                  resultItem[col.metadata.colName] = col.value;
                }
                return resultItem;
              });

              results.push(result);
            })
            .on("error", (err) => {
              this.#startTimeout();

              if (rejected) {
                return;
              }

              rejected = true;
              this.#requests.remove(queryRequest);
              reject(new Error(err.message));
            })
            .on("requestCompleted", () => {
              this.#startTimeout();

              if (rejected) {
                return;
              }

              this.#requests.remove(queryRequest);
              resolve();
            });

          this.#requests.push(queryRequest);

          conn.execSqlBatch(queryRequest);
        });
      }
    }

    return results;
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (this.#conn === undefined || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this.#startTimeout();

    const tediousColumnDefs = columnDefs.map((item) => this.#convertColumnDefToTediousBulkColumnDef(item));

    await new Promise<void>((resolve, reject) => {
      const bulkLoad = this.#conn?.newBulkLoad(tableName, (err) => {
        if (err != null) {
          reject(
            new Error(
              `[${err["code"] as string}] ${err.message}\n${JsonConvert.stringify(tediousColumnDefs)}\n-- query\n\n${JsonConvert.stringify(records).substring(0, 10000)}...\n--`,
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

      this.#conn?.execBulkLoad(bulkLoad, records);
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    throw new Error("'bulk upsert'는 'MSSQL'에서 지원되지 않는 기능입니다.");
  }

  #stopTimeout(): void {
    if (this.#connTimeout) {
      clearTimeout(this.#connTimeout);
    }
  }

  #startTimeout(): void {
    if (this.#connTimeout) {
      clearTimeout(this.#connTimeout);
    }
    this.#connTimeout = setTimeout(async () => {
      await this.closeAsync();
    }, this.#timeout * 2);
  }

  #convertColumnDefToTediousBulkColumnDef(columnDef: IQueryColumnDef): {
    name: string;
    type: DataType;
    options: ITediousColumnOptions;
  } {
    const tediousDataType = this.#convertColumnDataTypeToTediousBulkColumnType(columnDef.dataType);
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

  #convertColumnDataTypeToTediousBulkColumnType(type: Type<TQueryValue> | TSdOrmDataType | string): {
    type: DataType;
    length?: number;
    precision?: number;
    scale?: number;
  } {
    if (type["type"] !== undefined) {
      const currType = type as TSdOrmDataType;
      switch (currType.type) {
        case "TEXT":
          return { type: tedious.TYPES.NText };
        case "DECIMAL":
          return { type: tedious.TYPES.Decimal, precision: currType.precision, scale: currType.digits };
        case "STRING":
          return {
            type: tedious.TYPES.NVarChar,
            length: currType.length === "MAX" ? Infinity : (currType.length ?? 255),
          };
        case "FIXSTRING":
          return { type: tedious.TYPES.NChar, length: currType.length };
        case "BINARY":
          return {
            type: tedious.TYPES.VarBinary,
            length: currType.length === "MAX" ? Infinity : (currType.length ?? 255),
          };
        default:
          throw new TypeError();
      }
    } else if (typeof type === "string") {
      const split = type.split(/[(,)]/);
      const typeStr = split[0];
      const length =
        split[1] === "MAX" ? Infinity : typeof split[1] !== "undefined" ? Number.parseInt(split[1], 10) : undefined;
      const digits = typeof split[2] !== "undefined" ? Number.parseInt(split[2], 10) : undefined;

      const typeKey = Object.keys(tedious.TYPES).single((item) => item.toLocaleLowerCase() === typeStr.toLowerCase());
      if (typeKey === undefined) {
        throw new NeverEntryError();
      }
      const dataType = tedious.TYPES[typeKey];

      if (dataType === tedious.TYPES.Decimal) {
        return { type: dataType, precision: length, scale: digits };
      } else {
        return { type: dataType, length };
      }
    } else {
      const currType = type as Type<TQueryValue>;
      switch (currType) {
        case String:
          return { type: tedious.TYPES.NVarChar, length: 255 };
        case Number:
          return { type: tedious.TYPES.BigInt };
        case Boolean:
          return { type: tedious.TYPES.Bit };
        case DateTime:
          return { type: tedious.TYPES.DateTime2 };
        case DateOnly:
          return { type: tedious.TYPES.Date };
        case Time:
          return { type: tedious.TYPES.Time };
        case Uuid:
          return { type: tedious.TYPES.UniqueIdentifier };
        case Buffer:
          return { type: tedious.TYPES.Binary, length: Infinity };
        default:
          throw new TypeError(typeof currType !== "undefined" ? currType.name : "undefined");
      }
    }
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
