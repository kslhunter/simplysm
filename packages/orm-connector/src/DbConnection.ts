import * as tedious from "tedious";
import {Logger} from "@simplism/core";
import {IDbConnectionConfig} from "@simplism/orm-common";

export class DbConnection {
  private readonly _logger = new Logger("@simplism/orm-connector", "DbConnection");

  private _conn?: tedious.Connection;
  public isConnected = false;

  public constructor(private readonly _config: IDbConnectionConfig) {
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
        encrypt: false
      }
    });

    await new Promise<void>((resolve, reject) => {
      conn.on("connect", err => {
        if (err) {
          reject(err);
          return;
        }

        this.isConnected = true;
        resolve();
      });
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

    this._conn = conn;
  }

  public async closeAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (this._conn && this.isConnected) {
        const conn = this._conn;

        conn.on("end", err => {
          if (err) {
            reject(err);
            return;
          }

          this.isConnected = false;
          resolve();
        });

        conn.cancel();
        conn.close();
      }
      else {
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
            reject(err);
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
          reject(err);
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
          reject(err);
        }
        resolve();
      });
    });
  }

  public async executeAsync(query: string): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }

    const conn = this._conn;

    const results: any[][] = [];
    const queries = query.split(/GO;?/);

    for (const currQuery of queries) {
      this._logger.log("쿼리 실행:", currQuery);
      await new Promise<void>((resolve, reject) => {
        const queryRequest = new tedious
          .Request(currQuery, err => {
            if (err) {
              reject(err);
            }
          })
          .on("done", (rowCount, more, rows) => {
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
            reject(err);
          })
          .on("requestCompleted", () => {
            resolve();
          });

        conn.execSqlBatch(queryRequest);
      });
    }

    return results;
  }
}