import {IDbConnectionConfig} from "./commons";
import {Logger} from "@simplysm/sd-core-node";
import * as tedious from "tedious";
import {EventEmitter} from "events";
import {Wait} from "@simplysm/sd-core-common";
import {IDbConnection} from "./IDbConnection";

export class MssqlDbConnection extends EventEmitter implements IDbConnection {
  private readonly _logger = Logger.get(["simplysm", "sd-orm-node", "MssqlDbConnection"]);

  private readonly _timeout = 300000;

  private _conn?: tedious.Connection;
  private _connTimeout?: NodeJS.Timeout;
  private _requests: tedious.Request[] = [];

  public isConnected = false;
  public isOnTransaction = false;

  public constructor(private readonly _config: IDbConnectionConfig) {
    super();
  }

  public async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = new tedious.Connection({
      server: this._config.host ?? "localhost",
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
        requestTimeout: this._timeout,
        trustServerCertificate: true
      }
    } as any);

    conn.on("infoMessage", info => {
      this._logger.debug(info.message);
    });

    conn.on("errorMessage", error => {
      this._logger.error("errorMessage: " + error.message);
    });

    conn.on("error", error => {
      this._logger.error("error: " + error.message);
    });

    await new Promise<void>((resolve, reject) => {
      conn.on("connect", err => {
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

    conn.on("end", () => {
      this.emit("close");
      this._requests = [];
      this.isConnected = false;
      this.isOnTransaction = false;
      delete this._conn;
    });

    this._conn = conn;
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>(async (resolve, reject) => {
      this._stopTimeout();

      if (!this._conn || !this.isConnected) {
        // reject(new Error("'Connection'이 연결되어있지 않습니다."));
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

        this.isOnTransaction = true;
        resolve();
      }, "", tedious.ISOLATION_LEVEL.READ_UNCOMMITTED);
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
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = false;
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
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = false;
        resolve();
      });
    });
  }

  public async executeAsync(queries: string[]): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    const results: any[][] = [];
    for (const queryString of queries) {
      this._logger.debug("쿼리 실행:\n" + queryString);
      await new Promise<void>((resolve, reject) => {
        let rejected = false;
        const queryRequest = new tedious
          .Request(queryString, err => {
            if (err != null) {
              rejected = true;
              this._requests.remove(queryRequest);

              if (err["code"] === "ECANCEL") {
                reject(new Error("쿼리가 취소되었습니다."));
              }
              else {
                if (err["lineNumber"] > 0) {
                  const splitQuery = queryString.split("\n");
                  splitQuery[err["lineNumber"] - 1] = "==> " + splitQuery[err["lineNumber"] - 1];
                  reject(new Error(`[${err["code"] as string}] ${err.message}\n-- query\n${splitQuery.join("\n")}\n--`));
                }
                else {
                  reject(new Error(`[${err["code"] as string}] ${err.message}\n-- query\n${queryString}\n--`));
                }
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

  private _stopTimeout(): void {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
  }

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
}
