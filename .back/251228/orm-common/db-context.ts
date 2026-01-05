import { MssqlQueryBuilder } from "./query/query-builder/MssqlQueryBuilder";
import { MysqlQueryBuilder } from "./query/query-builder/MysqlQueryBuilder";
import { PostgresqlQueryBuilder } from "./query/query-builder/PostgresqlQueryBuilder";
import { TDialect } from "./types";
import { IDbContextExecutor, ISOLATION_LEVEL } from "./IDbContextExecutor";
import { TableBuilder, ForeignKeyBuilder } from "./schema/table-builder";
import { ViewBuilder } from "./schema/view-builder";
import { ProcedureBuilder } from "./schema/procedure-builder";
import { Queryable } from "./query/queryable";
import { ColumnDefRecord } from "./schema/column-builder";
import { QueryResultParseOption, TableName, QueryColumnDef } from "./query/query-def";
import { BaseQueryBuilder, TQueryDef } from "./query/query-builder/BaseQueryBuilder";
import { ExprHelper } from "./expr/ExprHelper";
import type { Expr } from "./expr/expr.types";

export type TDbContextStatus = "ready" | "connect" | "transact";

export abstract class DbContext {
  readonly expr = new ExprHelper();
  readonly qb: BaseQueryBuilder;
  readonly dialect: TDialect;

  /** 연결 상태 */
  status: TDbContextStatus = "ready";

  constructor(
    private readonly _executor: IDbContextExecutor,
    private readonly _opt: {
      dialect: TDialect;
      database?: string;
      schema?: string;
    },
  ) {
    this.dialect = _opt.dialect;
    this.qb = this._createQueryBuilder(_opt.dialect);
  }

  get database(): string | undefined {
    return this._opt.database;
  }

  get schema(): string | undefined {
    return this._opt.schema;
  }

  // ============================================
  // 연결 관리 (콜백 기반)
  // ============================================

  /**
   * 트랜잭션 없이 연결하여 콜백 실행 후 자동 종료
   */
  async connectWithoutTransactionAsync<R>(callback: () => Promise<R>): Promise<R> {
    await this._executor.connectAsync();
    this.status = "connect";

    let result: R;
    try {
      result = await callback();
    } catch (err) {
      await this._executor.closeAsync();
      this.status = "ready";
      throw err;
    }

    await this._executor.closeAsync();
    this.status = "ready";
    return result;
  }

  /**
   * 연결 → 트랜잭션 → 콜백 실행 → 커밋 → 종료 (자동 롤백)
   */
  async connectAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R> {
    await this._executor.connectAsync();
    this.status = "connect";

    await this._executor.beginTransactionAsync(isolationLevel);
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransactionAsync();
      this.status = "connect";
    } catch (err) {
      try {
        await this._executor.rollbackTransactionAsync();
        this.status = "connect";
      } catch (err1) {
        if (err1 instanceof Error) {
          if (!err1.message.includes("ROLLBACK") || !err1.message.includes("BEGIN")) {
            await this._executor.closeAsync();
            this.status = "ready";
            throw err1;
          }
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

  /**
   * 이미 연결된 상태에서 트랜잭션 시작 → 콜백 실행 → 커밋 (자동 롤백)
   * 연결 관리는 외부에서 담당하므로 closeAsync 호출 안 함
   */
  async transAsync<R>(fn: () => Promise<R>, isolationLevel?: ISOLATION_LEVEL): Promise<R> {
    if (this.status === "transact") {
      throw new Error("이미 TRANSACTION 상태입니다.");
    }

    await this._executor.beginTransactionAsync(isolationLevel);
    this.status = "transact";

    let result: R;
    try {
      result = await fn();

      await this._executor.commitTransactionAsync();
      this.status = "connect";
    } catch (err) {
      try {
        await this._executor.rollbackTransactionAsync();
        this.status = "connect";
      } catch (err1) {
        // 롤백 실패 시 - "트랜잭션 없음" 류의 에러가 아니면 re-throw
        // 연결은 외부에서 관리하므로 close하지 않음
        if (err1 instanceof Error) {
          if (!err1.message.includes("ROLLBACK") && !err1.message.includes("BEGIN")) {
            throw err1;
          }
        }
        // "트랜잭션 없음" 에러면 무시하고 원래 에러 throw
        this.status = "connect";
      }
      throw err;
    }

    return result;
  }

  // ============================================
  // 쿼리 실행
  // ============================================

  /**
   * 파라미터화된 쿼리 실행
   */
  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]> {
    return await this._executor.executeParametrizedAsync(query, params);
  }

  private _createQueryBuilder(dialect: TDialect): BaseQueryBuilder {
    switch (dialect) {
      case "mysql":
        return new MysqlQueryBuilder();
      case "mssql":
        return new MssqlQueryBuilder();
      case "postgresql":
        return new PostgresqlQueryBuilder();
      default:
        throw new Error(`Unsupported dialect: ${dialect}`);
    }
  }

  executeDefsAsync(
    defs: TQueryDef[],
    options?: (QueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    return this._executor.executeDefsAsync(defs, options);
  }

  // ============================================
  // initializeAsync - Code First DB 초기화
  // ============================================

  /**
   * Code First DB 초기화
   * - DB 생성
   * - 모든 TableBuilder/ViewBuilder/ProcedureBuilder로부터 자동 생성
   * - FK/Index 생성
   *
   * @param options.dbs - 초기화할 데이터베이스 목록. 미지정 시 현재 database 사용
   * @param options.force - true이면 기존 테이블/뷰/프로시저 모두 삭제 후 재생성. 기본값 false
   */
  async initializeAsync(options?: { dbs?: string[]; force?: boolean }): Promise<void> {
    const dbNames = options?.dbs ?? (this.database !== undefined ? [this.database] : []);
    if (dbNames.length < 1) {
      throw new Error("생성할 데이터베이스가 없습니다.");
    }

    const force = options?.force ?? false;

    // 1. DB 생성 및 초기화
    for (const dbName of dbNames) {
      // DB 존재 여부 확인
      const [dbInfo] = await this.executeDefsAsync([
        { type: "getDatabaseInfo", database: dbName } as TQueryDef,
      ]);

      if (dbInfo.length === 0) {
        // DB가 없으면 생성
        await this.executeDefsAsync([
          { type: "createDatabase", database: dbName } as TQueryDef,
        ]);
      } else if (force) {
        // force이면 내용물 정리
        await this.executeDefsAsync([
          { type: "clearDatabase", database: dbName } as TQueryDef,
        ]);
      }
    }

    // 2. 테이블/뷰/프로시저 생성
    const builders = this._getBuilders();
    const createDefs: TQueryDef[] = [];
    for (const builder of builders) {
      createDefs.push(this._getCreateDef(builder));
    }
    if (createDefs.length > 0) {
      await this.executeDefsAsync(createDefs);
    }

    // 3. FK 생성 (TableBuilder만)
    const tables = builders.filter((b) => b instanceof TableBuilder);
    const addFkDefs: TQueryDef[] = [];
    for (const table of tables) {
      addFkDefs.push(...this._getAddForeignKeyDefs(table));
    }
    if (addFkDefs.length > 0) {
      await this.executeDefsAsync(addFkDefs);
    }

    // 4. Index 생성 (TableBuilder만)
    const createIndexDefs: TQueryDef[] = [];
    for (const table of tables) {
      createIndexDefs.push(...this._getCreateIndexDefs(table));
    }
    if (createIndexDefs.length > 0) {
      await this.executeDefsAsync(createIndexDefs);
    }
  }

  // ============================================
  // Private Helpers - Builder → QueryDef 변환
  // ============================================

  /**
   * DbContext의 모든 Builder 수집 (Table/View/Procedure)
   */
  private _getBuilders(): (TableBuilder<any, any> | ViewBuilder<any, any> | ProcedureBuilder<any, any>)[] {
    const builders: (TableBuilder<any, any> | ViewBuilder<any, any> | ProcedureBuilder<any, any>)[] = [];

    for (const key of Object.keys(this)) {
      const value = this[key];

      // Queryable → Builder 추출
      if (value instanceof Queryable) {
        const from = value.meta.from;
        if (
          from instanceof TableBuilder ||
          from instanceof ViewBuilder ||
          from instanceof ProcedureBuilder
        ) {
          builders.push(from);
        }
      }
    }

    return builders;
  }

  /**
   * Builder → create QueryDef (createTable/createView/createProcedure)
   */
  private _getCreateDef(
    builder: TableBuilder<any, any> | ViewBuilder<any, any> | ProcedureBuilder<any, any>,
  ): TQueryDef {
    if (builder instanceof TableBuilder) {
      return this._getCreateTableDef(builder);
    } else if (builder instanceof ViewBuilder) {
      return this._getCreateViewDef(builder);
    } else if (builder instanceof ProcedureBuilder) {
      return this._getCreateProcedureDef(builder);
    }
    throw new Error("Unknown builder type");
  }

  /**
   * TableBuilder → createTable QueryDef
   */
  private _getCreateTableDef(table: TableBuilder<any, any>): TQueryDef {
    const columns = table.meta.columns as ColumnDefRecord | undefined;
    if (columns == null) {
      throw new Error(`Table '${table.meta.name}' has no columns`);
    }

    const columnDefs: (QueryColumnDef & { defaultValue?: Expr })[] = [];
    const primaryKeys: { columnName: string; orderBy: "ASC" | "DESC" }[] = [];

    for (const [colName, colBuilder] of Object.entries(columns)) {
      const meta = colBuilder.meta;

      columnDefs.push({
        name: colName,
        dataType: this.qb.getDataTypeString(meta.dataType),
        autoIncrement: meta.autoIncrement,
        nullable: meta.nullable,
        defaultValue: meta.defaultValue != null ? this.expr.val(meta.defaultValue).expr : undefined,
      });

      // PK 수집
      if (meta.primaryKeyIndex != null) {
        primaryKeys.push({
          columnName: colName,
          orderBy: "ASC",
        });
      }
    }

    // PK를 index 순으로 정렬
    primaryKeys.sort((a, b) => {
      const aIndex = columns[a.columnName].meta.primaryKeyIndex ?? 0;
      const bIndex = columns[b.columnName].meta.primaryKeyIndex ?? 0;
      return aIndex - bIndex;
    });

    return {
      type: "createTable",
      table: this._getTableNameDef(table),
      columns: columnDefs,
      primaryKeys,
    } as TQueryDef;
  }

  /**
   * ViewBuilder → createView QueryDef
   */
  private _getCreateViewDef(view: ViewBuilder<any, any>): TQueryDef {
    if (view.meta.viewFn == null) {
      throw new Error(`View '${view.meta.name}' has no viewFn`);
    }

    const queryable = view.meta.viewFn(this);
    const selectDef = queryable.getSelectQueryDef();

    return {
      type: "createView",
      view: {
        database: view.meta.database ?? this.database,
        schema: view.meta.schema ?? this.schema,
        name: view.meta.name,
      },
      query: this.qb.select(selectDef),
    } as TQueryDef;
  }

  /**
   * ProcedureBuilder → createProcedure QueryDef
   */
  private _getCreateProcedureDef(procedure: ProcedureBuilder<any, any>): TQueryDef {
    if (procedure.meta.body == null) {
      throw new Error(`Procedure '${procedure.meta.name}' has no body`);
    }

    return {
      type: "createProcedure",
      procedure: {
        database: procedure.meta.database ?? this.database,
        schema: procedure.meta.schema ?? this.schema,
        name: procedure.meta.name,
      },
      query: procedure.meta.body,
    } as TQueryDef;
  }

  /**
   * TableBuilder → addForeignKey QueryDefs
   */
  private _getAddForeignKeyDefs(table: TableBuilder<any, any>): TQueryDef[] {
    const relations = table.meta.relations;
    if (relations == null) return [];

    const fkDefs: TQueryDef[] = [];

    for (const [relationName, relationDef] of Object.entries(relations)) {
      if (!(relationDef instanceof ForeignKeyBuilder)) continue;

      const targetTable = relationDef.meta.targetFn();
      const fkColumns = this._getColumnNamesFromFn(table, relationDef.meta.columnsFn);
      const pkColumns = this._getPkColumnNames(targetTable);

      if (fkColumns.length !== pkColumns.length) {
        throw new Error(`FK/PK column count mismatch: ${table.meta.name}.${relationName}`);
      }

      // FK 추가
      fkDefs.push({
        type: "addForeignKey",
        table: this._getTableNameDef(table),
        foreignKey: {
          name: `FK_${table.meta.name}_${relationName}`,
          fkColumns,
          targetTable: this._getTableNameDef(targetTable),
          targetPkColumns: pkColumns,
        },
      } as TQueryDef);

      // FK용 인덱스 추가
      fkDefs.push({
        type: "createIndex",
        table: this._getTableNameDef(table),
        index: {
          name: `IDX_${table.meta.name}_${relationName}`,
          columns: fkColumns.map((col) => ({
            name: col,
            orderBy: "ASC" as const,
            unique: false,
          })),
        },
      } as TQueryDef);
    }

    return fkDefs;
  }

  /**
   * TableBuilder → createIndex QueryDefs
   */
  private _getCreateIndexDefs(table: TableBuilder<any, any>): TQueryDef[] {
    const indexes = table.meta.indexes;
    if (indexes == null || indexes.length === 0) return [];

    const indexDefs: TQueryDef[] = [];

    for (const indexBuilder of indexes) {
      const indexMeta = indexBuilder.meta;

      indexDefs.push({
        type: "createIndex",
        table: this._getTableNameDef(table),
        index: {
          name: `IDX_${table.meta.name}_${indexMeta.columns.join("_")}`,
          columns: indexMeta.columns.map((col, i) => ({
            name: col,
            orderBy: (indexMeta.orderBy?.[i] ?? "ASC"),
            unique: indexMeta.unique ?? false,
          })),
        },
      } as TQueryDef);
    }

    return indexDefs;
  }

  /**
   * TableBuilder → QueryTableNameDef
   */
  private _getTableNameDef(table: TableBuilder<any, any>): TableName {
    return {
      database: table.meta.database ?? this.database,
      schema: table.meta.schema ?? this.schema,
      name: table.meta.name,
    };
  }

  /**
   * columnsFn으로부터 컬럼 이름 추출
   */
  private _getColumnNamesFromFn(
    table: TableBuilder<any, any>,
    columnsFn: (c: any) => any[],
  ): string[] {
    const columns = table.meta.columns as ColumnDefRecord | undefined;
    if (columns == null) return [];

    const builders = columnsFn(columns);
    const names: string[] = [];

    for (const builder of builders) {
      for (const [key, col] of Object.entries(columns)) {
        if (col === builder) {
          names.push(key);
          break;
        }
      }
    }

    return names;
  }

  /**
   * TableBuilder로부터 PK 컬럼 이름 추출
   */
  private _getPkColumnNames(table: TableBuilder<any, any>): string[] {
    const columns = table.meta.columns as ColumnDefRecord | undefined;
    if (columns == null) return [];

    const pkCols: { name: string; index: number }[] = [];

    for (const [key, col] of Object.entries(columns)) {
      const pkIndex = col.meta.primaryKeyIndex;
      if (pkIndex != null) {
        pkCols.push({ name: key, index: pkIndex });
      }
    }

    return pkCols.sort((a, b) => a.index - b.index).map((p) => p.name);
  }
}
