import * as tedious from "tedious";
import {Logger, Wait} from "@simplism/core";
import {IQueryDef, QueryBuilder} from "../../orm-query/src";

export class DbConnection {
  private readonly _logger = new Logger("@simplism/orm-connector");

  private _conn?: tedious.Connection;
  public isConnected = false;
  private readonly _requests: tedious.Request[] = [];

  public constructor(private readonly _config: {
    server?: string;
    port?: number;
    username: string;
    password: string;
  }) {
  }

  public async connectAsync(): Promise<void> {
    const conn = new tedious.Connection({
      server: this._config.server || "localhost",
      userName: this._config.username,
      password: this._config.password,
      options: {
        port: this._config.port,
        rowCollectionOnDone: true,
        useUTC: false,
        encrypt: false,
        requestTimeout: 30000
      }
    });

    conn.on("infoMessage", async info => {
      this._logger.log(info.message);
    });

    conn.on("errorMessage", async error => {
      this._logger.error(error.message);
    });

    conn.on("error", async error => {
      this._logger.error(error.message);
    });

    await new Promise<void>((resolve, reject) => {
      conn.on("connect", err => {
        if (err) {
          reject(new Error(err.message));
          return;
        }

        this.isConnected = true;
        resolve();
      });
    });

    this._conn = conn;
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      if (this._conn && this.isConnected) {
        const conn = this._conn;

        conn.on("end", () => {
          delete this._conn;
          this.isConnected = false;
          resolve();
        });

        conn.cancel();
        await Wait.true(() => this._requests.length < 1);
        conn.close();
      } else {
        reject(new Error("'Connection'이 연결되어있지 않습니다."));
      }
    });
  }

  public async beginTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.beginTransaction(
        err => {
          if (err) {
            reject(new Error(err.message));
          }
          resolve();
        },
        "",
        tedious.ISOLATION_LEVEL.READ_COMMITTED
      );
    });
  }

  public async commitTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.commitTransaction(err => {
        if (err) {
          reject(new Error(err.message));
        }
        resolve();
      });
    });
  }

  public async rollbackTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.rollbackTransaction(err => {
        if (err) {
          reject(new Error(err.message));
        }
        resolve();
      });
    });
  }

  public async executeAsync(queryList: (string | IQueryDef)[]): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }

    const conn = this._conn;

    const results: any[][] = [];
    const queries = (
      queryList.map(query => query["type"]
        ? new QueryBuilder().from(query as IQueryDef).query
        : query as string
      ).join("\n\n")
    ).split("GO").map(item => item.trim()).filter((item: any) => !!item);

    for (const currQuery of queries) {
      this._logger.log("쿼리 실행:", currQuery);
      await new Promise<void>((resolve, reject) => {
        let rejected = false;
        const queryRequest = new tedious
          .Request(currQuery, err => {
            if (err) {
              rejected = true;
              this._requests.remove(queryRequest);

              if (err["code"] === "ECANCEL") {
                reject(new Error("쿼리가 취소되었습니다."));
              } else {
                reject(new Error(`[${err["code"]}] ${err.message}\n-- query\n${currQuery}\n--`));
              }
            }
          })
          .on("done", (rowCount, more, rows) => {
            if (rejected) {
              return;
            }

            const result = rows.map((item: tedious.ColumnValue[]) => {
              const resultItem = {};
              for (const col of item) {
                resultItem[col.metadata.colName] = col.value;
              }
              return resultItem;
            });

            results.push(result);
          })
          .on("error", err => {
            if (rejected) {
              return;
            }

            rejected = true;
            this._requests.remove(queryRequest);
            reject(new Error(err.message));
          })
          .on("requestCompleted", () => {
            if (rejected) {
              return;
            }

            this._requests.remove(queryRequest);
            resolve();
          });

        this._requests.push(queryRequest);

        conn.execSqlBatch(queryRequest);
      });
    }

    return results;
  }
}