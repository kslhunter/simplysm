import { DateOnly, DateTime, Time, Uuid } from "@simplysm/sd-core-common";

// ============================================
// 컬럼 타입 맵 (단일 소스)
// ============================================

export type ColumnPrimitiveMap = {
  string: string;
  number: number;
  bigint: bigint;
  boolean: boolean;
  datetime: DateTime;
  dateonly: DateOnly;
  time: Time;
  uuid: Uuid;
  buffer: Buffer;
};

// ============================================
// 파생 타입들
// ============================================

export type ColumnPrimitiveStr = keyof ColumnPrimitiveMap;
export type ColumnPrimitive = ColumnPrimitiveMap[ColumnPrimitiveStr] | undefined;
export type InferColumnPrimitive<T extends ColumnPrimitiveStr> = ColumnPrimitiveMap[T];

// ============================================
// DataRecord - 결과 데이터 타입 (재귀적, 중첩 허용)
// ============================================

export type DataRecord = {
  [key: string]: ColumnPrimitive | DataRecord | DataRecord[];
};

// ============================================
// TDialect - DB종류
// ============================================

export type TDialect = "mysql" | "mssql" | "postgresql";

// ============================================
// 타입 매핑 (dataType → 런타임 Type)
// ============================================

export type TDataType =
  | { type: "int" }
  | { type: "bigint" }
  | { type: "float" }
  | { type: "double" }
  | { type: "decimal"; precision: number; scale?: number }
  | { type: "varchar"; length: number }
  | { type: "char"; length: number }
  | { type: "text" }
  | { type: "binary"; length?: number }
  | { type: "boolean" }
  | { type: "datetime" }
  | { type: "date" }
  | { type: "time" }
  | { type: "uuid" };

// ============================================
// IColumnMeta - 컬럼 메타 인터페이스
// ============================================

export interface IColumnMeta {
  type: ColumnPrimitiveStr;
  dataType: TDataType;
  primaryKeyIndex?: number;
  autoIncrement?: boolean;
  nullable?: boolean;
  defaultValue?: ColumnPrimitive;
  description?: string;
}
