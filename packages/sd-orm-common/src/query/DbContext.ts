import {ObjectUtil, Type} from "@simplysm/sd-core-common";
import {IDbContextExecutor} from "./IDbContextExecutor";
import {Queryable} from "./Queryable";
import {DbDatabaseInfoModel, DbMigrationModel, DbTableInfoModel} from "../model";
import {IDbMigration} from "./IDbMigration";
import {IQueryResultParseOption, TQueryDef} from "../query-definition";
import {sorm} from "./sorm";
import {DbDefinitionUtil} from "../util/DbDefinitionUtil";
import {ITableDef} from "../definition";
import {QueryUtil} from "../util/QueryUtil";

export abstract class DbContext {
  public static readonly selectCache = new Map<string, { result: any[]; timeout: any } | undefined>();

  public status: "ready" | "connect" | "transact" = "ready";

  public prepareDefs: {
    def: TQueryDef;
    option: IQueryResultParseOption | undefined;
    isRealResult: boolean;
  }[] = [];

  public abstract get schema(): { database: string; schema: string };

  public abstract get migrations(): Type<IDbMigration>[];

  public readonly migration = new Queryable(this, DbMigrationModel);
  private readonly _databaseInfo = new Queryable(this, DbDatabaseInfoModel);
  private readonly _tableInfo = new Queryable(this, DbTableInfoModel);

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

  public async executePreparedAsync(): Promise<any[][]> {
    if (this.prepareDefs.length < 1) {
      return [];
    }

    const result: any[][] = [];
    const resultTmp: any[][] = await this.executeDefsAsync(this.prepareDefs.map((item) => item.def), this.prepareDefs.map((item) => item.option));
    for (let i = 0; i < resultTmp.length; i++) {
      if (this.prepareDefs[i].isRealResult) {
        result.push(resultTmp[i]);
      }
    }

    this.prepareDefs = [];
    DbContext.selectCache.clear();

    return result;
  }

  public async initializeAsync(dbs?: string[], force?: boolean): Promise<boolean> {
    if (force && this.status === "transact") {
      throw new Error("DB 강제 초기화는 트랜젝션 상에서는 동작하지 못합니다.\nconnect 대신에 connectWithoutTransaction 로 연결하여 시도하세요.");
    }

    if (!force) {
      // 강제 아님
      const isDbExists = (
        await this._databaseInfo
          .where((item) => [
            sorm.equal(item.name, this.schema.database)
          ])
          .countAsync()
      ) > 0;

      if (isDbExists) {
        // FORCE 아니고 DB 있음
        const hasMigrationTable = (
          await this._tableInfo
            .where((item) => [
              sorm.equal(item.name, "_migration")
            ])
            .countAsync()
        ) > 0;

        if (hasMigrationTable) {
          // FORCE 아니고 DB 있으나, Migration 없음
          const dbMigrationCodes = (
            await this.migration
              .select((item) => ({
                code: item.code
              }))
              .resultAsync()
          ).map((item) => item.code);

          const migrations = this.migrations.filter(item => !dbMigrationCodes.includes(item.name)).orderBy(item => item.name);

          if (migrations.length > 0) {
            if (this.status !== "transact") {
              await this.transAsync(async () => {
                for (const migration of migrations) {
                  await new migration().up(this);

                  await this.migration.insertAsync({
                    code: migration.name
                  });
                }
              });
            }
            else {
              for (const migration of migrations) {
                await new migration().up(this);

                await this.migration.insertAsync({
                  code: migration.name
                });
              }
            }
          }
        }

        return false;
      }

      // 강제 아니고 DB 없음: 강제와 동일한 동작
    }

    // 강제

    const dbNames = dbs || [this.schema.database];
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
      .filter((item) => !item.database || dbNames.includes(item.database))
      .filterExists() as ITableDef[];

    const createTableQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      if (tableDef.columns.length < 1) {
        throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      // 생성
      createTableQueryDefs.push({
        type: "createTable",
        table: {
          database: tableDef.database || this.schema.database,
          schema: tableDef.schema || this.schema.schema,
          name: tableDef.name
        },
        columns: tableDef.columns.map((col) => ObjectUtil.clearUndefined({
          name: col.name,
          dataType: col.dataType || QueryUtil.getDataType(col.typeFwd()),
          autoIncrement: col.autoIncrement,
          nullable: col.nullable
        }))
      });
    }
    queryDefsList.push(createTableQueryDefs);

    // PK 설정
    const addPKQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      if (tableDef.columns.length < 1) {
        throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      addPKQueryDefs.push({
        type: "addPrimaryKey",
        table: {
          database: tableDef.database || this.schema.database,
          schema: tableDef.schema || this.schema.schema,
          name: tableDef.name
        },
        primaryKeys: tableDef.columns
          .filter((item) => item.primaryKey !== undefined)
          .orderBy((item) => item.primaryKey!)
          .map((item) => ({
            column: item.name,
            orderBy: "ASC"
          }))
      });
    }
    queryDefsList.push(addPKQueryDefs);

    // TABLE 초기화: FK 설정
    const addFkQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      if (tableDef.columns.length < 1) {
        throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      for (const fkDef of tableDef.foreignKeys) {
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
            database: tableDef.database || this.schema.database,
            schema: tableDef.schema || this.schema.schema,
            name: tableDef.name
          },
          foreignKey: {
            name: fkDef.name,
            fkColumns: fkDef.columnPropertyKeys.map((propKey) => tableDef.columns.single((col) => col.propertyKey === propKey)!.name),
            targetTable: {
              database: targetTableDef.database || this.schema.database,
              schema: targetTableDef.schema || this.schema.schema,
              name: targetTableDef.name
            },
            targetPkColumns: targetPkNames
          }
        });
      }
    }
    queryDefsList.push(addFkQueryDefs);

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
            database: tableDef.database || this.schema.database,
            schema: tableDef.schema || this.schema.schema,
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

    // Migrations 등록
    const migrationInsertQueryDefs: TQueryDef[] = [];
    for (const migration of this.migrations.orderBy((item) => item.name)) {
      migrationInsertQueryDefs.push({
        type: "insert",
        from: `[${this.schema.database}].[${this.schema.schema}].[_migration]`,
        record: {
          "[code]": `N'${migration.name}'`
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