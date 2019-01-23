import * as tedious from "tedious";
import {Logger, Wait} from "@simplysm/common";
import {EventEmitter} from "events";
import {IDbConnectionConfig, IQueryDef, QueryBuilder} from "@simplysm/orm-common";

export class DbConnection extends EventEmitter {
  private readonly _logger = new Logger("@simplysm/orm-connector");

  private _conn?: tedious.Connection;
  public isConnected = false;
  private _requests: tedious.Request[] = [];

  private readonly _timeout = 300000;

  public constructor(private readonly _config: IDbConnectionConfig) {
    super();
  }

  public async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = new tedious.Connection({
      server: this._config.host || "localhost",
      authentication: {
        type: "default",
        options: {
          userName: this._config.username,
          password: this._config.password
        }
      },
      options: {
        port: this._config.port,
        rowCollectionOnDone: true,
        useUTC: false,
        encrypt: false,
        requestTimeout: this._timeout
      }
    } as any);

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

        this._startTimeout();
        this.isConnected = true;
        resolve();
      });
    });

    this._conn = conn;

    conn.on("end", () => {
      this.emit("close");
      this._requests = [];
      this.isConnected = false;
      delete this._conn;
    });
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      this._stopTimeout();

      if (!this._conn || !this.isConnected) {
        reject(new Error("'Connection'이 연결되어있지 않습니다."));
        return;
      }

      this._conn.on("end", () => {
        resolve();
      });

      this._conn.cancel();
      await Wait.true(() => this._requests.length < 1, undefined, 10000);
      this._conn.close();
    });
  }

  public async beginTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.beginTransaction(err => {
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      }, "", tedious.ISOLATION_LEVEL.READ_COMMITTED);
    });
  }

  public async commitTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.commitTransaction(err => {
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    });
  }

  public async rollbackTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.rollbackTransaction(err => {
        if (err) {
          reject(new Error(err.message));
          return;
        }
        resolve();
      });
    });
  }

  public async executeAsync(queryList: (string | IQueryDef)[]): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

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
              }
              else {
                reject(new Error(`[${err["code"]}] ${err.message}\n-- query\n${currQuery}\n--`));
              }
            }
          })
          .on("done", (rowCount, more, rows) => {
            this._startTimeout();

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

        conn.execSqlBatch(queryRequest);
      });
    }

    return results;
  }

  private _connTimeout?: NodeJS.Timeout;

  private _startTimeout(): void {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
    this._connTimeout = setTimeout(
      async () => {
        await this.closeAsync();
      },
      this._timeout * 2
    );
  }

  private _stopTimeout(): void {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
  }
}
