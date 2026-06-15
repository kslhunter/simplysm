import type { Bytes, DateOnly, DateTime, Time, Uuid } from "@simplysm/core-common";
import type { ColumnMeta, ColumnPrimitive } from "../../types/column";
import type { ExprInput } from "../../expr/expr-unit";
import type { DataRecord } from "../../types/db";

// ============================================
// ColumnBuilder
// ============================================

/**
 * Column 정의 builder
 *
 * Fluent API로 column 타입, nullable, autoIncrement, default, description을 정의
 * TableBuilder.columns()에서 사용
 *
 * @template TValue - Column 값 타입
 * @template TMeta - Column 메타데이터 타입
 *
 * @see {@link createColumnFactory} column factory
 * @see {@link TableBuilder} Table builder
 */
export class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  /**
   * @param meta - Column 메타데이터
   */
  constructor(readonly meta: TMeta) {}

  /**
   * Auto Increment 설정
   *
   * INSERT 시 자동 증가. INSERT 타입 추론에서 선택적(optional)으로 처리됨
   *
   * @returns 새 ColumnBuilder 인스턴스
   */
  autoIncrement(): ColumnBuilder<TValue, Omit<TMeta, "autoIncrement"> & { autoIncrement: true }> {
    return new ColumnBuilder({ ...this.meta, autoIncrement: true });
  }

  /**
   * Nullable 설정
   *
   * NULL 허용. 값 타입에 undefined가 추가됨
   *
   * @returns 새 ColumnBuilder 인스턴스
   */
  nullable(): ColumnBuilder<TValue | undefined, Omit<TMeta, "nullable"> & { nullable: true }> {
    return new ColumnBuilder({ ...this.meta, nullable: true });
  }

  /**
   * 기본값 설정
   *
   * INSERT 시 값이 지정되지 않으면 사용됨. INSERT 타입 추론에서 선택적(optional)으로 처리됨
   *
   * @param value - 기본값
   * @returns 새 ColumnBuilder 인스턴스
   */
  default(
    value: TValue,
  ): ColumnBuilder<TValue, Omit<TMeta, "default"> & { default: typeof value }> {
    return new ColumnBuilder({ ...this.meta, default: value });
  }

  /**
   * Column 설명 설정
   *
   * @param desc - Column 설명 (DDL Comment로 사용됨)
   * @returns 새 ColumnBuilder 인스턴스
   */
  description(desc: string): ColumnBuilder<TValue, TMeta & { description: string }> {
    return new ColumnBuilder({ ...this.meta, description: desc });
  }
}

// ============================================
// column factory
// ============================================

/**
 * Column builder factory 생성
 *
 * TableBuilder.columns()에서 사용하는 column 타입 factory
 * 모든 기본 데이터 타입에 대한 builder 생성 메서드를 제공
 *
 * @returns 각 Column 타입별 builder 생성 메서드를 포함하는 객체
 *
 * @see {@link ColumnBuilder} Column builder 클래스
 */
export function createColumnFactory() {
  return {
    /**
     * INT column (4바이트, -2^31 ~ 2^31-1)
     *
     * @returns ColumnBuilder 인스턴스
     */
    int(): ColumnBuilder<number, { type: "number"; dataType: { type: "int" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "int" } });
    },

    /**
     * BIGINT column (8바이트, -2^63 ~ 2^63-1)
     *
     * @returns ColumnBuilder 인스턴스
     */
    bigint(): ColumnBuilder<number, { type: "number"; dataType: { type: "bigint" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "bigint" } });
    },

    /**
     * FLOAT column (4바이트, 단정밀도 부동소수점)
     *
     * @returns ColumnBuilder 인스턴스
     */
    float(): ColumnBuilder<number, { type: "number"; dataType: { type: "float" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "float" } });
    },

    /**
     * DOUBLE column (8바이트, 배정밀도 부동소수점)
     *
     * @returns ColumnBuilder 인스턴스
     */
    double(): ColumnBuilder<number, { type: "number"; dataType: { type: "double" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "double" } });
    },

    /**
     * DECIMAL column (고정 소수점)
     *
     * @param precision - 전체 자릿수
     * @param scale - 소수점 이하 자릿수 (선택)
     * @returns ColumnBuilder 인스턴스
     */
    decimal(
      precision: number,
      scale?: number,
    ): ColumnBuilder<
      number,
      { type: "number"; dataType: { type: "decimal"; precision: number; scale?: number } }
    > {
      return new ColumnBuilder({ type: "number", dataType: { type: "decimal", precision, scale } });
    },

    /**
     * VARCHAR column (가변 길이 문자열)
     *
     * @param length - 최대 길이
     * @returns ColumnBuilder 인스턴스
     */
    varchar(
      length: number,
    ): ColumnBuilder<string, { type: "string"; dataType: { type: "varchar"; length: number } }> {
      return new ColumnBuilder({ type: "string", dataType: { type: "varchar", length } });
    },

    /**
     * CHAR column (고정 길이 문자열)
     *
     * @param length - 고정 길이
     * @returns ColumnBuilder 인스턴스
     */
    char(
      length: number,
    ): ColumnBuilder<string, { type: "string"; dataType: { type: "char"; length: number } }> {
      return new ColumnBuilder({ type: "string", dataType: { type: "char" as const, length } });
    },

    /**
     * TEXT column (대용량 텍스트)
     *
     * @returns ColumnBuilder 인스턴스
     */
    text(): ColumnBuilder<string, { type: "string"; dataType: { type: "text" } }> {
      return new ColumnBuilder({ type: "string", dataType: { type: "text" } });
    },

    /**
     * BINARY column (바이너리 데이터)
     *
     * DBMS별: MySQL=LONGBLOB, MSSQL=VARBINARY(MAX), PostgreSQL=BYTEA
     *
     * @returns ColumnBuilder 인스턴스
     */
    binary(): ColumnBuilder<Bytes, { type: "Bytes"; dataType: { type: "binary" } }> {
      return new ColumnBuilder({ type: "Bytes", dataType: { type: "binary" } });
    },

    /**
     * BOOLEAN column
     *
     * DBMS별: MySQL=TINYINT(1), MSSQL=BIT, PostgreSQL=BOOLEAN
     *
     * @returns ColumnBuilder 인스턴스
     */
    boolean(): ColumnBuilder<boolean, { type: "boolean"; dataType: { type: "boolean" } }> {
      return new ColumnBuilder({ type: "boolean", dataType: { type: "boolean" } });
    },

    /**
     * DATETIME column (날짜 + 시간)
     *
     * @returns ColumnBuilder 인스턴스
     */
    datetime(): ColumnBuilder<DateTime, { type: "DateTime"; dataType: { type: "datetime" } }> {
      return new ColumnBuilder({ type: "DateTime", dataType: { type: "datetime" } });
    },

    /**
     * DATE column (날짜만)
     *
     * @returns ColumnBuilder 인스턴스
     */
    date(): ColumnBuilder<DateOnly, { type: "DateOnly"; dataType: { type: "date" } }> {
      return new ColumnBuilder({ type: "DateOnly", dataType: { type: "date" } });
    },

    /**
     * TIME column (시간만)
     *
     * @returns ColumnBuilder 인스턴스
     */
    time(): ColumnBuilder<Time, { type: "Time"; dataType: { type: "time" } }> {
      return new ColumnBuilder({ type: "Time", dataType: { type: "time" } });
    },

    /**
     * UUID column
     *
     * DBMS별: MySQL=BINARY(16), MSSQL=UNIQUEIDENTIFIER, PostgreSQL=UUID
     *
     * @returns ColumnBuilder 인스턴스
     */
    uuid(): ColumnBuilder<Uuid, { type: "Uuid"; dataType: { type: "uuid" } }> {
      return new ColumnBuilder({ type: "Uuid", dataType: { type: "uuid" } });
    },
  };
}

// ============================================
// ColumnDefRecord - Column builder 레코드
// ============================================

/**
 * Column builder 레코드 타입
 *
 * TableBuilder.columns()의 반환 타입으로 사용됨
 */
export type ColumnBuilderRecord = Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>;

// ============================================
// Infer - 타입 추론 유틸리티
// ============================================

/**
 * Column builder 레코드에서 실제 값 타입을 추론
 *
 * @template T - Column builder 레코드 타입
 */
export type InferColumns<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? V : never;
};

/**
 * Column builder 레코드에서 expression 입력 타입을 추론
 *
 * @template T - Column builder 레코드 타입
 */
export type InferColumnExprs<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? ExprInput<V> : never;
};

/**
 * INSERT용 필수 column key 추출
 *
 * autoIncrement, nullable, default가 없는 column만 필수
 *
 * @template T - Column builder 레코드 타입
 */
export type RequiredInsertKeys<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K]["meta"] extends infer M extends ColumnMeta
    ? M["autoIncrement"] extends true
      ? never
      : M["nullable"] extends true
        ? never
        : M["default"] extends undefined
          ? K
          : never
    : never;
}[keyof TBuilders];

/**
 * INSERT용 선택적 column key 추출
 *
 * autoIncrement, nullable, default가 있는 column은 선택적(optional)
 *
 * @template T - Column builder 레코드 타입
 */
export type OptionalInsertKeys<TBuilders extends ColumnBuilderRecord> = Exclude<
  keyof TBuilders,
  RequiredInsertKeys<TBuilders>
>;

/**
 * INSERT 타입 추론
 *
 * 필수 column은 필수, 선택적 column은 Partial
 *
 * @template T - Column builder 레코드 타입
 */
export type InferInsertColumns<TBuilders extends ColumnBuilderRecord> = Pick<
  InferColumns<TBuilders>,
  RequiredInsertKeys<TBuilders>
> &
  Partial<Pick<InferColumns<TBuilders>, OptionalInsertKeys<TBuilders>>>;

/**
 * UPDATE 타입 추론
 *
 * 모든 column이 선택적(optional)
 *
 * @template T - Column builder 레코드 타입
 */
export type InferUpdateColumns<TBuilders extends ColumnBuilderRecord> = Partial<
  InferColumns<TBuilders>
>;

/**
 * 데이터 레코드에서 Column builder 레코드로 변환
 *
 * @template TData - 데이터 레코드 타입
 */
export type DataToColumnBuilderRecord<TData extends DataRecord> = {
  [K in keyof TData as TData[K] extends ColumnPrimitive ? K : never]: ColumnBuilder<
    TData[K] extends ColumnPrimitive ? TData[K] : never,
    any
  >;
};
