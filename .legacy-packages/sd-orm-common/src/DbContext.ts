import { QueryBuilder } from "./query/query-builder/QueryBuilder";
import type { IDbContextExecutor, IQueryResultParseOption } from "./IDbContextExecutor";
import { QueryHelper } from "./query/query-builder/QueryHelper";
import type { Type } from "@simplysm/sd-core-common";
import { DateTime, NeverEntryError, ObjectUtils, SdError } from "@simplysm/sd-core-common";
import { Queryable } from "./query/queryable/Queryable";
import { SystemMigration } from "./models/SystemMigration";
import { DbDefUtils } from "./utils/DbDefUtils";
import type { IQueryColumnDef, IQueryTableNameDef, TQueryDef } from "./query/query-builder/types";
import type { IDbMigration, ITableDef } from "./types";
import type { ISOLATION_LEVEL } from "./IDbConn";
import { StoredProcedure } from "./query/StoredProcedure";
import { queryable } from "./query/queryable/queryable-fn";

export abstract class DbContext {
  // static readonly SELECT_CACHE_TIMEOUT = 1000;
  // static readonly selectCache = new Map<string, { result: any[]; timeout: any } | undefined>();

  status: "ready" | "connect" | "transact" = "ready";

  lastConnectionDateTime?: DateTime;

  prepareDefs: TQueryDef[] = [];

  abstract get migrations(): Type<IDbMigration>[];

  qb: QueryBuilder;
  qh: QueryHelper;

  systemMigration = queryable(this, SystemMigration);

  getTableDefinitions(): ITableDef[] {
    return Object.values(this)
      .ofType<Queryable<any, any>>(Queryable)
      .map((qr) => qr.tableDef)
      .filterExists();
  }

  constructor(
    private readonly _executor: IDbContextExecutor | undefined,
    public opt: TDbContextOption,
  ) {
    this.qb = new QueryBuilder(opt.dialect);
    this.qh = new QueryHelper(opt.dialect);
  }

  async connectWithoutTransactionAsync<R>(callback: () => Promise<R>): Promise<R> {
    if (!this._executor) throw new Error("DB 실행기를 알 수 없습니다.");
    await this._executor.connectAsync();
    this.status = "connect";
    this.lastConnectionDateTime = new DateTime();

    let result: R;
    try {
      result = await callback();
    } catch (err) {
      await this._executor.closeAsync();
      this.status = "ready";
      this.lastConnectionDateTime = undefined;
      throw err;
    }

    await this._executor.closeAsync();
    this.status = "ready";
    this.lastConnectionDateTime = undefined;
    return result;
  }

  async connectAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R> {
    if (!this._executor) throw new Error("DB 실행기를 알 수 없습니다.");
    await this._executor.connectAsync();
    this.status = "connect";
    this.lastConnectionDateTime = new DateTime();

    await this._executor.beginTransactionAsync(isolationLevel);
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransactionAsync();
      this.status = "connect";
      this.lastConnectionDateTime = new DateTime();
    } catch (err) {
      try {
        await this._executor.rollbackTransactionAsync();
        this.status = "connect";
        this.lastConnectionDateTime = new DateTime();
      } catch (err1) {
        if (!(err1 instanceof Error)) throw new NeverEntryError();

        if (!err1.message.includes("ROLLBACK") || !err1.message.includes("BEGIN")) {
          await this._executor.closeAsync();
          this.status = "ready";
          this.lastConnectionDateTime = undefined;
          throw err1;
        }
      }

      await this._executor.closeAsync();
      this.status = "ready";
      this.lastConnectionDateTime = undefined;
      throw err;
    }

    await this._executor.closeAsync();
    this.status = "ready";
    this.lastConnectionDateTime = undefined;
    return result;
  }

  async transAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R> {
    if (!this._executor) throw new Error("DB 실행기를 알 수 없습니다.");

    if (this.status === "transact") {
      throw new Error("이미 TRANSACTION 상태 입니다.");
    }

    await this._executor.beginTransactionAsync(isolationLevel);
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransactionAsync();
      this.status = "connect";
      this.lastConnectionDateTime = new DateTime();
    } catch (err) {
      try {
        await this._executor.rollbackTransactionAsync();
        this.status = "connect";
        this.lastConnectionDateTime = new DateTime();
      } catch (err1) {
        if (!(err1 instanceof Error)) throw new NeverEntryError();

        if (!err1.message.includes("ROLLBACK") || !err1.message.includes("BEGIN")) {
          await this._executor.closeAsync();
          this.status = "ready";
          this.lastConnectionDateTime = undefined;
          throw err1;
        }
      }

      await this._executor.closeAsync();
      this.status = "ready";
      this.lastConnectionDateTime = undefined;
      throw err;
    }

    return result;
  }

  async executeDefsAsync(
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    if (!this._executor) throw new Error("DB 실행기를 알 수 없습니다.");
    return await this._executor.executeDefsAsync(defs, options);
  }

  // async executeQueriesAsync(queries: string[]): Promise<any[][]> {
  //   if (!this._executor) throw new Error("DB 실행기를 알 수 없습니다.");
  //   return await this._executor.executeAsync(queries);
  // }

  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]> {
    if (!this._executor) throw new Error("DB 실행기를 알 수 없습니다.");
    return await this._executor.executeParametrizedAsync(query, params);
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    if (!this._executor) throw new Error("DB 실행기를 알 수 없습니다.");
    await this._executor.bulkInsertAsync(tableName, columnDefs, records);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ) {
    if (!this._executor) throw new Error("DB 실행기를 알 수 없습니다.");
    await this._executor.bulkUpsertAsync(tableName, columnDefs, records);
  }

  async executePreparedAsync(): Promise<void> {
    if (this.prepareDefs.length < 1) return;
    await this.executeDefsAsync(this.prepareDefs);

    this.prepareDefs = [];
    // DbContext.selectCache.clear();
  }

  async getIsDbExistsAsync(database?: string): Promise<boolean> {
    if (this.opt.dialect !== "sqlite") {
      if (database === undefined) throw new NeverEntryError();

      return (
        (
          await this.executeDefsAsync([
            {
              type: "getDatabaseInfo",
              database,
            },
          ])
        )[0].length > 0
      );
    } else {
      throw new Error("sqlite 미구현");
    }
  }

  async getIsTableExistsAsync(tableNameDef: IQueryTableNameDef): Promise<boolean> {
    return (
      (
        await this.executeDefsAsync([
          {
            type: "getTableInfo",
            table: tableNameDef,
          },
        ])
      )[0].length > 0
    );
  }

  get tableDefs(): ITableDef[] {
    const thisRec = this as unknown as Record<string, any>;
    return [
      ...Object.keys(this)
        .filter((key) => !key.startsWith("_"))
        .map((key) => thisRec[key])
        .ofType<Queryable<any, any>>(Queryable),
      ...Object.keys(this)
        .filter((key) => !key.startsWith("_"))
        .map((key) => thisRec[key])
        .ofType<StoredProcedure<any, any>>(StoredProcedure),
    ]
      .map((qr) => DbDefUtils.getTableDef(qr.tableType!))
      .filterExists();
  }

  async getTableInfosAsync(
    database: string,
    schema?: string,
  ): Promise<
    {
      schema: string;
      name: string;
    }[]
  > {
    return (
      await this.executeDefsAsync([
        {
          type: "getTableInfos",
          database,
          schema,
        },
      ])
    )[0].map((item) => ({
      schema: item.TABLE_SCHEMA,
      name: item.TABLE_NAME,
    }));
  }

  async getTableColumnInfosAsync(
    database: string,
    schema: string,
    table: string,
  ): Promise<
    {
      name: string;
      dataType: string;
      length?: number;
      precision?: number;
      digits?: number;
      nullable: boolean;
      autoIncrement: boolean;
    }[]
  > {
    return (
      await this.executeDefsAsync([
        {
          type: "getTableColumnInfos",
          table: { database, schema, name: table },
        },
      ])
    )[0].map((item) => ({
      name: item.name,
      dataType: item.dataType,
      length: item.length,
      precision: item.precision,
      digits: item.digits,
      nullable: item.nullable,
      autoIncrement: item.autoIncrement,
    }));
  }

  async getTablePkColumnNamesAsync(
    database: string,
    schema: string,
    table: string,
  ): Promise<string[]> {
    return (
      await this.executeDefsAsync([
        {
          type: "getTablePrimaryKeys",
          table: { database, schema, name: table },
        },
      ])
    )[0].map((item) => item.name);
  }

  async getTableFksAsync(
    database: string,
    schema: string,
    table: string,
  ): Promise<
    {
      name: string;
      sourceColumnNames: string[];
      targetSchemaName: string;
      targetTableName: string;
    }[]
  > {
    return (
      await this.executeDefsAsync([
        {
          type: "getTableForeignKeys",
          table: { database, schema, name: table },
        },
      ])
    )[0]
      .groupBy((item) => item.name)
      .map((item) => ({
        name: item.key,
        sourceColumnNames: item.values.map((item1) => item1.sourceColumnName),
        targetSchemaName: item.values[0].targetSchemaName,
        targetTableName: item.values[0].targetTableName,
      }));
  }

  async getTableIndexesAsync(
    database: string,
    schema: string,
    table: string,
  ): Promise<
    {
      name: string;
      columns: {
        name: string;
        orderBy: "ASC" | "DESC";
      }[];
    }[]
  > {
    return (
      await this.executeDefsAsync([
        {
          type: "getTableIndexes",
          table: { database, schema, name: table },
        },
      ])
    )[0]
      .groupBy((item) => item.name)
      .map((item) => ({
        name: item.key,
        columns: item.values.map((item1) => ({
          name: item1.columnName,
          orderBy: item1.isDesc === true ? "DESC" : "ASC",
        })),
      }));
  }

  async truncateTable(table: string): Promise<void> {
    await this.executeDefsAsync([
      {
        type: "truncateTable",
        table: {
          ...(this.opt.dialect === "sqlite"
            ? {}
            : {
                database: this.opt.database,
                schema: this.opt.schema,
              }),
          name: table,
        },
      },
    ]);
  }

  async initializeAsync(
    dbs?: string[],
    force?: boolean,
  ): Promise<"creation" | "migration" | undefined> {
    if (force && this.status === "transact") {
      throw new Error(
        "DB 강제 초기화는 트랜젝션 상에서는 동작하지 못합니다.\nconnect 대신에 connectWithoutTransaction 로 연결하여 시도하세요.",
      );
    }

    if (force && this.opt.dialect === "sqlite") {
      throw new Error(
        "sqlite 강제초기화 불가, 강제로 초기화 하려면, 데이터베이스 파일을 삭제하고 초기화를 수행하세요.",
      );
    }

    // 강제 아닐때
    if (!force) {
      const isDbExists =
        this.opt.dialect === "sqlite" ? true : await this.getIsDbExistsAsync(this.opt.database);

      const isMigrationTableExists = !isDbExists
        ? false
        : await this.getIsTableExistsAsync({
            ...(this.opt.dialect === "sqlite"
              ? {}
              : {
                  database: this.opt.database,
                  schema: this.opt.schema,
                }),
            name: "_migration",
          });

      // DB / Migration TABLE 있을때
      if (isDbExists && isMigrationTableExists) {
        const dbMigrationCodes = (
          await this.systemMigration
            .select((item) => ({
              code: item.code,
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

                await this.systemMigration.insertAsync([
                  {
                    code: migration.name,
                  },
                ]);
              }
            });
          } else {
            for (const migration of migrations) {
              await new migration().up(this);

              await this.systemMigration.insertAsync([
                {
                  code: migration.name,
                },
              ]);
            }
          }

          return "migration";
        } else {
          return undefined;
        }
      }
    }

    // 강제 혹은 첫 수행

    const tableDefInfos: {
      database?: string;
      tableDefs: ITableDef[];
    }[] = [];

    if (this.opt.dialect !== "sqlite") {
      const dbNames = dbs ?? (this.opt.database !== undefined ? [this.opt.database] : []);
      if (dbNames.length < 1) {
        throw new Error("생성할 데이터베이스가 없습니다.");
      }

      // DB 초기화
      for (const dbName of dbNames) {
        await this.executeDefsAsync([
          {
            type: "createDatabaseIfNotExists",
            database: dbName,
          },
        ]);

        await this.executeParametrizedAsync(`USE ${dbName};`);

        await this.executeDefsAsync([
          {
            type: "clearDatabaseIfExists",
            database: dbName,
          },
        ]);
      }
      await this.executeParametrizedAsync(`USE ${this.opt.database};`);

      // TABLE 초기화: 생성/PK 설정
      const optDefault = this.opt;
      for (const dbName of dbNames) {
        tableDefInfos.push({
          database: dbName,
          tableDefs: this.tableDefs
            .filter(
              (item) =>
                (item.database == null && dbName === optDefault.database) ||
                dbName === item.database,
            )
            .filterExists(),
        });
      }
    } else {
      tableDefInfos.push({
        tableDefs: this.tableDefs.filterExists(),
      });
    }

    const queryDefsList: TQueryDef[][] = [];

    for (const tableDefInfo of tableDefInfos) {
      queryDefsList.push(...this.getCreateTablesFullQueryDefsFromTableDef(tableDefInfo.tableDefs));
    }

    // Migration 데이터 저장 등록
    const migrationInsertQueryDefs: TQueryDef[] = [];
    for (const migration of this.migrations.orderBy((item) => item.name)) {
      migrationInsertQueryDefs.push({
        type: "insert",
        from: this.qb.getTableName({
          ...(this.opt.dialect === "sqlite"
            ? {}
            : {
                database: this.opt.database,
                schema: this.opt.schema,
              }),
          name: "_migration",
        }),
        record: {
          [this.qb.wrap("code")]: `N'${migration.name}'`,
        },
      });
    }
    queryDefsList.push(migrationInsertQueryDefs);

    for (const queryDefs of queryDefsList) {
      await this.executeDefsAsync(queryDefs);
    }

    return "creation";
  }

  getCreateTablesFullQueryDefsFromTableDef(tableDefs: ITableDef[]): TQueryDef[][] {
    const result: TQueryDef[][] = [];

    const createTableQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      createTableQueryDefs.push(this.getCreateTableQueryDefFromTableDef(tableDef));
    }
    result.push(createTableQueryDefs);

    // TABLE 초기화: FK 설정
    const addFkQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      addFkQueryDefs.push(...this.getCreateFksQueryDefsFromTableDef(tableDef));
    }
    result.push(addFkQueryDefs);

    // TABLE 초기화: INDEX 설정
    const createIndexQueryDefs: TQueryDef[] = [];
    for (const tableDef of tableDefs) {
      createIndexQueryDefs.push(...this.getCreateIndexesQueryDefsFromTableDef(tableDef));
    }
    result.push(createIndexQueryDefs);

    return result;
  }

  getCreateTableQueryDefFromTableDef(tableDef: ITableDef): TQueryDef {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }

    if (tableDef.view) {
      return {
        type: "createView",
        table: this.getTableNameDef(tableDef),
        queryDef: tableDef.view(this).getSelectQueryDef(),
      };
    } else if (tableDef.procedure != null) {
      return {
        type: "createProcedure",
        table: this.getTableNameDef(tableDef),
        columns: tableDef.columns.map((col) => {
          try {
            return ObjectUtils.clearUndefined({
              name: col.name,
              dataType: this.qh.type(col.dataType ?? col.typeFwd()),
              nullable: col.nullable,
            });
          } catch (err) {
            throw new SdError(err, `컬럼 정의 변환 오류: ${JSON.stringify(col)}`.trim());
          }
        }),
        procedure: tableDef.procedure,
      };
    } else {
      return {
        type: "createTable",
        table: this.getTableNameDef(tableDef),
        columns: tableDef.columns.map((col) => {
          try {
            return ObjectUtils.clearUndefined({
              name: col.name,
              dataType: this.qh.type(col.dataType ?? col.typeFwd()),
              autoIncrement: col.autoIncrement,
              nullable: col.nullable,
            });
          } catch (err) {
            throw new SdError(err, `컬럼 정의 변환 오류: ${JSON.stringify(col)}`.trim());
          }
        }),
        primaryKeys: tableDef.columns
          .filter((item) => item.primaryKey !== undefined)
          .orderBy((item) => item.primaryKey!)
          .map((item) => ({
            columnName: item.name,
            orderBy: "ASC",
          })),
      };
    }
  }

  getCreateFksQueryDefsFromTableDef(tableDef: ITableDef): TQueryDef[] {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }

    const addFkQueryDefs: TQueryDef[] = [];
    for (const fkDef of tableDef.foreignKeys) {
      try {
        const targetTableDef = DbDefUtils.getTableDef(fkDef.targetTypeFwd());
        if (targetTableDef.columns.length < 1) {
          throw new Error(`${targetTableDef.name}의 컬럼 설정이 잘못되었습니다.`);
        }

        const targetPkNames = targetTableDef.columns
          .filter((item) => item.primaryKey !== undefined)
          .orderBy((item) => item.primaryKey!)
          .map((item) => item.name);

        addFkQueryDefs.push(
          ...[
            {
              type: "addForeignKey",
              table: this.getTableNameDef(tableDef),
              foreignKey: {
                name: fkDef.name,
                fkColumns: fkDef.columnPropertyKeys.map(
                  (propKey) => tableDef.columns.single((col) => col.propertyKey === propKey)!.name,
                ),
                targetTable: this.getTableNameDef(targetTableDef),
                targetPkColumns: targetPkNames,
              },
            } as TQueryDef,
            {
              type: "createIndex",
              table: this.getTableNameDef(tableDef),
              index: {
                name: fkDef.name,
                columns: fkDef.columnPropertyKeys.map((item) => ({
                  name: tableDef.columns.single((col) => col.propertyKey === item)!.name,
                  orderBy: "ASC",
                  unique: false,
                })),
              },
            } as TQueryDef,
          ],
        );
      } catch (err) {
        if (err instanceof Error) {
          throw new SdError(err, tableDef.name + " > " + fkDef.name + ": 오류");
        } else {
          throw err;
        }
      }
    }

    return addFkQueryDefs;
  }

  getCreateIndexesQueryDefsFromTableDef(tableDef: ITableDef): TQueryDef[] {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }

    const createIndexQueryDefs: TQueryDef[] = [];
    for (const indexDef of tableDef.indexes) {
      createIndexQueryDefs.push({
        type: "createIndex",
        table: this.getTableNameDef(tableDef),
        index: {
          name: indexDef.name,
          columns: indexDef.columns
            .orderBy((item) => item.order)
            .map((item) => ({
              name: tableDef.columns.single((col) => col.propertyKey === item.columnPropertyKey)!
                .name,
              orderBy: item.orderBy,
              unique: item.unique,
            })),
        },
      });
    }
    return createIndexQueryDefs;
  }

  getAddColumnQueryDefFromTableDef(tableDef: ITableDef, columnName: string): TQueryDef {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }
    const columnDef = tableDef.columns.single((col) => col.name === columnName);
    if (!columnDef) {
      throw new Error(`'${tableDef.name}.${columnName}' 설정이 잘못되었습니다.`);
    }

    return {
      type: "addColumn",
      table: this.getTableNameDef(tableDef),
      column: {
        name: columnDef.name,
        dataType: this.qh.type(columnDef.dataType ?? columnDef.typeFwd()),
        autoIncrement: columnDef.autoIncrement,
        nullable: columnDef.nullable,
      },
    };
  }

  getModifyColumnQueryDefFromTableDef(tableDef: ITableDef, columnName: string): TQueryDef {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }
    const columnDef = tableDef.columns.single((col) => col.name === columnName);
    if (!columnDef) {
      throw new Error(`'${tableDef.name}.${columnName}' 설정이 잘못되었습니다.`);
    }

    return {
      type: "modifyColumn",
      table: this.getTableNameDef(tableDef),
      column: {
        name: columnDef.name,
        dataType: this.qh.type(columnDef.dataType ?? columnDef.typeFwd()),
        autoIncrement: columnDef.autoIncrement,
        nullable: columnDef.nullable,
      },
    };
  }

  getModifyPkQueryDefFromTableDef(tableDef: ITableDef, columnNames: string[]): TQueryDef[] {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }

    return [
      {
        type: "dropPrimaryKey",
        table: this.getTableNameDef(tableDef),
      },
      ...(columnNames.length > 0
        ? [
            {
              type: "addPrimaryKey",
              table: this.getTableNameDef(tableDef),
              columns: columnNames,
            } as TQueryDef,
          ]
        : []),
    ];
  }

  getAddFkQueryDefFromTableDef(tableDef: ITableDef, fkName: string): TQueryDef {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }
    const fkDef = tableDef.foreignKeys.single((col) => col.name === fkName);
    if (!fkDef) {
      throw new Error(`'${tableDef.name} => FK: ${fkName}' 설정이 잘못되었습니다.`);
    }

    const targetTableDef = DbDefUtils.getTableDef(fkDef.targetTypeFwd());
    if (targetTableDef.columns.length < 1) {
      throw new Error(`${targetTableDef.name}의 컬럼 설정이 잘못되었습니다.`);
    }

    const targetPkNames = targetTableDef.columns
      .filter((item) => item.primaryKey !== undefined)
      .orderBy((item) => item.primaryKey!)
      .map((item) => item.name);

    return {
      type: "addForeignKey",
      table: this.getTableNameDef(tableDef),
      foreignKey: {
        name: fkDef.name,
        fkColumns: fkDef.columnPropertyKeys.map(
          (propKey) => tableDef.columns.single((col) => col.propertyKey === propKey)!.name,
        ),
        targetTable: this.getTableNameDef(targetTableDef),
        targetPkColumns: targetPkNames,
      },
    };
  }

  getRemoveFkQueryDefFromTableDef(tableDef: ITableDef, fkName: string): TQueryDef {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }

    return {
      type: "removeForeignKey",
      table: this.getTableNameDef(tableDef),
      foreignKey: fkName,
    };
  }

  getCreateIndexQueryDefFromTableDef(tableDef: ITableDef, indexName: string): TQueryDef {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }
    let indexDef = tableDef.indexes.single((item) => item.name === indexName);
    if (!indexDef) {
      const fkDef = tableDef.foreignKeys.single((item) => item.name === indexName);
      if (!fkDef) {
        throw new Error(`'${tableDef.name} => IDX: ${indexName}' 설정이 잘못되었습니다.`);
      }
      indexDef = {
        name: fkDef.name,
        description: fkDef.description,
        columns: fkDef.columnPropertyKeys.map((propKey, i) => ({
          columnPropertyKey: propKey,
          name: tableDef.columns.single((col) => col.propertyKey === propKey)!.name,
          order: i + 1,
          orderBy: "ASC",
          unique: false,
        })),
      };
    }

    return {
      type: "createIndex",
      table: this.getTableNameDef(tableDef),
      index: {
        name: indexDef.name,
        columns: indexDef.columns
          .orderBy((item) => item.order)
          .map((item) => ({
            name: tableDef.columns.single((col) => col.propertyKey === item.columnPropertyKey)!
              .name,
            orderBy: item.orderBy,
            unique: item.unique,
          })),
      },
    };
  }

  getDropIndexQueryDefFromTableDef(tableDef: ITableDef, indexName: string): TQueryDef {
    if (tableDef.columns.length < 1) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }

    return {
      type: "dropIndex",
      table: this.getTableNameDef(tableDef),
      index: indexName,
    };
  }

  getTableNameDef(tableDef: ITableDef): IQueryTableNameDef {
    return {
      ...(this.opt.dialect === "sqlite"
        ? {}
        : {
            database: tableDef.database ?? this.opt.database,
            schema: tableDef.schema ?? this.opt.schema,
          }),
      name: tableDef.name,
    };
  }
}

export type TDbContextOption = IDefaultDbContextOption | ISqliteDbContextOption;

export interface IDefaultDbContextOption {
  dialect: "mysql" | "mssql" | "mssql-azure";
  database?: string;
  schema?: string;
}

export interface ISqliteDbContextOption {
  dialect: "sqlite";
}
