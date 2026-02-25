import type { Bytes, DateOnly, DateTime, Time, Uuid } from "@simplysm/core-common";
import type { ColumnMeta, ColumnPrimitive } from "../../types/column";
import type { ExprInput } from "../../expr/expr-unit";
import type { DataRecord } from "../../types/db";

// ============================================
// ColumnBuilder
// ============================================

/**
 * Column definition builder
 *
 * Fluent API를 통해 컬럼의 type, nullable, autoIncrement, default, 설명을 definition
 * TableBuilder.columns()에서 사용
 *
 * @template TValue - Column value type
 * @template TMeta - Column Metadata type
 *
 * @example
 * ```typescript
 * Table("User")
 *   .columns((c) => ({
 *     id: c.bigint().autoIncrement(),           // bigint, auto increment
 *     name: c.varchar(100),                     // varchar(100), required
 *     email: c.varchar(200).nullable(),         // varchar(200), nullable
 *     status: c.varchar(20).default("active"),  // varchar(20), default value
 *     createdAt: c.datetime().description("생성일시"),
 *   }));
 * ```
 *
 * @see {@link createColumnFactory} 컬럼 팩토리
 * @see {@link TableBuilder} Table builder
 */
export class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  /**
   * @param meta - Column Metadata
   */
  constructor(readonly meta: TMeta) {}

  /**
   * Auto Increment 설정
   *
   * INSERT 시 Auto increment. INSERT용 Type inference에서 optional로 처리
   *
   * @returns 새 ColumnBuilder instance
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
   * Allow NULL. value 타입에 undefined Add
   *
   * @returns 새 ColumnBuilder instance
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
   * Default value 설정
   *
   * INSERT 시 value 미지정 시 사용. INSERT용 Type inference에서 optional로 처리
   *
   * @param value - Default value
   * @returns 새 ColumnBuilder instance
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
   * @param desc - Column 설명 (DDL Comment으로 사용)
   * @returns 새 ColumnBuilder instance
   *
   * @example
   * ```typescript
   * createdAt: c.datetime().description("레코드 Generate 일시")
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
 * Column builder 팩토리 Generate
 *
 * TableBuilder.columns()에서 사용하는 Column type 팩토리
 * 모든 기본 data type에 대한 builder Generate method 제공
 *
 * @returns Column type별 builder Generate 메서드를 포함한 object
 *
 * @example
 * ```typescript
 * Table("User")
 *   .columns((c) => ({
 *     // 숫자 type
 *     id: c.bigint().autoIncrement(),
 *     count: c.int(),
 *     price: c.decimal(10, 2),
 *
 *     // 문자열 type
 *     name: c.varchar(100),
 *     code: c.char(10),
 *     content: c.text(),
 *
 *     // 날짜/시간 type
 *     createdAt: c.datetime(),
 *     birthDate: c.date(),
 *     startTime: c.time(),
 *
 *     // 기타 type
 *     isActive: c.boolean(),
 *     data: c.binary(),
 *     uuid: c.uuid(),
 *   }));
 * ```
 *
 * @see {@link ColumnBuilder} Column builder class
 */
export function createColumnFactory() {
  return {
    /**
     * INT 컬럼 (4 bytes, -2^31 ~ 2^31-1)
     *
     * @returns ColumnBuilder instance
     */
    int(): ColumnBuilder<number, { type: "number"; dataType: { type: "int" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "int" } });
    },

    /**
     * BIGINT 컬럼 (8 bytes, -2^63 ~ 2^63-1)
     *
     * @returns ColumnBuilder instance
     */
    bigint(): ColumnBuilder<number, { type: "number"; dataType: { type: "bigint" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "bigint" } });
    },

    /**
     * FLOAT 컬럼 (4 bytes, 단정밀도 부동소수점)
     *
     * @returns ColumnBuilder instance
     */
    float(): ColumnBuilder<number, { type: "number"; dataType: { type: "float" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "float" } });
    },

    /**
     * DOUBLE 컬럼 (8 bytes, 배정밀도 부동소수점)
     *
     * @returns ColumnBuilder instance
     */
    double(): ColumnBuilder<number, { type: "number"; dataType: { type: "double" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "double" } });
    },

    /**
     * DECIMAL 컬럼 (고정 소수점)
     *
     * @param precision - 전체 자릿수
     * @param scale - 소수점 이하 자릿수 (Select)
     * @returns ColumnBuilder instance
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
     * @returns ColumnBuilder instance
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
     * @returns ColumnBuilder instance
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
     * @returns ColumnBuilder instance
     */
    text(): ColumnBuilder<string, { type: "string"; dataType: { type: "text" } }> {
      return new ColumnBuilder({ type: "string", dataType: { type: "text" } });
    },

    /**
     * BINARY 컬럼 (바이너리 data)
     *
     * DBMS별: MySQL=LONGBLOB, MSSQL=VARBINARY(MAX), PostgreSQL=BYTEA
     *
     * @returns ColumnBuilder instance
     */
    binary(): ColumnBuilder<Bytes, { type: "Bytes"; dataType: { type: "binary" } }> {
      return new ColumnBuilder({ type: "Bytes", dataType: { type: "binary" } });
    },

    /**
     * BOOLEAN 컬럼
     *
     * DBMS별: MySQL=TINYINT(1), MSSQL=BIT, PostgreSQL=BOOLEAN
     *
     * @returns ColumnBuilder instance
     */
    boolean(): ColumnBuilder<boolean, { type: "boolean"; dataType: { type: "boolean" } }> {
      return new ColumnBuilder({ type: "boolean", dataType: { type: "boolean" } });
    },

    /**
     * DATETIME 컬럼 (날짜 + 시간)
     *
     * @returns ColumnBuilder instance
     */
    datetime(): ColumnBuilder<DateTime, { type: "DateTime"; dataType: { type: "datetime" } }> {
      return new ColumnBuilder({ type: "DateTime", dataType: { type: "datetime" } });
    },

    /**
     * DATE 컬럼 (날짜만)
     *
     * @returns ColumnBuilder instance
     */
    date(): ColumnBuilder<DateOnly, { type: "DateOnly"; dataType: { type: "date" } }> {
      return new ColumnBuilder({ type: "DateOnly", dataType: { type: "date" } });
    },

    /**
     * TIME 컬럼 (시간만)
     *
     * @returns ColumnBuilder instance
     */
    time(): ColumnBuilder<Time, { type: "Time"; dataType: { type: "time" } }> {
      return new ColumnBuilder({ type: "Time", dataType: { type: "time" } });
    },

    /**
     * UUID 컬럼
     *
     * DBMS별: MySQL=BINARY(16), MSSQL=UNIQUEIDENTIFIER, PostgreSQL=UUID
     *
     * @returns ColumnBuilder instance
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
 * Column builder 레코드 type
 *
 * TableBuilder.columns()의 return 타입으로 사용
 */
export type ColumnBuilderRecord = Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>;

// ============================================
// Infer - Type inference 유틸리티
// ============================================

/**
 * Column builder 레코드에서 실제 value Type inference
 *
 * @template T - Column builder 레코드 type
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
 * Column builder 레코드에서 expression 입력 Type inference
 *
 * @template T - Column builder 레코드 type
 */
export type InferColumnExprs<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? ExprInput<V> : never;
};

/**
 * INSERT 시 required 컬럼 key 추출
 *
 * autoIncrement, nullable, default가 없는 컬럼만 required
 *
 * @template T - Column builder 레코드 type
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
 * INSERT 시 optional 컬럼 key 추출
 *
 * autoIncrement, nullable, default가 있는 컬럼은 optional
 *
 * @template T - Column builder 레코드 type
 */
export type OptionalInsertKeys<TBuilders extends ColumnBuilderRecord> = Exclude<
  keyof TBuilders,
  RequiredInsertKeys<TBuilders>
>;

/**
 * INSERT용 Type inference
 *
 * required 컬럼은 required, optional 컬럼은 Partial
 *
 * @template T - Column builder 레코드 type
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
 * UPDATE용 Type inference
 *
 * 모든 컬럼이 optional
 *
 * @template T - Column builder 레코드 type
 */
export type InferUpdateColumns<TBuilders extends ColumnBuilderRecord> = Partial<
  InferColumns<TBuilders>
>;

/**
 * data 레코드에서 Column builder 레코드로 Transform
 *
 * @template TData - data 레코드 type
 */
export type DataToColumnBuilderRecord<TData extends DataRecord> = {
  [K in keyof TData as TData[K] extends ColumnPrimitive ? K : never]: ColumnBuilder<
    TData[K] extends ColumnPrimitive ? TData[K] : never,
    any
  >;
};
