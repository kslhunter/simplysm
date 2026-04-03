import { type InferColumns } from "./column-builder";
import type { TableBuilder } from "../table-builder";
import type { ViewBuilder } from "../view-builder";

// ============================================
// ForeignKeyBuilder
// ============================================

/**
 * Foreign Key 관계 builder (N:1)
 *
 * 현재 Table에서 대상 Table로의 FK 관계를 정의
 * DB에 실제 FK 제약조건을 생성
 *
 * description 설정은 factory 함수의 opts 파라미터로 전달한다.
 * 메서드 체이닝(.description())은 TypeScript 순환 참조 시 TS7022를 유발하므로 제거됨.
 *
 * @template TOwner - 소유 Table builder 타입
 * @template TTargetFn - 대상 Table builder factory 타입
 *
 * @example
 * ```typescript
 * const Post = Table("Post")
 *   .columns((c) => ({
 *     id: c.bigint().autoIncrement(),
 *     authorId: c.bigint(),  // FK column
 *   }))
 *   .primaryKey("id")
 *   .relations((r) => ({
 *     // N:1 relationship - Post → User
 *     author: r.foreignKey(["authorId"], () => User, { description: "작성자" }),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyTargetBuilder} 역참조 builder
 * @see {@link RelationKeyBuilder} DB FK 없는 관계
 */
export class ForeignKeyBuilder<
  TOwner extends TableBuilder<any, any>,
  TTargetFn extends () => TableBuilder<any, any>,
> {
  /**
   * @param meta - FK 메타데이터
   * @param meta.ownerFn - 소유 Table factory
   * @param meta.columns - FK column 이름 배열
   * @param meta.targetFn - 대상 Table factory
   * @param meta.description - 관계 설명
   */
  constructor(
    readonly meta: {
      ownerFn: () => TOwner;
      columns: string[];
      targetFn: TTargetFn;
      description?: string;
    },
  ) {}
}

/**
 * Foreign Key 역참조 builder (1:N)
 *
 * 다른 Table이 현재 Table을 참조하는 FK의 역참조를 정의
 * include() 시 배열로 로드됨 (opts.single: true 시 단일 객체)
 *
 * description, single 설정은 factory 함수의 opts 파라미터로 전달한다.
 * 메서드 체이닝(.description(), .single())은 TypeScript 순환 참조 시 TS7022를 유발하므로 제거됨.
 *
 * @template TTargetTableFn - 참조하는 Table builder factory 타입
 * @template TIsSingle - 단일 객체 여부
 *
 * @example
 * ```typescript
 * const User = Table("User")
 *   .columns((c) => ({
 *     id: c.bigint().autoIncrement(),
 *     name: c.varchar(100),
 *   }))
 *   .primaryKey("id")
 *   .relations((r) => ({
 *     // 1:N relationship - User ← Post.author
 *     posts: r.foreignKeyTarget(() => Post, "author"),
 *
 *     // 1:1 relation (single object)
 *     profile: r.foreignKeyTarget(() => Profile, "user", { single: true }),
 *
 *     // with description
 *     comments: r.foreignKeyTarget(() => Comment, "user", { description: "댓글목록" }),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyBuilder} FK builder
 */
export class ForeignKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any>,
  TIsSingle extends boolean,
> {
  /**
   * @param meta - FK 역참조 메타데이터
   * @param meta.targetTableFn - 참조하는 Table factory
   * @param meta.relationName - 참조하는 Table의 FK 관계 이름
   * @param meta.description - 관계 설명
   * @param meta.isSingle - 단일 객체 여부
   */
  constructor(
    readonly meta: {
      targetTableFn: TTargetTableFn;
      relationName: string;
      description?: string;
      isSingle?: TIsSingle;
    },
  ) {}
}

// ============================================
// RelationKeyBuilder (FK와 동일하지만 DB에 FK를 등록하지 않음)
// ============================================

/**
 * 논리적 관계 builder (N:1) - DB FK 미생성
 *
 * ForeignKeyBuilder와 동일하지만 DB에 FK 제약조건을 생성하지 않음
 * View에서도 사용 가능
 *
 * description 설정은 factory 함수의 opts 파라미터로 전달한다.
 *
 * @template TOwner - 소유 Table/View builder 타입
 * @template TTargetFn - 대상 Table/View builder factory 타입
 *
 * @example
 * ```typescript
 * // View에서 Table로의 관계 정의
 * const UserSummary = View("UserSummary")
 *   .query((db: MyDb) => db.user().select(...))
 *   .relations((r) => ({
 *     // View → Table (FK 미생성)
 *     company: r.relationKey(["companyId"], () => Company, { description: "소속회사" }),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyBuilder} DB FK 생성 버전
 */
export class RelationKeyBuilder<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
> {
  /**
   * @param meta - 관계 메타데이터
   * @param meta.ownerFn - 소유 Table/View factory
   * @param meta.columns - 관계 column 이름 배열
   * @param meta.targetFn - 대상 Table/View factory
   * @param meta.description - 관계 설명
   */
  constructor(
    readonly meta: {
      ownerFn: () => TOwner;
      columns: string[];
      targetFn: TTargetFn;
      description?: string;
    },
  ) {}
}

/**
 * 논리적 관계 역참조 builder (1:N) - DB FK 미생성
 *
 * ForeignKeyTargetBuilder와 동일하지만 DB에 FK 제약조건을 생성하지 않음
 * View에서도 사용 가능
 *
 * description, single 설정은 factory 함수의 opts 파라미터로 전달한다.
 *
 * @template TTargetTableFn - 참조하는 Table/View builder factory 타입
 * @template TIsSingle - 단일 객체 여부
 *
 * @example
 * ```typescript
 * const Company = Table("Company")
 *   .columns((c) => ({ id: c.bigint() }))
 *   .relations((r) => ({
 *     // 역참조 (FK 미생성)
 *     employees: r.relationKeyTarget(() => UserSummary, "company"),
 *     // 단일 객체 + 설명
 *     ceo: r.relationKeyTarget(() => UserSummary, "company", { single: true, description: "대표" }),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyTargetBuilder} DB FK 생성 버전
 */
export class RelationKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TIsSingle extends boolean,
> {
  /**
   * @param meta - 관계 역참조 메타데이터
   * @param meta.targetTableFn - 참조하는 Table/View factory
   * @param meta.relationName - 참조하는 Table/View의 관계 이름
   * @param meta.description - 관계 설명
   * @param meta.isSingle - 단일 객체 여부
   */
  constructor(
    readonly meta: {
      targetTableFn: TTargetTableFn;
      relationName: string;
      description?: string;
      isSingle?: TIsSingle;
    },
  ) {}
}

/**
 * FK 관계 factory 타입 (table 전용)
 *
 * @template TOwner - 소유 Table builder 타입
 * @template TColumnKey - Column key 타입
 */
type RelationFkFactory<TOwner extends TableBuilder<any, any>, TColumnKey extends string> = {
  /** N:1 FK 관계 정의 (DB FK 생성) */
  foreignKey<TTargetFn extends () => TableBuilder<any, any>>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
    opts?: { description?: string },
  ): ForeignKeyBuilder<TOwner, TTargetFn>;
  /** 1:N FK 역참조 정의 (single: true → 단일 객체) */
  foreignKeyTarget<TTargetTableFn extends () => TableBuilder<any, any>>(
    targetTableFn: TTargetTableFn,
    relationName: string,
    opts: { single: true; description?: string },
  ): ForeignKeyTargetBuilder<TTargetTableFn, true>;
  foreignKeyTarget<TTargetTableFn extends () => TableBuilder<any, any>>(
    targetTableFn: TTargetTableFn,
    relationName: string,
    opts?: { single?: false; description?: string },
  ): ForeignKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * 논리적 관계 factory 타입 (table/View 공용)
 *
 * @template TOwner - 소유 Table/View builder 타입
 * @template TColumnKey - Column key 타입
 */
type RelationRkFactory<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TColumnKey extends string,
> = {
  /** N:1 논리적 관계 정의 (DB FK 미생성) */
  relationKey<TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
    opts?: { description?: string },
  ): RelationKeyBuilder<TOwner, TTargetFn>;
  /** 1:N 논리적 역참조 정의 (single: true → 단일 객체) */
  relationKeyTarget<
    TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  >(
    targetTableFn: TTargetTableFn,
    relationName: string,
    opts: { single: true; description?: string },
  ): RelationKeyTargetBuilder<TTargetTableFn, true>;
  relationKeyTarget<
    TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  >(
    targetTableFn: TTargetTableFn,
    relationName: string,
    opts?: { single?: false; description?: string },
  ): RelationKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * 관계 builder factory 생성
 *
 * TableBuilder.relations()와 ViewBuilder.relations()에서 사용
 * Table은 FK + RelationKey 모두 사용 가능, View는 RelationKey만 사용 가능
 *
 * @template TOwner - 소유 Table/View builder 타입
 * @template TColumnKey - Column key 타입
 * @param ownerFn - 소유 Table/View factory 함수
 * @returns 관계 builder factory
 *
 * @example
 * ```typescript
 * // Table - FK와 RelationKey 모두 사용 가능
 * const Post = Table("Post")
 *   .columns((c) => ({
 *     id: c.bigint(),
 *     authorId: c.bigint(),
 *   }))
 *   .relations((r) => ({
 *     author: r.foreignKey(["authorId"], () => User),  // FK 생성
 *   }));
 *
 * // View - RelationKey만 사용 가능
 * const UserSummary = View("UserSummary")
 *   .query(...)
 *   .relations((r) => ({
 *     posts: r.relationKeyTarget(() => Post, "author"),  // FK 미생성
 *   }));
 * ```
 */
export function createRelationFactory<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TColumnKey extends string,
>(
  ownerFn: () => TOwner,
): TOwner extends TableBuilder<any, any>
  ? RelationFkFactory<TOwner, TColumnKey> & RelationRkFactory<TOwner, TColumnKey>
  : RelationRkFactory<TOwner, TColumnKey> {
  return {
    foreignKey(columns, targetFn, opts?) {
      return new ForeignKeyBuilder({
        ownerFn: ownerFn as () => TableBuilder<any, any>,
        columns,
        targetFn,
        description: opts?.description,
      });
    },
    foreignKeyTarget(targetTableFn, relationName, opts?) {
      return new ForeignKeyTargetBuilder({
        targetTableFn,
        relationName,
        description: opts?.description,
        isSingle: opts?.single,
      });
    },
    relationKey(columns, targetFn, opts?) {
      return new RelationKeyBuilder({
        ownerFn: ownerFn,
        columns,
        targetFn,
        description: opts?.description,
      });
    },
    relationKeyTarget(targetTableFn, relationName, opts?) {
      return new RelationKeyTargetBuilder({
        targetTableFn,
        relationName,
        description: opts?.description,
        isSingle: opts?.single,
      });
    },
  } as TOwner extends TableBuilder<any, any>
    ? RelationFkFactory<TOwner, TColumnKey> & RelationRkFactory<TOwner, TColumnKey>
    : RelationRkFactory<TOwner, TColumnKey>;
}

// ============================================
// builder 레코드
// ============================================

/**
 * 관계 builder 레코드 타입
 *
 * TableBuilder.relations()와 ViewBuilder.relations()의 반환 타입
 */
export type RelationBuilderRecord = Record<
  string,
  | ForeignKeyBuilder<any, any>
  | ForeignKeyTargetBuilder<any, any>
  | RelationKeyBuilder<any, any>
  | RelationKeyTargetBuilder<any, any>
>;

// ============================================
// Infer - 관계 타입 추론
// ============================================

/**
 * FK/RelationKey에서 대상 타입 추출 (단일 객체)
 *
 * N:1 관계의 대상 타입
 *
 * @template T - FK 또는 RelationKey builder 타입
 */
export type ExtractRelationTarget<TRelation> = TRelation extends
  | ForeignKeyBuilder<any, infer TTargetFn>
  | RelationKeyBuilder<any, infer TTargetFn>
  ? ReturnType<TTargetFn> extends TableBuilder<infer TCols, infer TRels>
    ? InferColumns<TCols> & InferDeepRelations<TRels>
    : ReturnType<TTargetFn> extends ViewBuilder<any, infer TData, infer TRels>
      ? TData & InferDeepRelations<TRels>
      : never
  : never;

/**
 * FKTarget/RelationKeyTarget에서 대상 타입 추출 (배열 또는 단일 객체)
 *
 * 1:N 관계의 대상 타입 (opts.single: true 시 단일 객체)
 * TTargetTableFn: 순환 참조 방지를 위한 지연 평가용 () => Post 형태
 *
 * @template T - FKTarget 또는 RelationKeyTarget builder 타입
 */
export type ExtractRelationTargetResult<TRelation> = TRelation extends
  | ForeignKeyTargetBuilder<infer TTargetTableFn, infer TIsSingle>
  | RelationKeyTargetBuilder<infer TTargetTableFn, infer TIsSingle>
  ? ReturnType<TTargetTableFn> extends TableBuilder<infer TCols, infer TRels>
    ? TIsSingle extends true
      ? InferColumns<TCols> & InferDeepRelations<TRels>
      : (InferColumns<TCols> & InferDeepRelations<TRels>)[]
    : ReturnType<TTargetTableFn> extends ViewBuilder<any, infer TData, infer TRels>
      ? TIsSingle extends true
        ? TData & InferDeepRelations<TRels>
        : (TData & InferDeepRelations<TRels>)[]
      : never
  : never;

/**
 * 관계 정의에서 심층 관계 타입 추론
 *
 * include() 없이 접근 시 undefined가 되도록 모든 관계를 optional로 설정
 *
 * @template TRelations - 관계 builder 레코드 타입
 *
 * @example
 * ```typescript
 * type UserRelations = InferDeepRelations<typeof User.$relations>;
 * // { posts?: Post[]; profile?: Profile; }
 * ```
 */
export type InferDeepRelations<TRelations extends RelationBuilderRecord> = {
  [K in keyof TRelations]?:
    | ExtractRelationTarget<TRelations[K]>
    | ExtractRelationTargetResult<TRelations[K]>;
};
