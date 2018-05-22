import {Queryable} from "./Queryable";
import {ITableDef, modelDefMetadataKey} from "./decorators";
import {Type} from "@simplism/core";
import {helpers} from "./helpers";
import {WebSocketClient} from "@simplism/websocket-client";

export abstract class Database {
  private _connectionId?: number;
  private _preparedQueries: string[] = [];
  private _prepareResultIndexes: boolean[] = [];

  protected abstract get _configs(): { server: string; port: number; userName: string; password: string };

  // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
  public constructor(private readonly _ws: WebSocketClient) {
  }

  public async connectAsync<R>(callback: () => Promise<R>): Promise<R> {
    this._connectionId = await this._ws.sendAsync("OrmService.connect", this._configs);

    let result: R;
    try {
      result = await callback();
    }
    catch (err) {
      await this._ws.sendAsync("OrmService.close", this._connectionId);
      throw err;
    }
    await this._ws.sendAsync("OrmService.close", this._connectionId);
    return result;
  }

  public prepare(query: string, resultIndexes?: boolean[]): void {
    this._preparedQueries.push(query);
    if (resultIndexes) {
      this._prepareResultIndexes.pushRange(resultIndexes);
    }
  }

  public async executeAsync(query: string): Promise<any[][]> {
    return await this._ws.sendAsync("OrmService.execute", this._connectionId, query);
  }

  public async executePreparedAsync(): Promise<any[][]> {
    const queryResult = await this._ws.sendAsync("OrmService.execute", this._connectionId, this._preparedQueries.join("\r\n"));
    const result: any[][] = [];
    for (let i = 0; i < this._prepareResultIndexes.length; i++) {
      if (this._prepareResultIndexes[i]) {
        result.push(queryResult[i]);
      }
    }

    this._preparedQueries = [];
    this._prepareResultIndexes = [];
    return result;
  }

  public async bulkInsertAsync<T>(tableType: Type<T>, items: T[]): Promise<void> {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, tableType);
    if (!tableDef.columns) {
      throw new Error(`${tableDef.name}의 컬럼 설정이 잘못되었습니다.`);
    }

    await this._ws.sendAsync(
      "OrmService.bulkInsert",
      this._connectionId,
      {
        table: helpers.tableKey(tableDef),
        columns: tableDef.columns.map(item => ({
          name: item.name,
          dataType: item.dataType || helpers.getDataTypeFromType(item.typeFwd()),
          nullable: item.nullable
        }))
      },
      items
    );
  }

  public async initializeAsync(databases: string[]): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      const tableDefs = Object.keys(this)
        .filter(key => this[key] instanceof Queryable)
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
          .map(colDef => `\t[${colDef.name}] ${colDef.dataType || helpers.getDataTypeFromType(colDef.typeFwd())} ${colDef.autoIncrement ? "IDENTITY(1,1) " : " "}${colDef.nullable ? "NULL" : "NOT NULL"}`)
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
}