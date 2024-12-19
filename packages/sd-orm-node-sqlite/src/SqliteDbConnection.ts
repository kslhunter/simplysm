import { EventEmitter } from "events";
import { SdError, StringUtil } from "@simplysm/sd-core-common";
import {
  type IDbConnection,
  type IQueryColumnDef,
  type ISOLATION_LEVEL,
  type ISqliteDbConnectionConfig,
  QueryHelper,
} from "@simplysm/sd-orm-common";
import { Logger } from "@simplysm/sd-core-node";
import sqlite3 from "sqlite3";

export class SqliteDbConnection extends EventEmitter implements IDbConnection {
  #logger = Logger.get(["simplysm", "sd-orm-node", this.constructor.name]);

  #timeout = 300000;

  #conn?: sqlite3.Database;
  #connTimeout?: NodeJS.Timeout;

  isConnected = false;
  isOnTransaction = false;

  constructor(public readonly config: ISqliteDbConnectionConfig) {
    super();
  }

  async connectAsync() {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = new sqlite3.Database(this.config.filePath);

    conn.on("close", () => {
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

      conn.on("open", () => {
        this.#startTimeout();
        this.isConnected = true;
        this.isOnTransaction = false;
        resolve();
      });

      conn.serialize();
    });

    this.#conn = conn;
  }

  async closeAsync() {
    this.#stopTimeout();

    await new Promise<void>((resolve, reject) => {
      if (!this.#conn || !this.isConnected) {
        return;
      }

      this.#conn.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        this.emit("close");
        this.isConnected = false;
        this.isOnTransaction = false;
        this.#conn = undefined;
        resolve();
      });
    });
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL) {
    if (!this.#conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this.#startTimeout();

    const conn = this.#conn;

    await new Promise<void>((resolve, reject) => {
      conn.run("BEGIN;", (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  async commitTransactionAsync() {
    if (!this.#conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this.#startTimeout();

    const conn = this.#conn;

    await new Promise<void>((resolve, reject) => {
      conn.run("COMMIT;", (err) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = false;
        resolve();
      });
    });
  }

  async rollbackTransactionAsync() {
    if (!this.#conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this.#startTimeout();

    const conn = this.#conn;

    await new Promise<void>((resolve, reject) => {
      conn.run("ROLLBACK;", (err: Error | null) => {
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
    for (const query of queries.filter((item) => !StringUtil.isNullOrEmpty(item))) {
      // const queryStrings = query.split(/;\r?\n/g);
      const queryStrings = [query];

      const resultItems: any[] = [];
      for (const queryString of queryStrings) {
        this.#logger.debug("쿼리 실행:\n" + queryString);
        await new Promise<void>((resolve, reject) => {
          conn.all(queryString, (err, queryResults) => {
            this.#startTimeout();

            if (err) {
              reject(new SdError(err, "쿼리 수행중 오류발생\n-- query\n" + queryString.trim() + "\n--"));
              return;
            }

            resultItems.push(...queryResults);
            resolve();
          });
        });
      }

      results.push(resultItems);
    }

    return results;
  }

  async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) {
    const qh = new QueryHelper("sqlite");

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

  async bulkUpsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]) {
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
    for (const colName of columnDefs.filter((item) => !item.autoIncrement).map((item) => item.name)) {
      q += `${colName} = VALUES(${colName}),\n`;
    }
    q = q.slice(0, -2) + ";";

    await this.executeAsync([q]);
  }

  #stopTimeout() {
    if (this.#connTimeout) {
      clearTimeout(this.#connTimeout);
    }
  }

  #startTimeout() {
    if (this.#connTimeout) {
      clearTimeout(this.#connTimeout);
    }
    this.#connTimeout = setTimeout(async () => {
      await this.closeAsync();
    }, this.#timeout * 2);
  }
}
