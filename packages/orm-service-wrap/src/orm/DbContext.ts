import "@simplism/core";
import {IDbConnectionConfig} from "@simplism/orm-common";
import {ITableDef, MigrationQueryBuilder, ormHelpers, tableDefMetadataKey} from "@simplism/orm-query";
import {Queryable} from "./Queryable";
import {ServiceInterface} from "@simplism/service-interface";

export abstract class DbContext {
  public abstract get config(): IDbConnectionConfig;

  private _connId?: number;
  private _serviceInterface?: ServiceInterface;

  public async connectAsync<R>(serviceInterface: ServiceInterface, fn: (db: this) => Promise<R>, trans: boolean = true): Promise<R> {
    this._serviceInterface = serviceInterface;

    const connId = await serviceInterface.orm.connectAsync(this.config);
    this._connId = connId;

    if (trans) {
      await serviceInterface.orm.beginTransactionAsync(connId);
    }

    let result: R;
    try {
      result = await fn(this);

      if (trans) {
        await serviceInterface.orm.commitTransactionAsync(connId);
      }
    }
    catch (err) {
      if (trans) {
        await serviceInterface.orm.rollbackTransactionAsync(connId);
      }
      await serviceInterface.orm.closeAsync(connId);
      throw err;
    }

    await serviceInterface.orm.closeAsync(connId);

    return result;
  }

  public async initializeAsync(): Promise<void> {
    const tableDefs = Object.values(this)
      .ofType(Queryable)
      .map(qr => core.Reflect.getMetadata(tableDefMetadataKey, qr.modelType) as ITableDef)
      .filterExists();

    const dbNames = tableDefs.map(item => item.database).distinct();

    let query = "";
    if (dbNames.length < 1) {
      throw new Error("생성할 데이터베이스가 없습니다.");
    }
    for (const db of dbNames) {
      query += new MigrationQueryBuilder().dropDatabase(db) + "\n";
    }

    for (const db of dbNames) {
      query += new MigrationQueryBuilder().dropDatabase(db) + "\n";
      query += new MigrationQueryBuilder().createDatabase(db) + "\n";
    }
    query += "GO\n";
    query += "\n";

    // 테이블 생성
    for (const tableDef of tableDefs) {
      if (!tableDef.columns) {
        throw new Error(`${tableDef.name}의 컬럼 설정이 잘못되었습니다.`);
      }

      const columns = tableDef.columns.map(col => ({
        name: col.name,
        dataType: col.dataType || ormHelpers.getDataTypeFromType(col.typeFwd()),
        nullable: col.nullable,
        autoIncrement: col.autoIncrement
      }));

      query += new MigrationQueryBuilder().createTable(
        {
          database: tableDef.database,
          scheme: tableDef.scheme,
          name: tableDef.name
        },
        columns
      ) + "\n";

      // PK 설정
      const primaryKeys = tableDef.columns
        .filter(item => item.primaryKey !== undefined)
        .orderBy(item => item.primaryKey)
        .map(item => ({name: item.name, desc: false}));

      if (primaryKeys.length > 0) {
        query += new MigrationQueryBuilder().addPrimaryKey(
          {
            database: tableDef.database,
            scheme: tableDef.scheme,
            name: tableDef.name
          },
          primaryKeys
        ) + "\n";
      }
    }
    query += "\n";

    // FK 연결
    for (const tableDef of tableDefs) {
      const fkDefs = (tableDef.foreignKeys || [])
        .map(fkDef => {
          const targetTableDef: ITableDef = core.Reflect.getMetadata(tableDefMetadataKey, fkDef.targetTypeFwd());

          if (!targetTableDef.columns) {
            throw new Error(`${targetTableDef.name}의 컬럼 설정이 잘못되었습니다.`);
          }

          const targetPkNames = targetTableDef.columns
            .filter(item => item.primaryKey !== undefined)
            .orderBy(item => item.primaryKey)
            .map(item => item.name);

          return {
            name: fkDef.name,
            columnNames: fkDef.columnNames,
            targetTableDef: {
              database: targetTableDef.database,
              scheme: targetTableDef.scheme,
              name: targetTableDef.name
            },
            targetColumnNames: targetPkNames
          };
        });

      for (const fkDef of fkDefs) {
        query += new MigrationQueryBuilder().addForeignKey(
          {
            database: tableDef.database,
            scheme: tableDef.scheme,
            name: tableDef.name
          },
          fkDef
        ) + "\n";
      }
    }
    query += "\n";

    await this.executeAsync(query.trim());
  }

  public async executeAsync(query: string): Promise<any[][]> {
    return await this._serviceInterface!.orm.executeAsync(this._connId!, query);
  }

  public async dropAllAsync(): Promise<void> {
    const tableDefs = Object.values(this)
      .ofType(Queryable)
      .map(qr => core.Reflect.getMetadata(tableDefMetadataKey, qr.modelType) as ITableDef)
      .filterExists();

    const dbNames = tableDefs.map(item => item.database).distinct();

    let query = "";
    for (const db of dbNames) {
      query += new MigrationQueryBuilder().dropDatabase(db) + "\n";
    }

    await this.executeAsync(query.trim());
  }
}