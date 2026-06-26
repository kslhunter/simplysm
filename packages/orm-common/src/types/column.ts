import { primitive, type PrimitiveType, type PrimitiveTypeMap, type PrimitiveTypeStr } from "@simplysm/core-common";

// ============================================
// DataType (SQL 타입 정의)
// ============================================

/**
 * SQL 데이터 타입 정의
 *
 * DBMS 매핑:
 * - `int`: INT (4 bytes)
 * - `bigint`: BIGINT (8 bytes)
 * - `float`: FLOAT/REAL (4 bytes)
 * - `double`: DOUBLE/FLOAT (8 bytes)
 * - `decimal`: DECIMAL(precision, scale)
 * - `varchar`: VARCHAR(length)
 * - `char`: CHAR(length)
 * - `text`: TEXT/LONGTEXT
 * - `binary`: LONGBLOB/VARBINARY(MAX)/BYTEA
 * - `boolean`: TINYINT(1)/BIT/BOOLEAN
 * - `datetime`: DATETIME
 * - `date`: DATE
 * - `time`: TIME
 * - `uuid`: BINARY(16)/UNIQUEIDENTIFIER/UUID
 */
export type DataType =
  | { type: "int" }
  | { type: "bigint" }
  | { type: "float" }
  | { type: "double" }
  | { type: "decimal"; precision: number; scale?: number }
  | { type: "varchar"; length: number }
  | { type: "char"; length: number }
  | { type: "text" }
  | { type: "binary" }
  | { type: "boolean" }
  | { type: "datetime" }
  | { type: "date" }
  | { type: "time" }
  | { type: "uuid" };

// ============================================
// ColumnPrimitive (TypeScript 타입)
// ============================================

/**
 * Column 원시 타입 매핑
 */
export type ColumnPrimitiveMap = PrimitiveTypeMap;

/**
 * Column 원시 타입 이름 (문자열)
 */
export type ColumnPrimitiveStr = PrimitiveTypeStr;

/**
 * Column에 저장 가능한 모든 원시 타입
 *
 * undefined는 NULL을 나타냄
 */
export type ColumnPrimitive = PrimitiveType;

// ============================================
// DataType ↔ ColumnPrimitive Mapping
// ============================================

/**
 * SQL DataType → TypeScript 타입 이름 매핑
 */
export const dataTypeStrToColumnPrimitiveStr = {
  int: "number" as const,
  bigint: "number" as const,
  float: "number" as const,
  double: "number" as const,
  decimal: "number" as const,
  varchar: "string" as const,
  char: "string" as const,
  text: "string" as const,
  binary: "Bytes" as const,
  boolean: "boolean" as const,
  datetime: "DateTime" as const,
  date: "DateOnly" as const,
  time: "Time" as const,
  uuid: "Uuid" as const,
};

/**
 * DataType으로부터 TypeScript 타입 추론
 *
 * @template T - DataType
 */
export type InferColumnPrimitiveFromDataType<TDataType extends DataType> =
  ColumnPrimitiveMap[(typeof dataTypeStrToColumnPrimitiveStr)[TDataType["type"]]];

/**
 * 런타임 값에서 ColumnPrimitiveStr 추론
 *
 * @param value - Column 값
 * @returns ColumnPrimitiveStr 타입 이름
 * @throws 값 타입이 알 수 없을 때 ArgumentError
 */
export function inferColumnPrimitiveStr(value: Exclude<ColumnPrimitive, undefined>): ColumnPrimitiveStr {
  return primitive.typeStr(value);
}

// ============================================
// ColumnMeta
// ============================================

/**
 * Column 메타데이터
 *
 * ColumnBuilder에서 생성되어 TableBuilder에 전달됨
 *
 * @property type - TypeScript 타입 이름 (ColumnPrimitiveStr)
 * @property dataType - SQL 데이터 타입
 * @property autoIncrement - 자동 증가 여부
 * @property nullable - NULL 허용 여부
 * @property default - 기본값
 * @property description - Column 설명 (DDL 코멘트)
 *
 * @see {@link ColumnBuilder} Column builder
 */
export interface ColumnMeta {
  type: ColumnPrimitiveStr;
  dataType: DataType;
  autoIncrement?: boolean;
  nullable?: boolean;
  default?: ColumnPrimitive;
  description?: string;
}
