import { QueryBuilder } from "./QueryBuilder";
import { IDbContextExecutor } from "./IDbContextExecutor";
import { QueryHelper } from "./QueryHelper";
import { IQueryColumnDef, IQueryResultParseOption, TQueryDef } from "./commons";
import { NeverEntryError, ObjectUtil, SdError, Type } from "@simplysm/sd-core-common";
import { IDbMigration } from "./IDbMigration";
import { Queryable } from "./Queryable";
import { SystemMigration } from "./SystemMigration";
import { DbDefinitionUtil } from "./utils/DbDefinitionUtil";

// TODO: 모든 데이터를 CSV로 백업하는 기능 추가

export abstract class DbContext {
  public static readonly selectCache = new Map<string, { result: any[]; timeout: any } | undefined>();

  public status: "ready" | "connect" | "transact" = "ready";

  public prepareDefs: TQueryDef[] = [];

  public abstract get schema(): { database: string; schema: string };

  public abstract get migrations(): Type<IDbMigration>[];

  public readonly qb = new QueryBuilder(this._executor.dialect);
  public readonly qh = new QueryHelper(this._executor.dialect);

  public readonly systemMigration = new Queryable(this, SystemMigration);

  public dialect = this._executor.dialect;

  public constructor(private readonly _executor: IDbContextExecutor) {
  }

  public async connectWithoutTransactionAsync<R>(callback: () => Promise<R>): Promise<R> {
    await this._executor.connectAsync();
    this.status = "connect";

    let result: R;
    try {
      result = await callback();
    }
    catch (err) {
      await this._executor.closeAsync();
      this.status = "ready";
      throw err;
    }

    await this._executor.closeAsync();
    this.status = "ready";
    return result;
  }

  public async connectAsync<R>(fn: () => Promise<R>): Promise<R> {
    await this._executor.connectAsync();
    this.status = "connect";

    await this._executor.beginTransactionAsync();
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransactionAsync();
      this.status = "connect";
    }
    catch (err) {
      try {
        await this._executor.rollbackTransactionAsync();
        this.status = "connect";
      }
      catch (err1) {
        if (!(err1 instanceof Error)) throw new NeverEntryError();

        if (!err1.message.includes("ROLLBACK") || !err1.message.includes("BEGIN")) {
          await this._executor.closeAsync();
          this.status = "ready";
          throw err1;
        }
      }

      await this._executor.closeAsync();
      this.status = "ready";
      throw err;
    }

    await this._executor.closeAsync();
    this.status = "ready";
    return result;
  }

  public async transAsync<R>(fn: () => Promise<R>): Promise<R> {
    if (this.status === "transact") {
      throw new Error("이미 TRANSACTION 상태 입니다.");
    }

    await this._executor.beginTransactionAsync();
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransactionAsync();
      this.status = "connect";
    }
    catch (err) {
      try {
        await this._executor.rollbackTransactionAsync();
        this.status = "connect";
      }
      catch (err1) {
        if (!(err1 instanceof Error)) throw new NeverEntryError();

        if (!err1.message.includes("ROLLBACK") || !err1.message.includes("BEGIN")) {
          await this._executor.closeAsync();
          this.status = "ready";
          throw err1;
        }
      }

      await this._executor.closeAsync();
      this.status = "ready";
      throw err;
    }

    return result;
  }

  public async executeDefsAsync(defs: TQueryDef[], options?: (IQueryResultParseOption | undefined)[]): Promise<any[][]> {
    return await this._executor.executeDefsAsync(defs, options);
  }

  public async executeQueriesAsync(queries: string[]): Promise<any[][]> {
    return await this._executor.executeAsync(queries);
  }

  public async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], ...records: Record<string, any>[]): Promise<void> {
    await this._executor.bulkInsertAsync(tableName, columnDefs, ...records);
  }

  public async executePreparedAsync(): Promise<void> {
    if (this.prepareDefs.length < 1) return;
    await this.executeDefsAsync(this.prepareDefs);

    this.prepareDefs = [];
    DbContext.selectCache.clear();
  }

  public async initializeAsync(dbs?: string[], force?: boolean): Promise<boolean> {
    if (force && this.status === "transact") {
      throw new Error("DB 강제 초기화는 트랜젝션 상에서는 동작하지 못합니다.\nconnect 대신에 connectWithoutTransaction 로 연결하여 시도하세요.");
    }

    // 강제 아닐때
    if (!force) {
      const isDbExists = (
        await this.executeDefsAsync([
          { type: "getDatabaseInfo", database: this.schema.database }
        ])
      )[0].length > 0;

      const isTableExists = (
        await this.executeDefsAsync([
          {
            type: "getTableInfo",
            table: { database: this.schema.database, schema: this.schema.schema, name: "_migration" }
          }
        ])
      )[0].length > 0;

      // DB / TABLE 있을때
      if (isDbExists && isTableExists) {
        const dbMigrationCodes = (
          await this.systemMigration
            .select((item) => ({
              code: item.code
            }))
            .resultAsync()
        ).map((item) => item.code);

        const migrations = this.migrations
          .filter((item) => !dbMigrationCodes.includes(item.name))
          .orderBy((item) => item.name);

        // 마이그레이션 있을때
        if (migrations.length > 0) {
          if (this.status !== "transact") {
            await this.transAsync(async () => {
              for (const migration of migrations) {
                await new migration().up(this);

                await this.systemMigration.insertAsync({
                  code: migration.name
                });
              }
            });
          }
          else {
            for (const migration of migrations) {
              await new migration().up(this);

              await this.systemMigration.insertAsync({
                code: migration.name
              });
            }
          }
        }

        return false;
      }
    }

    // 강제 혹은 첫 수행

    const dbNames = dbs ?? [this.schema.database];
    if (dbNames.length < 1) {
      throw new Error("생성할 데이터베이스가 없습니다.");
    }

    const queryDefsList: TQueryDef[][] = [];

    // DB 초기화
    for (const dbName of dbNames) {
      queryDefsList.push([
        {
          type: "clearDatabaseIfExists",
          database: dbName
        },
        {
          type: "createDatabaseIfNotExists",
          database: dbName
        }
      ]);
    }

    // TABLE 초기화: 생성/PK 설정
    const tableDefs = Object.keys(this)
      .filter((key) => !key.startsWith("_"))
      .map((key) => this[key])
      .ofType<Queryable<any, any>>(Queryable)
      .map((qr) => DbDefinitionUtil.getTableDef(qr.tableType!))
      .filter((item) => item.database === undefined || dbNames.includes(item.database))
      .filterExists();

    const createTableQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      if (tableDef.columns.length < 1) {
        throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      // 생성
      createTableQueryDefs.push({
        type: "createTable",
        table: {
          database: tableDef.database ?? this.schema.database,
          schema: tableDef.schema ?? this.schema.schema,
          name: tableDef.name
        },
        columns: tableDef.columns.map((col) => ObjectUtil.clearUndefined({
          name: col.name,
          dataType: this.qh.type(col.dataType ?? col.typeFwd()),
          autoIncrement: col.autoIncrement,
          nullable: col.nullable
        })),
        primaryKeys: tableDef.columns
          .filter((item) => item.primaryKey !== undefined)
          .orderBy((item) => item.primaryKey!)
          .map((item) => ({
            columnName: item.name,
            orderBy: "ASC"
          }))
      });
    }
    queryDefsList.push(createTableQueryDefs);

    // TABLE 초기화: FK 설정
    const addFkQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      if (tableDef.columns.length < 1) {
        throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      for (const fkDef of tableDef.foreignKeys) {
        try {
          const targetTableDef = DbDefinitionUtil.getTableDef(fkDef.targetTypeFwd());
          if (targetTableDef.columns.length < 1) {
            throw new Error(`${targetTableDef.name}의 컬럼 설정이 잘못되었습니다.`);
          }

          const targetPkNames = targetTableDef.columns
            .filter((item) => item.primaryKey !== undefined)
            .orderBy((item) => item.primaryKey!)
            .map((item) => item.name);

          addFkQueryDefs.push({
            type: "addForeignKey",
            table: {
              database: tableDef.database ?? this.schema.database,
              schema: tableDef.schema ?? this.schema.schema,
              name: tableDef.name
            },
            foreignKey: {
              name: fkDef.name,
              fkColumns: fkDef.columnPropertyKeys.map((propKey) => tableDef.columns.single((col) => col.propertyKey === propKey)!.name),
              targetTable: {
                database: targetTableDef.database ?? this.schema.database,
                schema: targetTableDef.schema ?? this.schema.schema,
                name: targetTableDef.name
              },
              targetPkColumns: targetPkNames
            }
          });
        }
        catch (err) {
          throw new SdError(err, tableDef.name + " > " + fkDef.name + ": 오류");
        }
      }
    }
    queryDefsList.push(addFkQueryDefs);

    // TABLE 초기화: FK의 INDEX 설정
    const createFkIndexQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      if (tableDef.columns.length < 1) {
        throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      for (const fkDef of tableDef.foreignKeys) {
        createFkIndexQueryDefs.push({
          type: "createIndex",
          table: {
            database: tableDef.database ?? this.schema.database,
            schema: tableDef.schema ?? this.schema.schema,
            name: tableDef.name
          },
          index: {
            name: fkDef.name,
            columns: fkDef.columnPropertyKeys.map((item) => ({
              name: tableDef.columns.single((col) => col.propertyKey === item)!.name,
              orderBy: "ASC"
            }))
          }
        });
      }
    }
    queryDefsList.push(createFkIndexQueryDefs);


    // TABLE 초기화: INDEX 설정
    const createIndexQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      if (tableDef.columns.length < 1) {
        throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      for (const indexDef of tableDef.indexes) {
        createIndexQueryDefs.push({
          type: "createIndex",
          table: {
            database: tableDef.database ?? this.schema.database,
            schema: tableDef.schema ?? this.schema.schema,
            name: tableDef.name
          },
          index: {
            name: indexDef.name,
            columns: indexDef.columns.orderBy((item) => item.order).map((item) => ({
              name: tableDef.columns.single((col) => col.propertyKey === item.columnPropertyKey)!.name,
              orderBy: item.orderBy
            }))
          }
        });
      }
    }
    queryDefsList.push(createIndexQueryDefs);

    // Migration 데이터 저장 등록
    const migrationInsertQueryDefs: TQueryDef[] = [];
    for (const migration of this.migrations.orderBy((item) => item.name)) {
      migrationInsertQueryDefs.push({
        type: "insert",
        from: this.qb.getTableName({ ...this.schema, name: "_migration" }),
        record: {
          [this.qb.wrap("code")]: `N'${migration.name}'`
        }
      });
    }
    queryDefsList.push(migrationInsertQueryDefs);

    for (const queryDefs of queryDefsList) {
      await this.executeDefsAsync(queryDefs);
    }

    return true;
  }
}
