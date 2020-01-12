import {Queryable} from "./Queryable";
import {Type} from "@simplysm/sd-core";
import {ITableDef} from "./definitions";
import {MigrationQueryBuilder} from "./MigrationQueryBuilder";
import {QueryBuilder} from "./QueryBuilder";
import {IDbContextExecutor, IDbMigration, IQueryDef, tableDefMetadataKey} from "./commons";
import {QueryHelper} from "./QueryHelper";

export abstract class DbContext {
  // private _connId?: number;
  private _trans?: boolean;
  private _preparedResultIndexed: boolean[] = [];
  public preparedQueries: (string | IQueryDef)[] = [];
  public mainDb?: string;

  public abstract get configName(): string;

  public abstract get migrations(): Type<IDbMigration>[];

  // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
  public constructor(private readonly _executor: IDbContextExecutor) {
  }

  public getTableDefinitions(): ITableDef[] {
    return Object.values(this).ofType(Queryable).map(qr => qr.tableDef).filterExists();
  }

  public async connectAsync<R>(fn: (db: this) => Promise<R>, trans: boolean = true): Promise<R> {
    this.mainDb = await this._executor.getMainDbNameAsync(this.configName);
    if (!this.mainDb) {
      throw new Error("메인데이터베이스명을 알 수 없습니다.");
    }

    await this._executor.connectAsync(this.configName);

    if (trans) {
      await this._executor.beginTransactionAsync();
      this._trans = true;
    }

    let result: R;
    try {
      result = await fn(this);

      if (trans) {
        await this._executor.commitTransactionAsync();
        this._trans = false;
      }
    }
    catch (err) {
      if (trans) {
        try {
          await this._executor.rollbackTransactionAsync();
          this._trans = false;
        }
        catch (err1) {
          if (!err1.message.includes("ROLLBACK") || !err1.message.includes("BEGIN")) {
            await this._executor.closeAsync();
            this._trans = false;
            throw err1;
          }
        }
      }

      await this._executor.closeAsync();
      throw err;
    }

    await this._executor.closeAsync();
    return result;
  }

  public async transAsync<R>(fn: () => Promise<R>): Promise<R> {
    await this._executor.beginTransactionAsync();
    this._trans = true;

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransactionAsync();
      this._trans = false;
    }
    catch (err) {
      try {
        await this._executor.rollbackTransactionAsync();
        this._trans = false;
      }
      catch (err1) {
        if (!err1.message.includes("ROLLBACK") || !err1.message.includes("BEGIN")) {
          await this._executor.closeAsync();
          this._trans = false;
          throw err1;
        }
      }

      // await this._executor.closeAsync();
      throw err;
    }

    return result;
  }

  public async executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(queries: (string | IQueryDef)[], colDefs?: C, joinDefs?: { as: string; isSingle: boolean }[], dataQueryIndex?: number): Promise<undefined extends C ? any[][] : any[]> {
    return await this._executor.executeAsync(queries, colDefs, joinDefs, dataQueryIndex);
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

  public async initializeAsync(dbs?: string[], force?: boolean): Promise<boolean> {
    if (force && this._trans) {
      throw new Error("DB 초기화 함수 (initializeAsync)는 트랜젝션을 사용할 수 없습니다.");
    }

    if (!force) {
      const isDbExists = (
        await this.executeAsync([`SELECT COUNT(*) as [cnt] FROM [master].[dbo].[sysdatabases] WHERE [name] = '${this.mainDb}'`])
      )[0][0].cnt > 0;

      if (isDbExists) {
        const isTableExists = (
          await this.executeAsync([`SELECT COUNT(*) as [cnt] FROM [${this.mainDb}].[INFORMATION_SCHEMA].[TABLES] WHERE [TABLE_NAME] = '_migration'`])
        )[0][0].cnt > 0;

        if (isTableExists) {
          //-- Migration
          const dbMigrations = (
            await this.executeAsync([
              new QueryBuilder().from(`[${this.mainDb}].[dbo].[_migration]`).def
            ])
          )[0].map(item => item.code);

          const migrations = this.migrations.filter(item => !dbMigrations.includes(item.name)).orderBy(item => item.name);
          if (migrations.length > 0) {
            await this.transAsync(async () => {
              for (const migration of migrations) {
                await new migration().up(this);

                await this.executeAsync([
                  new QueryBuilder()
                    .from(`[${this.mainDb}].[dbo].[_migration]`)
                    .insert({code: migration.name})
                    .def
                ]);
              }
            });
          }
        }

        return false;
      }
    }

    const dbNames = dbs || [this.mainDb!];

    //-- Initialize
    const tableDefs = Object.values(this)
      .ofType(Queryable)
      .map(qr => Reflect.getMetadata(tableDefMetadataKey, qr.tableType!) as ITableDef)
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
        dataType: col.dataType || QueryHelper.getDataTypeFromType(col.typeFwd()),
        nullable: col.nullable,
        autoIncrement: col.autoIncrement
      }));

      query += new MigrationQueryBuilder().createTable(
        {
          database: tableDef.database || this.mainDb!,
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
            database: tableDef.database || this.mainDb!,
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
          const targetTableDef: ITableDef = Reflect.getMetadata(tableDefMetadataKey, fkDef.targetTypeFwd());

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
              database: targetTableDef.database || this.mainDb!,
              scheme: targetTableDef.scheme,
              name: targetTableDef.name
            },
            targetColumnNames: targetPkNames
          };
        });

      for (const fkDef of fkDefs) {
        query += new MigrationQueryBuilder().addForeignKey(
          {
            database: tableDef.database || this.mainDb!,
            scheme: tableDef.scheme,
            name: tableDef.name
          },
          fkDef
        ) + "\n";
      }
    }
    query += "GO\n\n";

    // INDEX 구성
    for (const tableDef of tableDefs) {
      if (!tableDef.indexes) continue;
      for (const indexDef of tableDef.indexes) {
        query += new MigrationQueryBuilder().createIndex(
          {
            database: tableDef.database || this.mainDb!,
            scheme: tableDef.scheme,
            name: tableDef.name
          },
          indexDef
        ) + "\n";
      }
    }
    query += "GO\n\n";

    // Migration 테이블 구성
    query += new MigrationQueryBuilder().createTable(
      {database: this.mainDb!, scheme: "dbo", name: "_migration"},
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
      {database: this.mainDb!, scheme: "dbo", name: "_migration"},
      [
        {name: "code", desc: false}
      ]
    ) + "\n";
    query += "GO\n\n";

    for (const migration of this.migrations.orderBy(item => item.name)) {
      query += new QueryBuilder()
        .from(`[${this.mainDb}].[dbo].[_migration]`)
        .insert({code: migration.name})
        .query + "\n";
    }

    // Log 테이블 구성
    /*query += new MigrationQueryBuilder().createTable(
      {database: this.mainDb!, scheme: "dbo", name: "_error"},
      [
        {
          name: "id",
          dataType: "INT",
          autoIncrement: true,
          nullable: false
        },
        {
          name: "datetime",
          dataType: "DATETIME2",
          autoIncrement: false,
          nullable: false
        },
        {
          name: "error",
          dataType: "TEXT",
          autoIncrement: false,
          nullable: false
        }
      ]
    ) + "\n";

    query += new MigrationQueryBuilder().addPrimaryKey(
      {database: this.mainDb!, scheme: "dbo", name: "_error"},
      [
        {name: "id", desc: false}
      ]
    ) + "\n";
    query += "GO\n\n";*/

    await this.executeAsync([query.trim()]);
    return true;
  }

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
        database: tableDef.database || this.mainDb!,
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
        database: tableDef.database || this.mainDb!,
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
        database: tableDef.database || this.mainDb!,
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
        database: tableDef.database || this.mainDb!,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      {
        name: fkDef.name,
        columnNames: fkDef.columnNames,
        targetTableDef: {
          database: fkDef.targetTableDef.database || this.mainDb!,
          scheme: fkDef.targetTableDef.scheme || "dbo",
          name: fkDef.targetTableDef.name
        },
        targetColumnNames: fkDef.targetColumnNames
      }
    );
    await this.executeAsync([query]);
  }

  public async createIndexAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    indexDef: {
      name: string;
      columnNames: string[];
    }
  ): Promise<void> {
    const query = new MigrationQueryBuilder().createIndex(
      {
        database: tableDef.database || this.mainDb!,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      indexDef
    );
    await this.executeAsync([query]);
  }

  public async removeForeignKeyAsync(
    tableDef: { database?: string; scheme?: string; name: string },
    fkName: string
  ): Promise<void> {
    const query = new MigrationQueryBuilder().removeForeignKey(
      {
        database: tableDef.database || this.mainDb!,
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
        database: tableDef.database || this.mainDb!,
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
        database: tableDef.database || this.mainDb!,
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
    },
    defaultValue?: any
  ): Promise<void> {
    const query = new MigrationQueryBuilder().modifyColumn(
      {
        database: tableDef.database || this.mainDb!,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      colDef,
      defaultValue
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
        database: tableDef.database || this.mainDb!,
        scheme: tableDef.scheme || "dbo",
        name: tableDef.name
      },
      colName,
      newColName
    );
    await this.executeAsync([query]);
  }
}
