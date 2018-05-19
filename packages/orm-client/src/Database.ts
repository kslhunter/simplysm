import {DbQueryable} from "./DbQueryable";
import {ITableDef, modelDefMetadataKey} from "./decorators";
import {Sorm} from "./Sorm";
import {SdWebSocketProvider} from "../providers/SdWebSocketProvider";
import {Type} from "@angular/core";

export abstract class DbConnection {
  private _connectionId?: number;
  private readonly _preparedQueries: string[] = [];

  protected abstract get _configs(): { server: string; userName: string; password: string };

  // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
  public constructor(private readonly _ws: SdWebSocketProvider) {
  }

  public async connectAsync<R>(callback: () => Promise<R>): Promise<R> {
    const res = await this._ws.sendAsync("db.connect", this._configs);
    this._connectionId = res.connectionId;

    let result: R;
    try {
      result = await callback();
    }
    catch (err) {
      await this._ws.sendAsync("db.close", {connectionId: this._connectionId});
      throw err;
    }
    await this._ws.sendAsync("db.close", {connectionId: this._connectionId});
    return result;
  }

  public prepare(query: string): void {
    this._preparedQueries.push(query);
  }

  public async executeAsync(query: string): Promise<any[][]> {
    return await this._ws.sendAsync("db.execute", {connectionId: this._connectionId, query});
  }

  public async executePreparedAsync(): Promise<any[][]> {
    return await this._ws.sendAsync("db.execute", {
      connectionId: this._connectionId,
      query: this._preparedQueries.join("\r\n")
    });
  }

  public async bulkInsertAsync<T>(tableType: Type<T>, items: T[]): Promise<void> {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, tableType);
    if (!tableDef.columns) {
      throw new Error(`${tableDef.name}의 컬럼 설정이 잘못되었습니다.`);
    }

    await this._ws.sendAsync("db.bulkInsert", {
      connectionId: this._connectionId,
      table: Sorm.tableKey(tableDef),
      columns: tableDef.columns.map(item => ({
        name: item.name,
        dataType: item.dataType,
        nullable: item.nullable
      })),
      rows: items
    });
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

        query += `CREATE TABLE ${Sorm.tableKey(tableDef)} (\r\n`;
        query += tableDef.columns
          .map(colDef => `\t[${colDef.name}] ${colDef.dataType} ${colDef.autoIncrement ? "IDENTITY(1,1) " : " "}${colDef.nullable ? "NULL" : "NOT NULL"}`)
          .join(",\r\n") + "\r\n";
        query += ");\r\n";

        const pkColDefs = tableDef.columns.filter(item => item.primaryKey !== undefined).orderBy(item => item.primaryKey);
        if (pkColDefs.length > 0) {
          query += `ALTER TABLE ${Sorm.tableKey(tableDef)} ADD PRIMARY KEY (${pkColDefs.map(item => `[${item.name}] ASC`).join(", ")});\r\n`;
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

          query += `ALTER TABLE ${Sorm.tableKey(tableDef)} ADD CONSTRAINT [FK_${tableDef.database}_${tableDef.scheme}_${tableDef.name}_${fkDef.name}] FOREIGN KEY (${fkDef.columnNames.map(colName => `[${colName}]`).join(", ")})\r\n`;
          query += `\tREFERENCES ${Sorm.tableKey(targetTableDef)} (${targetPkColDefs.map(item => `[${item.name}]`).join(", ")})\r\n`;
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