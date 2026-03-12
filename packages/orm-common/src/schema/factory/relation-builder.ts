import { type InferColumns } from "./column-builder";
import type { TableBuilder } from "../table-builder";
import type { ViewBuilder } from "../view-builder";

// ============================================
// ForeignKeyBuilder
// ============================================

/**
 * Foreign Key relation builder (N:1)
 *
 * Define FK relation from current Table to target Table
 * Creates actual FK constraint in the DB
 *
 * @template TOwner - Owner Table builder type
 * @template TTargetFn - Target Table builder factory type
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
 * @see {@link ForeignKeyTargetBuilder} Reverse-reference builder
 * @see {@link RelationKeyBuilder} Relation without DB FK
 */
export class ForeignKeyBuilder<
  TOwner extends TableBuilder<any, any>,
  TTargetFn extends () => TableBuilder<any, any>,
> {
  /**
   * @param meta - FK Metadata
   * @param meta.ownerFn - Owner Table factory
   * @param meta.columns - FK column name array
   * @param meta.targetFn - Target Table factory
   * @param meta.description - Relation description
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
   * Set relation description
   *
   * @param desc - Relation description
   * @returns New ForeignKeyBuilder instance
   */
  description(desc: string): ForeignKeyBuilder<TOwner, TTargetFn> {
    return new ForeignKeyBuilder({ ...this.meta, description: desc });
  }
}

/**
 * Foreign Key reverse-reference builder (1:N)
 *
 * Define reverse-reference for FK from another Table referencing current Table
 * Loaded as array on include() (single object when single() is called)
 *
 * @template TTargetTableFn - Referencing Table builder factory type
 * @template TIsSingle - Whether it is a single object
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
   * @param meta - FK reverse-reference Metadata
   * @param meta.targetTableFn - Referencing Table factory
   * @param meta.relationName - FK relation name of the referencing Table
   * @param meta.description - Relation description
   * @param meta.isSingle - Whether it is a single object
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
   * Set relation description
   *
   * @param desc - Relation description
   * @returns New ForeignKeyTargetBuilder instance
   */
  description(desc: string): ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle> {
    return new ForeignKeyTargetBuilder({ ...this.meta, description: desc });
  }

  /**
   * Set as single object relation (1:1)
   *
   * Default is array (1:N), single object when single() is called
   *
   * @returns New ForeignKeyTargetBuilder instance (isSingle=true)
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
// RelationKeyBuilder (same as FK but does not register FK in DB)
// ============================================

/**
 * Logical relation builder (N:1) - No DB FK creation
 *
 * Same as ForeignKeyBuilder but does not create FK constraints in the DB
 * Can also be used in Views
 *
 * @template TOwner - Owner Table/View builder type
 * @template TTargetFn - Target Table/View builder factory type
 *
 * @example
 * ```typescript
 * // Relation definition from View to Table
 * const UserSummary = View("UserSummary")
 *   .query((db: MyDb) => db.user().select(...))
 *   .relations((r) => ({
 *     // View → Table (no FK creation)
 *     company: r.relationKey(["companyId"], () => Company),
 *   }));
 *
 * // Relation definition from Table without FK
 * const Report = Table("Report")
 *   .columns((c) => ({ userId: c.bigint() }))
 *   .relations((r) => ({
 *     user: r.relationKey(["userId"], () => User),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyBuilder} DB FK creation version
 */
export class RelationKeyBuilder<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
> {
  /**
   * @param meta - Relation Metadata
   * @param meta.ownerFn - Owner Table/View factory
   * @param meta.columns - Relation column name array
   * @param meta.targetFn - Target Table/View factory
   * @param meta.description - Relation description
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
   * Set relation description
   *
   * @param desc - Relation description
   * @returns New RelationKeyBuilder instance
   */
  description(desc: string): RelationKeyBuilder<TOwner, TTargetFn> {
    return new RelationKeyBuilder({ ...this.meta, description: desc });
  }
}

/**
 * Logical relation reverse-reference builder (1:N) - No DB FK creation
 *
 * Same as ForeignKeyTargetBuilder but does not create FK constraints in the DB
 * Can also be used in Views
 *
 * @template TTargetTableFn - Referencing Table/View builder factory type
 * @template TIsSingle - Whether it is a single object
 *
 * @example
 * ```typescript
 * const Company = Table("Company")
 *   .columns((c) => ({ id: c.bigint() }))
 *   .relations((r) => ({
 *     // Reverse-reference (no FK creation)
 *     employees: r.relationKeyTarget(() => UserSummary, "company"),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyTargetBuilder} DB FK creation version
 */
export class RelationKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TIsSingle extends boolean,
> {
  /**
   * @param meta - Relation reverse-reference Metadata
   * @param meta.targetTableFn - Referencing Table/View factory
   * @param meta.relationName - Relation name of the referencing Table/View
   * @param meta.description - Relation description
   * @param meta.isSingle - Whether it is a single object
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
   * Set relation description
   *
   * @param desc - Relation description
   * @returns New RelationKeyTargetBuilder instance
   */
  description(desc: string): RelationKeyTargetBuilder<TTargetTableFn, TIsSingle> {
    return new RelationKeyTargetBuilder({ ...this.meta, description: desc });
  }

  /**
   * Set as single object relation (1:1)
   *
   * Default is array (1:N), single object when single() is called
   *
   * @returns New RelationKeyTargetBuilder instance (isSingle=true)
   */
  single(): RelationKeyTargetBuilder<TTargetTableFn, true> {
    return new RelationKeyTargetBuilder({ ...this.meta, isSingle: true });
  }
}

/**
 * FK relation factory type (table only)
 *
 * @template TOwner - Owner Table builder type
 * @template TColumnKey - Column key type
 */
type RelationFkFactory<TOwner extends TableBuilder<any, any>, TColumnKey extends string> = {
  /** N:1 FK relationship definition (DB FK Create) */
  foreignKey<TTargetFn extends () => TableBuilder<any, any>>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
  ): ForeignKeyBuilder<TOwner, TTargetFn>;
  /** 1:N FK reverse-reference definition */
  foreignKeyTarget<TTargetTableFn extends () => TableBuilder<any, any>>(
    targetTableFn: TTargetTableFn,
    relationName: string,
  ): ForeignKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * Logical relation factory type (shared for table/View)
 *
 * @template TOwner - Owner Table/View builder type
 * @template TColumnKey - Column key type
 */
type RelationRkFactory<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TColumnKey extends string,
> = {
  /** N:1 logical relation definition (no DB FK creation) */
  relationKey<TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
  ): RelationKeyBuilder<TOwner, TTargetFn>;
  /** 1:N logical reverse-reference definition */
  relationKeyTarget<
    TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  >(
    targetTableFn: TTargetTableFn,
    relationName: string,
  ): RelationKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * Relation builder factory creation
 *
 * Used in TableBuilder.relations() and ViewBuilder.relations()
 * Table can use both FK + RelationKey, View can only use RelationKey
 *
 * @template TOwner - Owner Table/View builder type
 * @template TColumnKey - Column key type
 * @param ownerFn - Owner Table/View factory function
 * @returns Relation builder factory
 *
 * @example
 * ```typescript
 * // Table - both FK and RelationKey available
 * const Post = Table("Post")
 *   .columns((c) => ({
 *     id: c.bigint(),
 *     authorId: c.bigint(),
 *   }))
 *   .relations((r) => ({
 *     author: r.foreignKey(["authorId"], () => User),  // FK Generate
 *   }));
 *
 * // View - only RelationKey available
 * const UserSummary = View("UserSummary")
 *   .query(...)
 *   .relations((r) => ({
 *     posts: r.relationKeyTarget(() => Post, "author"),  // No FK creation
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
// builder record
// ============================================

/**
 * relationship builder record type
 *
 * Return type of TableBuilder.relations() and ViewBuilder.relations()
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
 * Extract target type from FK/RelationKey (single object)
 *
 * Target type of N:1 relation
 *
 * @template T - FK or RelationKey builder type
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
 * Extract target type from FKTarget/RelationKeyTarget (array or single object)
 *
 * Target type of 1:N relation (single object when single() is called)
 * TTargetTableFn: () => Post form for lazy evaluation to prevent circular references
 *
 * @template T - FKTarget or RelationKeyTarget builder type
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
 * Deep relation Type inference from relation definitions
 *
 * Makes all relations optional so accessing without include() results in undefined
 *
 * @template TRelations - Relation builder record type
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
