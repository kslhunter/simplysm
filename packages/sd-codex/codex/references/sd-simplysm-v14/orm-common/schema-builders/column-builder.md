# `ColumnBuilder`

> **읽어야 하는 상황**: 컬럼의 데이터 타입, nullable, autoIncrement, default를 설정할 때. `Table().columns()` 및 `Procedure().params()`/`returns()` 콜백 내에서 팩토리 함수(`c.bigint()`, `c.varchar(100)` 등)를 통해 생성된다.

Column 타입, nullable, autoIncrement, default, description을 정의하는 빌더. `TableBuilder.columns()` 및 `ProcedureBuilder.params()`/`returns()` 콜백에서 `createColumnFactory()`가 반환하는 팩토리 객체를 통해 생성된다.

```typescript
export class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  constructor(readonly meta: TMeta);
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `meta` | property | `TMeta` | Column 메타데이터 |
| `autoIncrement()` | method | `ColumnBuilder<TValue, ...>` | AUTO_INCREMENT 설정. INSERT 타입에서 optional |
| `nullable()` | method | `ColumnBuilder<TValue \| undefined, ...>` | NULL 허용. 값 타입에 `undefined` 추가 |
| `default(value)` | method | `ColumnBuilder<TValue, ...>` | 기본값 설정. INSERT 타입에서 optional |
| `description(desc)` | method | `ColumnBuilder<TValue, ...>` | Column 설명 (DDL Comment) |

## Related Types

### `createColumnFactory`

`TableBuilder.columns()`, `ProcedureBuilder.params()`/`returns()` 콜백에서 자동으로 제공되는 팩토리.

```typescript
export function createColumnFactory(): { ... };
```

#### 지원 Column 타입

| 메서드 | SQL 타입 | TypeScript 타입 | 비고 |
|--------|----------|-----------------|------|
| `int()` | INT | `number` | 4바이트 |
| `bigint()` | BIGINT | `number` | 8바이트 |
| `float()` | FLOAT | `number` | 4바이트 단정밀도 |
| `double()` | DOUBLE | `number` | 8바이트 배정밀도 |
| `decimal(precision, scale?)` | DECIMAL(p,s) | `number` | 고정 소수점 |
| `varchar(length)` | VARCHAR(n) | `string` | 가변 길이 |
| `char(length)` | CHAR(n) | `string` | 고정 길이 |
| `text()` | TEXT/LONGTEXT | `string` | 대용량 |
| `binary()` | LONGBLOB/VARBINARY(MAX)/BYTEA | `Bytes` | 바이너리 |
| `boolean()` | TINYINT(1)/BIT/BOOLEAN | `boolean` | DBMS별 다름 |
| `datetime()` | DATETIME | `DateTime` | |
| `date()` | DATE | `DateOnly` | |
| `time()` | TIME | `Time` | |
| `uuid()` | BINARY(16)/UNIQUEIDENTIFIER/UUID | `Uuid` | |

## Usage

```typescript
Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),          // bigint, AUTO_INCREMENT, INSERT optional
    name: c.varchar(100),                    // varchar(100), 필수
    email: c.varchar(200).nullable(),        // varchar(200), NULL 허용
    status: c.varchar(20).default("active"), // varchar(20), 기본값 "active", INSERT optional
    createdAt: c.datetime().description("생성일시"),
    price: c.decimal(10, 2),
    data: c.binary(),
  }));
```
