import {IDbConnectionConfig} from "@simplism/orm-common";
import {ITableDef, ormHelpers, tableDefMetadataKey} from "@simplism/orm-query";
import {Queryable} from "./Queryable";

export abstract class DbContext {
  public abstract get config(): IDbConnectionConfig;

  public async initializeAsync(): Promise<void> {
    const tableDefs = Object.values(this)
      .ofType(Queryable)
      .map(qr => core.Reflect.getMetadata(tableDefMetadataKey, qr.modelType) as ITableDef)
      .filterExists();

    const databaseNames = tableDefs
      .map(tableDef => tableDef.database)
      .distinct();

    let query = "";

    if (databaseNames.length < 1) {
      throw new Error("생성할 데이터베이스가 없습니다.");
    }

    // DB 재생성
    for (const db of databaseNames) {
      query += new MigrationQueryBuilder().createDatabase(db) + "\n";
    }
    query += "GO\n";
    query += "\n";

    // 테이블 생성
    for (const tableDef of tableDefs) {
      if (!tableDef.columns) {
        throw new Error(`${tableDef.name}의 컬럼 설정이 잘못되었습니다.`);
      }

      query += new MigrationQueryBuilder().createTable(
        {
          database: tableDef.database,
          scheme: tableDef.scheme,
          name: tableDef.name,
        },
        tableDef.columns.map(col => ({
          name: col.name,
          dataType: col.dataType || ormHelpers.getDataTypeFromType(col.typeFwd()),
          nullable: col.nullable,
          autoIncrement: col.autoIncrement
        }))
      ) + "\n";

      // PK 설정
      const pkColDefs = tableDef.columns
        .filter(item => item.primaryKey !== undefined)
        .orderBy(item => item.primaryKey)
        .map(item => ({name: item.name, rule: "ASC"}));

      if (pkColDefs.length > 0) {
        query += new MigrationQueryBuilder().addPrimaryKey(
          {
            database: tableDef.database,
            scheme: tableDef.scheme,
            name: tableDef.name
          },
          pkColDefs
        ) + "\n";
      }
    }
    query += "\n";

    // FK 연결
    for (const tableDef of tableDefs) {
      for (const fkDef of tableDef.foreignKeys!) {
        const targetTableDef: ITableDef = core.Reflect.getMetadata(tableDefMetadataKey, fkDef.targetTypeFwd());
        if (!targetTableDef.columns) {
          throw new Error(`${targetTableDef.name}의 컬럼 설정이 잘못되었습니다.`);
        }
        const targetPkNames = targetTableDef.columns
          .filter(item => item.primaryKey !== undefined)
          .orderBy(item => item.primaryKey)
          .map(item => item.name);

        query += new MigrationQueryBuilder().addForeignKey(
          {
            database: tableDef.database,
            scheme: tableDef.scheme,
            name: tableDef.name
          },
          {
            name: fkDef.name,
            columnNames: fkDef.columnNames,
            targetColumnNames: targetPkNames
          }
        ) + "\n";
      }
    }
    query += "\n";

    await this.executeAsync(query.trim());

    throw new Error("미구현");
  }

  public async dropAllAsync(): Promise<void> {
    throw new Error("미구현");
  }
}