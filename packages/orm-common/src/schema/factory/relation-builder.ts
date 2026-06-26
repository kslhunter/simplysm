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
 * @template TTargetFn - 대상 Table builder factory 타입 (무제약)
 *
 * 대상 타겟을 잡는 제네릭은 **무제약**(`extends () => TableBuilder<...>` 제약 없음)이다.
 * 제약이 있으면 모델 const 형성 중 `() => typeof X` 타겟 화살표를 eager 평가하여
 * TS6 에서 순환 const(TS7022/7024)를 유발하기 때문이다. 대상 해소는 `$inferSelect`
 * 접근 시점에 lazy 하게(`ExtractRelationTarget`) 이루어진다.
 *
 * @see {@link ForeignKeyTargetBuilder} 역참조 builder
 * @see {@link RelationKeyBuilder} DB FK 없는 관계
 */
export class ForeignKeyBuilder<TTargetFn> {
  /**
   * @param meta - FK 메타데이터
   * @param meta.columns - FK column 이름 배열
   * @param meta.targetFn - 대상 Table factory
   * @param meta.description - 관계 설명
   */
  constructor(
    readonly meta: {
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
 * @template TTargetTableFn - 참조하는 Table builder factory 타입 (무제약)
 * @template TIsSingle - 단일 객체 여부
 *
 * @see {@link ForeignKeyBuilder} FK builder
 */
export class ForeignKeyTargetBuilder<TTargetTableFn, TIsSingle> {
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
 * @template TTargetFn - 대상 Table/View builder factory 타입 (무제약)
 *
 * @see {@link ForeignKeyBuilder} DB FK 생성 버전
 */
export class RelationKeyBuilder<TTargetFn> {
  /**
   * @param meta - 관계 메타데이터
   * @param meta.columns - 관계 column 이름 배열
   * @param meta.targetFn - 대상 Table/View factory
   * @param meta.description - 관계 설명
   */
  constructor(
    readonly meta: {
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
 * @template TTargetTableFn - 참조하는 Table/View builder factory 타입 (무제약)
 * @template TIsSingle - 단일 객체 여부
 *
 * @see {@link ForeignKeyTargetBuilder} DB FK 생성 버전
 */
export class RelationKeyTargetBuilder<TTargetTableFn, TIsSingle> {
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

// ============================================
// 관계 factory
// ============================================

/**
 * FK 관계 factory 타입 (table 전용)
 *
 * 컬럼 키 제약(`TColumnKey extends string`)은 self-contained 하므로 **유지**한다.
 * 대상 타겟을 잡는 제네릭(`TTargetFn`/`TTargetTableFn`)은 **무제약**이다.
 *
 * @template TColumnKey - Column key 타입
 */
export type RelationFkFactory<TColumnKey extends string> = {
  /** N:1 FK 관계 정의 (DB FK 생성) */
  foreignKey<TTargetFn>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
    opts?: { description?: string },
  ): ForeignKeyBuilder<TTargetFn>;
  /** 1:N FK 역참조 정의 (single: true → 단일 객체) */
  foreignKeyTarget<TTargetTableFn>(
    targetTableFn: TTargetTableFn,
    relationName: string,
    opts: { single: true; description?: string },
  ): ForeignKeyTargetBuilder<TTargetTableFn, true>;
  foreignKeyTarget<TTargetTableFn>(
    targetTableFn: TTargetTableFn,
    relationName: string,
    opts?: { single?: false; description?: string },
  ): ForeignKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * 논리적 관계 factory 타입 (table/View 공용)
 *
 * @template TColumnKey - Column key 타입
 */
export type RelationRkFactory<TColumnKey extends string> = {
  /** N:1 논리적 관계 정의 (DB FK 미생성) */
  relationKey<TTargetFn>(
    columns: TColumnKey[],
    targetFn: TTargetFn,
    opts?: { description?: string },
  ): RelationKeyBuilder<TTargetFn>;
  /** 1:N 논리적 역참조 정의 (single: true → 단일 객체) */
  relationKeyTarget<TTargetTableFn>(
    targetTableFn: TTargetTableFn,
    relationName: string,
    opts: { single: true; description?: string },
  ): RelationKeyTargetBuilder<TTargetTableFn, true>;
  relationKeyTarget<TTargetTableFn>(
    targetTableFn: TTargetTableFn,
    relationName: string,
    opts?: { single?: false; description?: string },
  ): RelationKeyTargetBuilder<TTargetTableFn, false>;
};

/**
 * Table용 관계 factory (FK + RelationKey 모두 사용 가능)
 */
export type TableRelationFactory<TColumnKey extends string> = RelationFkFactory<TColumnKey> &
  RelationRkFactory<TColumnKey>;

/**
 * View용 관계 factory (RelationKey만 사용 가능)
 */
export type ViewRelationFactory<TColumnKey extends string> = RelationRkFactory<TColumnKey>;

/**
 * 관계 builder factory 생성
 *
 * `TableBuilder.relations(fn)` / `ViewBuilder.relations(fn)` 의 콜백 인자로 전달된다.
 * Table은 FK + RelationKey 모두 사용 가능, View는 RelationKey만 사용 가능.
 *
 * @template TColumnKey - Column key 타입
 * @returns 관계 builder factory
 */
export function createRelationFactory<TColumnKey extends string = string>(): TableRelationFactory<TColumnKey> {
  return {
    foreignKey(columns, targetFn, opts?) {
      return new ForeignKeyBuilder({
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
  } as TableRelationFactory<TColumnKey>;
}

// ============================================
// builder 레코드
// ============================================

/**
 * 관계 builder 레코드 타입
 *
 * `TableBuilder.relations(fn)` / `ViewBuilder.relations(fn)` 콜백의 반환 타입.
 */
export type RelationBuilderRecord = Record<
  string,
  | ForeignKeyBuilder<any>
  | ForeignKeyTargetBuilder<any, any>
  | RelationKeyBuilder<any>
  | RelationKeyTargetBuilder<any, any>
>;

// ============================================
// Infer - 관계 타입 추론 (lazy 구조적 walk + 순환 방지 visited)
// ============================================
//
// 핵심: 관계 대상을 `ReturnType<TFn>` 으로 즉시 풀지 않고
// `TFn extends () => infer TTarget` 형태로 **lazy** 하게 푼다.
// 이로써 `$inferSelect` phantom 필드에 접근하기 전까지 `() => typeof X` 타겟이
// 평가되지 않아, 모델 const 형성 중 순환이 발생하지 않는다.
// 같은 테이블/뷰 이름 재방문(`TVisited`) 시 컬럼만 반환하여 무한 재귀를 끊는다.

/**
 * FK/RelationKey에서 대상 타입 추출 (단일 객체, N:1)
 *
 * 대상이 Table이면 컬럼 + 심층 관계, View면 데이터 + 심층 관계를 반환한다.
 *
 * @template TRelation - FK 또는 RelationKey builder 타입
 * @template TVisited - 순환 방지를 위한 방문 테이블/뷰명 집합
 */
export type ExtractRelationTarget<TRelation, TVisited extends string = never> = TRelation extends
  | ForeignKeyBuilder<infer TTargetFn>
  | RelationKeyBuilder<infer TTargetFn>
  ? TTargetFn extends () => infer TTarget
    ? TTarget extends TableBuilder<infer TName, infer TCols, infer TRels>
      ? TName extends TVisited
        ? InferColumns<TCols>
        : InferColumns<TCols> & InferDeepRelations<TRels, TVisited | TName>
      : TTarget extends ViewBuilder<any, infer TVName, infer TData, infer TVRels>
        ? TVName extends TVisited
          ? TData
          : TData & InferDeepRelations<TVRels, TVisited | TVName>
        : never
    : never
  : never;

/**
 * FKTarget/RelationKeyTarget에서 대상 타입 추출 (배열 또는 단일 객체, 1:N)
 *
 * opts.single: true 시 단일 객체, 아니면 배열.
 *
 * @template TRelation - FKTarget 또는 RelationKeyTarget builder 타입
 * @template TVisited - 순환 방지를 위한 방문 테이블/뷰명 집합
 */
export type ExtractRelationTargetResult<
  TRelation,
  TVisited extends string = never,
> = TRelation extends
  | ForeignKeyTargetBuilder<infer TTargetTableFn, infer TIsSingle>
  | RelationKeyTargetBuilder<infer TTargetTableFn, infer TIsSingle>
  ? TTargetTableFn extends () => infer TTarget
    ? TTarget extends TableBuilder<infer TName, infer TCols, infer TRels>
      ? TName extends TVisited
        ? TIsSingle extends true
          ? InferColumns<TCols>
          : InferColumns<TCols>[]
        : TIsSingle extends true
          ? InferColumns<TCols> & InferDeepRelations<TRels, TVisited | TName>
          : (InferColumns<TCols> & InferDeepRelations<TRels, TVisited | TName>)[]
      : TTarget extends ViewBuilder<any, infer TVName, infer TData, infer TVRels>
        ? TVName extends TVisited
          ? TIsSingle extends true
            ? TData
            : TData[]
          : TIsSingle extends true
            ? TData & InferDeepRelations<TVRels, TVisited | TVName>
            : (TData & InferDeepRelations<TVRels, TVisited | TVName>)[]
        : never
    : never
  : never;

/**
 * 관계 레코드에서 심층 관계 타입 추론
 *
 * include() 없이 접근 시 undefined가 되도록 모든 관계를 optional로 설정.
 * 입력 제약 없음(무제약) — 관계가 없는(`{}`) 테이블도 안전하게 빈 객체로 해소된다.
 *
 * @template TRelations - 관계 builder 레코드 타입 (무제약)
 * @template TVisited - 순환 방지를 위한 방문 테이블/뷰명 집합
 */
export type InferDeepRelations<TRelations, TVisited extends string = never> = {
  [K in keyof TRelations]?:
    | ExtractRelationTarget<TRelations[K], TVisited>
    | ExtractRelationTargetResult<TRelations[K], TVisited>;
};
