import {DbQueryable} from "./DbQueryable";
import {ITableDef, modelDefMetadataKey} from "./decorators";
import {Type} from "../../core/src";
import {helpers} from "./helpers";
import * as tedious from "tedious";
import {Logger} from "@simplism/core";

export abstract class DbConnection {
  private readonly _logger = new Logger("@simplism/orm", "DbConnection");
  private readonly _preparedQueries: string[] = [];
  private _conn?: tedious.Connection;

  protected abstract get _configs(): { server: string; userName: string; password: string };

  public static async connectAsync<D extends DbConnection, R>(connType: Type<D>, callback: (conn: D) => Promise<R>): Promise<R> {
    const conn = new connType();
    await conn._connectAsync();
    await conn._beginTransactionAsync();

    let result: R;
    try {
      result = await callback(conn);
      await conn._commitTransactionAsync();
    }
    catch (err) {
      await conn._rollbackTransactionAsync();
      await conn._closeAsync();
      throw err;
    }
    await conn._closeAsync();
    return result;
  }

  public async initializeAsync(databases: string[]): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      const tableDefs = Object.keys(this)
        .filter(key => this[key] instanceof DbQueryable)
        .map(key => core.Reflect.getMetadata(modelDefMetadataKey, this[key].tableType) as ITableDef)
        .filter(def => databases.includes(def.database));

      let query = "";

      // DB 재생성
      for (const db of databases) {
        query += `DROP DATABASE IF EXISTS [${db}];\r\n`;
        query += `CREATE DATABASE [${db}];\r\n`;
      }
      query += "GO;\r\n\n";

      // 테이블 생성
      for (const tableDef of tableDefs) {
        if (!databases.includes(tableDef.database)) {
          continue;
        }

        if (!tableDef.columns) {
          throw new Error(`${tableDef.name}의 컬럼 설정이 잘못되었습니다.`);
        }

        query += `CREATE TABLE ${helpers.tableKey(tableDef)} (\r\n`;
        query += tableDef.columns
          .map(colDef => `\t[${colDef.name}] ${colDef.dataType} ${colDef.autoIncrement ? "IDENTITY(1,1) " : " "}${colDef.nullable ? "NULL" : "NOT NULL"}`)
          .join(",\r\n") + "\r\n";
        query += ");\r\n";

        const pkColDefs = tableDef.columns.filter(item => item.primaryKey !== undefined).orderBy(item => item.primaryKey);
        if (pkColDefs.length > 0) {
          query += `ALTER TABLE ${helpers.tableKey(tableDef)} ADD PRIMARY KEY (${pkColDefs.map(item => `[${item.name}] ASC`).join(", ")});\r\n`;
        }

        query += "\r\n";
      }

      // FK 연결
      for (const tableDef of tableDefs.filter(item => item.foreignKeys)) {
        for (const fkDef of tableDef.foreignKeys!) {
          const targetTableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, fkDef.targetTypeFwd());
          if (!targetTableDef.columns) {
            throw new Error(`${targetTableDef.name}의 컬럼 설정이 잘못되었습니다.`);
          }
          const targetPkColDefs = targetTableDef.columns.filter(item => item.primaryKey !== undefined).orderBy(item => item.primaryKey);

          query += `ALTER TABLE ${helpers.tableKey(tableDef)} ADD CONSTRAINT [FK_${tableDef.database}_${tableDef.scheme}_${tableDef.name}_${fkDef.name}] FOREIGN KEY (${fkDef.columnNames.map(colName => `[${colName}]`).join(", ")})\r\n`;
          query += `\tREFERENCES ${helpers.tableKey(targetTableDef)} (${targetPkColDefs.map(item => `[${item.name}]`).join(", ")})\r\n`;
          query += "\tON DELETE NO ACTION\r\n";
          query += "\tON UPDATE NO ACTION;\r\n";
        }

        query += "\r\n";
      }

      await this.executeAsync(query);
    }
    else {
      throw new Error("미구현");
    }
  }

  public prepare(query: string): void {
    this._preparedQueries.push(query);
  }

  public async executeAsync(query: string): Promise<any[][]> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    const results: any[][] = [];
    const queries = query.split("GO;");

    for (const subQuery of queries) {
      this._logger.log("쿼리를 수행합니다.\r\n" + subQuery);
      await new Promise<void>((resolve, reject) => {
        const queryRequest = new tedious
          .Request(subQuery, async err => {
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
            if (result.length > 0) {
              results.push(result);
            }

            if (!more) {
              resolve();
            }
          })
          .on("error", async err => {
            this._logger.error(err.message + "\r\n" + subQuery);
            reject(err);
          });

        this._conn!.execSqlBatch(queryRequest);
      });
    }

    return results;
  }

  public async executePreparedAsync(): Promise<any[][]> {
    const query = this._preparedQueries.join("\r\n");
    return await this.executeAsync(query);
  }

  public async bulkInsertAsync<T>(tableType: Type<T>, items: T[]): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, tableType);
    if (!tableDef.columns) {
      throw new Error(`${tableDef.name}의 컬럼 설정이 잘못되었습니다.`);
    }

    const table = helpers.tableKey(tableDef);
    const columns = tableDef.columns.map(item => ({
      name: item.name,
      dataType: item.dataType!,
      nullable: item.nullable
    }));

    await new Promise<void>((resolve, reject) => {
      const bulkLoad = this._conn!.newBulkLoad(table, async err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });

      for (const column of columns) {
        const tediousType = helpers.getTediousTypeFromDataType(column.dataType);
        bulkLoad.addColumn(column.name, tediousType.type, {
          length: tediousType.length,
          nullable: column.nullable || false
        });
      }

      for (const item of items) {
        bulkLoad.addRow(item);
      }

      this._conn!.execBulkLoad(bulkLoad);
    });
  }

  private async _connectAsync(): Promise<void> {
    this._conn = await new Promise<tedious.Connection>((resolve, reject) => {
      const conn = new tedious.Connection({
        server: this._configs.server,
        userName: this._configs.userName,
        password: this._configs.password,
        options: {
          rowCollectionOnDone: true,
          useUTC: false
        }
      });

      conn.on("connect", err => {
        if (err) {
          reject(err);
          return;
        }
        resolve(conn);
      });
    });
  }

  private async _beginTransactionAsync(): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await new Promise<void>((resolve, reject) => {
      this._conn!.beginTransaction(
        err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        },
        undefined,
        tedious.ISOLATION_LEVEL.READ_COMMITTED
      );
    });
  }

  private async _commitTransactionAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (!this._conn) {
        throw new Error("DB에 연결되어있지 않습니다.");
      }

      this._conn.commitTransaction(
        err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  private async _rollbackTransactionAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (!this._conn) {
        throw new Error("DB에 연결되어있지 않습니다.");
      }

      this._conn.rollbackTransaction(
        err => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  private async _closeAsync(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (!this._conn) {
        throw new Error("DB에 연결되어있지 않습니다.");
      }

      this._conn.on("end", async err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
      this._conn.close();
    });
  }
}