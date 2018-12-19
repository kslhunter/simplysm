import {Type} from "@simplism/core";
import {IDbConnectionConfig} from "@simplism/orm-common";
import {
  IQueryDef,
  ITableDef,
  MigrationQueryBuilder,
  ormHelpers,
  QueryBuilder,
  tableDefMetadataKey
} from "@simplism/orm-query";
import {Queryable} from "./Queryable";
import {IDbMigration} from "./IDbMigration";
import {IDbContextExecutor} from "./IDbContextExecutor";

export abstract class DbContext {
  private _withoutTransaction?: boolean;

  public abstract get config(): IDbConnectionConfig;

  public abstract get migrations(): Type<IDbMigration>[];

  public constructor(private readonly _executor?: IDbContextExecutor) {
  }

  public async connectAsync<R>(fn: (db: this) => Promise<R>, withoutTransaction?: boolean): Promise<R> {
    this._withoutTransaction = withoutTransaction;
    return await this._executor!.connectAsync(this, fn, withoutTransaction);
  }

  public async forceCloseAsync(): Promise<void> {
    await this._executor!.forceCloseAsync();
  }

  public async executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(queries: (string | IQueryDef)[], colDefs?: C, joinDefs?: { as: string; isSingle: boolean }[]): Promise<undefined extends C ? any[][] : any[]> {
    return await this._executor!.executeAsync(queries, colDefs, joinDefs);
  }

  public preparedQueries: (string | IQueryDef)[] = [];
  private _preparedResultIndexed: boolean[] = [];

  public async initializeAsync(dbNames: string[], force?: boolean): Promise<boolean> {
    if (force && !this._withoutTransaction) {
      throw new Error("DB 초기화 함수 (initializeAsync)는 트랜젝션을 사용할 수 없습니다.");
    }

    if (!force) {
      const isDbExists = (
        await this.executeAsync([`SELECT COUNT(*) as [cnt] FROM [master].[dbo].[sysdatabases] WHERE [name] = '${this.config.database}'`])
      )[0][0].cnt > 0;

      if (isDbExists) {
        const isTableExists = (
          await this.executeAsync([`SELECT COUNT(*) as [cnt] FROM [${this.config.database}].[INFORMATION_SCHEMA].[TABLES] WHERE [TABLE_NAME] = '_migration'`])
        )[0][0].cnt > 0;

        if (isTableExists) {
          //-- Migration
          const dbMigrations = (
            await this.executeAsync([
              new QueryBuilder().from(`[${this.config.database}].[dbo].[_migration]`).def
            ])
          )[0].map(item => item.code);
          console.log(dbMigrations);


          const migrations = this.migrations.filter(item => !dbMigrations.includes(item.name)).orderBy(item => item.name);
          if (migrations.length > 0) {
            await this._executor!.transAsync(async () => {
              for (const migration of migrations) {
                await new migration().up(this);

                await this.executeAsync([
                  new QueryBuilder()
                    .from(`[${this.config.database}].[dbo].[_migration]`)
                    .insert({code: migration.name})
                    .def
                ]);
              }
            });
          }

          return false;
        }
      }
    }

    //-- Initialize
    {
      const tableDefs = Object.values(this)
        .ofType(Queryable)
        .map(qr => core.Reflect.getMetadata(tableDefMetadataKey, qr.tableType!) as ITableDef)
        .filter(item => !item.database || dbNames.includes(item.database))
        .filterExists();

      let query = "";
      if (dbNames.length < 1) {
        throw new Error("생성할 데이터베이스가 없습니다.");
      }

      for (const dbName of dbNames) {
        query += new MigrationQueryBuilder().clearDatabaseIfExists(dbName) + "\n";
        query += new MigrationQueryBuilder().createDatabaseIfNotExists(dbName) + "\n";
        query += "GO\n\n";
      }

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
            database: tableDef.database || this.config.database,
            scheme: tableDef.scheme,
            name: tableDef.name
          },
          columns
        ) + "\n";
      }
      query += "GO\n\n";

      // PK 설정
      for (const tableDef of tableDefs) {
        if (!tableDef.columns) {
          throw new Error(`${tableDef.name}의 컬럼 설정이 잘못되었습니다.`);
        }

        const primaryKeys = tableDef.columns
          .filter(item => item.primaryKey !== undefined)
          .orderBy(item => item.primaryKey)
          .map(item => ({name: item.name, desc: false}));

        if (primaryKeys.length > 0) {
          query += new MigrationQueryBuilder().addPrimaryKey(
            {
              database: tableDef.database || this.config.database,
              scheme: tableDef.scheme,
              name: tableDef.name
            },
            primaryKeys
          ) + "\n";
        }
      }
      query += "GO\n\n";

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
                database: targetTableDef.database || this.config.database,
                scheme: targetTableDef.scheme,
                name: targetTableDef.name
              },
              targetColumnNames: targetPkNames
            };
          });

        for (const fkDef of fkDefs) {
          query += new MigrationQueryBuilder().addForeignKey(
            {
              database: tableDef.database || this.config.database,
              scheme: tableDef.scheme,
              name: tableDef.name
            },
            fkDef
          ) + "\n";
        }
      }
      query += "GO\n\n";

      query += new MigrationQueryBuilder().createTable(
        {database: this.config.database, scheme: "dbo", name: "_migration"},
        [
          {
            name: "code",
            dataType: "NVARCHAR(255)",
            autoIncrement: false,
            nullable: false
          }
        ]
      ) + "\n";

      query += new MigrationQueryBuilder().addPrimaryKey(
        {database: this.config.database, scheme: "dbo", name: "_migration"},
        [
          {name: "code", desc: false}
        ]
      ) + "\n";
      query += "GO\n\n";

      for (const migration of this.migrations.orderBy(item => item.name)) {
        query += new QueryBuilder()
          .from(`[${this.config.database}].[dbo].[_migration]`)
          .insert({code: migration.name})
          .query + "\n";
      }

      await this.executeAsync([query.trim()]);
    }
    return true;
  }

  public prepare(query: (string | IQueryDef)[], preparedResultIndexed: boolean[]): void {
    this.preparedQueries.pushRange(query);
    this._preparedResultIndexed = this._preparedResultIndexed.concat(preparedResultIndexed);
  }

  public async executePreparedAsync(): Promise<any[][]> {
    if (this.preparedQueries.length < 1) {
      return [];
    }

    const result: any[][] = [];
    const resultTmp: any[][] = await this.executeAsync(this.preparedQueries);
    for (let i = 0; i < resultTmp.length; i++) {
      if (this._preparedResultIndexed[i]) {
        result.push(resultTmp[i]);
      }
    }

    this.preparedQueries = [];
    this._preparedResultIndexed = [];
    return result;
  }

  /*public async dropAllAsync(): Promise<void> {
    const tableDefs = Object.values(this)
      .ofType(Queryable)
      .map(qr => core.Reflect.getMetadata(tableDefMetadataKey, qr.tableType!) as ITableDef)
      .filterExists();

    const dbNames = tableDefs.map(item => item.database)
      .concat([this.config.database])
      .distinct()
      .filterExists();

    let query = "";
    for (const db of dbNames) {
      query += new MigrationQueryBuilder().clearDatabaseIfExists(db) + "\n";
    }

    await this.executeAsync(query.trim());
  }*/

  public async createTableAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    colDefs: {
      name: string;
      dataType: string;
      nullable?: boolean;
      autoIncrement?: boolean;
    }[]
  ): Promise<void> {
    const query = new MigrationQueryBuilder().createTable(
      {
        database: tableDef.database || this.config.database,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      colDefs
    );
    await this.executeAsync([query]);
  }

  public async dropTableAsync(
    tableDef: { database?: string; scheme?: string; name: string }
  ): Promise<void> {
    const query = new MigrationQueryBuilder().dropTable(
      {
        database: tableDef.database || this.config.database,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      }
    );
    await this.executeAsync([query]);
  }

  public async addPrimaryKeyAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    pkColDefs: {
      name: string;
      desc?: boolean;
    }[]
  ): Promise<void> {
    const query = new MigrationQueryBuilder().addPrimaryKey(
      {
        database: tableDef.database || this.config.database,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      pkColDefs
    );
    await this.executeAsync([query]);
  }

  public async addForeignKeyAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    fkDef: {
      name: string;
      columnNames: string[];
      targetTableDef: {
        database?: string;
        scheme?: string;
        name: string;
      };
      targetColumnNames: string[];
    }
  ): Promise<void> {
    const query = new MigrationQueryBuilder().addForeignKey(
      {
        database: tableDef.database || this.config.database,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      {
        name: fkDef.name,
        columnNames: fkDef.columnNames,
        targetTableDef: {
          database: fkDef.targetTableDef.database || this.config.database,
          scheme: fkDef.targetTableDef.scheme || "dbo",
          name: fkDef.targetTableDef.name
        },
        targetColumnNames: fkDef.targetColumnNames
      }
    );
    await this.executeAsync([query]);
  }

  public async removeForeignKeyAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    fkName: string
  ): Promise<void> {
    const query = new MigrationQueryBuilder().removeForeignKey(
      {
        database: tableDef.database || this.config.database,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      fkName
    );
    await this.executeAsync([query]);
  }

  public async addColumnAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    colDef: {
      name: string;
      dataType: string;
      nullable?: boolean;
      autoIncrement?: boolean;
    },
    defaultValue?: any
  ): Promise<void> {
    const query = new MigrationQueryBuilder().addColumn(
      {
        database: tableDef.database || this.config.database,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      colDef,
      defaultValue
    );
    await this.executeAsync([query]);
  }

  public async removeColumnAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    colName: string
  ): Promise<void> {
    const query = new MigrationQueryBuilder().removeColumn(
      {
        database: tableDef.database || this.config.database,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      colName
    );
    await this.executeAsync([query]);
  }

  public async modifyColumnAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    colDef: {
      name: string;
      dataType: string;
      nullable?: boolean;
      autoIncrement?: boolean;
    }
  ): Promise<void> {
    const query = new MigrationQueryBuilder().modifyColumn(
      {
        database: tableDef.database || this.config.database,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      colDef
    );
    await this.executeAsync([query]);
  }

  public async renameColumnAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    colName: string,
    newColName: string
  ): Promise<void> {
    const query = new MigrationQueryBuilder().renameColumn(
      {
        database: tableDef.database || this.config.database,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      colName,
      newColName
    );
    await this.executeAsync([query]);
  }

  /*private async _getClearDatabaseIfExistsQueryAsync(dbName: string): Promise<string> {
    let query = "";

    const cnt = (await this.executeAsync("select COUNT(*) as cnt from sys.databases WHERE name='ALIYO'"))[0][0].cnt;
    if (cnt < 1) return query;

    // 프록시저 초기화
    const procs = (await this.executeAsync(`
SELECT
  SCHEMA_NAME(schema_id) as [schema],
  o.name as [name]
FROM [${dbName}].sys.sql_modules m
INNER JOIN [${dbName}].sys.objects o ON m.object_id=o.object_id
WHERE type_desc like '%PROCEDURE%'`.trim()))[0];

    for (const proc of procs) {
      query += `DROP PROCEDURE [${dbName}].[${proc.schema}].[${proc.name}];\n`;
    }

    // 함수 초기화
    const funcs = (await this.executeAsync(`
SELECT
  SCHEMA_NAME(schema_id) as [schema],
  o.name as name
FROM [${dbName}].sys.sql_modules m
INNER JOIN [${dbName}].sys.objects o ON m.object_id=o.object_id
WHERE type_desc like '%function%'`.trim()))[0];

    for (const func of funcs) {
      query += `DROP FUNCTION [${dbName}].[${func.schema}].[${func.name}];\n`;
    }

    // 뷰 초기화
    const views = (await this.executeAsync(`
SELECT
  SCHEMA_NAME(schema_id) as [schema],
  v.name as name
FROM [${dbName}].sys.views v`.trim()))[0];

    for (const view of views) {
      query += `DROP VIEW [${dbName}].[${view.schema}].[${view.name}];\n`;
    }

    // 테이블 FK 끊기 초기화
    const fks = (await this.executeAsync(`
SELECT
  [tbl].[name] as tableName,
  [obj].[name] as name
FROM [${dbName}].sys.tables [tbl]
INNER JOIN [${dbName}].sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'`.trim()))[0];

    for (const fk of fks) {
      query += `ALTER TABLE [${dbName}].[dbo].[${fk.tableName}] DROP CONSTRAINT [${fk.name}];\n`;
    }

    // 테이블 삭제
    const tables = (await this.executeAsync(`
SELECT [tbl].[name] as name
FROM [${dbName}].sys.tables [tbl]
WHERE [type]= 'U'`.trim()))[0];

    for (const table of tables) {
      query += `DROP TABLE [${dbName}].[dbo].[${table.name}];\n`;
    }

    return query.trim();
  }*/
}
