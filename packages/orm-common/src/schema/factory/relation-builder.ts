import { type InferColumns } from "./column-builder";
import type { TableBuilder } from "../table-builder";
import type { ViewBuilder } from "../view-builder";

// ============================================
// ForeignKeyBuilder
// ============================================

/**
 * Foreign Key relationship builder (N:1)
 *
 * 현재 Table에서 참조 Table로의 FK relationship definition
 * DB에 실제 FK constraint Generate
 *
 * @template TOwner - 소유 Table builder type
 * @template TTargetFn - 참조 Table builder factory type
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
 *     author: r.foreignKey(["authorId"], () => User),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyTargetBuilder} 역참조 builder
 * @see {@link RelationKeyBuilder} DB FK 없는 relationship
 */
export class ForeignKeyBuilder<
  TOwner extends TableBuilder<any, any>,
  TTargetFn extends () => TableBuilder<any, any>,
> {
  /**
   * @param meta - FK Metadata
   * @param meta.ownerFn - 소유 Table factory
   * @param meta.columns - FK column명 array
   * @param meta.targetFn - 참조 Table factory
   * @param meta.description - relationship description
   */
  constructor(
    readonly meta: {
      ownerFn: () => TOwner;
      columns: string[];
      targetFn: TTargetFn;
      description?: string;
    },
  ) {}

  /**
   * relationship set description
   *
   * @param desc - relationship description
   * @returns 새 ForeignKeyBuilder instance
   */
  description(desc: string): ForeignKeyBuilder<TOwner, TTargetFn> {
    return new ForeignKeyBuilder({ ...this.meta, description: desc });
  }
}

/**
 * Foreign Key 역참조 builder (1:N)
 *
 * 다른 Table에서 현재 Table을 참조하는 FK의 역참조 definition
 * include() 시 배열로 로드 (single() 호출 시 단일 object)
 *
 * @template TTargetTableFn - 참조하는 Table builder factory type
 * @template TIsSingle - 단일 object 여부
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
 *     // 1:1 relationship (단일 object)
 *     profile: r.foreignKeyTarget(() => Profile, "user").single(),
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
   * @param meta - FK 역참조 Metadata
   * @param meta.targetTableFn - 참조하는 Table factory
   * @param meta.relationName - 참조하는 Table의 FK 관계명
   * @param meta.description - relationship description
   * @param meta.isSingle - 단일 object 여부
   */
  constructor(
    readonly meta: {
      targetTableFn: TTargetTableFn;
      relationName: string;
      description?: string;
      isSingle?: TIsSingle;
    },
  ) {}

  /**
   * relationship set description
   *
   * @param desc - relationship description
   * @returns 새 ForeignKeyTargetBuilder instance
   */
  description(desc: string): ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle> {
    return new ForeignKeyTargetBuilder({ ...this.meta, description: desc });
  }

  /**
   * 단일 object 관계로 설정 (1:1)
   *
   * Basic은 array (1:N), single() 호출 시 단일 object
   *
   * @returns 새 ForeignKeyTargetBuilder instance (isSingle=true)
   *
   * @example
   * ```typescript
   * profile: r.foreignKeyTarget(() => Profile, "user").single()
   * ```
   */
  single(): ForeignKeyTargetBuilder<TTargetTableFn, true> {
    return new ForeignKeyTargetBuilder({ ...this.meta, isSingle: true });
  }
}

// ============================================
// RelationKeyBuilder (FK와 동일하지만 DB에 FK 등록 안 함)
// ============================================

/**
 * 논리적 relationship builder (N:1) - DB FK 미생성
 *
 * ForeignKeyBuilder와 동일하지만 DB에 FK 제약조건을 생성하지 않음
 * View(View)에서도 사용 가능
 *
 * @template TOwner - 소유 Table/View builder type
 * @template TTargetFn - 참조 Table/View builder factory type
 *
 * @example
 * ```typescript
 * // View에서 Table로 relationship definition
 * const UserSummary = View("UserSummary")
 *   .query((db: MyDb) => db.user().select(...))
 *   .relations((r) => ({
 *     // View → Table (FK 미생성)
 *     company: r.relationKey(["companyId"], () => Company),
 *   }));
 *
 * // Table에서 FK 없이 relationship definition
 * const Report = Table("Report")
 *   .columns((c) => ({ userId: c.bigint() }))
 *   .relations((r) => ({
 *     user: r.relationKey(["userId"], () => User),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyBuilder} DB FK Generate 버전
 */
export class RelationKeyBuilder<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
> {
  /**
   * @param meta - relationship Metadata
   * @param meta.ownerFn - 소유 Table/View factory
   * @param meta.columns - relationship column명 array
   * @param meta.targetFn - 참조 Table/View factory
   * @param meta.description - relationship description
   */
  constructor(
    readonly meta: {
      ownerFn: () => TOwner;
      columns: string[];
      targetFn: TTargetFn;
      description?: string;
    },
  ) {}

  /**
   * relationship set description
   *
   * @param desc - relationship description
   * @returns 새 RelationKeyBuilder instance
   */
  description(desc: string): RelationKeyBuilder<TOwner, TTargetFn> {
    return new RelationKeyBuilder({ ...this.meta, description: desc });
  }
}

/**
 * 논리적 relationship 역참조 builder (1:N) - DB FK 미생성
 *
 * ForeignKeyTargetBuilder와 동일하지만 DB에 FK 제약조건을 생성하지 않음
 * View(View)에서도 사용 가능
 *
 * @template TTargetTableFn - 참조하는 Table/View builder factory type
 * @template TIsSingle - 단일 object 여부
 *
 * @example
 * ```typescript
 * const Company = Table("Company")
 *   .columns((c) => ({ id: c.bigint() }))
 *   .relations((r) => ({
 *     // 역참조 (FK 미생성)
 *     employees: r.relationKeyTarget(() => UserSummary, "company"),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyTargetBuilder} DB FK Generate 버전
 */
export class RelationKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TIsSingle extends boolean,
> {
  /**
   * @param meta - relationship 역참조 Metadata
   * @param meta.targetTableFn - 참조하는 Table/View factory
   * @param meta.relationName - 참조하는 Table/View의 관계명
   * @param meta.description - relationship description
   * @param meta.isSingle - 단일 object 여부
   */
  constructor(
    readonly meta: {
      targetTableFn: TTargetTableFn;
      relationName: string;
      description?: string;
      isSingle?: TIsSingle;
    },
  ) {}

  /**
   * relationship set description
   *
   * @param desc - relationship description
   * @returns 새 RelationKeyTargetBuilder instance
   */
  description(desc: string): RelationKeyTargetBuilder<TTargetTableFn, TIsSingle> {
    return new RelationKeyTargetBuilder({ ...this.meta, description: desc });
  }

  /**
   * 단일 object 관계로 설정 (1:1)
   *
   * Basic은 array (1:N), single() 호출 시 단일 object
   *
   * @returns 새 RelationKeyTargetBuilder instance (isSingle=true)
   */
  single(): RelationKeyTargetBuilder<TTargetTableFn, true> {
    return new RelationKeyTargetBuilder({ ...this.meta, isSingle: true });
  }
}

/**
 * FK relationship factory type (table 전용)
 *
 * @template TOwner - 소유 Table builder type
 * @template TColumnKey - Column key type
 */
type RelationFkFactory<TOwner extends TableBuilder<any, any>, TColumnKey extends string> = {
  /** N:1 FK relationship definition (DB FK Create) */
  foreignKey<TTargetFn extends () => TableBuilder<any, any>>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
  ): ForeignKeyBuilder<TOwner, TTargetFn>;
  /** 1:N FK 역참조 definition */
  foreignKeyTarget<TTargetTableFn extends () => TableBuilder<any, any>>(
    targetTableFn: TTargetTableFn,
    relationName: string,
  ): ForeignKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * 논리적 relationship factory type (table/View 공용)
 *
 * @template TOwner - 소유 Table/View builder type
 * @template TColumnKey - Column key type
 */
type RelationRkFactory<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TColumnKey extends string,
> = {
  /** N:1 논리적 relationship definition (DB FK 미생성) */
  relationKey<TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
  ): RelationKeyBuilder<TOwner, TTargetFn>;
  /** 1:N 논리적 역참조 definition */
  relationKeyTarget<
    TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  >(
    targetTableFn: TTargetTableFn,
    relationName: string,
  ): RelationKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * relationship builder factory Generate
 *
 * TableBuilder.relations() 및 ViewBuilder.relations()used in
 * Table은 FK + RelationKey 모두 사용 가능, View는 RelationKey만 사용 가능
 *
 * @template TOwner - 소유 Table/View builder type
 * @template TColumnKey - Column key type
 * @param ownerFn - 소유 Table/View factory function
 * @returns relationship builder factory
 *
 * @example
 * ```typescript
 * // Table - FK, RelationKey 모두 사용 가능
 * const Post = Table("Post")
 *   .columns((c) => ({
 *     id: c.bigint(),
 *     authorId: c.bigint(),
 *   }))
 *   .relations((r) => ({
 *     author: r.foreignKey(["authorId"], () => User),  // FK Generate
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
    foreignKey(columns, targetFn) {
      return new ForeignKeyBuilder({
        ownerFn: ownerFn as () => TableBuilder<any, any>,
        columns,
        targetFn,
      });
    },
    foreignKeyTarget(targetTableFn, relationName) {
      return new ForeignKeyTargetBuilder({ targetTableFn, relationName });
    },
    relationKey(columns, targetFn) {
      return new RelationKeyBuilder({
        ownerFn: ownerFn,
        columns,
        targetFn,
      });
    },
    relationKeyTarget(targetTableFn, relationName) {
      return new RelationKeyTargetBuilder({ targetTableFn, relationName });
    },
  } as TOwner extends TableBuilder<any, any>
    ? RelationFkFactory<TOwner, TColumnKey> & RelationRkFactory<TOwner, TColumnKey>
    : RelationRkFactory<TOwner, TColumnKey>;
}

// ============================================
// builder 레코드
// ============================================

/**
 * relationship builder record type
 *
 * TableBuilder.relations() 및 ViewBuilder.relations()의 return type
 */
export type RelationBuilderRecord = Record<
  string,
  | ForeignKeyBuilder<any, any>
  | ForeignKeyTargetBuilder<any, any>
  | RelationKeyBuilder<any, any>
  | RelationKeyTargetBuilder<any, any>
>;

// ============================================
// Infer - relationship Type inference
// ============================================

/**
 * FK/RelationKey에서 참조 대상 type 추출 (단일 object)
 *
 * N:1 관계의 참조 대상 type
 *
 * @template T - FK 또는 RelationKey builder type
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
 * FKTarget/RelationKeyTarget에서 참조 대상 type 추출 (array 또는 단일 object)
 *
 * 1:N 관계의 참조 대상 type (single() 호출 시 단일 object)
 * TTargetTableFn: () => Post 형태로 lazy evaluation하여 순환참조 방지
 *
 * @template T - FKTarget 또는 RelationKeyTarget builder type
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
 * relationship 정의에서 깊은 relationship Type inference
 *
 * 모든 관계를 optional로 만들어 include() 없이 access 시 undefined processing
 *
 * @template TRelations - relationship builder record type
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
