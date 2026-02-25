import type { ColumnMeta } from "@simplysm/orm-common";
import { DateTime, DateOnly } from "@simplysm/core-common";

// columnMetas for bulkInsert basic test (id:int, name:varchar, value:double)
export const bulkColumnMetas: Record<string, ColumnMeta> = {
  id: { type: "number", dataType: { type: "int" } },
  name: { type: "string", dataType: { type: "varchar", length: 100 } },
  value: { type: "number", dataType: { type: "double" } },
};

// Records for bulkInsert basic test
export const bulkRecords = [
  { id: 1, name: "bulk1", value: 1.1 },
  { id: 2, name: "bulk2", value: 2.2 },
  { id: 3, name: "bulk3", value: 3.3 },
];

// columnMetas for various type test (bool, int, double, varchar, datetime, dateonly)
export const typeColumnMetas: Record<string, ColumnMeta> = {
  bool_val: { type: "boolean", dataType: { type: "boolean" } },
  int_val: { type: "number", dataType: { type: "int" } },
  float_val: { type: "number", dataType: { type: "double" } },
  str_val: { type: "string", dataType: { type: "varchar", length: 100 } },
  datetime_val: { type: "DateTime", dataType: { type: "datetime" } },
  date_val: { type: "DateOnly", dataType: { type: "date" } },
};

// Records for various type test
export const typeTestDate = new DateTime(2024, 6, 15, 10, 30, 45);
export const typeTestDateOnly = new DateOnly(2024, 6, 15);

export const typeRecords = [
  {
    bool_val: true,
    int_val: 42,
    float_val: 3.14159,
    str_val: "hello",
    datetime_val: typeTestDate,
    date_val: typeTestDateOnly,
  },
  {
    bool_val: false,
    int_val: -100,
    float_val: -2.5,
    str_val: "world",
    datetime_val: typeTestDate,
    date_val: typeTestDateOnly,
  },
];

// columnMetas for NULL test
export const nullableColumnMetas: Record<string, ColumnMeta> = {
  id: { type: "number", dataType: { type: "int" } },
  name: { type: "string", dataType: { type: "varchar", length: 100 }, nullable: true },
  value: { type: "number", dataType: { type: "int" }, nullable: true },
};

// Records for NULL test
export const nullableRecords = [
  { id: 1, name: "test1", value: 100 },
  { id: 2, name: null, value: 200 },
  { id: 3, name: "test3", value: null },
  { id: 4, name: null, value: null },
];

// columnMetas for UUID and binary test
export const uuidBinaryColumnMetas: Record<string, ColumnMeta> = {
  id: { type: "number", dataType: { type: "int" } },
  uuid_val: { type: "Uuid", dataType: { type: "uuid" } },
  binary_val: { type: "Bytes", dataType: { type: "binary" } },
};
