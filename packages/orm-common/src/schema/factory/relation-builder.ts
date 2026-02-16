import { type InferColumns } from "./column-builder";
import type { TableBuilder } from "../table-builder";
import type { ViewBuilder } from "../view-builder";

// ============================================
// ForeignKeyBuilder
// ============================================

/**
 * Foreign Key 관계 빌더 (N:1)
 *
 * 현재 테이블에서 참조 테이블로의 FK 관계 정의
 * DB에 실제 FK 제약조건 생성
 *
 * @template TOwner - 소유 테이블 빌더 타입
 * @template TTargetFn - 참조 테이블 빌더 팩토리 타입
 *
 * @example
 * ```typescript
 * const Post = Table("Post")
 *   .columns((c) => ({
 *     id: c.bigint().autoIncrement(),
 *     authorId: c.bigint(),  // FK 컬럼
 *   }))
 *   .primaryKey("id")
 *   .relations((r) => ({
 *     // N:1 관계 - Post → User
 *     author: r.foreignKey(["authorId"], () => User),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyTargetBuilder} 역참조 빌더
 * @see {@link RelationKeyBuilder} DB FK 없는 관계
 */
export class ForeignKeyBuilder<TOwner extends TableBuilder<any, any>, TTargetFn extends () => TableBuilder<any, any>> {
  /**
   * @param meta - FK 메타데이터
   * @param meta.ownerFn - 소유 테이블 팩토리
   * @param meta.columns - FK 컬럼명 배열
   * @param meta.targetFn - 참조 테이블 팩토리
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

  /**
   * 관계 설명 설정
   *
   * @param desc - 관계 설명
   * @returns 새 ForeignKeyBuilder 인스턴스
   */
  description(desc: string): ForeignKeyBuilder<TOwner, TTargetFn> {
    return new ForeignKeyBuilder({ ...this.meta, description: desc });
  }
}

/**
 * Foreign Key 역참조 빌더 (1:N)
 *
 * 다른 테이블에서 현재 테이블을 참조하는 FK의 역참조 정의
 * include() 시 배열로 로드 (single() 호출 시 단일 객체)
 *
 * @template TTargetTableFn - 참조하는 테이블 빌더 팩토리 타입
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
 *     // 1:N 관계 - User ← Post.author
 *     posts: r.foreignKeyTarget(() => Post, "author"),
 *
 *     // 1:1 관계 (단일 객체)
 *     profile: r.foreignKeyTarget(() => Profile, "user").single(),
 *   }));
 * ```
 *
 * @see {@link ForeignKeyBuilder} FK 빌더
 */
export class ForeignKeyTargetBuilder<TTargetTableFn extends () => TableBuilder<any, any>, TIsSingle extends boolean> {
  /**
   * @param meta - FK 역참조 메타데이터
   * @param meta.targetTableFn - 참조하는 테이블 팩토리
   * @param meta.relationName - 참조하는 테이블의 FK 관계명
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

  /**
   * 관계 설명 설정
   *
   * @param desc - 관계 설명
   * @returns 새 ForeignKeyTargetBuilder 인스턴스
   */
  description(desc: string): ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle> {
    return new ForeignKeyTargetBuilder({ ...this.meta, description: desc });
  }

  /**
   * 단일 객체 관계로 설정 (1:1)
   *
   * 기본은 배열 (1:N), single() 호출 시 단일 객체
   *
   * @returns 새 ForeignKeyTargetBuilder 인스턴스 (isSingle=true)
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
 * 논리적 관계 빌더 (N:1) - DB FK 미생성
 *
 * ForeignKeyBuilder와 동일하지만 DB에 FK 제약조건을 생성하지 않음
 * 뷰(View)에서도 사용 가능
 *
 * @template TOwner - 소유 테이블/뷰 빌더 타입
 * @template TTargetFn - 참조 테이블/뷰 빌더 팩토리 타입
 *
 * @example
 * ```typescript
 * // 뷰에서 테이블로 관계 정의
 * const UserSummary = View("UserSummary")
 *   .query((db: MyDb) => db.user().select(...))
 *   .relations((r) => ({
 *     // 뷰 → 테이블 (FK 미생성)
 *     company: r.relationKey(["companyId"], () => Company),
 *   }));
 *
 * // 테이블에서 FK 없이 관계 정의
 * const Report = Table("Report")
 *   .columns((c) => ({ userId: c.bigint() }))
 *   .relations((r) => ({
 *     user: r.relationKey(["userId"], () => User),
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
   * @param meta.ownerFn - 소유 테이블/뷰 팩토리
   * @param meta.columns - 관계 컬럼명 배열
   * @param meta.targetFn - 참조 테이블/뷰 팩토리
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

  /**
   * 관계 설명 설정
   *
   * @param desc - 관계 설명
   * @returns 새 RelationKeyBuilder 인스턴스
   */
  description(desc: string): RelationKeyBuilder<TOwner, TTargetFn> {
    return new RelationKeyBuilder({ ...this.meta, description: desc });
  }
}

/**
 * 논리적 관계 역참조 빌더 (1:N) - DB FK 미생성
 *
 * ForeignKeyTargetBuilder와 동일하지만 DB에 FK 제약조건을 생성하지 않음
 * 뷰(View)에서도 사용 가능
 *
 * @template TTargetTableFn - 참조하는 테이블/뷰 빌더 팩토리 타입
 * @template TIsSingle - 단일 객체 여부
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
 * @see {@link ForeignKeyTargetBuilder} DB FK 생성 버전
 */
export class RelationKeyTargetBuilder<
  TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TIsSingle extends boolean,
> {
  /**
   * @param meta - 관계 역참조 메타데이터
   * @param meta.targetTableFn - 참조하는 테이블/뷰 팩토리
   * @param meta.relationName - 참조하는 테이블/뷰의 관계명
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

  /**
   * 관계 설명 설정
   *
   * @param desc - 관계 설명
   * @returns 새 RelationKeyTargetBuilder 인스턴스
   */
  description(desc: string): RelationKeyTargetBuilder<TTargetTableFn, TIsSingle> {
    return new RelationKeyTargetBuilder({ ...this.meta, description: desc });
  }

  /**
   * 단일 객체 관계로 설정 (1:1)
   *
   * 기본은 배열 (1:N), single() 호출 시 단일 객체
   *
   * @returns 새 RelationKeyTargetBuilder 인스턴스 (isSingle=true)
   */
  single(): RelationKeyTargetBuilder<TTargetTableFn, true> {
    return new RelationKeyTargetBuilder({ ...this.meta, isSingle: true });
  }
}

/**
 * FK 관계 팩토리 타입 (테이블 전용)
 *
 * @template TOwner - 소유 테이블 빌더 타입
 * @template TColumnKey - 컬럼 키 타입
 */
type RelationFkFactory<TOwner extends TableBuilder<any, any>, TColumnKey extends string> = {
  /** N:1 FK 관계 정의 (DB FK 생성) */
  foreignKey<TTargetFn extends () => TableBuilder<any, any>>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
  ): ForeignKeyBuilder<TOwner, TTargetFn>;
  /** 1:N FK 역참조 정의 */
  foreignKeyTarget<TTargetTableFn extends () => TableBuilder<any, any>>(
    targetTableFn: TTargetTableFn,
    relationName: string,
  ): ForeignKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * 논리적 관계 팩토리 타입 (테이블/뷰 공용)
 *
 * @template TOwner - 소유 테이블/뷰 빌더 타입
 * @template TColumnKey - 컬럼 키 타입
 */
type RelationRkFactory<
  TOwner extends TableBuilder<any, any> | ViewBuilder<any, any, any>,
  TColumnKey extends string,
> = {
  /** N:1 논리적 관계 정의 (DB FK 미생성) */
  relationKey<TTargetFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
  ): RelationKeyBuilder<TOwner, TTargetFn>;
  /** 1:N 논리적 역참조 정의 */
  relationKeyTarget<TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>>(
    targetTableFn: TTargetTableFn,
    relationName: string,
  ): RelationKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * 관계 빌더 팩토리 생성
 *
 * TableBuilder.relations() 및 ViewBuilder.relations()에서 사용
 * 테이블은 FK + RelationKey 모두 사용 가능, 뷰는 RelationKey만 사용 가능
 *
 * @template TOwner - 소유 테이블/뷰 빌더 타입
 * @template TColumnKey - 컬럼 키 타입
 * @param ownerFn - 소유 테이블/뷰 팩토리 함수
 * @returns 관계 빌더 팩토리
 *
 * @example
 * ```typescript
 * // 테이블 - FK, RelationKey 모두 사용 가능
 * const Post = Table("Post")
 *   .columns((c) => ({
 *     id: c.bigint(),
 *     authorId: c.bigint(),
 *   }))
 *   .relations((r) => ({
 *     author: r.foreignKey(["authorId"], () => User),  // FK 생성
 *   }));
 *
 * // 뷰 - RelationKey만 사용 가능
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
// 빌더 레코드
// ============================================

/**
 * 관계 빌더 레코드 타입
 *
 * TableBuilder.relations() 및 ViewBuilder.relations()의 반환 타입
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
 * FK/RelationKey에서 참조 대상 타입 추출 (단일 객체)
 *
 * N:1 관계의 참조 대상 타입
 *
 * @template T - FK 또는 RelationKey 빌더 타입
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
 * FKTarget/RelationKeyTarget에서 참조 대상 타입 추출 (배열 또는 단일 객체)
 *
 * 1:N 관계의 참조 대상 타입 (single() 호출 시 단일 객체)
 * TTargetTableFn: () => Post 형태로 lazy evaluation하여 순환참조 방지
 *
 * @template T - FKTarget 또는 RelationKeyTarget 빌더 타입
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
 * 관계 정의에서 깊은 관계 타입 추론
 *
 * 모든 관계를 optional로 만들어 include() 없이 접근 시 undefined 처리
 *
 * @template TRelations - 관계 빌더 레코드 타입
 *
 * @example
 * ```typescript
 * type UserRelations = InferDeepRelations<typeof User.$relations>;
 * // { posts?: Post[]; profile?: Profile; }
 * ```
 */
export type InferDeepRelations<TRelations extends RelationBuilderRecord> = {
  [K in keyof TRelations]?: ExtractRelationTarget<TRelations[K]> | ExtractRelationTargetResult<TRelations[K]>;
};
