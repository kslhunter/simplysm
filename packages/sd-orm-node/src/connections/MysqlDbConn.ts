import { SdLogger } from "@simplysm/sd-core-node";
import type mysqlType from "mysql";
import { EventEmitter } from "events";
import { SdError, StringUtils } from "@simplysm/sd-core-common";
import {
  IDbConn,
  IDefaultDbConnConf,
  IQueryColumnDef,
  ISOLATION_LEVEL,
  QueryHelper,
} from "@simplysm/sd-orm-common";

let mysql: typeof import("mysql");
let importErr: any | undefined;
try {
  mysql = await import("mysql");
} catch (err) {
  importErr = err;
}

export class MysqlDbConn extends EventEmitter implements IDbConn {
  readonly #logger = SdLogger.get(["simplysm", "sd-orm-node", this.constructor.name]);

  readonly #timeout = 5 * 60 * 1000;

  #conn?: mysqlType.Connection;
  #connTimeout?: NodeJS.Timeout;

  isConnected = false;
  isOnTransaction = false;

  constructor(readonly config: IDefaultDbConnConf) {
    super();
    if (importErr != null) throw importErr;
  }

  async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.username === "root" ? undefined : this.config.database,
      multipleStatements: true,
      charset: "utf8mb4",
    });

    conn.on("end", () => {
      this.emit("close");
      this.isConnected = false;
      this.isOnTransaction = false;
      this.#conn = undefined;
    });

    await new Promise<void>((resolve, reject) => {
      conn.on("error", (error) => {
        if (this.isConnected) {
          this.#logger.error("error: " + error.message);
        } else {
          reject(new Error(error.message));
        }
      });

      conn.on("connect", () => {
        this.#startTimeout();
        this.isConnected = true;
        this.isOnTransaction = false;
        resolve();
      });

      conn.connect();
    });
    this.#conn = conn;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async closeAsync(): Promise<void> {
    this.#stopTimeout();

    if (!this.#conn || !this.isConnected) {
      return;
    }

    this.#conn.destroy();

    this.emit("close");
    this.isConnected = false;
    this.isOnTransaction = false;
    this.#conn = undefined;
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (!this.#conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this.#startTimeout();

    const conn = this.#conn;

    await new Promise<void>((resolve, reject) => {
      conn.beginTransaction((err: mysqlType.MysqlError | null) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      conn.query(
        {
          sql:
            "SET SESSION TRANSACTION ISOLATION LEVEL " +
            (isolationLevel ?? this.config.defaultIsolationLevel ?? "REPEATABLE_READ").replace(
              /_/g,
              " ",
            ),
          timeout: this.#timeout,
        },
        (err) => {
          if (err) {
            reject(new Error(err.message));
            return;
          }

          this.isOnTransaction = true;
          resolve();
        },
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
      conn.commit((err: mysqlType.MysqlError | null) => {
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
      conn.rollback((err: mysqlType.MysqlError | null) => {
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

      const resultItems: any[] = [];
      for (const queryString of queryStrings) {
        this.#logger.debug(`쿼리 실행(${queryString.length.toLocaleString()}): ${queryString}`);
        await new Promise<void>((resolve, reject) => {
          let rejected = false;
          conn
            .query({ sql: queryString, timeout: this.#timeout }, (err, queryResults) => {
              this.#startTimeout();

              if (err) {
                rejected = true;
                reject(
                  new SdError(
                    err,
                    "쿼리 수행중 오류발생" +
                      (err.sql !== undefined ? "\n-- query\n" + err.sql.trim() + "\n--" : ""),
                  ),
                );
                return;
              }

              if (queryResults instanceof Array) {
                for (const queryResult of queryResults.filter(
                  (item) => !("affectedRows" in item && "fieldCount" in item),
                )) {
                  resultItems.push(queryResult);
                }
              }
            })
            .on("error", (err) => {
              this.#startTimeout();
              if (rejected) return;

              rejected = true;
              reject(
                new SdError(
                  err,
                  "쿼리 수행중 오류발생" +
                    (err.sql !== undefined ? "\n-- query\n" + err.sql.trim() + "\n--" : ""),
                ),
              );
            })
            .on("end", () => {
              this.#startTimeout();
              if (rejected) return;

              resolve();
            });
        });
      }

      results.push(resultItems);
    }

    return results;
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    const qh = new QueryHelper("mysql");

    const colNames = columnDefs.map((def) => def.name);

    let q = "";
    q += `INSERT INTO ${tableName} (${colNames.map((item) => "`" + item + "`").join(", ")})
          VALUES`;
    q += "\n";
    for (const record of records) {
      q += `(${colNames.map((colName) => qh.getQueryValue(record[colName])).join(", ")}),\n`;
    }
    q = q.slice(0, -2) + ";";

    await this.executeAsync([q]);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    const qh = new QueryHelper("mysql");

    const colNames = columnDefs.map((def) => def.name);

    let q = "";
    q += `INSERT INTO ${tableName} (${colNames.map((item) => "`" + item + "`").join(", ")})
          VALUES`;
    q += "\n";
    for (const record of records) {
      q += `(${colNames.map((colName) => qh.getQueryValue(record[colName])).join(", ")}),\n`;
    }
    q = q.slice(0, -2);

    q += "\n";
    q += "ON DUPLICATE KEY UPDATE\n";
    for (const colName of columnDefs
      .filter((item) => !item.autoIncrement)
      .map((item) => item.name)) {
      q += `${colName} = VALUES(${colName}),\n`;
    }
    q = q.slice(0, -2) + ";";

    await this.executeAsync([q]);
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
}
