import { TableBuilder } from "../schema/table-builder";
import { ViewBuilder } from "../schema/view-builder";

import type { DataRecord, ResultMeta } from "../types/db";
import type {
  DeleteQueryDef,
  InsertIfNotExistsQueryDef,
  InsertIntoQueryDef,
  InsertQueryDef,
  QueryDefObjectName,
  SelectQueryDef,
  SelectQueryDefJoin,
  UpdateQueryDef,
  UpsertQueryDef,
} from "../types/query-def";
import type { DbContextBase } from "../types/db-context-def";
import {
  type ColumnBuilderRecord,
  type DataToColumnBuilderRecord,
} from "../schema/factory/column-builder";
import type { ColumnPrimitive, ColumnPrimitiveStr } from "../types/column";
import type { WhereExprUnit, ExprInput } from "../expr/expr-unit";
import { ExprUnit } from "../expr/expr-unit";
import type { Expr } from "../types/expr";
import { ArgumentError, obj } from "@simplysm/core-common";
import {
  ForeignKeyBuilder,
  ForeignKeyTargetBuilder,
  RelationKeyBuilder,
  RelationKeyTargetBuilder,
} from "../schema/factory/relation-builder";
import { parseSearchQuery } from "./search-parser";
import { expr } from "../expr/expr";

/**
 * JOIN query builder
 *
 * join/joinSingle 메서드 내부에서 조인할 table을 지정하는 데 사용
 */
class JoinQueryable {
  constructor(
    private readonly _db: DbContextBase,
    private readonly _joinAlias: string,
  ) {}

  /**
   * 조인할 table 지정
   *
   * @param table - 조인할 table
   * @returns 조인된 Queryable
   */
  from<T extends TableBuilder<any, any>>(table: T): Queryable<T["$inferSelect"], T> {
    return queryable(this._db, table, this._joinAlias)();
  }

  /**
   * 조인 결과의 column을 직접 지정
   *
   * @param columns - 커스텀 column 정의
   * @returns 커스텀 column이 적용된 Queryable
   */
  select<R extends DataRecord>(columns: QueryableRecord<R>): Queryable<R, never> {
    return new Queryable({
      db: this._db,
      as: this._joinAlias,
      columns,
      isCustomColumns: true,
    });
  }

  /**
   * 여러 Queryable을 UNION으로 결합
   *
   * @param queries - UNION할 Queryable 배열 (최소 2개)
   * @returns UNION된 Queryable
   * @throws 2개 미만의 queryable이 전달되면 에러
   */
  union<TData extends DataRecord>(...queries: Queryable<TData, any>[]): Queryable<TData, never> {
    if (queries.length < 2) {
      throw new ArgumentError("union은 최소 2개의 queryable이 필요합니다.", {
        provided: queries.length,
        minimum: 2,
      });
    }

    const first = queries[0];

    return new Queryable({
      db: first.meta.db,
      from: queries, // Queryable[] 배열로 저장
      as: this._joinAlias,
      columns: transformColumnsAlias(first.meta.columns, this._joinAlias, ""),
    });
  }
}

/**
 * 재귀 CTE (Common Table Expression) builder
 *
 * recursive() 메서드 내부에서 사용되며, 재귀 쿼리의 본문을 정의한다
 *
 * @template TBaseData - Base query data type
 */
class RecursiveQueryable<TBaseData extends DataRecord> {
  constructor(
    private readonly _baseQr: Queryable<TBaseData, any>,
    private readonly _cteName: string,
  ) {}

  /**
   * 재귀 query의 대상 table 지정
   *
   * @param table - 재귀할 대상 table
   * @returns self 속성이 추가된 Queryable (자기 참조용)
   */
  from<T extends TableBuilder<any, any>>(
    table: T,
  ): Queryable<T["$inferSelect"] & { self?: TBaseData[] }, T> {
    const selfAlias = `${this._cteName}.self`;

    return queryable(this._baseQr.meta.db, table, this._cteName)().join(
      "self",
      () =>
        new Queryable<TBaseData, never>({
          db: this._baseQr.meta.db,
          from: this._cteName,
          as: selfAlias,
          columns: transformColumnsAlias(this._baseQr.meta.columns, selfAlias, ""),
          isCustomColumns: false,
        }),
    ) as any;
  }

  /**
   * 재귀 query의 column을 직접 지정
   *
   * @param columns - 커스텀 column 정의
   * @returns self 속성이 추가된 Queryable
   */
  select<R extends DataRecord>(
    columns: QueryableRecord<R>,
  ): Queryable<R & { self?: TBaseData[] }, never> {
    const selfAlias = `${this._cteName}.self`;

    return new Queryable<R, never>({
      db: this._baseQr.meta.db,
      as: this._cteName,
      columns,
      isCustomColumns: true,
    }).join(
      "self",
      () =>
        new Queryable<TBaseData, never>({
          db: this._baseQr.meta.db,
          from: this._cteName,
          as: selfAlias,
          columns: transformColumnsAlias(this._baseQr.meta.columns, selfAlias, ""),
          isCustomColumns: false,
        }),
    );
  }

  /**
   * 여러 Queryable을 UNION으로 결합 (재귀 query용)
   *
   * @param queries - UNION할 Queryable 배열 (최소 2개)
   * @returns self 속성이 추가된 UNION Queryable
   * @throws 2개 미만의 queryable이 전달되면 에러
   */
  union<TData extends DataRecord>(
    ...queries: Queryable<TData, any>[]
  ): Queryable<TData & { self?: TBaseData[] }, never> {
    if (queries.length < 2) {
      throw new ArgumentError("union은 최소 2개의 queryable이 필요합니다.", {
        provided: queries.length,
        minimum: 2,
      });
    }

    const first = queries[0];

    const selfAlias = `${this._cteName}.self`;

    return new Queryable<any, never>({
      db: first.meta.db,
      from: queries, // Queryable[] 배열로 저장
      as: this._cteName,
      columns: transformColumnsAlias(first.meta.columns, this._cteName, ""),
    }).join(
      "self",
      () =>
        new Queryable({
          db: this._baseQr.meta.db,
          from: this._cteName,
          as: selfAlias,
          columns: transformColumnsAlias(this._baseQr.meta.columns, selfAlias, ""),
          isCustomColumns: false,
        }),
    ) as any;
  }
}

/**
 * Query builder 클래스
 *
 * 체이닝 방식으로 table/view에 대한 SELECT, INSERT, UPDATE, DELETE query를 구성
 *
 * @template TData - Query 결과의 데이터 타입
 * @template TFrom - 소스 table (CUD 연산에 필요)
 *
 * @example
 * ```typescript
 * // Basic query
 * const users = await db.user()
 *   .where((u) => [expr.eq(u.isActive, true)])
 *   .orderBy((u) => u.name)
 *   .execute();
 *
 * // JOIN query
 * const posts = await db.post()
 *   .include((p) => p.user)
 *   .execute();
 *
 * // INSERT
 * await db.user().insert([{ name: "Gildong Hong", email: "test@test.com" }]);
 * ```
 */
export class Queryable<
  TData extends DataRecord,
  TFrom extends TableBuilder<any, any> | never, // CUD 연산은 TableBuilder만 지원
> {
  constructor(readonly meta: QueryableMeta<TData>) {}

  //#region ========== option - SELECT / DISTINCT / LOCK ==========

  /**
   * SELECT할 column 지정.
   *
   * @param fn - Column 매핑 함수. 원본 column을 받아 새 column 구조를 반환
   * @returns 새 column 구조가 적용된 Queryable
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   userName: u.name,
   *   userEmail: u.email,
   * }))
   * ```
   */
  select<R extends Record<string, any>>(
    fn: (columns: QueryableRecord<TData>) => R,
  ): Queryable<UnwrapQueryableRecord<R>, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.select(fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      }) as any;
    }

    const newColumns = fn(this.meta.columns);

    return new Queryable<any, never>({
      ...this.meta,
      columns: newColumns,
      isCustomColumns: true,
    }) as any;
  }

  /**
   * 중복 행 제거를 위한 DISTINCT 옵션 적용
   *
   * @returns DISTINCT가 적용된 Queryable
   *
   * @example
   * ```typescript
   * db.user()
   *   .select((u) => ({ name: u.name }))
   *   .distinct()
   * ```
   */
  distinct(): Queryable<TData, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.distinct());
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    return new Queryable({
      ...this.meta,
      distinct: true,
    });
  }

  /**
   * 행 잠금 적용 (FOR UPDATE)
   *
   * 트랜잭션 내에서 선택된 행에 대한 배타적 잠금 획득
   *
   * @returns 잠금이 적용된 Queryable
   *
   * @example
   * ```typescript
   * await db.connect(async () => {
   *   const user = await db.user()
   *     .where((u) => [expr.eq(u.id, 1)])
   *     .lock()
   *     .single();
   * });
   * ```
   */
  lock(): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.lock());
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    return new Queryable({
      ...this.meta,
      lock: true,
    });
  }

  //#endregion

  //#region ========== restrict - TOP / LIMIT ==========

  /**
   * 상위 N개 행만 선택 (ORDER BY 없이도 사용 가능)
   *
   * @param count - 선택할 행 수
   * @returns TOP이 적용된 Queryable
   *
   * @example
   * ```typescript
   * // Latest 10 users
   * db.user()
   *   .orderBy((u) => u.createdAt, "DESC")
   *   .top(10)
   * ```
   */
  top(count: number): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.top(count));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    return new Queryable({
      ...this.meta,
      top: count,
    });
  }

  /**
   * 페이지네이션을 위한 LIMIT/OFFSET 설정.
   * 먼저 orderBy()를 호출해야 함.
   *
   * @param skip - 건너뛸 행 수 (OFFSET)
   * @param take - 가져올 행 수 (LIMIT)
   * @returns 페이지네이션이 적용된 Queryable
   * @throws ORDER BY 절이 없으면 에러
   *
   * @example
   * ```typescript
   * db.user
   *   .orderBy((u) => u.createdAt)
   *   .limit(0, 20) // first 20
   * ```
   */
  limit(skip: number, take: number): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.limit(skip, take));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    if (!this.meta.orderBy) {
      throw new ArgumentError("limit()은 ORDER BY 절이 필요합니다.", {
        method: "limit",
        required: "orderBy",
      });
    }

    return new Queryable({
      ...this.meta,
      limit: [skip, take],
    });
  }

  //#endregion

  //#region ========== sorting - ORDER BY ==========

  /**
   * 정렬 조건 추가. 여러 번 호출 시 순서대로 적용됨.
   *
   * 문자열 overload는 체인 경로를 받아 `obj.getChainValue`로 컬럼을 찾는다.
   * 동적 정렬(sortingDefs 루프 등)에서 보일러플레이트를 줄이는 용도.
   *
   * @param fnOrKey - 정렬할 column을 반환하는 함수 또는 체인 경로 문자열
   * @param orderBy - 정렬 방향 (ASC/DESC). 기본값: ASC
   * @returns 정렬 조건이 추가된 Queryable
   *
   * @example
   * ```typescript
   * db.user
   *   .orderBy((u) => u.name)           // name ASC
   *   .orderBy((u) => u.age, "DESC")    // age DESC
   *   .orderBy("id", "DESC")            // string overload
   *   .orderBy("user.name")             // chain path
   * ```
   */
  orderBy(
    fnOrKey: string | ((columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>),
    orderBy?: "ASC" | "DESC",
  ): Queryable<TData, TFrom> {
    const fn =
      typeof fnOrKey === "string"
        ? (columns: QueryableRecord<TData>) =>
            obj.getChainValue(columns, fnOrKey, true) as ExprUnit<ColumnPrimitive>
        : fnOrKey;

    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.orderBy(fn, orderBy));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    const column = fn(this.meta.columns);

    return new Queryable({
      ...this.meta,
      orderBy: [...(this.meta.orderBy ?? []), [column, orderBy]],
    });
  }

  //#endregion

  //#region ========== Search - WHERE ==========

  /**
   * WHERE 조건 추가. 여러 번 호출 시 AND로 결합됨.
   *
   * @param predicate - 조건 배열을 반환하는 함수
   * @returns 조건이 추가된 Queryable
   *
   * @example
   * ```typescript
   * db.user
   *   .where((u) => [expr.eq(u.isActive, true)])
   *   .where((u) => [expr.gte(u.age, 18)])
   * ```
   */
  where(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.where(predicate));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    const conditions = predicate(this.meta.columns);

    return new Queryable({
      ...this.meta,
      where: [...(this.meta.where ?? []), ...conditions],
    });
  }

  /**
   * 텍스트 검색 수행
   *
   * 검색 구문은 {@link parseSearchQuery} 참조
   * - 공백으로 구분된 단어는 OR 조건
   * - `+`로 시작하는 단어는 필수 포함 (AND 조건)
   * - `-`로 시작하는 단어는 제외 (NOT 조건)
   *
   * @param fn - 검색 대상 column을 반환하는 함수
   * @param searchText - 검색 텍스트
   * @returns 검색 조건이 추가된 Queryable
   *
   * @example
   * ```typescript
   * db.user()
   *   .search((u) => [u.name, u.email], "John Doe -withdrawn")
   * ```
   */
  search(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<string | undefined>[],
    searchText: string,
  ): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.search(fn, searchText));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    if (searchText.trim() === "") {
      return this;
    }

    const columns = fn(this.meta.columns);
    const parsed = parseSearchQuery(searchText);

    const conditions: WhereExprUnit[] = [];

    // OR 조건: 아무 column에서 아무 패턴이 매칭되면 일치
    if (parsed.or.length === 1) {
      const pattern = parsed.or[0];
      const columnMatches = columns.map((col) => expr.like(expr.lower(col), pattern.toLowerCase()));
      conditions.push(expr.or(columnMatches));
    } else if (parsed.or.length > 1) {
      const orConditions = parsed.or.map((pattern) => {
        const columnMatches = columns.map((col) =>
          expr.like(expr.lower(col), pattern.toLowerCase()),
        );
        return expr.or(columnMatches);
      });
      conditions.push(expr.or(orConditions));
    }

    // MUST 조건: 각 패턴이 최소 하나의 column에서 매칭되어야 함 (AND)
    for (const pattern of parsed.must) {
      const columnMatches = columns.map((col) => expr.like(expr.lower(col), pattern.toLowerCase()));
      conditions.push(expr.or(columnMatches));
    }

    // NOT 조건: 아무 column에서도 매칭되지 않아야 함 (AND NOT)
    for (const pattern of parsed.not) {
      const columnMatches = columns.map((col) => expr.like(expr.lower(col), pattern.toLowerCase()));
      conditions.push(expr.not(expr.or(columnMatches)));
    }

    if (conditions.length === 0) {
      return this;
    }

    return this.where(() => [expr.and(conditions)]);
  }

  //#endregion

  //#region ========== Group - GROUP BY / HAVING ==========

  /**
   * GROUP BY 절 추가
   *
   * @param fn - 그룹화할 column을 반환하는 함수
   * @returns GROUP BY가 적용된 Queryable
   *
   * @example
   * ```typescript
   * db.order()
   *   .select((o) => ({
   *     userId: o.userId,
   *     totalAmount: expr.sum(o.amount),
   *   }))
   *   .groupBy((o) => [o.userId])
   * ```
   */
  groupBy(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>[],
  ): Queryable<TData, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.groupBy(fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    const groupBy = fn(this.meta.columns);

    return new Queryable({ ...this.meta, groupBy });
  }

  /**
   * HAVING 절 추가 (GROUP BY 이후 필터링)
   *
   * @param predicate - 조건 배열을 반환하는 함수
   * @returns HAVING이 적용된 Queryable
   *
   * @example
   * ```typescript
   * db.order()
   *   .select((o) => ({
   *     userId: o.userId,
   *     totalAmount: expr.sum(o.amount),
   *   }))
   *   .groupBy((o) => [o.userId])
   *   .having((o) => [expr.gte(o.totalAmount, 10000)])
   * ```
   */
  having(predicate: (columns: QueryableRecord<TData>) => WhereExprUnit[]): Queryable<TData, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.having(predicate));
      return new Queryable({
        ...this.meta,
        from: newFroms,
      });
    }

    const conditions = predicate(this.meta.columns);

    return new Queryable({
      ...this.meta,
      having: [...(this.meta.having ?? []), ...conditions],
    });
  }

  //#endregion

  //#region ========== join - JOIN / JOIN SINGLE ==========

  /**
   * 1:N 관계에 대한 LEFT OUTER JOIN 수행 (결과에 배열로 추가)
   *
   * @param as - 결과에 추가할 속성 이름
   * @param fn - 조인 조건을 정의하는 콜백 함수
   * @returns 조인 결과가 배열로 추가된 Queryable
   *
   * @example
   * ```typescript
   * db.user()
   *   .join("posts", (qr, u) =>
   *     qr.from(Post)
   *       .where((p) => [expr.eq(p.userId, u.id)])
   *   )
   * // Result: { id, name, posts: [{ id, title }, ...] }
   * ```
   */
  join<A extends string, R extends DataRecord>(
    as: A,
    fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<TData & { [K in A]?: R[] }, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.join(as, fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }

    // 1. JOIN 별칭 생성
    const joinAlias = `${this.meta.as}.${as}`;

    // 2. 대상을 Queryable로 변환 (별칭 전달)
    const joinQr = new JoinQueryable(this.meta.db, joinAlias);

    // 3. fn 실행 (where 등 조건이 추가된 Queryable 반환)
    const resultQr = fn(joinQr, this.meta.columns);

    // 4. JOIN 결과를 새 column에 추가
    const joinColumns = transformColumnsAlias(resultQr.meta.columns, joinAlias);

    return new Queryable({
      ...this.meta,
      columns: {
        ...this.meta.columns,
        [as]: [joinColumns],
      } as QueryableRecord<any>,
      isCustomColumns: true,
      joins: [...(this.meta.joins ?? []), { queryable: resultQr, isSingle: false }],
    }) as any;
  }

  /**
   * N:1 또는 1:1 관계에 대한 LEFT OUTER JOIN 수행 (결과에 단일 객체로 추가)
   *
   * @param as - 결과에 추가할 속성 이름
   * @param fn - 조인 조건을 정의하는 콜백 함수
   * @returns 조인 결과가 단일 객체로 추가된 Queryable
   *
   * @example
   * ```typescript
   * db.post()
   *   .joinSingle("user", (qr, p) =>
   *     qr.from(User)
   *       .where((u) => [expr.eq(u.id, p.userId)])
   *   )
   * // Result: { id, title, user: { id, name } | undefined }
   * ```
   */
  joinSingle<A extends string, R extends DataRecord>(
    as: A,
    fn: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<
    { [K in keyof TData as K extends A ? never : K]: TData[K] } & { [K in A]?: R },
    TFrom
  > {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.joinSingle(as, fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }

    // 1. JOIN 별칭 생성
    const joinAlias = `${this.meta.as}.${as}`;

    // 2. 대상을 Queryable로 변환 (별칭 전달)
    const joinQr = new JoinQueryable(this.meta.db, joinAlias);

    // 3. fn 실행 (where 등 조건이 추가된 Queryable 반환)
    const resultQr = fn(joinQr, this.meta.columns);

    // 4. JOIN 결과를 새 column에 추가
    const joinColumns = transformColumnsAlias(resultQr.meta.columns, joinAlias);

    return new Queryable({
      ...this.meta,
      columns: {
        ...this.meta.columns,
        [as]: joinColumns,
      } as QueryableRecord<any>,
      isCustomColumns: true,
      joins: [...(this.meta.joins ?? []), { queryable: resultQr, isSingle: true }],
    }) as any;
  }

  //#endregion

  //#region ========== join - INCLUDE ==========

  /**
   * 관련 table을 자동으로 JOIN.
   * TableBuilder에 정의된 FK/FKT 관계를 기반으로 동작.
   *
   * @param fn - 포함할 관계를 선택하는 함수 (PathProxy를 통해 타입 체크)
   * @returns JOIN이 추가된 Queryable
   * @throws 관계가 정의되지 않은 경우 에러
   *
   * @example
   * ```typescript
   * // Single relationship include
   * db.post.include((p) => p.user)
   *
   * // Nested relationship include
   * db.post.include((p) => p.user.company)
   *
   * // Multiple relationship include
   * db.user
   *   .include((u) => u.company)
   *   .include((u) => u.posts)
   * ```
   */
  include(fn: (item: PathProxy<TData>) => PathProxy<any>): Queryable<TData, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.include(fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }

    const proxy = createPathProxy<TData>();
    const result = fn(proxy);
    const relationChain = result[PATH_SYMBOL].join(".");

    return this._include(relationChain);
  }

  private _include(relationChain: string): Queryable<TData, TFrom> {
    const relationNames = relationChain.split(".");

    let result: Queryable<any, any> = this;
    let currentTable = this.meta.from;
    const chainParts: string[] = [];

    for (const relationName of relationNames) {
      if (!(currentTable instanceof TableBuilder)) {
        throw new Error("include()는 TableBuilder 기반 queryable에서만 사용할 수 있습니다.");
      }

      const parentChain = chainParts.join(".");
      chainParts.push(relationName);

      // 이미 JOIN된 경우 중복 추가 방지
      const targetAlias = `${result.meta.as}.${chainParts.join(".")}`;
      const existingJoin = result.meta.joins?.find((j) => j.queryable.meta.as === targetAlias);
      if (existingJoin) {
        // 기존 JOIN의 table로 currentTable 갱신 후 계속
        const existingFrom = existingJoin.queryable.meta.from;
        if (existingFrom instanceof TableBuilder) {
          currentTable = existingFrom;
        }
        continue;
      }

      const relationDef = currentTable.meta.relations?.[relationName];
      if (relationDef == null) {
        throw new Error(`관계 '${relationName}'을(를) 찾을 수 없습니다.`);
      }

      if (relationDef instanceof ForeignKeyBuilder || relationDef instanceof RelationKeyBuilder) {
        // FK/RelationKey (N:1): Post.user → User
        // 조건: Post.userId = User.id
        const targetTable = relationDef.meta.targetFn();
        const fkColKeys = relationDef.meta.columns;
        const targetPkColKeys = getMatchedPrimaryKeys(fkColKeys, targetTable);

        result = result.joinSingle(chainParts.join("."), (joinQr, parentCols) => {
          const qr = joinQr.from(targetTable);

          const srcCols = resolveNestedCols(parentCols, parentChain);
          const conditions: WhereExprUnit[] = [];

          for (let i = 0; i < fkColKeys.length; i++) {
            const fkCol = srcCols[fkColKeys[i]];
            const pkCol = qr.meta.columns[targetPkColKeys[i]] as ExprUnit<ColumnPrimitive>;

            conditions.push(expr.eq(pkCol, fkCol));
          }

          return qr.where(() => conditions);
        });

        currentTable = targetTable;
      } else if (
        relationDef instanceof ForeignKeyTargetBuilder ||
        relationDef instanceof RelationKeyTargetBuilder
      ) {
        // FKT/RelationKeyTarget (1:N 또는 1:1): User.posts → Post[]
        // 조건: Post.userId = User.id
        const targetTable = relationDef.meta.targetTableFn();
        const fkRelName = relationDef.meta.relationName;
        const sourceFk = targetTable.meta.relations?.[fkRelName];
        if (!(sourceFk instanceof ForeignKeyBuilder) && !(sourceFk instanceof RelationKeyBuilder)) {
          throw new Error(
            `'${relationName}'이(가) 참조하는 '${fkRelName}'은(는) ` +
              `${targetTable.meta.name} 테이블에서 유효한 ForeignKey/RelationKey가 아닙니다.`,
          );
        }
        const sourceTable = targetTable;
        const isSingle: boolean = relationDef.meta.isSingle ?? false;

        const fkColKeys = sourceFk.meta.columns;
        const pkColKeys = getMatchedPrimaryKeys(fkColKeys, currentTable);

        const buildJoin = (joinQr: JoinQueryable, parentCols: QueryableRecord<DataRecord>) => {
          const qr = joinQr.from(sourceTable);

          const srcCols = resolveNestedCols(parentCols, parentChain);
          const conditions: WhereExprUnit[] = [];

          for (let i = 0; i < fkColKeys.length; i++) {
            const pkCol = srcCols[pkColKeys[i]] as ExprUnit<ColumnPrimitive>;
            const fkCol = qr.meta.columns[fkColKeys[i]] as ExprUnit<ColumnPrimitive>;

            conditions.push(expr.eq(fkCol, pkCol));
          }

          return qr.where(() => conditions);
        };

        result = isSingle
          ? result.joinSingle(chainParts.join("."), buildJoin)
          : result.join(chainParts.join("."), buildJoin);

        currentTable = sourceTable;
      }

      // 다단계 include: flat dotted key를 부모 관계 내부로 이동
      if (parentChain !== "") {
        const flatKey = chainParts.join(".");
        const cols = result.meta.columns as Record<string, unknown>;
        const joinedCols = cols[flatKey];

        const newCols: Record<string, unknown> = { ...cols };

        // parentChain을 따라 부모를 shallow clone하며 도달
        let target = newCols;
        for (const part of parentChain.split(".")) {
          const val = target[part];
          if (Array.isArray(val)) {
            const cloned = { ...(val[0] as Record<string, unknown>) };
            target[part] = [cloned];
            target = cloned;
          } else if (val != null && typeof val === "object" && !(val instanceof ExprUnit)) {
            const cloned = { ...(val as Record<string, unknown>) };
            target[part] = cloned;
            target = cloned;
          }
        }

        target[relationName] = joinedCols;
        delete newCols[flatKey];

        result = new Queryable({
          ...result.meta,
          columns: newCols as QueryableRecord<any>,
        });
      }
    }

    return result as Queryable<TData, TFrom>;
  }

  //#endregion

  //#region ========== Subquery - WRAP / UNION ==========

  /**
   * Wrap the current Queryable as a Subquery
   *
   * Required when using count() after distinct() or groupBy()
   *
   * @returns Queryable wrapped as a Subquery
   *
   * @example
   * ```typescript
   * // Count after DISTINCT
   * const count = await db.user()
   *   .select((u) => ({ name: u.name }))
   *   .distinct()
   *   .wrap()
   *   .count();
   * ```
   */
  wrap(): Queryable<TData, never> {
    // 현재 Queryable을 서브쿼리로 래핑
    const wrapAlias = this.meta.db.getNextAlias();
    return new Queryable({
      db: this.meta.db,
      from: this,
      as: wrapAlias,
      columns: transformColumnsAlias<TData>(this.meta.columns, wrapAlias, ""),
    });
  }

  /**
   * Combine multiple Queryables with UNION (remove duplicates)
   *
   * @param queries - Array of Queryables to UNION (minimum 2)
   * @returns UNION-ed Queryable
   * @throws If less than 2 queryables are passed
   *
   * @example
   * ```typescript
   * const combined = Queryable.union(
   *   db.user().where((u) => [expr.eq(u.type, "admin")]),
   *   db.user().where((u) => [expr.eq(u.type, "manager")]),
   * );
   * ```
   */
  static union<TData extends DataRecord>(
    ...queries: Queryable<TData, any>[]
  ): Queryable<TData, never> {
    if (queries.length < 2) {
      throw new ArgumentError("union은 최소 2개의 queryable이 필요합니다.", {
        provided: queries.length,
        minimum: 2,
      });
    }

    const first = queries[0];
    const unionAlias = first.meta.db.getNextAlias();
    return new Queryable({
      db: first.meta.db,
      from: queries, // Queryable[] 배열로 저장
      as: unionAlias,
      columns: transformColumnsAlias(first.meta.columns, unionAlias, ""),
    });
  }

  //#endregion

  //#region ========== recursive - WITH RECURSIVE ==========

  /**
   * Generate a recursive CTE (Common Table Expression)
   *
   * Used for querying hierarchical data (org charts, category trees, etc.)
   *
   * @param fn - Callback function that defines the recursive part
   * @returns Queryable with the recursive CTE applied
   *
   * @example
   * ```typescript
   * // Query org chart hierarchy
   * db.employee()
   *   .where((e) => [expr.null(e.managerId)]) // Root nodes
   *   .recursive((cte) =>
   *     cte.from(Employee)
   *       .where((e) => [expr.eq(e.managerId, e.self[0].id)])
   *   )
   * ```
   */
  recursive(
    fn: (qr: RecursiveQueryable<TData>) => Queryable<TData, any>,
  ): Queryable<TData, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.recursive(fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }
    // 동적 CTE 이름 생성
    const cteName = this.meta.db.getNextAlias();

    // 2. 대상을 Queryable로 변환 (CTE 이름 전달)
    const cteQr = new RecursiveQueryable(this, cteName);

    // 3. fn 실행 (where 등 조건이 추가된 Queryable 반환)
    const resultQr = fn(cteQr);

    return new Queryable({
      db: this.meta.db,
      as: this.meta.as,
      from: cteName,
      columns: transformColumnsAlias(this.meta.columns, this.meta.as, ""),
      with: {
        name: cteName,
        base: this as any, // 순환 참조 타입 추론 차단
        recursive: resultQr,
      },
    });
  }

  //#endregion

  //#region ========== [query] Select - SELECT ==========

  /**
   * Execute a SELECT query and return the result array
   *
   * @returns Query result array
   *
   * @example
   * ```typescript
   * const users = await db.user()
   *   .where((u) => [expr.eq(u.isActive, true)])
   *   .execute();
   * ```
   */
  async execute(): Promise<TData[]> {
    const results = await this.meta.db.executeDefs<TData>(
      [this.getSelectQueryDef()],
      [this.getResultMeta()],
    );
    return results[0];
  }

  /**
   * Return a single result (Error if more than 1)
   *
   * @returns Single result or undefined
   * @throws When more than one result is returned
   *
   * @example
   * ```typescript
   * const user = await db.user()
   *   .where((u) => [expr.eq(u.id, 1)])
   *   .single();
   * ```
   */
  async single(): Promise<TData | undefined> {
    const result = await this.execute();
    if (result.length > 1) {
      throw new ArgumentError("단일 결과를 기대했으나 복수 결과가 반환되었습니다.", {
        table: this._getSourceName(),
        resultCount: result.length,
      });
    }
    return result[0];
  }

  /**
   * Query 소스 이름 반환 (에러 메시지용)
   */
  private _getSourceName(): string {
    const from = this.meta.from;
    if (from instanceof TableBuilder || from instanceof ViewBuilder) {
      return from.meta.name;
    }
    if (typeof from === "string") {
      return from;
    }
    return this.meta.as;
  }

  /**
   * Return the first result (only the first even if multiple exist)
   *
   * @returns First result or undefined
   *
   * @example
   * ```typescript
   * const latestUser = await db.user()
   *   .orderBy((u) => u.createdAt, "DESC")
   *   .first();
   * ```
   */
  async first(): Promise<TData | undefined> {
    const results = await this.top(1).execute();
    return results[0];
  }

  /**
   * Return the number of result rows
   *
   * @param fn - Function to specify the column to count (optional)
   * @returns Number of rows
   * @throws Error when called directly after distinct() or groupBy() (use wrap() first)
   *
   * @example
   * ```typescript
   * const count = await db.user()
   *   .where((u) => [expr.eq(u.isActive, true)])
   *   .count();
   * ```
   */
  async count(fn?: (cols: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>): Promise<number> {
    if (this.meta.distinct) {
      throw new Error("distinct() 이후에 count()를 사용할 수 없습니다. wrap()을 먼저 사용하세요.");
    }
    if (this.meta.groupBy) {
      throw new Error("groupBy() 이후에 count()를 사용할 수 없습니다. wrap()을 먼저 사용하세요.");
    }

    const countQr = fn
      ? this.select((c) => ({ cnt: expr.count(fn(c)) }))
      : this.select(() => ({ cnt: expr.count() }));

    const result = await countQr.single();

    return result?.cnt ?? 0;
  }

  /**
   * Check whether data matching the conditions exists
   *
   * @returns true if exists, false otherwise
   *
   * @example
   * ```typescript
   * const hasAdmin = await db.user()
   *   .where((u) => [expr.eq(u.role, "admin")])
   *   .exists();
   * ```
   */
  async exists(): Promise<boolean> {
    const result = await this.top(1).execute();
    return result.length > 0;
  }

  getSelectQueryDef(): SelectQueryDef {
    return obj.clearUndefined({
      type: "select",
      from: this._buildFromDef(),
      as: this.meta.as,
      select: this.meta.isCustomColumns ? this._buildSelectDef(this.meta.columns, "") : undefined,
      distinct: this.meta.distinct,
      top: this.meta.top,
      lock: this.meta.lock,
      where: this.meta.where?.map((w) => w.expr),
      joins: this.meta.joins ? this._buildJoinDefs(this.meta.joins) : undefined,
      orderBy: this.meta.orderBy?.map((o) => (o[1] ? [o[0].expr, o[1]] : [o[0].expr])),
      limit: this.meta.limit,
      groupBy: this.meta.groupBy?.map((g) => g.expr),
      having: this.meta.having?.map((w) => w.expr),
      with: this.meta.with
        ? {
            name: this.meta.with.name,
            base: this.meta.with.base.getSelectQueryDef(),
            recursive: this.meta.with.recursive.getSelectQueryDef(),
          }
        : undefined,
    });
  }

  private _buildFromDef():
    | QueryDefObjectName
    | SelectQueryDef
    | SelectQueryDef[]
    | string
    | undefined {
    const from = this.meta.from;

    if (from instanceof TableBuilder || from instanceof ViewBuilder) {
      return this.meta.db.getQueryDefObjectName(from);
    } else if (from instanceof Queryable) {
      return from.getSelectQueryDef();
    } else if (Array.isArray(from)) {
      return from.map((qr) => qr.getSelectQueryDef());
    }

    return from;
  }

  private _buildSelectDef(
    columns: QueryableRecord<any> | QueryableWriteRecord<any>,
    prefix: string,
  ): Record<string, Expr> {
    const result: Record<string, Expr> = {};

    for (const [key, val] of Object.entries(columns)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (val instanceof ExprUnit) {
        result[fullKey] = val.expr;
      } else if (Array.isArray(val)) {
        if (val.length > 0) {
          Object.assign(result, this._buildSelectDef(val[0], fullKey));
        }
      } else if (typeof val === "object" && val != null) {
        Object.assign(result, this._buildSelectDef(val, fullKey));
      } else {
        // 일반 값 (string, number, boolean 등) — Expr로 변환
        result[fullKey] = expr.toExpr(val);
      }
    }

    return result;
  }

  private _buildJoinDefs(joins: QueryableMetaJoin[]): SelectQueryDefJoin[] {
    const result: SelectQueryDefJoin[] = [];

    for (const join of joins) {
      const joinQr = join.queryable;
      const selectDef = joinQr.getSelectQueryDef();

      const joinDef: SelectQueryDefJoin = {
        ...selectDef,
        as: joinQr.meta.as,
        isSingle: join.isSingle,
      };

      result.push(joinDef);
    }

    return result;
  }

  getResultMeta(outputColumns?: string[]): ResultMeta {
    const columns: Record<string, ColumnPrimitiveStr> = {};
    const joins: Record<string, { isSingle: boolean }> = {};

    const buildResultMeta = (cols: QueryableRecord<any>, prefix: string) => {
      for (const [key, val] of Object.entries(cols)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (outputColumns && !outputColumns.includes(fullKey)) continue;

        if (val instanceof ExprUnit) {
          // 원시 column
          columns[fullKey] = val.dataType;
        } else if (Array.isArray(val)) {
          // 배열 (1:N 관계)
          if (val.length > 0) {
            joins[fullKey] = { isSingle: false };
            buildResultMeta(val[0], fullKey);
          }
        } else if (typeof val === "object") {
          // 단일 객체 (N:1, 1:1 관계)
          joins[fullKey] = { isSingle: true };
          buildResultMeta(val, fullKey);
        }
      }
    };

    buildResultMeta(this.meta.columns, "");

    return { columns, joins };
  }

  //#endregion

  //#region ========== [query] Insert - INSERT ==========

  /**
   * Execute an INSERT query
   *
   * Automatically splits into chunks of 1000 for MSSQL's row limit
   *
   * @param records - Array of records to insert
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of inserted records
   *
   * @example
   * ```typescript
   * // Simple insert
   * await db.user().insert([
   *   { name: "Gildong Hong", email: "hong@test.com" },
   * ]);
   *
   * // Return ID after insert
   * const [inserted] = await db.user().insert(
   *   [{ name: "Gildong Hong" }],
   *   ["id"],
   * );
   * ```
   */
  async insert(records: TFrom["$inferInsert"][]): Promise<void>;
  async insert<K extends keyof TFrom["$inferColumns"] & string>(
    records: TFrom["$inferInsert"][],
    outputColumns: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async insert<K extends keyof TFrom["$inferColumns"] & string>(
    records: TFrom["$inferInsert"][],
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[] | void> {
    if (records.length === 0) {
      return outputColumns ? [] : undefined;
    }

    // MSSQL의 1000행 제한을 위해 청크로 분할
    const CHUNK_SIZE = 1000;
    const allResults: Pick<TFrom["$inferColumns"], K>[] = [];

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE);

      const results = await this.meta.db.executeDefs<Pick<TFrom["$inferColumns"], K>>(
        [this.getInsertQueryDef(chunk, outputColumns)],
        outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
      );

      if (outputColumns) {
        allResults.push(...results[0]);
      }
    }

    if (outputColumns) {
      return allResults;
    }
  }

  /**
   * INSERT if no data matches the WHERE condition
   *
   * @param record - Record to insert
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns the inserted record
   *
   * @example
   * ```typescript
   * await db.user()
   *   .where((u) => [expr.eq(u.email, "test@test.com")])
   *   .insertIfNotExists({ name: "testing", email: "test@test.com" });
   * ```
   */
  async insertIfNotExists(record: TFrom["$inferInsert"]): Promise<void>;
  async insertIfNotExists<K extends keyof TFrom["$inferColumns"] & string>(
    record: TFrom["$inferInsert"],
    outputColumns: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>>;
  async insertIfNotExists<K extends keyof TFrom["$inferColumns"] & string>(
    record: TFrom["$inferInsert"],
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K> | void> {
    const results = await this.meta.db.executeDefs<Pick<TFrom["$inferColumns"], K>>(
      [this.getInsertIfNotExistsQueryDef(record)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0][0];
    }
  }

  /**
   * INSERT INTO ... SELECT (INSERT the current SELECT results into another Table)
   *
   * @param targetTable - Target Table to insert into
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of inserted records
   *
   * @example
   * ```typescript
   * await db.user()
   *   .select((u) => ({ name: u.name, createdAt: u.createdAt }))
   *   .where((u) => [expr.eq(u.isArchived, false)])
   *   .insertInto(ArchivedUser);
   * ```
   */
  async insertInto<TTable extends TableBuilder<DataToColumnBuilderRecord<TData>, any>>(
    targetTable: TTable,
  ): Promise<void>;
  async insertInto<
    TTable extends TableBuilder<DataToColumnBuilderRecord<TData>, any>,
    TOut extends keyof TTable["$inferColumns"] & string,
  >(targetTable: TTable, outputColumns: TOut[]): Promise<Pick<TData, TOut>[]>;
  async insertInto<
    TTable extends TableBuilder<DataToColumnBuilderRecord<TData>, any>,
    TOut extends keyof TTable["$inferColumns"] & string,
  >(targetTable: TTable, outputColumns?: TOut[]): Promise<Pick<TData, TOut>[] | void> {
    const results = await this.meta.db.executeDefs<Pick<TData, TOut>>(
      [this.getInsertIntoQueryDef(targetTable)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0];
    }
  }

  getInsertQueryDef(
    records: TFrom["$inferInsert"][],
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): InsertQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    // AI column에 명시적 값이 있으면 overrideIdentity 설정
    const overrideIdentity =
      outputDef.aiColName != null &&
      records.some((r) => (r as Record<string, unknown>)[outputDef.aiColName!] != null);

    return obj.clearUndefined({
      type: "insert",
      table: this.meta.db.getQueryDefObjectName(from),
      records,
      overrideIdentity: overrideIdentity || undefined,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  getInsertIfNotExistsQueryDef(
    record: TFrom["$inferInsert"],
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): InsertIfNotExistsQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    const { select: _, ...existsSelectQuery } = this.getSelectQueryDef();

    return obj.clearUndefined({
      type: "insertIfNotExists",
      table: this.meta.db.getQueryDefObjectName(from),
      record,
      existsSelectQuery,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  getInsertIntoQueryDef<TTable extends TableBuilder<DataToColumnBuilderRecord<TData>, any>>(
    targetTable: TTable,
    outputColumns?: (keyof TTable["$inferColumns"] & string)[],
  ): InsertIntoQueryDef {
    const outputDef = this._getCudOutputDef();

    return obj.clearUndefined({
      type: "insertInto",
      table: this.meta.db.getQueryDefObjectName(targetTable),
      recordsSelectQuery: this.getSelectQueryDef(),
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  //#endregion

  //#region ========== [query] Modify - UPDATE / DELETE ==========

  /**
   * Execute an UPDATE query
   *
   * @param recordFwd - Function that returns the columns and values to update
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of updated records
   *
   * @example
   * ```typescript
   * // Simple update
   * await db.user()
   *   .where((u) => [expr.eq(u.id, 1)])
   *   .update((u) => ({
   *     name: expr.val("string", "New Name"),
   *     updatedAt: expr.val("DateTime", DateTime.now()),
   *   }));
   *
   * // Reference existing value
   * await db.product()
   *   .update((p) => ({
   *     price: expr.mul(p.price, expr.val("number", 1.1)),
   *   }));
   * ```
   */
  async update(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
  ): Promise<void>;
  async update<K extends keyof TFrom["$inferColumns"] & string>(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
    outputColumns: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async update<K extends keyof TFrom["$inferColumns"] & string>(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[] | void> {
    const results = await this.meta.db.executeDefs<Pick<TFrom["$inferColumns"], K>>(
      [this.getUpdateQueryDef(recordFwd, outputColumns)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0];
    }
  }

  /**
   * Execute a DELETE query
   *
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of deleted records
   *
   * @example
   * ```typescript
   * // Simple delete
   * await db.user()
   *   .where((u) => [expr.eq(u.id, 1)])
   *   .delete();
   *
   * // Return deleted data
   * const deleted = await db.user()
   *   .where((u) => [expr.eq(u.isExpired, true)])
   *   .delete(["id", "name"]);
   * ```
   */
  async delete(): Promise<void>;
  async delete<K extends keyof TFrom["$inferColumns"] & string>(
    outputColumns: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async delete<K extends keyof TFrom["$inferColumns"] & string>(
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[] | void> {
    const results = await this.meta.db.executeDefs<Pick<TFrom["$inferColumns"], K>>(
      [this.getDeleteQueryDef(outputColumns)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0];
    }
  }

  getUpdateQueryDef(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): UpdateQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    return obj.clearUndefined({
      type: "update",
      table: this.meta.db.getQueryDefObjectName(from),
      as: this.meta.as,
      record: this._buildSelectDef(recordFwd(this.meta.columns), ""),
      top: this.meta.top,
      where: this.meta.where?.map((w) => w.expr),
      joins: this.meta.joins ? this._buildJoinDefs(this.meta.joins) : undefined,
      limit: this.meta.limit,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  getDeleteQueryDef(outputColumns?: (keyof TFrom["$inferColumns"] & string)[]): DeleteQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    return obj.clearUndefined({
      type: "delete",
      table: this.meta.db.getQueryDefObjectName(from),
      as: this.meta.as,
      top: this.meta.top,
      where: this.meta.where?.map((w) => w.expr),
      joins: this.meta.joins ? this._buildJoinDefs(this.meta.joins) : undefined,
      limit: this.meta.limit,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  //#endregion

  //#region ========== [query] Modify - UPSERT ==========

  /**
   * Execute an UPSERT (UPDATE or INSERT) query
   *
   * UPDATE if data matching the WHERE condition exists, otherwise INSERT
   *
   * @param updateFn - Function that returns the columns and values to update
   * @param insertFn - Function that returns the record to insert (optional, defaults to same as updateFn)
   * @param outputColumns - Column name array to receive (optional)
   * @returns When outputColumns specified, returns array of affected records
   *
   * @example
   * ```typescript
   * // Same data for UPDATE/INSERT
   * await db.user()
   *   .where((u) => [expr.eq(u.email, "test@test.com")])
   *   .upsert(() => ({
   *     name: expr.val("string", "testing"),
   *     email: expr.val("string", "test@test.com"),
   *   }));
   *
   * // Different data for UPDATE/INSERT
   * await db.user()
   *   .where((u) => [expr.eq(u.email, "test@test.com")])
   *   .upsert(
   *     () => ({ loginCount: expr.val("number", 1) }),
   *     (update) => ({ ...update, email: expr.val("string", "test@test.com") }),
   *   );
   * ```
   */
  async upsert(
    updateFn: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferUpdate"]>,
  ): Promise<void>;
  async upsert<K extends keyof TFrom["$inferColumns"] & string>(
    insertFn: (cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferInsert"]>,
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async upsert<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>>(
    updateFn: (cols: QueryableRecord<TData>) => U,
    insertFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
  ): Promise<void>;
  async upsert<
    U extends QueryableWriteRecord<TFrom["$inferUpdate"]>,
    K extends keyof TFrom["$inferColumns"] & string,
  >(
    updateFn: (cols: QueryableRecord<TData>) => U,
    insertFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async upsert<
    U extends QueryableWriteRecord<TFrom["$inferUpdate"]>,
    K extends keyof TFrom["$inferColumns"] & string,
  >(
    updateFnOrInsertFn:
      | ((cols: QueryableRecord<TData>) => U)
      | ((cols: QueryableRecord<TData>) => QueryableWriteRecord<TFrom["$inferInsert"]>),
    insertFnOrOutputColumns?:
      | ((updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>)
      | K[],
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[] | void> {
    const updateRecordFn = updateFnOrInsertFn as (cols: QueryableRecord<TData>) => U;

    const insertRecordFn = (
      insertFnOrOutputColumns instanceof Function ? insertFnOrOutputColumns : updateFnOrInsertFn
    ) as (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>;

    const realOutputColumns =
      insertFnOrOutputColumns instanceof Function ? outputColumns : insertFnOrOutputColumns;

    const results = await this.meta.db.executeDefs<Pick<TFrom["$inferColumns"], K>>(
      [this.getUpsertQueryDef(updateRecordFn, insertRecordFn, realOutputColumns)],
      [realOutputColumns ? this.getResultMeta(realOutputColumns) : undefined],
    );

    if (realOutputColumns) {
      return results[0];
    }
  }

  getUpsertQueryDef<U extends QueryableWriteRecord<TFrom["$inferUpdate"]>>(
    updateRecordFn: (cols: QueryableRecord<TData>) => U,
    insertRecordFn: (updateRecord: U) => QueryableWriteRecord<TFrom["$inferInsert"]>,
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): UpsertQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    const { select: _sel, ...existsSelectQuery } = this.getSelectQueryDef();

    // updateRecord 생성
    const updateQrRecord = updateRecordFn(this.meta.columns);
    const updateRecord: Record<string, Expr> = {};
    for (const [key, value] of Object.entries(updateQrRecord)) {
      updateRecord[key] = expr.toExpr(value);
    }

    // insertRecord 생성 (updateRecordRaw를 두 번째 인자로 전달)
    const insertRecordRaw = insertRecordFn(updateQrRecord);
    const insertRecord = Object.fromEntries(
      Object.entries(insertRecordRaw).map(([key, value]) => [key, expr.toExpr(value)]),
    );

    return obj.clearUndefined({
      type: "upsert",
      table: this.meta.db.getQueryDefObjectName(from),
      existsSelectQuery,
      updateRecord,
      insertRecord,
      output: outputColumns
        ? {
            columns: outputColumns,
            pkColNames: outputDef.pkColNames,
            aiColName: outputDef.aiColName,
          }
        : undefined,
    });
  }

  //#endregion

  //#region ========== DDL Helper ==========

  /**
   * FK 제약조건 활성화/비활성화 (트랜잭션 내에서 사용 가능)
   */
  async switchFk(enabled: boolean): Promise<void> {
    const from = this.meta.from;
    if (!(from instanceof TableBuilder) && !(from instanceof ViewBuilder)) {
      throw new Error(
        "switchFk는 TableBuilder 또는 ViewBuilder 기반 queryable에서만 사용할 수 있습니다.",
      );
    }
    await this.meta.db.switchFk(this.meta.db.getQueryDefObjectName(from), enabled);
  }

  //#endregion

  //#region ========== CUD Common ==========

  private _getCudOutputDef(): {
    pkColNames: string[];
    aiColName?: string;
  } {
    const from = this.meta.from;

    if (from instanceof TableBuilder) {
      if (from.meta.columns == null) {
        throw new Error(`테이블 '${from.meta.name}'에 Column 정의가 없습니다.`);
      }

      let aiColName: string | undefined;
      for (const [key, col] of Object.entries(from.meta.columns as ColumnBuilderRecord)) {
        if (col.meta.autoIncrement) {
          aiColName = key;
        }
      }

      return {
        pkColNames: from.meta.primaryKey ?? [],
        aiColName,
      };
    }

    throw new Error("CUD 작업은 TableBuilder 기반 queryable에서만 사용할 수 있습니다.");
  }

  //#endregion
}

//#region ========== Helper Functions ==========

/**
 * Match FK column array with the target Table's PK and return PK column name array
 *
 * @param fkCols - FK column name array
 * @param targetTable - Target Table builder being referenced
 * @returns Matched PK column name array
 * @throws When FK/PK column count mismatch
 */
export function getMatchedPrimaryKeys(
  fkCols: string[],
  targetTable: TableBuilder<any, any>,
): string[] {
  const pk = targetTable.meta.primaryKey;
  if (pk == null || fkCols.length !== pk.length) {
    throw new Error(
      `FK/PK column count mismatch (target: ${targetTable.meta.name}, FK: ${fkCols.length}, PK: ${pk?.length ?? 0})`,
    );
  }
  return pk;
}

/**
 * Common helper to transform nested columns structure to a new alias
 *
 * When wrapping as Subquery/JOIN, transforms existing alias to new alias while
 * keeping nested keys (posts.userId) as flattened keys.
 *
 * e.g.: If the path of posts[0].userId column is ["T1.posts", "userId"],
 *       transforming to new alias "T2" yields ["T2", "posts.userId"].
 *
 * @param columns - Column record to transform
 * @param alias - New Table alias (e.g., "T2")
 * @param keyPrefix - Current nested path (for recursive calls, default "")
 * @returns Transformed column record
 */
function transformColumnsAlias<TRecord extends DataRecord>(
  columns: QueryableRecord<TRecord>,
  alias: string,
  keyPrefix: string = "",
): QueryableRecord<TRecord> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(columns as Record<string, unknown>)) {
    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;

    if (value instanceof ExprUnit) {
      result[key] = expr.col(value.dataType, alias, fullKey);
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        result[key] = [
          transformColumnsAlias(value[0] as QueryableRecord<DataRecord>, alias, fullKey),
        ];
      }
    } else if (typeof value === "object" && value != null) {
      result[key] = transformColumnsAlias(value as QueryableRecord<DataRecord>, alias, fullKey);
    } else {
      result[key] = value;
    }
  }

  return result as QueryableRecord<TRecord>;
}

//#endregion

//#region ========== Types ==========

interface QueryableMeta<TData extends DataRecord> {
  db: DbContextBase;
  from?:
    | TableBuilder<any, any>
    | ViewBuilder<any, any, any>
    | Queryable<any, any>
    | Queryable<TData, any>[]
    | string;
  as: string;
  columns: QueryableRecord<TData>;
  isCustomColumns?: boolean;
  distinct?: boolean;
  top?: number;
  lock?: boolean;
  where?: WhereExprUnit[];
  joins?: QueryableMetaJoin[];
  orderBy?: [ExprUnit<ColumnPrimitive>, ("ASC" | "DESC")?][];
  limit?: [number, number];
  groupBy?: ExprUnit<ColumnPrimitive>[];
  having?: WhereExprUnit[];
  with?: { name: string; base: Queryable<any, any>; recursive: Queryable<any, any> };
}

interface QueryableMetaJoin {
  queryable: Queryable<any, any>;
  isSingle: boolean;
}

export type QueryableRecord<TData extends DataRecord> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K]>
    : TData[K] extends (infer U)[]
      ? U extends DataRecord
        ? QueryableRecord<U>[]
        : never
      : TData[K] extends (infer U)[] | undefined
        ? U extends DataRecord
          ? QueryableRecord<U>[] | undefined
          : never
        : TData[K] extends DataRecord
          ? QueryableRecord<TData[K]>
          : TData[K] extends DataRecord | undefined
            ? QueryableRecord<Exclude<TData[K], undefined>> | undefined
            : never;
};

export type QueryableWriteRecord<TData> = {
  [K in keyof TData]: TData[K] extends ColumnPrimitive ? ExprInput<TData[K]> : never;
};

/**
 * QueryableRecord에서 DataRecord로 역변환
 *
 * ExprUnit<T>를 T로 언래핑, 중첩 객체/배열을 재귀적으로 언래핑
 */
export type UnwrapQueryableRecord<R> = {
  [K in keyof R as K extends symbol ? never : K]: NonNullable<R[K]> extends ExprUnit<infer T>
    ? T | Extract<R[K], undefined>
    : NonNullable<R[K]> extends (infer U)[]
      ? U extends Record<string, any>
        ? UnwrapQueryableRecord<U>[] | Extract<R[K], undefined>
        : never
      : NonNullable<R[K]> extends Record<string, any>
        ? UnwrapQueryableRecord<NonNullable<R[K]>> | Extract<R[K], undefined>
        : never;
};

//#region ========== PathProxy - Type-safe path builder for include ==========

/**
 * include()에서 타입 안전하게 관계 경로를 지정하기 위한 Proxy 타입
 * non-ColumnPrimitive 필드(FK, FKT 관계)만 접근 가능
 *
 * @example
 * ```typescript
 * // item.user.company 접근 시 내부적으로 경로 ["user", "company"]를 수집
 * db.post.include(item => item.user.company)
 *
 * // item.title은 string(ColumnPrimitive)이므로 컴파일 에러
 * db.post.include(item => item.title) // 컴파일 에러
 * ```
 */
/**
 * 배열이면 요소 타입 추출
 */
type UnwrapArray<TArray> = TArray extends (infer TElement)[] ? TElement : TArray;

const PATH_SYMBOL = Symbol("path");

/**
 * include()용 타입 안전 path proxy
 */
export type PathProxy<TObject> = {
  [K in keyof TObject as TObject[K] extends ColumnPrimitive ? never : K]-?: PathProxy<
    UnwrapArray<TObject[K]>
  >;
} & { readonly [PATH_SYMBOL]: string[] };

/**
 * parentChain(점 구분 경로)을 따라 nested columns 구조를 탐색하여 대상 컬럼을 반환.
 * 배열(1:N 관계)은 첫 번째 요소를 사용.
 */
function resolveNestedCols(
  cols: QueryableRecord<any>,
  parentChain: string,
): QueryableRecord<any> {
  if (parentChain === "") return cols;
  let current: unknown = cols;
  for (const part of parentChain.split(".")) {
    current = (current as Record<string, unknown>)[part];
    if (Array.isArray(current)) current = current[0];
  }
  return current as QueryableRecord<any>;
}

/**
 * PathProxy 인스턴스 생성
 * Proxy를 사용하여 속성 접근을 가로채고 경로를 수집
 */
function createPathProxy<TObject>(path: string[] = []): PathProxy<TObject> {
  return new Proxy({} as PathProxy<TObject>, {
    get(_, prop: string | symbol) {
      if (prop === PATH_SYMBOL) return path;
      if (typeof prop === "symbol") return undefined;
      return createPathProxy<unknown>([...path, prop]);
    },
  });
}

//#endregion

/**
 * Table 또는 View용 Queryable factory 함수 생성
 *
 * DbContext에서 Table/View별 getter를 정의할 때 사용
 *
 * @param db - DbContext 인스턴스
 * @param tableOrView - TableBuilder 또는 ViewBuilder 인스턴스
 * @param as - Alias 지정 (선택, 미지정 시 자동 생성)
 * @returns Queryable을 반환하는 factory 함수
 *
 * @example
 * ```typescript
 * class AppDbContext extends DbContext {
 *   // 호출할 때마다 새 alias가 할당됨
 *   user = queryable(this, User);
 *
 *   // 사용 예시
 *   async getActiveUsers() {
 *     return this.user()
 *       .where((u) => [expr.eq(u.isActive, true)])
 *       .execute();
 *   }
 * }
 * ```
 */
export function queryable<TBuilder extends TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  db: DbContextBase,
  tableOrView: TBuilder,
  as?: string,
): () => Queryable<TBuilder["$inferSelect"], TBuilder extends TableBuilder<any, any> ? TBuilder : never> {
  return () => {
    // as가 미지정이면 db.getNextAlias() 사용 (카운터 증가)
    // as가 지정되면 그대로 사용 (카운터 증가 없음)
    const finalAs = as ?? db.getNextAlias();

    // TableBuilder + columns
    if (tableOrView instanceof TableBuilder && tableOrView.meta.columns != null) {
      const columnDefs = tableOrView.meta.columns as ColumnBuilderRecord;

      return new Queryable({
        db,
        from: tableOrView,
        as: finalAs,
        columns: Object.fromEntries(
          Object.entries(columnDefs).map(([key, colDef]) => [
            key,
            expr.col(colDef.meta.type, finalAs, key),
          ]),
        ),
      }) as any;
    }

    // ViewBuilder + viewFn
    if (tableOrView instanceof ViewBuilder && tableOrView.meta.viewFn != null) {
      const baseQr = tableOrView.meta.viewFn(db);

      // TFrom을 ViewBuilder로 설정하여 반환
      return new Queryable({
        db,
        from: tableOrView,
        as: finalAs,
        columns: transformColumnsAlias(baseQr.meta.columns, finalAs),
      }) as any;
    }

    throw new Error(`Invalid Table/View Metadata: ${tableOrView.meta.name}`);
  };
}

//#endregion
