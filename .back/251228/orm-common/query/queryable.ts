import { ColumnPrimitive, ColumnPrimitiveStr, DataRecord, IColumnMeta } from "../types";
import { ForeignKeyBuilder, ForeignKeyTargetBuilder, TableBuilder } from "../schema/table-builder";
import { ColumnBuilder, ColumnDefRecord } from "../schema/column-builder";
import { DbContext } from "../db-context";
import { ViewBuilder } from "../schema/view-builder";
import { ExprUnit, WhereExprUnit } from "../expr/ExprUnit";
import type { Expr } from "../expr/expr.types";
import { FnUtils } from "@simplysm/sd-core-common";
import type {
  DeleteQueryDef,
  InsertIfNotExistsQueryDef,
  InsertIntoQueryDef,
  InsertQueryDef,
  JoinQueryDef,
  QueryResultParseOption,
  SelectQuery,
  TruncateTableQueryDef,
  UpdateQueryDef,
  UpsertQueryDef,
} from "./query-def";

// ============================================
// QueryableRecord - Queryable용 래핑
// ============================================

export type QueryableRecord<TData extends DataRecord> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K]>
    : TData[K] extends (infer U)[]
      ? U extends DataRecord
        ? QueryableRecord<U>[]
        : never
      : TData[K] extends DataRecord
        ? QueryableRecord<TData[K]>
        : TData[K] extends DataRecord | undefined
          ? QueryableRecord<Exclude<TData[K], undefined>> | undefined
          : never;
};

// ============================================
// Base 타입 (타입 안전한 접근용)
// ============================================

// CUD용 조건부 타입 (TFrom이 TableBuilder일 때만 실제 타입, 아니면 never)
type InferColumns<T> = T extends { $inferColumns: infer U } ? U : never;
type InferColumnKeys<T> = keyof InferColumns<T>;

type WithExprUnit<T> = { [K in keyof T]: T[K] | ExprUnit<T[K] & ColumnPrimitive> };
type InferInsert<T> = T extends { $inferInsert: infer U } ? WithExprUnit<U> : never;
type InferUpdate<T> = T extends { $inferUpdate: infer U } ? WithExprUnit<U> : never;

// ============================================
// Pivot/Unpivot 옵션 타입
// ============================================

interface PivotOptions<
  TData extends DataRecord,
  TValue extends ColumnPrimitive,
  TKeys extends readonly string[],
> {
  /** 집계 대상 컬럼 */
  value: (cols: QueryableRecord<TData>) => ExprUnit<TValue>;
  /** 집계 함수 (e.g. v => db.qh.sum(v)) */
  agg: (val: ExprUnit<TValue>) => ExprUnit<TValue | undefined>;
  /** 피벗 기준 컬럼 */
  for: (cols: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>;
  /** 피벗할 키 값들 */
  in: TKeys;
  /** 기본값 (선택적) */
  default?: TValue;
}

interface UnpivotOptions<
  TData extends DataRecord,
  TColumnKeys extends keyof TData & string,
  TValueAs extends string,
  TKeyAs extends string,
> {
  /** 언피벗할 컬럼 키 배열 */
  columns: readonly TColumnKeys[];
  /** 결과 값 컬럼 이름 */
  valueAs: TValueAs;
  /** 결과 키 컬럼 이름 */
  keyAs: TKeyAs;
}

// ============================================
// Queryable Meta
// ============================================

interface QueryableMeta<TData extends DataRecord> {
  db: DbContext;
  from: TableBuilder<any, any> | ViewBuilder<any, any> | Queryable<any> | Queryable<any>[];
  as: string; // 테이블 alias (기본값: "TBL", join시: "TBL.posts" 등)
  columns: QueryableRecord<TData>;
  where: WhereExprUnit[];
  joins: {
    as: string;
    queryable: Queryable<any>;
    isSingle: boolean;
  }[];
  distinct?: boolean;
  top?: number;
  orderBy?: { column: ExprUnit<ColumnPrimitive>; desc: boolean }[];
  limit?: { skip: number; take: number };
  groupBy?: ExprUnit<ColumnPrimitive>[];
  having?: WhereExprUnit[];
  lock?: boolean;
  sample?: number;
  pivot?: {
    valueColumn: ExprUnit<ColumnPrimitive>;
    forColumn: ExprUnit<ColumnPrimitive>;
    keys: readonly string[];
    defaultValue?: ColumnPrimitive;
    aggFn: (v: ExprUnit<ColumnPrimitive>) => ExprUnit<ColumnPrimitive>;
  };
  unpivot?: {
    columns: ExprUnit<ColumnPrimitive>[];
    valueAs: string;
    keyAs: string;
  };
  isColumnsChanged?: boolean;
}

// ============================================
// Queryable
// ============================================

export class Queryable<
  TData extends DataRecord,
  TFrom extends TableBuilder<any, any> | ViewBuilder<any, any> | never = never,
> {
  constructor(private readonly _meta: QueryableMeta<TData>) {}

  // ============================================
  // SELECT 관련 (TFrom → never)
  // ============================================

  select<R extends DataRecord>(
    fn: (columns: QueryableRecord<TData>) => QueryableRecord<R>,
  ): Queryable<R, never> {
    const newColumns = fn(this._meta.columns);

    return new Queryable({
      ...this._meta,
      columns: newColumns,
      isColumnsChanged: true,
    });
  }

  distinct(): Queryable<TData, never> {
    return new Queryable({
      ...this._meta,
      distinct: true,
    });
  }

  top(count: number): Queryable<TData, TFrom> {
    return new Queryable({
      ...this._meta,
      top: count,
    });
  }

  // ============================================
  // WHERE / HAVING
  // ============================================

  where(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, TFrom> {
    const conditions = predicate(this._meta.columns);

    return new Queryable({
      ...this._meta,
      where: [...this._meta.where, ...conditions],
    });
  }

  having(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, never> {
    const conditions = predicate(this._meta.columns);

    return new Queryable({
      ...this._meta,
      having: [...(this._meta.having ?? []), ...conditions],
    });
  }

  // ============================================
  // ORDER BY
  // ============================================

  orderBy(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
    desc?: boolean,
  ): Queryable<TData, TFrom> {
    const column = fn(this._meta.columns);

    return new Queryable({
      ...this._meta,
      orderBy: [...(this._meta.orderBy ?? []), { column, desc: desc ?? false }],
    });
  }

  clearOrderBy(): Queryable<TData, TFrom> {
    return new Queryable({
      ...this._meta,
      orderBy: undefined,
    });
  }

  // ============================================
  // LIMIT / OFFSET
  // ============================================

  limit(skip: number, take: number): Queryable<TData, TFrom> {
    return new Queryable({
      ...this._meta,
      limit: { skip, take },
    });
  }

  // ============================================
  // GROUP BY (TFrom → never)
  // ============================================

  groupBy(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>[],
  ): Queryable<TData, never> {
    const groupColumns = fn(this._meta.columns);

    return new Queryable({
      ...this._meta,
      groupBy: groupColumns,
    });
  }

  // ============================================
  // LOCK
  // ============================================

  lock(): Queryable<TData, TFrom> {
    return new Queryable({
      ...this._meta,
      lock: true,
    });
  }

  // ============================================
  // SAMPLE (TABLESAMPLE)
  // ============================================

  sample(rowCount: number): Queryable<TData, TFrom> {
    return new Queryable({
      ...this._meta,
      sample: rowCount,
    });
  }

  // ============================================
  // PIVOT (TFrom → never)
  // ============================================

  pivot<TValue extends ColumnPrimitive, TKeys extends readonly string[]>(
    options: PivotOptions<TData, TValue, TKeys>,
  ): Queryable<TData & { [K in TKeys[number]]: TValue }, never> {
    const valueColumn = options.value(this._meta.columns);
    const forColumn = options.for(this._meta.columns);

    // 각 키별로 qh.getPivotInColumn()이 agg까지 포함하여 최종 컬럼 생성
    const pivotColumns = {} as Record<string, ExprUnit<TValue>>;
    for (const key of options.in) {
      // MSSQL: [PVT].[key]
      // MySQL/PostgreSQL: SUM(CASE WHEN ... END)
      pivotColumns[key] = this._meta.db.qh.getPivotInColumn(
        key,
        valueColumn,
        forColumn,
        options.agg as (v: ExprUnit<TValue>) => ExprUnit<TValue>,
        options.default,
      );
    }

    // 원본 컬럼에서 value/for 컬럼 제외 (PIVOT 결과에 포함되지 않음)
    const tempColumns = { ...this._meta.columns } as Record<string, ExprUnit<ColumnPrimitive>>;
    const valueExpr = valueColumn.expr;
    const forExpr = forColumn.expr;
    for (const [key, unit] of Object.entries(tempColumns)) {
      if (unit.expr === valueExpr || unit.expr === forExpr) {
        delete tempColumns[key];
      }
    }

    // dialect별 컬럼 alias 변환 (MSSQL: [TBL] → [PVT])
    const convertedColumns = this._meta.db.qh.convertColumnsForPivot(tempColumns);

    return new Queryable({
      ...this._meta,
      columns: {
        ...convertedColumns,
        ...pivotColumns,
      } as unknown as QueryableRecord<TData & { [K in TKeys[number]]: TValue }>,
      pivot: {
        valueColumn,
        forColumn,
        keys: options.in,
        defaultValue: options.default,
        aggFn: options.agg as (v: ExprUnit<ColumnPrimitive>) => ExprUnit<ColumnPrimitive>, // MSSQL QueryBuilder용
      },
    });
  }

  // ============================================
  // UNPIVOT (TFrom → never)
  // ============================================

  unpivot<TColumnKeys extends keyof TData & string, TValueAs extends string, TKeyAs extends string>(
    options: UnpivotOptions<TData, TColumnKeys, TValueAs, TKeyAs>,
  ): Queryable<
    TData & { [K in TValueAs]: TData[TColumnKeys] } & { [K in TKeyAs]: TColumnKeys },
    never
  > {
    // columns 키 배열로부터 ExprUnit 배열 생성
    const unpivotColumns = options.columns.map((key) => this._meta.columns[key] as ExprUnit<any>);
    const valueType = unpivotColumns[0]?.type ?? "string";

    // 새 columns 구성 (언피벗 대상 컬럼 제거)
    const tempColumns = { ...this._meta.columns } as Record<string, ExprUnit<any>>;
    for (const key of options.columns) {
      delete tempColumns[key];
    }

    // dialect별 컬럼 alias 변환 (MSSQL: [TBL] → [UPVT])
    const newColumns = this._meta.db.qh.convertColumnsForUnpivot(tempColumns) as Record<
      string,
      unknown
    >;

    // value/key 컬럼 추가
    newColumns[options.valueAs] = this._meta.db.qh.getUnpivotValueColumn(
      options.valueAs,
      valueType,
    );
    newColumns[options.keyAs] = this._meta.db.qh.getUnpivotKeyColumn(options.keyAs);

    return new Queryable({
      ...this._meta,
      columns: newColumns as unknown as QueryableRecord<
        TData & { [K in TValueAs]: TData[TColumnKeys] } & { [K in TKeyAs]: TColumnKeys }
      >,
      unpivot: {
        columns: unpivotColumns,
        valueAs: options.valueAs,
        keyAs: options.keyAs,
      },
    });
  }

  // ============================================
  // WRAP (서브쿼리, TFrom → never)
  // ============================================

  wrap(): Queryable<TData, never> {
    // 현재 Queryable을 서브쿼리로 감싸기
    return new Queryable({
      db: this._meta.db,
      from: this as Queryable<any>,
      as: "TBL",
      columns: this._meta.columns,
      where: [],
      joins: [],
    });
  }

  // ============================================
  // UNION (static, TFrom → never)
  // ============================================

  static union<T extends DataRecord>(queryables: Queryable<T, any>[]): Queryable<T, never> {
    if (queryables.length === 0) {
      throw new Error("union requires at least one queryable");
    }

    const first = queryables[0];

    return new Queryable({
      db: first._meta.db,
      from: queryables as Queryable<any>[],
      as: "TBL",
      columns: first._meta.columns,
      where: [],
      joins: [],
    });
  }

  // ============================================
  // SEARCH (LIKE/REGEXP 검색)
  // ============================================

  search(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<string | undefined>[],
    searchText: string,
  ): Queryable<TData, TFrom> {
    if (!searchText.trim()) return this;

    const fields = fn(this._meta.columns);
    const db = this._meta.db;

    // 검색어 파싱 및 조건 생성
    const terms = searchText
      .trim()
      .split(" ")
      .filter((t) => t.length > 0);

    const conditions: WhereExprUnit[] = [];

    for (const term of terms) {
      const fieldConditions: WhereExprUnit[] = [];
      for (const field of fields) {
        fieldConditions.push(db.qh.includes(db.qh.lower(field), term.toLowerCase()));
      }
      if (fieldConditions.length > 0) {
        conditions.push(db.qh.or(fieldConditions));
      }
    }

    if (conditions.length === 0) return this;

    return new Queryable({
      ...this._meta,
      where: [...this._meta.where, db.qh.and(conditions)],
    });
  }

  // ============================================
  // INCLUDE (FK 기반 자동 JOIN)
  // ============================================

  include(fn: (item: TData) => DataRecord | DataRecord[]): Queryable<TData, TFrom> {
    const parsed = FnUtils.parse(fn);
    const itemParamName = parsed.params[0];
    const relationChain = parsed.returnContent
      .replace(itemParamName + ".", "")
      .replace(/\[0]/g, "")
      .trim();

    return this._include(relationChain);
  }

  private _include(relationChain: string): Queryable<TData, TFrom> {
    const relationNames = relationChain.split(".");

    let result: Queryable<any> = this;
    let currentTable = this._meta.from;
    const chainParts: string[] = [];

    for (const relationName of relationNames) {
      if (!(currentTable instanceof TableBuilder)) {
        throw new Error("include는 TableBuilder 기반에서만 가능");
      }

      const parentChain = chainParts.join(".");
      chainParts.push(relationName);

      const relations = currentTable.meta.relations;
      const relationDef = relations?.[relationName];

      if (relationDef == null) {
        throw new Error(`Relation '${relationName}' not found`);
      }

      if (relationDef instanceof ForeignKeyBuilder) {
        // FK (N:1): Post.user → User
        // 조건: Post.userId = User.id
        const targetTable = relationDef.meta.targetFn();
        const fkColKeys = this._getColKeysFromFn(currentTable, relationDef.meta.columnsFn);
        const pkColKeys = this._getPkColKeys(targetTable.meta.columns);

        if (fkColKeys.length !== pkColKeys.length) {
          throw new Error(`FK/PK column count mismatch: ${currentTable.meta.name}.${relationName}`);
        }

        result = result.joinSingle(targetTable, relationName, (joinQr, parentCols) => {
          const srcCols = this._getChainedCols(parentCols, parentChain);
          const conditions: WhereExprUnit[] = [];

          for (let i = 0; i < fkColKeys.length; i++) {
            const fkCol = srcCols[fkColKeys[i]] as ExprUnit<ColumnPrimitive>;
            const pkCol = (joinQr.meta.columns as QueryableRecord<DataRecord>)[
              pkColKeys[i]
            ] as ExprUnit<ColumnPrimitive>;

            conditions.push(this._meta.db.qh.isNotNull(fkCol));
            conditions.push(this._meta.db.qh.eq(pkCol, fkCol));
          }

          return joinQr.where(() => conditions);
        });

        currentTable = targetTable;
      } else if (relationDef instanceof ForeignKeyTargetBuilder) {
        // FKT (1:N 또는 1:1): User.posts → Post[]
        // 조건: Post.userId = User.id
        const sourceFk = relationDef.meta.sourceFkFn();
        const sourceTable = sourceFk.meta.ownerFn();
        const isSingle: boolean = relationDef.meta.isSingle ?? false;

        const fkColKeys = this._getColKeysFromFn(sourceTable, sourceFk.meta.columnsFn);
        const pkColKeys = this._getPkColKeys(currentTable.meta.columns);

        if (fkColKeys.length !== pkColKeys.length) {
          throw new Error(
            `FK/PK column count mismatch: ${sourceTable.meta.name} → ${currentTable.meta.name}`,
          );
        }

        const buildJoin = (joinQr: Queryable<any>, parentCols: QueryableRecord<DataRecord>) => {
          const srcCols = this._getChainedCols(parentCols, parentChain);
          const conditions: WhereExprUnit[] = [];

          for (let i = 0; i < fkColKeys.length; i++) {
            const pkCol = srcCols[pkColKeys[i]] as ExprUnit<ColumnPrimitive>;
            const fkCol = joinQr.meta.columns[fkColKeys[i]] as ExprUnit<ColumnPrimitive>;

            conditions.push(this._meta.db.qh.isNotNull(pkCol));
            conditions.push(this._meta.db.qh.eq(fkCol, pkCol));
          }

          return joinQr.where(() => conditions);
        };

        result = isSingle
          ? result.joinSingle(sourceTable, relationName, buildJoin)
          : result.join(sourceTable, relationName, buildJoin);

        currentTable = sourceTable;
      }
    }

    return result as Queryable<TData, TFrom>;
  }

  // ============================================
  // JOIN
  // ============================================

  // join - 1:N (배열로 추가)
  join<A extends string, TTable extends TableBuilder<any, any>, R extends DataRecord>(
    target: TTable,
    as: A,
    fwd: (
      qr: Queryable<TTable["$infer"], TTable>,
      cols: QueryableRecord<TData>,
    ) => Queryable<R, any>,
  ): Queryable<TData & { [K in A]: R[] }, TFrom>;

  join<A extends string, TJoinData extends DataRecord, R extends DataRecord>(
    target: Queryable<TJoinData, any>,
    as: A,
    fwd: (qr: Queryable<TJoinData, any>, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<TData & { [K in A]: R[] }, TFrom>;

  join<A extends string, R extends DataRecord>(
    target: TableBuilder<any, any> | Queryable<any>,
    as: A,
    fwd: (qr: Queryable<any>, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<TData & { [K in A]: R[] }, TFrom> {
    // 1. join alias 생성
    const joinAlias = `${this._meta.as}.${as}`;

    // 2. target → Queryable 변환 (alias 전달)
    const joinQr =
      target instanceof TableBuilder ? queryable(this._meta.db, target, joinAlias) : target;

    // 3. fwd 실행 (where 등 조건 추가된 Queryable 반환)
    const resultQr = fwd(joinQr, this._meta.columns);

    // 4. 새 columns에 join 결과 추가
    // LATERAL JOIN 사용 시 (isColumnsChanged 또는 중첩 join), 서브쿼리 alias 참조로 변환
    const needsLateral = resultQr._meta.isColumnsChanged || resultQr._meta.joins.length > 0;
    const joinColumns = needsLateral
      ? this._transformColumnsForLateral(resultQr._meta.columns, joinAlias)
      : resultQr._meta.columns;

    const newColumns = {
      ...this._meta.columns,
      [as]: [joinColumns],
    } as unknown as QueryableRecord<TData & { [K in A]: R[] }>;

    // 5. joins 배열에 추가
    const joins = [...this._meta.joins, { as, queryable: resultQr, isSingle: false }];

    return new Queryable({
      ...this._meta,
      columns: newColumns,
      joins,
    });
  }

  // joinSingle - N:1, 1:1 (optional 단일 객체)
  joinSingle<A extends string, TTable extends TableBuilder<any, any>, R extends DataRecord>(
    target: TTable,
    as: A,
    fwd: (
      qr: Queryable<TTable["$infer"], TTable>,
      cols: QueryableRecord<TData>,
    ) => Queryable<R, any>,
  ): Queryable<Omit<TData, A> & { [K in A]?: R }, TFrom>;

  joinSingle<A extends string, TJoinData extends DataRecord, R extends DataRecord>(
    target: Queryable<TJoinData, any>,
    as: A,
    fwd: (qr: Queryable<TJoinData, any>, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<Omit<TData, A> & { [K in A]?: R }, TFrom>;

  joinSingle<A extends string, R extends DataRecord>(
    target: TableBuilder<any, any> | Queryable<any>,
    as: A,
    fwd: (qr: Queryable<any>, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<Omit<TData, A> & { [K in A]?: R }, TFrom> {
    // 1. join alias 생성
    const joinAlias = `${this._meta.as}.${as}`;

    // 2. target → Queryable 변환 (alias 전달)
    const joinQr =
      target instanceof TableBuilder ? queryable(this._meta.db, target, joinAlias) : target;

    // 3. fwd 실행 (where 등 조건 추가된 Queryable 반환)
    const resultQr = fwd(joinQr, this._meta.columns);

    // 4. 새 columns에 join 결과 추가
    // LATERAL JOIN 사용 시 (isColumnsChanged 또는 중첩 join), 서브쿼리 alias 참조로 변환
    const needsLateral = resultQr._meta.isColumnsChanged || resultQr._meta.joins.length > 0;
    const joinColumns = needsLateral
      ? this._transformColumnsForLateral(resultQr._meta.columns, joinAlias)
      : resultQr._meta.columns;

    const newColumns = {
      ...this._meta.columns,
      [as]: joinColumns,
    } as unknown as QueryableRecord<Omit<TData, A> & { [K in A]?: R }>;

    // 5. joins 배열에 추가
    const joins = [...this._meta.joins, { as, queryable: resultQr, isSingle: true }];

    return new Queryable({
      ...this._meta,
      columns: newColumns,
      joins,
    });
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * LATERAL JOIN용 columns 변환
   * 서브쿼리 내부의 ExprUnit을 서브쿼리 alias 참조로 변환
   * 중첩 객체는 키 경로를 평탄화하여 "TBL.users"."orders.id" 형식으로 생성
   */
  private _transformColumnsForLateral(
    columns: QueryableRecord<DataRecord>,
    joinAlias: string,
    keyPrefix: string = "",
  ): QueryableRecord<DataRecord> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(columns as Record<string, unknown>)) {
      // 키 경로 생성: prefix가 있으면 "orders.id" 형식
      const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;

      if (value instanceof ExprUnit) {
        // 서브쿼리 alias 참조로 새 ExprUnit 생성
        // e.g., "TBL.user"."orders.id"
        result[key] = this._meta.db.qh.col(value.type, joinAlias, fullKey);
      } else if (Array.isArray(value) && value.length > 0) {
        // 배열 (1:N join) - 첫 번째 요소를 재귀 처리, key 자체가 prefix
        const transformedArray = this._transformColumnsForLateral(
          value[0] as QueryableRecord<DataRecord>,
          joinAlias,
          fullKey,
        );
        result[key] = [transformedArray];
      } else if (typeof value === "object" && value != null) {
        // 중첩 객체는 재귀 처리 (키 prefix 전달)
        result[key] = this._transformColumnsForLateral(
          value as QueryableRecord<DataRecord>,
          joinAlias,
          fullKey,
        );
      } else {
        result[key] = value;
      }
    }

    return result as QueryableRecord<DataRecord>;
  }

  /**
   * columnsFn 결과에서 컬럼 key 추출
   */
  private _getColKeysFromFn(
    table: TableBuilder<any, any>,
    columnsFn: (c: ColumnDefRecord) => ColumnBuilder<ColumnPrimitive, IColumnMeta>[],
  ): string[] {
    const columns = table.meta.columns;
    if (columns == null) return [];

    const builders = columnsFn(columns);
    const keys: string[] = [];

    for (const builder of builders) {
      for (const [key, col] of Object.entries(columns)) {
        if (col === builder) {
          keys.push(key);
          break;
        }
      }
    }

    return keys;
  }

  /**
   * 컬럼 정의에서 PK 컬럼 key 목록 (primaryKeyIndex 순)
   */
  private _getPkColKeys(columns: ColumnDefRecord): string[] {
    const pkCols: { key: string; index: number }[] = [];

    for (const [key, col] of Object.entries(columns)) {
      const pkIndex = col.meta.primaryKeyIndex;
      if (pkIndex != null) {
        pkCols.push({ key, index: pkIndex });
      }
    }

    return pkCols.sort((a, b) => a.index - b.index).map((p) => p.key);
  }

  /**
   * chain으로 중첩 columns 접근
   * "user.company" → cols.user.company
   */
  private _getChainedCols(
    cols: QueryableRecord<DataRecord>,
    chain: string,
  ): QueryableRecord<DataRecord> {
    if (!chain) return cols;

    let curr: unknown = cols;
    for (const part of chain.split(".")) {
      curr = (curr as Record<string, unknown>)[part];
      if (curr == null) break;
    }

    return curr as QueryableRecord<DataRecord>;
  }

  // ============================================
  // Query Definition 생성
  // ============================================

  /**
   * SELECT 쿼리 정의 생성
   */
  getSelectQueryDef(): SelectQuery {
    const def: SelectQuery = {};

    // FROM
    def.from = this._buildFromDef();
    def.as = this._meta.as;

    // SELECT
    def.select = this._buildSelectDef(this._meta.columns, "");
    def.isCustomSelect = this._meta.isColumnsChanged;

    // PIVOT 사용시 select에서 value/for 컬럼 제거
    if (this._meta.pivot) {
      const valueExpr = this._meta.pivot.valueColumn.expr;
      const forExpr = this._meta.pivot.forColumn.expr;
      for (const [key, value] of Object.entries(def.select)) {
        if (value === valueExpr || value === forExpr) {
          delete def.select[key];
        }
      }
    }

    // JOIN
    if (this._meta.joins.length > 0) {
      def.join = this._buildJoinDefs(this._meta.joins);
    }

    // WHERE
    if (this._meta.where.length > 0) {
      def.where = this._meta.where.map((w) => w.expr);
    }

    // DISTINCT
    if (this._meta.distinct) {
      def.distinct = true;
    }

    // TOP
    if (this._meta.top != null) {
      def.top = this._meta.top;
    }

    // GROUP BY
    if (this._meta.groupBy && this._meta.groupBy.length > 0) {
      def.groupBy = this._meta.groupBy.map((g) => g.expr);
    }

    // HAVING
    if (this._meta.having && this._meta.having.length > 0) {
      def.having = this._meta.having.map((h) => h.expr);
    }

    // ORDER BY
    if (this._meta.orderBy && this._meta.orderBy.length > 0) {
      def.orderBy = this._meta.orderBy.map((o) => [o.column.expr, o.desc ? "DESC" : "ASC"]);
    }

    // LIMIT
    if (this._meta.limit) {
      def.limit = [this._meta.limit.skip, this._meta.limit.take];
    }

    // PIVOT
    if (this._meta.pivot) {
      def.pivot = {
        pivotColumn: this._meta.pivot.forColumn.expr,
        valueColumn: this._meta.pivot.valueColumn.expr,
        aggregateExpr: this._meta.pivot.aggFn(this._meta.pivot.valueColumn).expr,
        pivotValues: [...this._meta.pivot.keys],
        defaultValue:
          this._meta.pivot.defaultValue != null
            ? this._meta.db.qh.val(this._meta.pivot.defaultValue).expr
            : undefined,
      };
    }

    // UNPIVOT
    if (this._meta.unpivot) {
      def.unpivot = {
        valueColumnName: this._meta.unpivot.valueAs,
        keyColumnName: this._meta.unpivot.keyAs,
        sourceColumns: this._meta.unpivot.columns.map((c) => {
          // ExprColumn에서 컬럼 이름 추출
          const expr = c.expr;
          if (expr.type === "column") {
            return expr.path[expr.path.length - 1];
          }
          throw new Error("Unpivot column must be a column expression");
        }),
      };
    }

    // LOCK
    if (this._meta.lock) {
      def.lock = true;
    }

    // SAMPLE
    if (this._meta.sample != null) {
      def.sample = this._meta.sample;
    }

    return def;
  }

  /**
   * TableBuilder/ViewBuilder에서 테이블 이름 정의를 가져온다.
   * DbContext의 database/schema를 fallback으로 사용한다.
   */
  private _getTableNameDef(from: TableBuilder<any, any> | ViewBuilder<any, any>): {
    database?: string;
    schema?: string;
    name: string;
  } {
    const db = this._meta.db;
    return {
      database: from.meta.database ?? db.database,
      schema: from.meta.schema ?? db.schema,
      name: from.meta.name,
    };
  }

  private _buildFromDef(): string | SelectQuery | SelectQuery[] {
    const from = this._meta.from;

    if (from instanceof TableBuilder || from instanceof ViewBuilder) {
      const tblNmDef = this._getTableNameDef(from);
      return this._meta.db.qh.getTableNameString(tblNmDef.database, tblNmDef.schema, tblNmDef.name);
    } else if (from instanceof Queryable) {
      // 서브쿼리
      return from.getSelectQueryDef();
    } else if (Array.isArray(from)) {
      // UNION
      return from.map((qr) => qr.getSelectQueryDef());
    }

    throw new Error("Invalid from type");
  }

  private _buildSelectDef(
    columns: QueryableRecord<DataRecord>,
    prefix: string,
  ): Record<string, Expr> {
    const result: Record<string, Expr> = {};

    for (const [key, val] of Object.entries(columns)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = val as unknown;

      if (value instanceof ExprUnit) {
        result[fullKey] = value.expr;
      } else if (Array.isArray(value) && value.length > 0) {
        // JOIN 배열 - 첫 번째 요소(QueryableRecord)를 재귀 처리
        Object.assign(
          result,
          this._buildSelectDef(value[0] as QueryableRecord<DataRecord>, fullKey),
        );
      } else if (typeof value === "object" && value != null) {
        // 중첩 객체 (joinSingle 결과)
        Object.assign(result, this._buildSelectDef(value as QueryableRecord<DataRecord>, fullKey));
      }
    }

    return result;
  }

  private _buildJoinDefs(joins: QueryableMeta<DataRecord>["joins"]): JoinQueryDef[] {
    const result: JoinQueryDef[] = [];

    for (const join of joins) {
      const joinQr = join.queryable;
      const selectDef = joinQr.getSelectQueryDef();

      const joinDef: JoinQueryDef = {
        ...selectDef,
        from: selectDef.from!,
        as: joinQr._meta.as,
        isSingle: join.isSingle,
      };

      result.push(joinDef);
    }

    return result;
  }

  /**
   * 결과 파싱 옵션 생성
   */
  getParseOption(): QueryResultParseOption {
    const columns: Record<string, { dataType: string }> = {};
    const joins: Record<string, { isSingle: boolean }> = {};

    // columns 수집
    this._collectColumns(this._meta.columns, "", columns);

    // joins 수집
    this._collectJoins(this._meta.joins, "", joins);

    return { columns, joins };
  }

  private _collectColumns(
    cols: QueryableRecord<DataRecord>,
    prefix: string,
    result: Record<string, { dataType: string }>,
  ): void {
    for (const [key, val] of Object.entries(cols)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const value = val as unknown;

      if (value instanceof ExprUnit) {
        result[fullKey] = { dataType: value.type };
      } else if (Array.isArray(value)) {
        // JOIN 배열 - 첫 번째 요소로 타입 추론
        if (value.length > 0 && typeof value[0] === "object") {
          this._collectColumns(value[0] as QueryableRecord<DataRecord>, fullKey, result);
        }
      } else if (typeof value === "object" && value != null) {
        this._collectColumns(value as QueryableRecord<DataRecord>, fullKey, result);
      }
    }
  }

  private _collectJoins(
    joinList: QueryableMeta<DataRecord>["joins"],
    prefix: string,
    result: Record<string, { isSingle: boolean }>,
  ): void {
    for (const join of joinList) {
      const fullKey = prefix ? `${prefix}.${join.as}` : join.as;
      result[fullKey] = { isSingle: join.isSingle };

      // 재귀적으로 중첩 JOIN 수집
      this._collectJoins(join.queryable._meta.joins, fullKey, result);
    }
  }

  // ============================================
  // SELECT 실행 메서드
  // ============================================

  /**
   * SELECT 실행 후 결과 반환
   */
  async resultAsync(): Promise<TData[]> {
    const def = this.getSelectQueryDef();
    const parseOption = this.getParseOption();

    const results = await this._meta.db.executeDefsAsync(
      [{ type: "select", ...def }],
      [parseOption],
    );

    return results[0] as TData[];
  }

  /**
   * 단일 결과 반환 (2개 이상이면 에러)
   */
  async singleAsync(): Promise<TData | undefined> {
    const results = await this.top(2).resultAsync();
    if (results.length > 1) {
      throw new Error("복수의 쿼리결과가 있습니다.");
    }
    return results[0];
  }

  /**
   * 첫 번째 결과 반환 (여러 개여도 첫 번째만)
   */
  async firstAsync(): Promise<TData | undefined> {
    const results = await this.top(1).resultAsync();
    return results[0];
  }

  /**
   * COUNT 실행
   */
  async countAsync(): Promise<number>;
  async countAsync(
    fwd: (cols: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
  ): Promise<number>;
  async countAsync(
    fwd?: (cols: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
  ): Promise<number> {
    if (this._meta.distinct) {
      throw new Error("distinct 이후엔 countAsync를 사용할 수 없습니다. wrap을 먼저 사용하세요.");
    }
    if (this._meta.groupBy) {
      throw new Error("groupBy 이후엔 countAsync를 사용할 수 없습니다. wrap을 먼저 사용하세요.");
    }

    const countQr = fwd
      ? this.select((c) => ({ cnt: this._meta.db.qh.count(fwd(c)) }))
      : this.select(() => ({ cnt: this._meta.db.qh.count() }));

    // orderBy 제거
    const result = await countQr.clearOrderBy().singleAsync();

    return result?.cnt ?? 0;
  }

  /**
   * 존재 여부 확인
   */
  async existsAsync(): Promise<boolean> {
    const count = await this.countAsync();
    return count > 0;
  }

  // ============================================
  // CUD 실행 메서드 (TFrom이 TableBuilder<any, any>일 때만 사용 가능)
  // ============================================

  /**
   * INSERT QueryDef 생성
   */
  getInsertQueryDef(
    records: InferInsert<TFrom>[],
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "insert" } & InsertQueryDef {
    const fromDef = this._getFromDef();
    return {
      type: "insert",
      from: { database: fromDef.database, schema: fromDef.schema, name: fromDef.name },
      records: records.map((record) =>
        this._recordToExprRecord(record as Record<string, unknown>),
      ),
      output: outputColumns ? [...outputColumns] : undefined,
      pkColNames: fromDef.pkColNames,
      aiColName: fromDef.aiColName,
    };
  }

  /**
   * INSERT 실행
   */
  async insertAsync(records: InferInsert<TFrom>[]): Promise<void>;
  async insertAsync<K extends InferColumnKeys<TFrom> & string>(
    records: InferInsert<TFrom>[],
    outputColumns: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[]>;
  async insertAsync<K extends InferColumnKeys<TFrom> & string>(
    records: InferInsert<TFrom>[],
    outputColumns?: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[] | void> {
    if (records.length === 0) {
      return outputColumns ? [] : undefined;
    }

    const def = this.getInsertQueryDef(records, outputColumns);
    const parseOption = outputColumns ? this._getOutputParseOption(outputColumns) : undefined;
    const results = await this._meta.db.executeDefsAsync([def], [parseOption]);

    if (outputColumns) {
      return results.flat() as Pick<InferColumns<TFrom>, K>[];
    }
  }

  /**
   * UPDATE QueryDef 생성
   */
  getUpdateQueryDef(
    recordFwd: (cols: QueryableRecord<TData>) => InferUpdate<TFrom>,
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "update" } & UpdateQueryDef {
    const fromDef = this._getFromDef();
    const record = recordFwd(this._meta.columns);

    const def: { type: "update" } & UpdateQueryDef = {
      type: "update",
      from: { database: fromDef.database, schema: fromDef.schema, name: fromDef.name },
      as: "TBL",
      record: this._recordToExprRecord(record as Record<string, unknown>),
      where: this._meta.where.map((w) => w.expr),
      output: outputColumns ? [...outputColumns] : undefined,
    };

    // JOIN
    if (this._meta.joins.length > 0) {
      def.join = this._buildJoinDefs(this._meta.joins);
    }

    return def;
  }

  /**
   * UPDATE 실행
   */
  async updateAsync(recordFwd: (cols: QueryableRecord<TData>) => InferUpdate<TFrom>): Promise<void>;
  async updateAsync<K extends InferColumnKeys<TFrom> & string>(
    recordFwd: (cols: QueryableRecord<TData>) => InferUpdate<TFrom>,
    outputColumns: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[]>;
  async updateAsync<K extends InferColumnKeys<TFrom> & string>(
    recordFwd: (cols: QueryableRecord<TData>) => InferUpdate<TFrom>,
    outputColumns?: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[] | void> {
    const def = this.getUpdateQueryDef(recordFwd, outputColumns);
    const parseOption = outputColumns ? this._getOutputParseOption(outputColumns) : undefined;
    const results = await this._meta.db.executeDefsAsync([def], [parseOption]);

    if (outputColumns) {
      return results[0] as Pick<InferColumns<TFrom>, K>[];
    }
  }

  /**
   * DELETE QueryDef 생성
   */
  getDeleteQueryDef(
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "delete" } & DeleteQueryDef {
    const fromDef = this._getFromDef();

    const def: { type: "delete" } & DeleteQueryDef = {
      type: "delete",
      from: { database: fromDef.database, schema: fromDef.schema, name: fromDef.name },
      as: "TBL",
      where: this._meta.where.map((w) => w.expr),
      output: outputColumns ? [...outputColumns] : undefined,
    };

    // JOIN
    if (this._meta.joins.length > 0) {
      def.join = this._buildJoinDefs(this._meta.joins);
    }

    return def;
  }

  /**
   * DELETE 실행
   */
  async deleteAsync(): Promise<void>;
  async deleteAsync<K extends InferColumnKeys<TFrom> & string>(
    outputColumns: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[]>;
  async deleteAsync<K extends InferColumnKeys<TFrom> & string>(
    outputColumns?: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[] | void> {
    const def = this.getDeleteQueryDef(outputColumns);
    const parseOption = outputColumns ? this._getOutputParseOption(outputColumns) : undefined;
    const results = await this._meta.db.executeDefsAsync([def], [parseOption]);

    if (outputColumns) {
      return results[0] as Pick<InferColumns<TFrom>, K>[];
    }
  }

  /**
   * TRUNCATE QueryDef 생성 (TableBuilder만 지원)
   */
  getTruncateQueryDef(): { type: "truncate" } & TruncateTableQueryDef {
    const fromDef = this._getFromDef();

    return {
      type: "truncate",
      table: fromDef,
    };
  }

  /**
   * TRUNCATE 실행 (TableBuilder만 지원)
   */
  async truncateAsync(): Promise<void> {
    const def = this.getTruncateQueryDef();
    await this._meta.db.executeDefsAsync([def]);
  }

  /**
   * UPSERT QueryDef 생성
   */
  getUpsertQueryDef(
    updateFwd: (cols: QueryableRecord<TData>) => InferInsert<TFrom>,
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "upsert" } & UpsertQueryDef;
  getUpsertQueryDef<U extends InferUpdate<TFrom>>(
    updateFwd: (cols: QueryableRecord<TData>) => U,
    insertFwd: (updateRecord: U) => InferInsert<TFrom>,
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "upsert" } & UpsertQueryDef;
  getUpsertQueryDef<U extends InferUpdate<TFrom>>(
    updateFwd: (cols: QueryableRecord<TData>) => U | InferInsert<TFrom>,
    insertFwdOrOutputColumns?:
      | ((updateRecord: U) => InferInsert<TFrom>)
      | (InferColumnKeys<TFrom> & string)[],
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "upsert" } & UpsertQueryDef {
    const fromDef = this._getFromDef();

    const insertFwd =
      typeof insertFwdOrOutputColumns === "function" ? insertFwdOrOutputColumns : undefined;
    const finalOutputColumns = Array.isArray(insertFwdOrOutputColumns)
      ? insertFwdOrOutputColumns
      : outputColumns;

    const updateRecord = updateFwd(this._meta.columns) as U;
    const insertRecord = insertFwd
      ? insertFwd(updateRecord)
      : (updateRecord as unknown as InferInsert<TFrom>);

    // PK, AI 컬럼 정보
    const from = this._meta.from;
    const columns: ColumnDefRecord | undefined =
      from instanceof TableBuilder
        ? from.meta.columns
        : from instanceof ViewBuilder
          ? from.meta.columns
          : undefined;
    const pkColNames = columns ? this._getPkColKeys(columns) : [];
    const aiColName = columns ? this._getAiColKey(columns) : undefined;

    return {
      type: "upsert",
      from: { database: fromDef.database, schema: fromDef.schema, name: fromDef.name },
      as: "TBL",
      updateRecord: this._recordToExprRecord(updateRecord as Record<string, unknown>),
      insertRecord: this._recordToExprRecord(insertRecord as Record<string, unknown>),
      where: this._meta.where.map((w) => w.expr),
      output: finalOutputColumns ? [...finalOutputColumns] : undefined,
      pkColNames,
      aiColName,
    };
  }

  /**
   * UPSERT 실행 (UPDATE or INSERT)
   */
  async upsertAsync(updateFwd: (cols: QueryableRecord<TData>) => InferInsert<TFrom>): Promise<void>;
  async upsertAsync<K extends InferColumnKeys<TFrom> & string>(
    updateFwd: (cols: QueryableRecord<TData>) => InferInsert<TFrom>,
    outputColumns: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[]>;
  async upsertAsync<U extends InferUpdate<TFrom>>(
    updateFwd: (cols: QueryableRecord<TData>) => U,
    insertFwd: (updateRecord: U) => InferInsert<TFrom>,
  ): Promise<void>;
  async upsertAsync<U extends InferUpdate<TFrom>, K extends InferColumnKeys<TFrom> & string>(
    updateFwd: (cols: QueryableRecord<TData>) => U,
    insertFwd: (updateRecord: U) => InferInsert<TFrom>,
    outputColumns: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[]>;
  async upsertAsync<U extends InferUpdate<TFrom>, K extends InferColumnKeys<TFrom> & string>(
    updateFwd: (cols: QueryableRecord<TData>) => U | InferInsert<TFrom>,
    insertFwdOrOutputColumns?: ((updateRecord: U) => InferInsert<TFrom>) | K[],
    outputColumns?: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[] | void> {
    const finalOutputColumns = Array.isArray(insertFwdOrOutputColumns)
      ? insertFwdOrOutputColumns
      : outputColumns;

    const def = this.getUpsertQueryDef(
      updateFwd as any,
      insertFwdOrOutputColumns as any,
      outputColumns,
    );

    const parseOption = finalOutputColumns
      ? this._getOutputParseOption(finalOutputColumns)
      : undefined;
    const results = await this._meta.db.executeDefsAsync([def], [parseOption]);

    if (finalOutputColumns) {
      return results[0] as Pick<InferColumns<TFrom>, K>[];
    }
  }

  /**
   * INSERT IF NOT EXISTS QueryDef 생성
   */
  getInsertIfNotExistsQueryDef(
    recordFwd: (cols: QueryableRecord<TData>) => InferInsert<TFrom>,
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "insertIfNotExists" } & InsertIfNotExistsQueryDef {
    const fromDef = this._getFromDef();
    const record = recordFwd(this._meta.columns);

    return {
      type: "insertIfNotExists",
      from: { database: fromDef.database, schema: fromDef.schema, name: fromDef.name },
      as: "TBL",
      insertRecord: this._recordToExprRecord(record as Record<string, unknown>),
      where: this._meta.where.map((w) => w.expr),
      output: outputColumns ? [...outputColumns] : undefined,
      pkColNames: fromDef.pkColNames,
      aiColName: fromDef.aiColName,
    };
  }

  /**
   * INSERT IF NOT EXISTS (WHERE 조건에 없으면 INSERT)
   */
  async insertIfNotExistsAsync(
    recordFwd: (cols: QueryableRecord<TData>) => InferInsert<TFrom>,
  ): Promise<void>;
  async insertIfNotExistsAsync<K extends InferColumnKeys<TFrom> & string>(
    recordFwd: (cols: QueryableRecord<TData>) => InferInsert<TFrom>,
    outputColumns: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[]>;
  async insertIfNotExistsAsync<K extends InferColumnKeys<TFrom> & string>(
    recordFwd: (cols: QueryableRecord<TData>) => InferInsert<TFrom>,
    outputColumns?: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[] | void> {
    const def = this.getInsertIfNotExistsQueryDef(recordFwd, outputColumns);
    const parseOption = outputColumns ? this._getOutputParseOption(outputColumns) : undefined;
    const results = await this._meta.db.executeDefsAsync([def], [parseOption]);

    if (outputColumns) {
      return results[0] as Pick<InferColumns<TFrom>, K>[];
    }
  }

  /**
   * INSERT INTO QueryDef 생성
   */
  getInsertIntoQueryDef<TTarget extends TableBuilder<any, any>>(
    targetTable: TTarget,
    options?: { stopAutoIdentity?: boolean },
  ): { type: "insertInto" } & InsertIntoQueryDef {
    const selectDef = this.getSelectQueryDef();

    return {
      type: "insertInto",
      ...selectDef,
      select: selectDef.select ?? {},
      target: {
        database: targetTable.meta.database ?? this._meta.db.database,
        schema: targetTable.meta.schema ?? this._meta.db.schema,
        name: targetTable.meta.name,
      },
      stopAutoIdentity: options?.stopAutoIdentity,
    };
  }

  /**
   * INSERT INTO ... SELECT (현재 SELECT 결과를 다른 테이블에 INSERT)
   */
  async insertIntoAsync<TTarget extends TableBuilder<any, any>>(
    targetTable: TTarget,
    options?: { stopAutoIdentity?: boolean },
  ): Promise<void> {
    const def = this.getInsertIntoQueryDef(targetTable, options);
    await this._meta.db.executeDefsAsync([def]);
  }

  /**
   * INSERT without FK check QueryDef 생성
   */
  getInsertWithoutFkCheckQueryDef(
    records: InferInsert<TFrom>[],
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "insert" } & InsertQueryDef {
    return {
      ...this.getInsertQueryDef(records, outputColumns),
      disableFkCheck: true,
    };
  }

  /**
   * INSERT without FK check (FK 체크 없이 INSERT)
   */
  async insertWithoutFkCheckAsync(records: InferInsert<TFrom>[]): Promise<void>;
  async insertWithoutFkCheckAsync<K extends InferColumnKeys<TFrom> & string>(
    records: InferInsert<TFrom>[],
    outputColumns: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[]>;
  async insertWithoutFkCheckAsync<K extends InferColumnKeys<TFrom> & string>(
    records: InferInsert<TFrom>[],
    outputColumns?: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[] | void> {
    if (records.length === 0) {
      return outputColumns ? [] : undefined;
    }

    const def = this.getInsertWithoutFkCheckQueryDef(records, outputColumns);
    const parseOption = outputColumns ? this._getOutputParseOption(outputColumns) : undefined;
    const results = await this._meta.db.executeDefsAsync([def], [parseOption]);

    if (outputColumns) {
      return results.flat() as Pick<InferColumns<TFrom>, K>[];
    }
  }

  /**
   * UPDATE without FK check QueryDef 생성
   */
  getUpdateWithoutFkCheckQueryDef(
    recordFwd: (cols: QueryableRecord<TData>) => InferUpdate<TFrom>,
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "update" } & UpdateQueryDef {
    return {
      ...this.getUpdateQueryDef(recordFwd, outputColumns),
      disableFkCheck: true,
    };
  }

  /**
   * UPDATE without FK check (FK 체크 없이 UPDATE)
   */
  async updateWithoutFkCheckAsync(
    recordFwd: (cols: QueryableRecord<TData>) => InferUpdate<TFrom>,
  ): Promise<void>;
  async updateWithoutFkCheckAsync<K extends InferColumnKeys<TFrom> & string>(
    recordFwd: (cols: QueryableRecord<TData>) => InferUpdate<TFrom>,
    outputColumns: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[]>;
  async updateWithoutFkCheckAsync<K extends InferColumnKeys<TFrom> & string>(
    recordFwd: (cols: QueryableRecord<TData>) => InferUpdate<TFrom>,
    outputColumns?: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[] | void> {
    const def = this.getUpdateWithoutFkCheckQueryDef(recordFwd, outputColumns);
    const parseOption = outputColumns ? this._getOutputParseOption(outputColumns) : undefined;
    const results = await this._meta.db.executeDefsAsync([def], [parseOption]);

    if (outputColumns) {
      return results[0] as Pick<InferColumns<TFrom>, K>[];
    }
  }

  /**
   * DELETE without FK check QueryDef 생성
   */
  getDeleteWithoutFkCheckQueryDef(
    outputColumns?: (InferColumnKeys<TFrom> & string)[],
  ): { type: "delete" } & DeleteQueryDef {
    return {
      ...this.getDeleteQueryDef(outputColumns),
      disableFkCheck: true,
    };
  }

  /**
   * DELETE without FK check (FK 체크 없이 DELETE)
   */
  async deleteWithoutFkCheckAsync(): Promise<void>;
  async deleteWithoutFkCheckAsync<K extends InferColumnKeys<TFrom> & string>(
    outputColumns: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[]>;
  async deleteWithoutFkCheckAsync<K extends InferColumnKeys<TFrom> & string>(
    outputColumns?: K[],
  ): Promise<Pick<InferColumns<TFrom>, K>[] | void> {
    const def = this.getDeleteWithoutFkCheckQueryDef(outputColumns);
    const parseOption = outputColumns ? this._getOutputParseOption(outputColumns) : undefined;
    const results = await this._meta.db.executeDefsAsync([def], [parseOption]);

    if (outputColumns) {
      return results[0] as Pick<InferColumns<TFrom>, K>[];
    }
  }

  // ============================================
  // CUD Private Helpers
  // ============================================

  private _getFromDef(): {
    database?: string;
    schema?: string;
    name: string;
    columns: Record<string, { type: ColumnPrimitiveStr }>;
    pkColNames: string[];
    aiColName?: string;
  } {
    const from = this._meta.from;

    if (from instanceof TableBuilder) {
      if (from.meta.columns == null) {
        throw new Error("테이블 컬럼 정의가 없습니다.");
      }

      const columns: Record<string, { type: ColumnPrimitiveStr }> = {};
      const pkCols: { name: string; index: number }[] = [];
      let aiColName: string | undefined;

      for (const [key, col] of Object.entries(from.meta.columns as ColumnDefRecord)) {
        columns[key] = { type: col.meta.type };

        // PK 수집
        if (col.meta.primaryKeyIndex != null) {
          pkCols.push({ name: key, index: col.meta.primaryKeyIndex });
        }

        // AI 수집
        if (col.meta.autoIncrement) {
          aiColName = key;
        }
      }

      // PK를 index 순으로 정렬
      pkCols.sort((a, b) => a.index - b.index);

      const tblNmDef = this._getTableNameDef(from);
      return {
        database: tblNmDef.database,
        schema: tblNmDef.schema,
        name: tblNmDef.name,
        columns,
        pkColNames: pkCols.map((p) => p.name),
        aiColName,
      };
    } else if (from instanceof ViewBuilder) {
      // columns가 있으면 columns 사용 (CUD 가능)
      if (from.meta.columns != null) {
        const columns: Record<string, { type: ColumnPrimitiveStr }> = {};
        const pkCols: { name: string; index: number }[] = [];
        let aiColName: string | undefined;

        for (const [key, col] of Object.entries(from.meta.columns as ColumnDefRecord)) {
          columns[key] = { type: col.meta.type };

          if (col.meta.primaryKeyIndex != null) {
            pkCols.push({ name: key, index: col.meta.primaryKeyIndex });
          }

          if (col.meta.autoIncrement) {
            aiColName = key;
          }
        }

        pkCols.sort((a, b) => a.index - b.index);

        const tblNmDef = this._getTableNameDef(from);
        return {
          database: tblNmDef.database,
          schema: tblNmDef.schema,
          name: tblNmDef.name,
          columns,
          pkColNames: pkCols.map((p) => p.name),
          aiColName,
        };
      }

      // columns 없으면 CUD 불가
      throw new Error("View에서 CUD 작업을 하려면 columns를 정의해야 합니다.");
    }

    throw new Error("CUD 작업은 TableBuilder 또는 ViewBuilder 기반에서만 가능합니다.");
  }

  private _recordToExprRecord(record: Record<string, unknown>): Record<string, Expr> {
    const result: Record<string, Expr> = {};

    for (const [key, value] of Object.entries(record)) {
      if (value === undefined) continue;

      if (value instanceof ExprUnit) {
        result[key] = value.expr;
      } else {
        result[key] = this._meta.db.qh.val(value as ColumnPrimitive).expr;
      }
    }

    return result;
  }

  private _getOutputParseOption<K extends InferColumnKeys<TFrom>>(
    outputColumns: K[],
  ): QueryResultParseOption {
    const fromDef = this._getFromDef();
    const columns: Record<string, { dataType: string }> = {};

    for (const colName of outputColumns) {
      const colInfo = fromDef.columns[colName as string];
      columns[colName as string] = { dataType: colInfo.type };
    }

    return { columns };
  }

  private _getAiColKey(columns: ColumnDefRecord): string | undefined {
    for (const [key, col] of Object.entries(columns)) {
      if (col.meta.autoIncrement) {
        return key;
      }
    }
    return undefined;
  }

  get meta() {
    return this._meta;
  }
}

// ============================================
// queryable 팩토리 함수
// ============================================

export function queryable<T extends TableBuilder<any, any> | ViewBuilder<any, any>>(
  db: DbContext,
  tableOrView: T,
  as: string = "TBL",
): Queryable<T["$infer"], T> {
  // ViewBuilder + viewFn → viewFn 실행
  if (tableOrView instanceof ViewBuilder && tableOrView.meta.viewFn != null) {
    const baseQr = tableOrView.meta.viewFn(db);
    // TFrom을 ViewBuilder로 설정하여 반환
    return new Queryable({
      ...baseQr.meta,
      from: tableOrView,
      as,
    }) as Queryable<T["$infer"], T>;
  }

  // ViewBuilder + columns만 (DB First)
  if (tableOrView instanceof ViewBuilder && tableOrView.meta.columns != null) {
    const columnDefs = tableOrView.meta.columns;

    const columns = Object.keys(columnDefs).toObject(
      (key) => key,
      (key) => db.qh.col(columnDefs[key].meta.type, as, key),
    ) as QueryableRecord<T["$infer"]>;

    return new Queryable({ db, from: tableOrView, as, columns, joins: [], where: [] });
  }

  // TableBuilder
  if (tableOrView instanceof TableBuilder && tableOrView.meta.columns != null) {
    const columnDefs = tableOrView.meta.columns;

    const columns = Object.keys(columnDefs).toObject(
      (key) => key,
      (key) => db.qh.col(columnDefs[key].meta.type, as, key),
    ) as QueryableRecord<T["$infer"]>;

    return new Queryable({ db, from: tableOrView, as, columns, joins: [], where: [] });
  }

  throw new Error(`Invalid table/view meta: ${tableOrView.meta.name}`);
}
