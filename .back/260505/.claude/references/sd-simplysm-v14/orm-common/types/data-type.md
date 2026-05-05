# `DataType`

> **읽어야 하는 상황**: SQL 데이터 타입과 TypeScript 타입 간의 매핑을 참조하거나, `expr.cast()`에 전달할 대상 타입을 확인할 때.

SQL 데이터 타입 및 TypeScript 타입 매핑 관련 타입/상수 모음.

## `DataType`

SQL 데이터 타입 정의 discriminated union.

```typescript
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
```

| `type` | MySQL | MSSQL | PostgreSQL | TypeScript |
|--------|-------|-------|------------|------------|
| `int` | INT | INT | INTEGER | `number` |
| `bigint` | BIGINT | BIGINT | BIGINT | `number` |
| `float` | FLOAT | REAL | REAL | `number` |
| `double` | DOUBLE | FLOAT | DOUBLE PRECISION | `number` |
| `decimal` | DECIMAL(p,s) | DECIMAL(p,s) | NUMERIC(p,s) | `number` |
| `varchar` | VARCHAR(n) | NVARCHAR(n) | VARCHAR(n) | `string` |
| `char` | CHAR(n) | NCHAR(n) | CHAR(n) | `string` |
| `text` | LONGTEXT | NVARCHAR(MAX) | TEXT | `string` |
| `binary` | LONGBLOB | VARBINARY(MAX) | BYTEA | `Bytes` |
| `boolean` | TINYINT(1) | BIT | BOOLEAN | `boolean` |
| `datetime` | DATETIME | DATETIME2 | TIMESTAMP | `DateTime` |
| `date` | DATE | DATE | DATE | `DateOnly` |
| `time` | TIME | TIME | TIME | `Time` |
| `uuid` | BINARY(16) | UNIQUEIDENTIFIER | UUID | `Uuid` |

## `ColumnPrimitiveMap`

TypeScript 타입 이름(문자열) → 실제 TypeScript 타입 매핑.

```typescript
export type ColumnPrimitiveMap = {
  string: string;
  number: number;
  boolean: boolean;
  DateTime: DateTime;
  DateOnly: DateOnly;
  Time: Time;
  Uuid: Uuid;
  Bytes: Bytes;
};
```

## `ColumnPrimitiveStr`

Column 원시 타입 이름 문자열. `keyof ColumnPrimitiveMap`.

```typescript
export type ColumnPrimitiveStr = keyof ColumnPrimitiveMap;
// "string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes"
```

## `ColumnPrimitive`

Column에 저장 가능한 모든 원시 타입. `undefined`는 NULL을 나타낸다.

```typescript
export type ColumnPrimitive = ColumnPrimitiveMap[ColumnPrimitiveStr] | undefined;
```

## `dataTypeStrToColumnPrimitiveStr`

SQL DataType의 `type` 문자열 → `ColumnPrimitiveStr` 매핑 상수.

```typescript
export const dataTypeStrToColumnPrimitiveStr: {
  int: "number";
  bigint: "number";
  float: "number";
  double: "number";
  decimal: "number";
  varchar: "string";
  char: "string";
  text: "string";
  binary: "Bytes";
  boolean: "boolean";
  datetime: "DateTime";
  date: "DateOnly";
  time: "Time";
  uuid: "Uuid";
};
```

## `InferColumnPrimitiveFromDataType<T>`

`DataType`으로부터 TypeScript 타입을 추론하는 제네릭 타입.

```typescript
export type InferColumnPrimitiveFromDataType<TDataType extends DataType> =
  ColumnPrimitiveMap[(typeof dataTypeStrToColumnPrimitiveStr)[TDataType["type"]]];

// 예시
type IntType = InferColumnPrimitiveFromDataType<{ type: "int" }>;  // number
type VarcharType = InferColumnPrimitiveFromDataType<{ type: "varchar"; length: 100 }>;  // string
```

## `inferColumnPrimitiveStr`

런타임 값에서 `ColumnPrimitiveStr`을 추론하는 함수.

```typescript
export function inferColumnPrimitiveStr(value: ColumnPrimitive): ColumnPrimitiveStr;
```

- `undefined`/`null`이면 에러를 던진다.

## `ColumnMeta`

`ColumnBuilder`에서 생성되어 `TableBuilder`에 전달되는 Column 메타데이터.

```typescript
export interface ColumnMeta {
  type: ColumnPrimitiveStr;
  dataType: DataType;
  autoIncrement?: boolean;
  nullable?: boolean;
  default?: ColumnPrimitive;
  description?: string;
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `type` | `ColumnPrimitiveStr` | TypeScript 타입 이름 |
| `dataType` | `DataType` | SQL 데이터 타입 |
| `autoIncrement` | `boolean \| undefined` | AUTO_INCREMENT 여부 |
| `nullable` | `boolean \| undefined` | NULL 허용 여부 |
| `default` | `ColumnPrimitive \| undefined` | 기본값 |
| `description` | `string \| undefined` | Column 설명 (DDL Comment) |
