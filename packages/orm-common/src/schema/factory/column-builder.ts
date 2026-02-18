import type { Bytes, DateOnly, DateTime, Time, Uuid } from "@simplysm/core-common";
import type { ColumnMeta, ColumnPrimitive } from "../../types/column";
import type { ExprInput } from "../../expr/expr-unit";
import type { DataRecord } from "../../types/db";

// ============================================
// ColumnBuilder
// ============================================

/**
 * 컬럼 정의 빌더
 *
 * Fluent API를 통해 컬럼의 타입, nullable, autoIncrement, default, 설명을 정의
 * TableBuilder.columns()에서 사용
 *
 * @template TValue - 컬럼 값 타입
 * @template TMeta - 컬럼 메타데이터 타입
 *
 * @example
 * ```typescript
 * Table("User")
 *   .columns((c) => ({
 *     id: c.bigint().autoIncrement(),           // bigint, auto increment
 *     name: c.varchar(100),                     // varchar(100), required
 *     email: c.varchar(200).nullable(),         // varchar(200), nullable
 *     status: c.varchar(20).default("active"),  // varchar(20), default 값
 *     createdAt: c.datetime().description("생성일시"),
 *   }));
 * ```
 *
 * @see {@link createColumnFactory} 컬럼 팩토리
 * @see {@link TableBuilder} 테이블 빌더
 */
export class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  /**
   * @param meta - 컬럼 메타데이터
   */
  constructor(readonly meta: TMeta) {}

  /**
   * Auto Increment 설정
   *
   * INSERT 시 자동 증가. INSERT용 타입 추론에서 optional로 처리
   *
   * @returns 새 ColumnBuilder 인스턴스
   *
   * @example
   * ```typescript
   * id: c.bigint().autoIncrement()
   * ```
   */
  autoIncrement(): ColumnBuilder<TValue, Omit<TMeta, "autoIncrement"> & { autoIncrement: true }> {
    return new ColumnBuilder({ ...this.meta, autoIncrement: true });
  }

  /**
   * Nullable 설정
   *
   * NULL 허용. 값 타입에 undefined 추가
   *
   * @returns 새 ColumnBuilder 인스턴스
   *
   * @example
   * ```typescript
   * email: c.varchar(200).nullable()  // string | undefined
   * ```
   */
  nullable(): ColumnBuilder<TValue | undefined, Omit<TMeta, "nullable"> & { nullable: true }> {
    return new ColumnBuilder({ ...this.meta, nullable: true });
  }

  /**
   * 기본값 설정
   *
   * INSERT 시 값 미지정 시 사용. INSERT용 타입 추론에서 optional로 처리
   *
   * @param value - 기본값
   * @returns 새 ColumnBuilder 인스턴스
   *
   * @example
   * ```typescript
   * status: c.varchar(20).default("active")
   * createdAt: c.datetime().default("CURRENT_TIMESTAMP")
   * ```
   */
  default(
    value: TValue,
  ): ColumnBuilder<TValue, Omit<TMeta, "default"> & { default: typeof value }> {
    return new ColumnBuilder({ ...this.meta, default: value });
  }

  /**
   * 컬럼 설명 설정
   *
   * @param desc - 컬럼 설명 (DDL 주석으로 사용)
   * @returns 새 ColumnBuilder 인스턴스
   *
   * @example
   * ```typescript
   * createdAt: c.datetime().description("레코드 생성 일시")
   * ```
   */
  description(desc: string): ColumnBuilder<TValue, TMeta & { description: string }> {
    return new ColumnBuilder({ ...this.meta, description: desc });
  }
}

// ============================================
// 컬럼 팩토리
// ============================================

/**
 * 컬럼 빌더 팩토리 생성
 *
 * TableBuilder.columns()에서 사용하는 컬럼 타입 팩토리
 * 모든 기본 데이터 타입에 대한 빌더 생성 메서드 제공
 *
 * @returns 컬럼 타입별 빌더 생성 메서드를 포함한 객체
 *
 * @example
 * ```typescript
 * Table("User")
 *   .columns((c) => ({
 *     // 숫자 타입
 *     id: c.bigint().autoIncrement(),
 *     count: c.int(),
 *     price: c.decimal(10, 2),
 *
 *     // 문자열 타입
 *     name: c.varchar(100),
 *     code: c.char(10),
 *     content: c.text(),
 *
 *     // 날짜/시간 타입
 *     createdAt: c.datetime(),
 *     birthDate: c.date(),
 *     startTime: c.time(),
 *
 *     // 기타 타입
 *     isActive: c.boolean(),
 *     data: c.binary(),
 *     uuid: c.uuid(),
 *   }));
 * ```
 *
 * @see {@link ColumnBuilder} 컬럼 빌더 클래스
 */
export function createColumnFactory() {
  return {
    /**
     * INT 컬럼 (4 bytes, -2^31 ~ 2^31-1)
     *
     * @returns ColumnBuilder 인스턴스
     */
    int(): ColumnBuilder<number, { type: "number"; dataType: { type: "int" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "int" } });
    },

    /**
     * BIGINT 컬럼 (8 bytes, -2^63 ~ 2^63-1)
     *
     * @returns ColumnBuilder 인스턴스
     */
    bigint(): ColumnBuilder<number, { type: "number"; dataType: { type: "bigint" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "bigint" } });
    },

    /**
     * FLOAT 컬럼 (4 bytes, 단정밀도 부동소수점)
     *
     * @returns ColumnBuilder 인스턴스
     */
    float(): ColumnBuilder<number, { type: "number"; dataType: { type: "float" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "float" } });
    },

    /**
     * DOUBLE 컬럼 (8 bytes, 배정밀도 부동소수점)
     *
     * @returns ColumnBuilder 인스턴스
     */
    double(): ColumnBuilder<number, { type: "number"; dataType: { type: "double" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "double" } });
    },

    /**
     * DECIMAL 컬럼 (고정 소수점)
     *
     * @param precision - 전체 자릿수
     * @param scale - 소수점 이하 자릿수 (선택)
     * @returns ColumnBuilder 인스턴스
     *
     * @example
     * ```typescript
     * price: c.decimal(10, 2)  // DECIMAL(10, 2)
     * ```
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
     * VARCHAR 컬럼 (가변 길이 문자열)
     *
     * @param length - 최대 길이
     * @returns ColumnBuilder 인스턴스
     *
     * @example
     * ```typescript
     * name: c.varchar(100)  // VARCHAR(100)
     * ```
     */
    varchar(
      length: number,
    ): ColumnBuilder<string, { type: "string"; dataType: { type: "varchar"; length: number } }> {
      return new ColumnBuilder({ type: "string", dataType: { type: "varchar", length } });
    },

    /**
     * CHAR 컬럼 (고정 길이 문자열)
     *
     * @param length - 고정 길이
     * @returns ColumnBuilder 인스턴스
     *
     * @example
     * ```typescript
     * countryCode: c.char(2)  // CHAR(2)
     * ```
     */
    char(
      length: number,
    ): ColumnBuilder<string, { type: "string"; dataType: { type: "char"; length: number } }> {
      return new ColumnBuilder({ type: "string", dataType: { type: "char" as const, length } });
    },

    /**
     * TEXT 컬럼 (대용량 문자열)
     *
     * @returns ColumnBuilder 인스턴스
     */
    text(): ColumnBuilder<string, { type: "string"; dataType: { type: "text" } }> {
      return new ColumnBuilder({ type: "string", dataType: { type: "text" } });
    },

    /**
     * BINARY 컬럼 (바이너리 데이터)
     *
     * DBMS별: MySQL=LONGBLOB, MSSQL=VARBINARY(MAX), PostgreSQL=BYTEA
     *
     * @returns ColumnBuilder 인스턴스
     */
    binary(): ColumnBuilder<Bytes, { type: "Bytes"; dataType: { type: "binary" } }> {
      return new ColumnBuilder({ type: "Bytes", dataType: { type: "binary" } });
    },

    /**
     * BOOLEAN 컬럼
     *
     * DBMS별: MySQL=TINYINT(1), MSSQL=BIT, PostgreSQL=BOOLEAN
     *
     * @returns ColumnBuilder 인스턴스
     */
    boolean(): ColumnBuilder<boolean, { type: "boolean"; dataType: { type: "boolean" } }> {
      return new ColumnBuilder({ type: "boolean", dataType: { type: "boolean" } });
    },

    /**
     * DATETIME 컬럼 (날짜 + 시간)
     *
     * @returns ColumnBuilder 인스턴스
     */
    datetime(): ColumnBuilder<DateTime, { type: "DateTime"; dataType: { type: "datetime" } }> {
      return new ColumnBuilder({ type: "DateTime", dataType: { type: "datetime" } });
    },

    /**
     * DATE 컬럼 (날짜만)
     *
     * @returns ColumnBuilder 인스턴스
     */
    date(): ColumnBuilder<DateOnly, { type: "DateOnly"; dataType: { type: "date" } }> {
      return new ColumnBuilder({ type: "DateOnly", dataType: { type: "date" } });
    },

    /**
     * TIME 컬럼 (시간만)
     *
     * @returns ColumnBuilder 인스턴스
     */
    time(): ColumnBuilder<Time, { type: "Time"; dataType: { type: "time" } }> {
      return new ColumnBuilder({ type: "Time", dataType: { type: "time" } });
    },

    /**
     * UUID 컬럼
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
// ColumnDefRecord - 컬럼 빌더 레코드
// ============================================

/**
 * 컬럼 빌더 레코드 타입
 *
 * TableBuilder.columns()의 반환 타입으로 사용
 */
export type ColumnBuilderRecord = Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>;

// ============================================
// Infer - 타입 추론 유틸리티
// ============================================

/**
 * 컬럼 빌더 레코드에서 실제 값 타입 추론
 *
 * @template T - 컬럼 빌더 레코드 타입
 *
 * @example
 * ```typescript
 * type UserColumns = InferColumns<typeof User.$columns>;
 * // { id: number; name: string; email: string | undefined; }
 * ```
 */
export type InferColumns<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? V : never;
};

/**
 * 컬럼 빌더 레코드에서 표현식 입력 타입 추론
 *
 * @template T - 컬럼 빌더 레코드 타입
 */
export type InferColumnExprs<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? ExprInput<V> : never;
};

/**
 * INSERT 시 필수 컬럼 키 추출
 *
 * autoIncrement, nullable, default가 없는 컬럼만 필수
 *
 * @template T - 컬럼 빌더 레코드 타입
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
 * INSERT 시 선택적 컬럼 키 추출
 *
 * autoIncrement, nullable, default가 있는 컬럼은 optional
 *
 * @template T - 컬럼 빌더 레코드 타입
 */
export type OptionalInsertKeys<TBuilders extends ColumnBuilderRecord> = Exclude<
  keyof TBuilders,
  RequiredInsertKeys<TBuilders>
>;

/**
 * INSERT용 타입 추론
 *
 * 필수 컬럼은 required, optional 컬럼은 Partial
 *
 * @template T - 컬럼 빌더 레코드 타입
 *
 * @example
 * ```typescript
 * type UserInsert = InferInsertColumns<typeof User.$columns>;
 * // { name: string; } & { id?: number; email?: string; status?: string; }
 * ```
 */
export type InferInsertColumns<TBuilders extends ColumnBuilderRecord> = Pick<
  InferColumns<TBuilders>,
  RequiredInsertKeys<TBuilders>
> &
  Partial<Pick<InferColumns<TBuilders>, OptionalInsertKeys<TBuilders>>>;

/**
 * UPDATE용 타입 추론
 *
 * 모든 컬럼이 optional
 *
 * @template T - 컬럼 빌더 레코드 타입
 */
export type InferUpdateColumns<TBuilders extends ColumnBuilderRecord> = Partial<
  InferColumns<TBuilders>
>;

/**
 * 데이터 레코드에서 컬럼 빌더 레코드로 변환
 *
 * @template TData - 데이터 레코드 타입
 */
export type DataToColumnBuilderRecord<TData extends DataRecord> = {
  [K in keyof TData as TData[K] extends ColumnPrimitive ? K : never]: ColumnBuilder<
    TData[K] extends ColumnPrimitive ? TData[K] : never,
    any
  >;
};
