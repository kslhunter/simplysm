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
import { type ColumnBuilderRecord, type DataToColumnBuilderRecord } from "../schema/factory/column-builder";
import type { ColumnPrimitive, ColumnPrimitiveStr } from "../types/column";
import type { WhereExprUnit } from "../expr/expr-unit";
import { ExprUnit } from "../expr/expr-unit";
import type { Expr } from "../types/expr";
import { ArgumentError, objClearUndefined } from "@simplysm/core-common";
import {
  ForeignKeyBuilder,
  ForeignKeyTargetBuilder,
  RelationKeyBuilder,
  RelationKeyTargetBuilder,
} from "../schema/factory/relation-builder";
import { parseSearchQuery } from "./search-parser";
import { expr } from "../expr/expr";

/**
 * JOIN 쿼리 빌더
 *
 * join/joinSingle 메서드 내부에서 사용되며, 조인 대상 테이블을 지정하는 역할을 수행
 */
class JoinQueryable {
  constructor(
    private readonly _db: DbContextBase,
    private readonly _joinAlias: string,
  ) {}

  /**
   * 조인할 테이블을 지정
   *
   * @param table - 조인 대상 테이블
   * @returns 조인된 Queryable
   */
  from<T extends TableBuilder<any, any>>(table: T): Queryable<T["$infer"], T> {
    return queryable(this._db, table, this._joinAlias)();
  }

  /**
   * 조인 결과의 컬럼을 직접 지정
   *
   * @param columns - 커스텀 컬럼 정의
   * @returns 커스텀 컬럼이 적용된 Queryable
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
   * @throws 2개 미만의 queryable이 전달된 경우
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
 * 재귀 CTE(Common Table Expression) 빌더
 *
 * recursive() 메서드 내부에서 사용되며, 재귀 쿼리의 본문을 정의하는 역할을 수행
 *
 * @template TBaseData - 기본 쿼리의 데이터 타입
 */
class RecursiveQueryable<TBaseData extends DataRecord> {
  constructor(
    private readonly _baseQr: Queryable<TBaseData, any>,
    private readonly _cteName: string,
  ) {}

  /**
   * 재귀 쿼리의 대상 테이블을 지정
   *
   * @param table - 재귀할 대상 테이블
   * @returns self 속성이 추가된 Queryable (자기 참조용)
   */
  from<T extends TableBuilder<any, any>>(table: T): Queryable<T["$infer"] & { self?: TBaseData[] }, T> {
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
    );
  }

  /**
   * 재귀 쿼리의 컬럼을 직접 지정
   *
   * @param columns - 커스텀 컬럼 정의
   * @returns self 속성이 추가된 Queryable
   */
  select<R extends DataRecord>(columns: QueryableRecord<R>): Queryable<R & { self?: TBaseData[] }, never> {
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
   * 여러 Queryable을 UNION으로 결합 (재귀 쿼리용)
   *
   * @param queries - UNION할 Queryable 배열 (최소 2개)
   * @returns self 속성이 추가된 UNION Queryable
   * @throws 2개 미만의 queryable이 전달된 경우
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
 * 쿼리 빌더 클래스
 *
 * 테이블/뷰에 대한 SELECT, INSERT, UPDATE, DELETE 등의 쿼리를 체이닝 방식으로 구성
 *
 * @template TData - 쿼리 결과의 데이터 타입
 * @template TFrom - 원본 테이블 (CUD 작업에 필요)
 *
 * @example
 * ```typescript
 * // 기본 조회
 * const users = await db.user()
 *   .where((u) => [expr.eq(u.isActive, true)])
 *   .orderBy((u) => u.name)
 *   .result();
 *
 * // JOIN 조회
 * const posts = await db.post()
 *   .include((p) => p.user)
 *   .result();
 *
 * // INSERT
 * await db.user().insert([{ name: "홍길동", email: "test@test.com" }]);
 * ```
 */
export class Queryable<
  TData extends DataRecord,
  TFrom extends TableBuilder<any, any> | never, // CUD는 TableBuilder만 지원하기 위함
> {
  constructor(readonly meta: QueryableMeta<TData>) {}

  //#region ========== 옵션 - SELECT / DISTINCT / LOCK ==========

  /**
   * SELECT할 컬럼을 지정합니다.
   *
   * @param fn - 컬럼 매핑 함수. 원본 컬럼을 받아 새 컬럼 구조를 반환
   * @returns 새로운 컬럼 구조가 적용된 Queryable
   *
   * @example
   * ```typescript
   * db.user().select((u) => ({
   *   userName: u.name,
   *   userEmail: u.email,
   * }))
   * ```
   */
  select<R extends DataRecord>(fn: (columns: QueryableRecord<TData>) => QueryableRecord<R>): Queryable<R, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.select(fn));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias<R>(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }

    const newColumns = fn(this.meta.columns);

    return new Queryable<any, never>({
      ...this.meta,
      columns: newColumns,
      isCustomColumns: true,
    }) as any;
  }

  /**
   * DISTINCT 옵션을 적용하여 중복 행을 제거
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
   * 행 잠금(FOR UPDATE)을 적용
   *
   * 트랜잭션 내에서 선택된 행에 대한 배타적 잠금을 획득
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

  //#region ========== 제한 - TOP / LIMIT ==========

  /**
   * 상위 N개의 행만 조회 (ORDER BY 없이 사용 가능)
   *
   * @param count - 조회할 행 수
   * @returns TOP이 적용된 Queryable
   *
   * @example
   * ```typescript
   * // 최신 사용자 10명
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
   * 페이지네이션을 위한 LIMIT/OFFSET을 설정합니다.
   * 반드시 orderBy()를 먼저 호출해야 합니다.
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
   *   .limit(0, 20) // 첫 20개
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

  //#region ========== 정렬 - ORDER BY ==========

  /**
   * 정렬 조건을 추가합니다. 여러 번 호출하면 순서대로 적용됩니다.
   *
   * @param fn - 정렬 기준 컬럼을 반환하는 함수
   * @param orderBy - 정렬 방향 (ASC/DESC). 기본값: ASC
   * @returns 정렬 조건이 추가된 Queryable
   *
   * @example
   * ```typescript
   * db.user
   *   .orderBy((u) => u.name)           // 이름 ASC
   *   .orderBy((u) => u.age, "DESC")    // 나이 DESC
   * ```
   */
  orderBy(
    fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>,
    orderBy?: "ASC" | "DESC",
  ): Queryable<TData, TFrom> {
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

  //#region ========== 검색 - WHERE ==========

  /**
   * WHERE 조건을 추가합니다. 여러 번 호출하면 AND로 결합됩니다.
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
   * 텍스트 검색을 수행
   *
   * 검색 문법은 {@link parseSearchQuery}를 참조
   * - 공백으로 구분된 단어는 OR 조건
   * - `+`로 시작하는 단어는 필수 포함 (AND 조건)
   * - `-`로 시작하는 단어는 제외 (NOT 조건)
   *
   * @param fn - 검색 대상 컬럼을 반환하는 함수
   * @param searchText - 검색 텍스트
   * @returns 검색 조건이 추가된 Queryable
   *
   * @example
   * ```typescript
   * db.user()
   *   .search((u) => [u.name, u.email], "홍길동 -탈퇴")
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

    // OR 조건: 각 컬럼에서 pattern 하나라도 매치하면 OK
    if (parsed.or.length === 1) {
      const pattern = parsed.or[0];
      const columnMatches = columns.map((col) => expr.like(expr.lower(col), pattern.toLowerCase()));
      conditions.push(expr.or(columnMatches));
    } else if (parsed.or.length > 1) {
      const orConditions = parsed.or.map((pattern) => {
        const columnMatches = columns.map((col) => expr.like(expr.lower(col), pattern.toLowerCase()));
        return expr.or(columnMatches);
      });
      conditions.push(expr.or(orConditions));
    }

    // MUST 조건: 각 pattern이 어떤 컬럼에서든 매치해야 함 (AND)
    for (const pattern of parsed.must) {
      const columnMatches = columns.map((col) => expr.like(expr.lower(col), pattern.toLowerCase()));
      conditions.push(expr.or(columnMatches));
    }

    // NOT 조건: 모든 컬럼에서 매치하지 않아야 함 (AND NOT)
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

  //#region ========== 그룹 - GROUP BY / HAVING ==========

  /**
   * GROUP BY 절을 추가
   *
   * @param fn - 그룹화 기준 컬럼을 반환하는 함수
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
  groupBy(fn: (columns: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>[]): Queryable<TData, never> {
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
   * HAVING 절을 추가 (GROUP BY 후 필터링)
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

  //#region ========== 조인 - JOIN / JOIN SINGLE ==========

  /**
   * 1:N 관계의 LEFT OUTER JOIN을 수행 (배열로 결과 추가)
   *
   * @param as - 결과에 추가할 속성 이름
   * @param fwd - 조인 조건을 정의하는 콜백 함수
   * @returns 조인 결과가 배열로 추가된 Queryable
   *
   * @example
   * ```typescript
   * db.user()
   *   .join("posts", (qr, u) =>
   *     qr.from(Post)
   *       .where((p) => [expr.eq(p.userId, u.id)])
   *   )
   * // 결과: { id, name, posts: [{ id, title }, ...] }
   * ```
   */
  join<A extends string, R extends DataRecord>(
    as: A,
    fwd: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<TData & { [K in A]?: R[] }, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.join(as, fwd));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }

    // 1. join alias 생성
    const joinAlias = `${this.meta.as}.${as}`;

    // 2. target → Queryable 변환 (alias 전달)
    const joinQr = new JoinQueryable(this.meta.db, joinAlias);

    // 3. fwd 실행 (where 등 조건 추가된 Queryable 반환)
    const resultQr = fwd(joinQr, this.meta.columns);

    // 4. 새 columns에 join 결과 추가
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
   * N:1 또는 1:1 관계의 LEFT OUTER JOIN을 수행 (단일 객체로 결과 추가)
   *
   * @param as - 결과에 추가할 속성 이름
   * @param fwd - 조인 조건을 정의하는 콜백 함수
   * @returns 조인 결과가 단일 객체로 추가된 Queryable
   *
   * @example
   * ```typescript
   * db.post()
   *   .joinSingle("user", (qr, p) =>
   *     qr.from(User)
   *       .where((u) => [expr.eq(u.id, p.userId)])
   *   )
   * // 결과: { id, title, user: { id, name } | undefined }
   * ```
   */
  joinSingle<A extends string, R extends DataRecord>(
    as: A,
    fwd: (qr: JoinQueryable, cols: QueryableRecord<TData>) => Queryable<R, any>,
  ): Queryable<{ [K in keyof TData as K extends A ? never : K]: TData[K] } & { [K in A]?: R }, TFrom> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.joinSingle(as, fwd));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }

    // 1. join alias 생성
    const joinAlias = `${this.meta.as}.${as}`;

    // 2. target → Queryable 변환 (alias 전달)
    const joinQr = new JoinQueryable(this.meta.db, joinAlias);

    // 3. fwd 실행 (where 등 조건 추가된 Queryable 반환)
    const resultQr = fwd(joinQr, this.meta.columns);

    // 4. 새 columns에 join 결과 추가
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

  //#region ========== 조인 - INCLUDE ==========

  /**
   * 관계된 테이블을 자동으로 JOIN합니다.
   * TableBuilder에 정의된 FK/FKT 관계를 기반으로 동작합니다.
   *
   * @param fn - 포함할 관계를 선택하는 함수 (PathProxy를 통해 타입 체크됨)
   * @returns JOIN이 추가된 Queryable
   * @throws 관계가 정의되지 않은 경우 에러
   *
   * @example
   * ```typescript
   * // 단일 관계 포함
   * db.post.include((p) => p.user)
   *
   * // 중첩 관계 포함
   * db.post.include((p) => p.user.company)
   *
   * // 다중 관계 포함
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
        // 기존 JOIN의 테이블로 currentTable 업데이트 후 continue
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

          // FKT join은 배열로 저장되므로 배열인 경우 첫 번째 요소 사용
          const srcColsRaw = parentChain ? parentCols[parentChain] : parentCols;
          const srcCols = (Array.isArray(srcColsRaw) ? srcColsRaw[0] : srcColsRaw) as QueryableRecord<any>;
          const conditions: WhereExprUnit[] = [];

          for (let i = 0; i < fkColKeys.length; i++) {
            const fkCol = srcCols[fkColKeys[i]];
            const pkCol = qr.meta.columns[targetPkColKeys[i]] as ExprUnit<ColumnPrimitive>;

            conditions.push(expr.eq(pkCol, fkCol));
          }

          return qr.where(() => conditions);
        });

        currentTable = targetTable;
      } else if (relationDef instanceof ForeignKeyTargetBuilder || relationDef instanceof RelationKeyTargetBuilder) {
        // FKT/RelationKeyTarget (1:N 또는 1:1): User.posts → Post[]
        // 조건: Post.userId = User.id
        const targetTable = relationDef.meta.targetTableFn();
        const fkRelName = relationDef.meta.relationName;
        const sourceFk = targetTable.meta.relations?.[fkRelName];
        if (!(sourceFk instanceof ForeignKeyBuilder) && !(sourceFk instanceof RelationKeyBuilder)) {
          throw new Error(
            `'${relationName}'이 참조하는 '${fkRelName}'이(가) ` +
              `${targetTable.meta.name} 테이블의 유효한 ForeignKey/RelationKey가 아닙니다.`,
          );
        }
        const sourceTable = targetTable;
        const isSingle: boolean = relationDef.meta.isSingle ?? false;

        const fkColKeys = sourceFk.meta.columns;
        const pkColKeys = getMatchedPrimaryKeys(fkColKeys, currentTable);

        const buildJoin = (joinQr: JoinQueryable, parentCols: QueryableRecord<DataRecord>) => {
          const qr = joinQr.from(sourceTable);

          // FKT join은 배열로 저장되므로 배열인 경우 첫 번째 요소 사용
          const srcColsRaw = parentChain ? parentCols[parentChain] : parentCols;
          const srcCols = (Array.isArray(srcColsRaw) ? srcColsRaw[0] : srcColsRaw) as QueryableRecord<any>;
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
    }

    return result as Queryable<TData, TFrom>;
  }

  //#endregion

  //#region ========== 서브쿼리 - WRAP / UNION ==========

  /**
   * 현재 Queryable을 서브쿼리로 감싸기
   *
   * distinct() 또는 groupBy() 후 count() 사용 시 필요
   *
   * @returns 서브쿼리로 감싸진 Queryable
   *
   * @example
   * ```typescript
   * // DISTINCT 후 카운트
   * const count = await db.user()
   *   .select((u) => ({ name: u.name }))
   *   .distinct()
   *   .wrap()
   *   .count();
   * ```
   */
  wrap(): Queryable<TData, never> {
    // 현재 Queryable을 서브쿼리로 감싸기
    const wrapAlias = this.meta.db.getNextAlias();
    return new Queryable({
      db: this.meta.db,
      from: this,
      as: wrapAlias,
      columns: transformColumnsAlias<TData>(this.meta.columns, wrapAlias, ""),
    });
  }

  /**
   * 여러 Queryable을 UNION으로 결합 (중복 제거)
   *
   * @param queries - UNION할 Queryable 배열 (최소 2개)
   * @returns UNION된 Queryable
   * @throws 2개 미만의 queryable이 전달된 경우
   *
   * @example
   * ```typescript
   * const combined = Queryable.union(
   *   db.user().where((u) => [expr.eq(u.type, "admin")]),
   *   db.user().where((u) => [expr.eq(u.type, "manager")]),
   * );
   * ```
   */
  static union<TData extends DataRecord>(...queries: Queryable<TData, any>[]): Queryable<TData, never> {
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

  //#region ========== 재귀 - WITH RECURSIVE ==========

  /**
   * 재귀 CTE(Common Table Expression)를 생성
   *
   * 계층 구조 데이터(조직도, 카테고리 트리 등)를 조회할 때 사용
   *
   * @param fwd - 재귀 부분을 정의하는 콜백 함수
   * @returns 재귀 CTE가 적용된 Queryable
   *
   * @example
   * ```typescript
   * // 조직도 계층 조회
   * db.employee()
   *   .where((e) => [expr.null(e.managerId)]) // 루트 노드
   *   .recursive((cte) =>
   *     cte.from(Employee)
   *       .where((e) => [expr.eq(e.managerId, e.self[0].id)])
   *   )
   * ```
   */
  recursive(fwd: (qr: RecursiveQueryable<TData>) => Queryable<TData, any>): Queryable<TData, never> {
    if (Array.isArray(this.meta.from)) {
      const newFroms = this.meta.from.map((from) => from.recursive(fwd));
      return new Queryable({
        ...this.meta,
        from: newFroms,
        columns: transformColumnsAlias(newFroms[0].meta.columns, this.meta.as, ""),
      });
    }
    // 동적 CTE 이름 생성
    const cteName = this.meta.db.getNextAlias();

    // 2. target → Queryable 변환 (CTE 이름 전달)
    const cteQr = new RecursiveQueryable(this, cteName);

    // 3. fwd 실행 (where 등 조건 추가된 Queryable 반환)
    const resultQr = fwd(cteQr);

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

  //#region ========== [쿼리] 조회 - SELECT ==========

  /**
   * SELECT 쿼리를 실행하고 결과 배열을 반환
   *
   * @returns 쿼리 결과 배열
   *
   * @example
   * ```typescript
   * const users = await db.user()
   *   .where((u) => [expr.eq(u.isActive, true)])
   *   .result();
   * ```
   */
  async result(): Promise<TData[]> {
    const results = await this.meta.db.executeDefs<TData>([this.getSelectQueryDef()], [this.getResultMeta()]);
    return results[0];
  }

  /**
   * 단일 결과를 반환 (2개 이상이면 에러)
   *
   * @returns 단일 결과 또는 undefined
   * @throws 2개 이상의 결과가 반환된 경우
   *
   * @example
   * ```typescript
   * const user = await db.user()
   *   .where((u) => [expr.eq(u.id, 1)])
   *   .single();
   * ```
   */
  async single(): Promise<TData | undefined> {
    const result = await this.top(2).result();
    if (result.length > 1) {
      throw new ArgumentError("단일 결과를 기대했지만 2개 이상의 결과가 반환되었습니다.", {
        table: this._getSourceName(),
        resultCount: result.length,
      });
    }
    return result[0];
  }

  /**
   * 쿼리 소스 이름 반환 (에러 메시지용)
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
   * 첫 번째 결과를 반환 (여러 개여도 첫 번째만)
   *
   * @returns 첫 번째 결과 또는 undefined
   *
   * @example
   * ```typescript
   * const latestUser = await db.user()
   *   .orderBy((u) => u.createdAt, "DESC")
   *   .first();
   * ```
   */
  async first(): Promise<TData | undefined> {
    const results = await this.top(1).result();
    return results[0];
  }

  /**
   * 결과 행 수를 반환
   *
   * @param fwd - 카운트할 컬럼을 지정하는 함수 (선택)
   * @returns 행 수
   * @throws distinct() 또는 groupBy() 후 직접 호출 시 에러 (wrap() 필요)
   *
   * @example
   * ```typescript
   * const count = await db.user()
   *   .where((u) => [expr.eq(u.isActive, true)])
   *   .count();
   * ```
   */
  async count(fwd?: (cols: QueryableRecord<TData>) => ExprUnit<ColumnPrimitive>): Promise<number> {
    if (this.meta.distinct) {
      throw new Error("distinct() 후에는 count()를 사용할 수 없습니다. wrap()을 먼저 사용하세요.");
    }
    if (this.meta.groupBy) {
      throw new Error("groupBy() 후에는 count()를 사용할 수 없습니다. wrap()을 먼저 사용하세요.");
    }

    const countQr = fwd
      ? this.select((c) => ({ cnt: expr.count(fwd(c)) }))
      : this.select(() => ({ cnt: expr.count() }));

    const result = await countQr.single();

    return result?.cnt ?? 0;
  }

  /**
   * 조건에 맞는 데이터 존재 여부를 확인
   *
   * @returns 존재하면 true, 없으면 false
   *
   * @example
   * ```typescript
   * const hasAdmin = await db.user()
   *   .where((u) => [expr.eq(u.role, "admin")])
   *   .exists();
   * ```
   */
  async exists(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }

  getSelectQueryDef(): SelectQueryDef {
    return objClearUndefined({
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

  private _buildFromDef(): QueryDefObjectName | SelectQueryDef | SelectQueryDef[] | string | undefined {
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

  private _buildSelectDef(columns: QueryableRecord<any>, prefix: string): Record<string, Expr> {
    const result: Record<string, Expr> = {};

    for (const [key, val] of Object.entries(columns)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (val instanceof ExprUnit) {
        result[fullKey] = val.expr;
      } else if (Array.isArray(val)) {
        if (val.length > 0) {
          Object.assign(result, this._buildSelectDef(val[0], fullKey));
        }
      } else if (typeof val === "object") {
        Object.assign(result, this._buildSelectDef(val, fullKey));
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
          // primitive 컬럼
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

  //#region ========== [쿼리] 삽입 - INSERT ==========

  /**
   * INSERT 쿼리를 실행
   *
   * MSSQL의 1000개 제한을 위해 자동으로 1000개씩 청크로 분할하여 실행
   *
   * @param records - 삽입할 레코드 배열
   * @param outputColumns - 반환받을 컬럼 이름 배열 (선택)
   * @returns outputColumns 지정 시 삽입된 레코드 배열 반환
   *
   * @example
   * ```typescript
   * // 단순 삽입
   * await db.user().insert([
   *   { name: "홍길동", email: "hong@test.com" },
   * ]);
   *
   * // 삽입 후 ID 반환
   * const [inserted] = await db.user().insert(
   *   [{ name: "홍길동" }],
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

    // MSSQL 1000개 제한을 위해 청크 분할
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
   * WHERE 조건에 맞는 데이터가 없으면 INSERT
   *
   * @param record - 삽입할 레코드
   * @param outputColumns - 반환받을 컬럼 이름 배열 (선택)
   * @returns outputColumns 지정 시 삽입된 레코드 반환
   *
   * @example
   * ```typescript
   * await db.user()
   *   .where((u) => [expr.eq(u.email, "test@test.com")])
   *   .insertIfNotExists({ name: "테스트", email: "test@test.com" });
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
   * INSERT INTO ... SELECT (현재 SELECT 결과를 다른 테이블에 INSERT)
   *
   * @param targetTable - 삽입 대상 테이블
   * @param outputColumns - 반환받을 컬럼 이름 배열 (선택)
   * @returns outputColumns 지정 시 삽입된 레코드 배열 반환
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

    // AI 컬럼에 명시적 값이 있으면 overrideIdentity 설정
    const overrideIdentity =
      outputDef.aiColName != null &&
      records.some((r) => (r as Record<string, unknown>)[outputDef.aiColName!] !== undefined);

    return objClearUndefined({
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

    return objClearUndefined({
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

    return objClearUndefined({
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

  //#region ========== [쿼리] 수정 - UPDATE / DELETE ==========

  /**
   * UPDATE 쿼리를 실행
   *
   * @param recordFwd - 업데이트할 컬럼과 값을 반환하는 함수
   * @param outputColumns - 반환받을 컬럼 이름 배열 (선택)
   * @returns outputColumns 지정 시 업데이트된 레코드 배열 반환
   *
   * @example
   * ```typescript
   * // 단순 업데이트
   * await db.user()
   *   .where((u) => [expr.eq(u.id, 1)])
   *   .update((u) => ({
   *     name: expr.val("string", "새이름"),
   *     updatedAt: expr.val("DateTime", DateTime.now()),
   *   }));
   *
   * // 기존 값 참조
   * await db.product()
   *   .update((p) => ({
   *     price: expr.mul(p.price, expr.val("number", 1.1)),
   *   }));
   * ```
   */
  async update(recordFwd: (cols: QueryableRecord<TData>) => QueryableRecord<TFrom["$inferUpdate"]>): Promise<void>;
  async update<K extends keyof TFrom["$columns"] & string>(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableRecord<TFrom["$inferUpdate"]>,
    outputColumns: K[],
  ): Promise<Pick<TFrom["$columns"], K>[]>;
  async update<K extends keyof TFrom["$columns"] & string>(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableRecord<TFrom["$inferUpdate"]>,
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$columns"], K>[] | void> {
    const results = await this.meta.db.executeDefs<Pick<TFrom["$columns"], K>>(
      [this.getUpdateQueryDef(recordFwd, outputColumns)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0];
    }
  }

  /**
   * DELETE 쿼리를 실행
   *
   * @param outputColumns - 반환받을 컬럼 이름 배열 (선택)
   * @returns outputColumns 지정 시 삭제된 레코드 배열 반환
   *
   * @example
   * ```typescript
   * // 단순 삭제
   * await db.user()
   *   .where((u) => [expr.eq(u.id, 1)])
   *   .delete();
   *
   * // 삭제된 데이터 반환
   * const deleted = await db.user()
   *   .where((u) => [expr.eq(u.isExpired, true)])
   *   .delete(["id", "name"]);
   * ```
   */
  async delete(): Promise<void>;
  async delete<K extends keyof TFrom["$columns"] & string>(outputColumns: K[]): Promise<Pick<TFrom["$columns"], K>[]>;
  async delete<K extends keyof TFrom["$columns"] & string>(
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$columns"], K>[] | void> {
    const results = await this.meta.db.executeDefs<Pick<TFrom["$columns"], K>>(
      [this.getDeleteQueryDef(outputColumns)],
      outputColumns ? [this.getResultMeta(outputColumns)] : undefined,
    );

    if (outputColumns) {
      return results[0];
    }
  }

  getUpdateQueryDef(
    recordFwd: (cols: QueryableRecord<TData>) => QueryableRecord<TFrom["$inferUpdate"]>,
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): UpdateQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    return objClearUndefined({
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

    return objClearUndefined({
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

  //#region ========== [쿼리] 수정 - UPSERT ==========

  /**
   * UPSERT (UPDATE or INSERT) 쿼리를 실행
   *
   * WHERE 조건에 맞는 데이터가 있으면 UPDATE, 없으면 INSERT
   *
   * @param updateFwd - 업데이트할 컬럼과 값을 반환하는 함수
   * @param insertFwd - 삽입할 레코드를 반환하는 함수 (선택, 미지정 시 updateFwd와 동일)
   * @param outputColumns - 반환받을 컬럼 이름 배열 (선택)
   * @returns outputColumns 지정 시 영향받은 레코드 배열 반환
   *
   * @example
   * ```typescript
   * // UPDATE/INSERT 동일 데이터
   * await db.user()
   *   .where((u) => [expr.eq(u.email, "test@test.com")])
   *   .upsert(() => ({
   *     name: expr.val("string", "테스트"),
   *     email: expr.val("string", "test@test.com"),
   *   }));
   *
   * // UPDATE/INSERT 다른 데이터
   * await db.user()
   *   .where((u) => [expr.eq(u.email, "test@test.com")])
   *   .upsert(
   *     () => ({ loginCount: expr.val("number", 1) }),
   *     (update) => ({ ...update, email: expr.val("string", "test@test.com") }),
   *   );
   * ```
   */
  async upsert(updateFwd: (cols: QueryableRecord<TData>) => QueryableRecord<TFrom["$inferUpdate"]>): Promise<void>;
  async upsert<K extends keyof TFrom["$inferColumns"] & string>(
    insertFwd: (cols: QueryableRecord<TData>) => QueryableRecord<TFrom["$inferInsert"]>,
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async upsert<U extends QueryableRecord<TFrom["$inferUpdate"]>>(
    updateFwd: (cols: QueryableRecord<TData>) => U,
    insertFwd: (updateRecord: U) => QueryableRecord<TFrom["$inferInsert"]>,
  ): Promise<void>;
  async upsert<U extends QueryableRecord<TFrom["$inferUpdate"]>, K extends keyof TFrom["$inferColumns"] & string>(
    updateFwd: (cols: QueryableRecord<TData>) => U,
    insertFwd: (updateRecord: U) => QueryableRecord<TFrom["$inferInsert"]>,
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[]>;
  async upsert<U extends QueryableRecord<TFrom["$inferUpdate"]>, K extends keyof TFrom["$inferColumns"] & string>(
    updateFwdOrInsertFwd:
      | ((cols: QueryableRecord<TData>) => U)
      | ((cols: QueryableRecord<TData>) => QueryableRecord<TFrom["$inferInsert"]>),
    insertFwdOrOutputColumns?: ((updateRecord: U) => QueryableRecord<TFrom["$inferInsert"]>) | K[],
    outputColumns?: K[],
  ): Promise<Pick<TFrom["$inferColumns"], K>[] | void> {
    const updateRecordFwd = updateFwdOrInsertFwd as (cols: QueryableRecord<TData>) => U;

    const insertRecordFwd = (
      insertFwdOrOutputColumns instanceof Function ? insertFwdOrOutputColumns : updateFwdOrInsertFwd
    ) as (updateRecord: U) => QueryableRecord<TFrom["$inferInsert"]>;

    const realOutputColumns = insertFwdOrOutputColumns instanceof Function ? outputColumns : insertFwdOrOutputColumns;

    const results = await this.meta.db.executeDefs<Pick<TFrom["$inferColumns"], K>>(
      [this.getUpsertQueryDef(updateRecordFwd, insertRecordFwd, realOutputColumns)],
      [realOutputColumns ? this.getResultMeta(realOutputColumns) : undefined],
    );

    if (realOutputColumns) {
      return results[0];
    }
  }

  getUpsertQueryDef<U extends QueryableRecord<TFrom["$inferUpdate"]>>(
    updateRecordFwd: (cols: QueryableRecord<TData>) => U,
    insertRecordFwd: (updateRecord: U) => QueryableRecord<TFrom["$inferInsert"]>,
    outputColumns?: (keyof TFrom["$inferColumns"] & string)[],
  ): UpsertQueryDef {
    const from = this.meta.from as TableBuilder<any, any> | ViewBuilder<any, any, any>;
    const outputDef = this._getCudOutputDef();

    const { select: _sel, ...existsSelectQuery } = this.getSelectQueryDef();

    // updateRecord 생성
    const updateQrRecord = updateRecordFwd(this.meta.columns);
    const updateRecord: Record<string, Expr> = {};
    for (const [key, value] of Object.entries(updateQrRecord)) {
      updateRecord[key] = expr.toExpr(value);
    }

    // insertRecord 생성 (updateRecordRaw를 두 번째 인자로)
    const insertRecordRaw = insertRecordFwd(updateQrRecord);
    const insertRecord = Object.fromEntries(
      Object.entries(insertRecordRaw).map(([key, value]) => [key, expr.toExpr(value)]),
    );

    return objClearUndefined({
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
   * FK 제약조건 on/off (트랜잭션 내 사용 가능)
   */
  async switchFk(switch_: "on" | "off"): Promise<void> {
    const from = this.meta.from;
    if (!(from instanceof TableBuilder) && !(from instanceof ViewBuilder)) {
      throw new Error("switchFk는 TableBuilder 또는 ViewBuilder 기반 queryable에서만 사용할 수 있습니다.");
    }
    await this.meta.db.switchFk(this.meta.db.getQueryDefObjectName(from), switch_);
  }

  //#endregion

  //#region ========== CUD 공통 ==========

  private _getCudOutputDef(): {
    pkColNames: string[];
    aiColName?: string;
  } {
    const from = this.meta.from;

    if (from instanceof TableBuilder) {
      if (from.meta.columns == null) {
        throw new Error(`테이블 '${from.meta.name}'에 컬럼 정의가 없습니다.`);
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
 * FK 컬럼 배열과 대상 테이블의 PK를 매칭하여 PK 컬럼명 배열을 반환
 *
 * @param fkCols - FK 컬럼명 배열
 * @param targetTable - 참조 대상 테이블 빌더
 * @returns 매칭된 PK 컬럼명 배열
 * @throws FK/PK 컬럼 수 불일치 시
 */
export function getMatchedPrimaryKeys(fkCols: string[], targetTable: TableBuilder<any, any>): string[] {
  const pk = targetTable.meta.primaryKey;
  if (pk == null || fkCols.length !== pk.length) {
    throw new Error(
      `FK/PK 컬럼 개수가 일치하지 않습니다 (대상: ${targetTable.meta.name}, FK: ${fkCols.length}개, PK: ${pk?.length ?? 0}개)`,
    );
  }
  return pk;
}

/**
 * 중첩 columns 구조를 새 alias로 변환하는 공용 헬퍼
 *
 * 서브쿼리/JOIN 시 기존 alias를 새 alias로 변환하면서,
 * 중첩 키(posts.userId)는 평면화된 키로 유지한다.
 *
 * 예: posts[0].userId 컬럼의 경로가 ["T1.posts", "userId"]인 경우,
 *     새 alias "T2"로 변환하면 ["T2", "posts.userId"]가 된다.
 *
 * @param columns - 변환할 컬럼 레코드
 * @param alias - 새 테이블 alias (예: "T2")
 * @param keyPrefix - 현재 중첩 경로 (재귀 호출용, 기본값 "")
 * @returns 변환된 컬럼 레코드
 */
function transformColumnsAlias<T extends DataRecord>(
  columns: QueryableRecord<T>,
  alias: string,
  keyPrefix: string = "",
): QueryableRecord<T> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(columns as Record<string, unknown>)) {
    const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;

    if (value instanceof ExprUnit) {
      result[key] = expr.col(value.dataType, alias, fullKey);
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        result[key] = [transformColumnsAlias(value[0] as QueryableRecord<DataRecord>, alias, fullKey)];
      }
    } else if (typeof value === "object" && value != null) {
      result[key] = transformColumnsAlias(value as QueryableRecord<DataRecord>, alias, fullKey);
    } else {
      result[key] = value;
    }
  }

  return result as QueryableRecord<T>;
}

//#endregion

//#region ========== Types ==========

interface QueryableMeta<TData extends DataRecord> {
  db: DbContextBase;
  from?: TableBuilder<any, any> | ViewBuilder<any, any, any> | Queryable<any, any> | Queryable<TData, any>[] | string;
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
  // 1. Primitive 처리
  [K in keyof TData]: TData[K] extends ColumnPrimitive
    ? ExprUnit<TData[K]>
    : // 2. 배열 처리 (옵셔널 포함)
      TData[K] extends (infer U)[]
      ? U extends DataRecord
        ? QueryableRecord<U>[]
        : never
      : TData[K] extends (infer U)[] | undefined
        ? U extends DataRecord
          ? QueryableRecord<U>[] | undefined
          : never
        : // 3. 단일 객체 처리 (옵셔널 포함)
          TData[K] extends DataRecord
          ? QueryableRecord<TData[K]>
          : TData[K] extends DataRecord | undefined
            ? QueryableRecord<Exclude<TData[K], undefined>> | undefined
            : never;
};

//#region ========== PathProxy - include용 타입 안전 경로 빌더 ==========

/**
 * include()에서 관계 경로를 타입 안전하게 지정하기 위한 Proxy 타입
 * ColumnPrimitive가 아닌 필드(FK, FKT 관계)만 접근 가능
 *
 * @example
 * ```typescript
 * // item.user.company 접근 시 내부적으로 ["user", "company"] 경로 수집
 * db.post.include(item => item.user.company)
 *
 * // item.title은 string(ColumnPrimitive)이므로 컴파일 에러
 * db.post.include(item => item.title) // ❌ 에러
 * ```
 */
/**
 * 배열이면 요소 타입 추출
 */
type UnwrapArray<T> = T extends (infer U)[] ? U : T;

const PATH_SYMBOL = Symbol("path");

/**
 * include()용 타입 안전 경로 프록시
 */
export type PathProxy<T> = {
  [K in keyof T as T[K] extends ColumnPrimitive ? never : K]-?: PathProxy<UnwrapArray<T[K]>>;
} & { readonly [PATH_SYMBOL]: string[] };

/**
 * PathProxy 인스턴스 생성
 * Proxy를 사용하여 프로퍼티 접근을 가로채고 경로를 수집
 */
function createPathProxy<T>(path: string[] = []): PathProxy<T> {
  return new Proxy({} as PathProxy<T>, {
    get(_, prop: string | symbol) {
      if (prop === PATH_SYMBOL) return path;
      if (typeof prop === "symbol") return undefined;
      return createPathProxy<unknown>([...path, prop]);
    },
  });
}

//#endregion

/**
 * 테이블 또는 뷰에 대한 Queryable 팩토리 함수를 생성
 *
 * DbContext에서 테이블/뷰별 getter를 정의할 때 사용
 *
 * @param db - DbContext 인스턴스
 * @param tableOrView - TableBuilder 또는 ViewBuilder 인스턴스
 * @param as - alias 지정 (선택, 미지정 시 자동 생성)
 * @returns Queryable을 반환하는 팩토리 함수
 *
 * @example
 * ```typescript
 * class AppDbContext extends DbContext {
 *   // 호출 시마다 새로운 alias 할당
 *   user = queryable(this, User);
 *
 *   // 사용 예시
 *   async getActiveUsers() {
 *     return this.user()
 *       .where((u) => [expr.eq(u.isActive, true)])
 *       .result();
 *   }
 * }
 * ```
 */
export function queryable<T extends TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  db: DbContextBase,
  tableOrView: T,
  as?: string,
): () => Queryable<T["$infer"], T extends TableBuilder<any, any> ? T : never> {
  return () => {
    // as가 명시되지 않으면 db.getNextAlias() 사용 (카운터 증가)
    // as가 명시되면 그대로 사용 (카운터 증가 안함)
    const finalAs = as ?? db.getNextAlias();

    // TableBuilder + columns
    if (tableOrView instanceof TableBuilder && tableOrView.meta.columns != null) {
      const columnDefs = tableOrView.meta.columns as ColumnBuilderRecord;

      return new Queryable({
        db,
        from: tableOrView,
        as: finalAs,
        columns: Object.fromEntries(
          Object.entries(columnDefs).map(([key, colDef]) => [key, expr.col(colDef.meta.type, finalAs, key)]),
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

    throw new Error(`잘못된 테이블/뷰 메타데이터: ${tableOrView.meta.name}`);
  };
}

//#endregion
