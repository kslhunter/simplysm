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
 * Define column type, nullable, autoIncrement, default, and description via Fluent API
 * Used in TableBuilder.columns()
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
 *     createdAt: c.datetime().description("created datetime"),
 *   }));
 * ```
 *
 * @see {@link createColumnFactory} column factory
 * @see {@link TableBuilder} Table builder
 */
export class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  /**
   * @param meta - Column Metadata
   */
  constructor(readonly meta: TMeta) {}

  /**
   * Auto Increment configuration
   *
   * Auto increments on INSERT. Treated as optional in INSERT Type inference
   *
   * @returns new ColumnBuilder instance
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
   * Nullable configuration
   *
   * Allow NULL. Adds undefined to the value type
   *
   * @returns new ColumnBuilder instance
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
   * Default value configuration
   *
   * Used when no value is specified on INSERT. Treated as optional in INSERT Type inference
   *
   * @param value - Default value
   * @returns new ColumnBuilder instance
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
   * column set description
   *
   * @param desc - Column description (used as DDL Comment)
   * @returns new ColumnBuilder instance
   *
   * @example
   * ```typescript
   * createdAt: c.datetime().description("record creation datetime")
   * ```
   */
  description(desc: string): ColumnBuilder<TValue, TMeta & { description: string }> {
    return new ColumnBuilder({ ...this.meta, description: desc });
  }
}

// ============================================
// column factory
// ============================================

/**
 * Column builder factory creation
 *
 * Column type factory used in TableBuilder.columns()
 * Provides builder creation methods for all basic data types
 *
 * @returns Object containing builder creation methods for each Column type
 *
 * @example
 * ```typescript
 * Table("User")
 *   .columns((c) => ({
 *     // Number type
 *     id: c.bigint().autoIncrement(),
 *     count: c.int(),
 *     price: c.decimal(10, 2),
 *
 *     // String type
 *     name: c.varchar(100),
 *     code: c.char(10),
 *     content: c.text(),
 *
 *     // Date/time type
 *     createdAt: c.datetime(),
 *     birthDate: c.date(),
 *     startTime: c.time(),
 *
 *     // Other type
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
     * INT column (4 bytes, -2^31 ~ 2^31-1)
     *
     * @returns ColumnBuilder instance
     */
    int(): ColumnBuilder<number, { type: "number"; dataType: { type: "int" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "int" } });
    },

    /**
     * BIGINT column (8 bytes, -2^63 ~ 2^63-1)
     *
     * @returns ColumnBuilder instance
     */
    bigint(): ColumnBuilder<number, { type: "number"; dataType: { type: "bigint" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "bigint" } });
    },

    /**
     * FLOAT column (4 bytes, single-precision floating point)
     *
     * @returns ColumnBuilder instance
     */
    float(): ColumnBuilder<number, { type: "number"; dataType: { type: "float" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "float" } });
    },

    /**
     * DOUBLE column (8 bytes, double-precision floating point)
     *
     * @returns ColumnBuilder instance
     */
    double(): ColumnBuilder<number, { type: "number"; dataType: { type: "double" } }> {
      return new ColumnBuilder({ type: "number", dataType: { type: "double" } });
    },

    /**
     * DECIMAL column (fixed-point)
     *
     * @param precision - Total number of digits
     * @param scale - Number of digits after the decimal point (optional)
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
     * VARCHAR column (variable-length string)
     *
     * @param length - Maximum length
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
     * CHAR column (fixed-length string)
     *
     * @param length - Fixed length
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
     * TEXT column (large text)
     *
     * @returns ColumnBuilder instance
     */
    text(): ColumnBuilder<string, { type: "string"; dataType: { type: "text" } }> {
      return new ColumnBuilder({ type: "string", dataType: { type: "text" } });
    },

    /**
     * BINARY column (binary data)
     *
     * Per DBMS: MySQL=LONGBLOB, MSSQL=VARBINARY(MAX), PostgreSQL=BYTEA
     *
     * @returns ColumnBuilder instance
     */
    binary(): ColumnBuilder<Bytes, { type: "Bytes"; dataType: { type: "binary" } }> {
      return new ColumnBuilder({ type: "Bytes", dataType: { type: "binary" } });
    },

    /**
     * BOOLEAN column
     *
     * Per DBMS: MySQL=TINYINT(1), MSSQL=BIT, PostgreSQL=BOOLEAN
     *
     * @returns ColumnBuilder instance
     */
    boolean(): ColumnBuilder<boolean, { type: "boolean"; dataType: { type: "boolean" } }> {
      return new ColumnBuilder({ type: "boolean", dataType: { type: "boolean" } });
    },

    /**
     * DATETIME column (date + time)
     *
     * @returns ColumnBuilder instance
     */
    datetime(): ColumnBuilder<DateTime, { type: "DateTime"; dataType: { type: "datetime" } }> {
      return new ColumnBuilder({ type: "DateTime", dataType: { type: "datetime" } });
    },

    /**
     * DATE column (date only)
     *
     * @returns ColumnBuilder instance
     */
    date(): ColumnBuilder<DateOnly, { type: "DateOnly"; dataType: { type: "date" } }> {
      return new ColumnBuilder({ type: "DateOnly", dataType: { type: "date" } });
    },

    /**
     * TIME column (time only)
     *
     * @returns ColumnBuilder instance
     */
    time(): ColumnBuilder<Time, { type: "Time"; dataType: { type: "time" } }> {
      return new ColumnBuilder({ type: "Time", dataType: { type: "time" } });
    },

    /**
     * UUID column
     *
     * Per DBMS: MySQL=BINARY(16), MSSQL=UNIQUEIDENTIFIER, PostgreSQL=UUID
     *
     * @returns ColumnBuilder instance
     */
    uuid(): ColumnBuilder<Uuid, { type: "Uuid"; dataType: { type: "uuid" } }> {
      return new ColumnBuilder({ type: "Uuid", dataType: { type: "uuid" } });
    },
  };
}

// ============================================
// ColumnDefRecord - Column builder record
// ============================================

/**
 * Column builder record type
 *
 * Used as the return type of TableBuilder.columns()
 */
export type ColumnBuilderRecord = Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>;

// ============================================
// Infer - Type inference utilities
// ============================================

/**
 * Infer actual value types from a Column builder record
 *
 * @template T - Column builder record type
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
 * Infer expression input types from a Column builder record
 *
 * @template T - Column builder record type
 */
export type InferColumnExprs<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? ExprInput<V> : never;
};

/**
 * Extract required column keys for INSERT
 *
 * Only columns without autoIncrement, nullable, or default are required
 *
 * @template T - Column builder record type
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
 * Extract optional column keys for INSERT
 *
 * Columns with autoIncrement, nullable, or default are optional
 *
 * @template T - Column builder record type
 */
export type OptionalInsertKeys<TBuilders extends ColumnBuilderRecord> = Exclude<
  keyof TBuilders,
  RequiredInsertKeys<TBuilders>
>;

/**
 * INSERT Type inference
 *
 * Required columns are required, optional columns are Partial
 *
 * @template T - Column builder record type
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
 * UPDATE Type inference
 *
 * All columns are optional
 *
 * @template T - Column builder record type
 */
export type InferUpdateColumns<TBuilders extends ColumnBuilderRecord> = Partial<
  InferColumns<TBuilders>
>;

/**
 * Transform from data record to Column builder record
 *
 * @template TData - data record type
 */
export type DataToColumnBuilderRecord<TData extends DataRecord> = {
  [K in keyof TData as TData[K] extends ColumnPrimitive ? K : never]: ColumnBuilder<
    TData[K] extends ColumnPrimitive ? TData[K] : never,
    any
  >;
};
