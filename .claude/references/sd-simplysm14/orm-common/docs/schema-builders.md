# Schema Builders

## `Table`

TableBuilder 팩토리 함수.

```typescript
export function Table(name: string): TableBuilder<never, never>;
```

## `TableBuilder`

Fluent API로 테이블 스키마를 정의하는 빌더. 메서드 체인마다 새 인스턴스를 반환한다 (불변).

```typescript
export class TableBuilder<TColumns extends ColumnBuilderRecord, TRelations extends RelationBuilderRecord> {
  readonly $columns!: TColumns;
  readonly $relations!: TRelations;
  readonly $inferSelect!: InferColumns<TColumns> & InferDeepRelations<TRelations>;
  readonly $inferColumns!: InferColumns<TColumns>;
  readonly $inferInsert!: InferInsertColumns<TColumns>;
  readonly $inferUpdate!: InferUpdateColumns<TColumns>;

  constructor(readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    columns?: TColumns;
    primaryKey?: (keyof TColumns & string)[];
    relations?: TRelations;
    indexes?: IndexBuilder<(keyof TColumns & string)[]>[];
  });

  description(desc: string): TableBuilder;
  database(db: string): TableBuilder;
  schema(schema: string): TableBuilder;
  columns<TNewColumnDefs>(fn: (c: ReturnType<typeof createColumnFactory>) => TNewColumnDefs): TableBuilder<TNewColumnDefs, TRelations>;
  primaryKey(...columns: (keyof TColumns & string)[]): TableBuilder;
  indexes(fn: (i: ReturnType<typeof createIndexFactory>) => IndexBuilder[]): TableBuilder;
  relations<T extends RelationBuilderRecord>(fn: (r: RelationFactory) => T): TableBuilder<TColumns, T>;
}
```

## `View`

ViewBuilder 팩토리 함수.

```typescript
export function View(name: string): ViewBuilder<never, never, never>;
```

## `ViewBuilder`

Fluent API로 뷰 스키마를 정의하는 빌더.

```typescript
export class ViewBuilder<TDbContext extends DbContextBase, TData extends DataRecord, TRelations extends RelationBuilderRecord> {
  readonly $relations!: TRelations;
  readonly $inferSelect!: TData;

  constructor(readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    viewFn?: (db: TDbContext) => Queryable<TData, any>;
    relations?: TRelations;
  });

  description(desc: string): ViewBuilder;
  database(db: string): ViewBuilder;
  schema(schema: string): ViewBuilder;
  query<TViewData, TDb>(viewFn: (db: TDb) => Queryable<TViewData, any>): ViewBuilder<TDb, TViewData, TRelations>;
  relations<T extends RelationBuilderRecord>(fn: (r: RelationFactory) => T): ViewBuilder<TDbContext, TData & InferDeepRelations<T>, T>;
}
```

## `Procedure`

ProcedureBuilder 팩토리 함수.

```typescript
export function Procedure(name: string): ProcedureBuilder<never, never>;
```

## `ProcedureBuilder`

Fluent API로 Stored Procedure를 정의하는 빌더.

```typescript
export class ProcedureBuilder<TParams extends ColumnBuilderRecord, TReturns extends ColumnBuilderRecord> {
  readonly $params!: TParams;
  readonly $returns!: TReturns;

  constructor(readonly meta: {
    name: string;
    description?: string;
    database?: string;
    schema?: string;
    params?: TParams;
    returns?: TReturns;
    query?: string;
  });

  description(desc: string): ProcedureBuilder;
  database(db: string): ProcedureBuilder;
  schema(schema: string): ProcedureBuilder;
  params<T>(fn: (c: ReturnType<typeof createColumnFactory>) => T): ProcedureBuilder<T, TReturns>;
  returns<T>(fn: (c: ReturnType<typeof createColumnFactory>) => T): ProcedureBuilder<TParams, T>;
  body(sql: string): ProcedureBuilder;
}
```

## `ColumnBuilder`

Column 정의 빌더. Fluent API로 타입, nullable, autoIncrement, default, description을 정의한다.

```typescript
export class ColumnBuilder<TValue extends ColumnPrimitive, TMeta extends ColumnMeta> {
  constructor(readonly meta: TMeta);

  autoIncrement(): ColumnBuilder<TValue, TMeta & { autoIncrement: true }>;
  nullable(): ColumnBuilder<TValue | undefined, TMeta & { nullable: true }>;
  default(value: TValue): ColumnBuilder<TValue, TMeta & { default: typeof value }>;
  description(desc: string): ColumnBuilder<TValue, TMeta & { description: string }>;
}
```

## `createColumnFactory`

Column 타입 팩토리 생성. 반환 객체의 메서드:

| 메서드 | SQL 타입 | TypeScript 타입 | 비고 |
|--------|----------|----------------|------|
| `int()` | INT | `number` | 4바이트 |
| `bigint()` | BIGINT | `number` | 8바이트 |
| `float()` | FLOAT | `number` | 4바이트 단정밀도 |
| `double()` | DOUBLE | `number` | 8바이트 배정밀도 |
| `decimal(precision, scale?)` | DECIMAL | `number` | 고정 소수점 |
| `varchar(length)` | VARCHAR | `string` | 가변 길이 문자열 |
| `char(length)` | CHAR | `string` | 고정 길이 문자열 |
| `text()` | TEXT | `string` | 대용량 텍스트 |
| `binary()` | LONGBLOB/VARBINARY/BYTEA | `Bytes` | 바이너리 |
| `boolean()` | TINYINT(1)/BIT/BOOLEAN | `boolean` | |
| `datetime()` | DATETIME | `DateTime` | 날짜+시간 |
| `date()` | DATE | `DateOnly` | 날짜만 |
| `time()` | TIME | `Time` | 시간만 |
| `uuid()` | BINARY(16)/UNIQUEIDENTIFIER/UUID | `Uuid` | |

## `ColumnBuilderRecord`

Column builder 레코드 타입.

```typescript
export type ColumnBuilderRecord = Record<string, ColumnBuilder<ColumnPrimitive, ColumnMeta>>;
```

## `InferColumns`

Column builder 레코드에서 실제 값 타입 추론.

```typescript
export type InferColumns<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? V : never;
};
```

## `InferColumnExprs`

Column builder 레코드에서 expression 입력 타입 추론.

```typescript
export type InferColumnExprs<TBuilders extends ColumnBuilderRecord> = {
  [K in keyof TBuilders]: TBuilders[K] extends ColumnBuilder<infer V, any> ? ExprInput<V> : never;
};
```

## `RequiredInsertKeys`

INSERT용 필수 column key 추출. autoIncrement, nullable, default가 없는 column만 필수.

```typescript
export type RequiredInsertKeys<TBuilders extends ColumnBuilderRecord> = /* ... */;
```

## `OptionalInsertKeys`

INSERT용 선택적 column key 추출.

```typescript
export type OptionalInsertKeys<TBuilders extends ColumnBuilderRecord> = Exclude<keyof TBuilders, RequiredInsertKeys<TBuilders>>;
```

## `InferInsertColumns`

INSERT 타입 추론. 필수 column은 필수, autoIncrement/nullable/default column은 optional.

```typescript
export type InferInsertColumns<TBuilders extends ColumnBuilderRecord> =
  Pick<InferColumns<TBuilders>, RequiredInsertKeys<TBuilders>> &
  Partial<Pick<InferColumns<TBuilders>, OptionalInsertKeys<TBuilders>>>;
```

## `InferUpdateColumns`

UPDATE 타입 추론. 모든 column이 optional.

```typescript
export type InferUpdateColumns<TBuilders extends ColumnBuilderRecord> = Partial<InferColumns<TBuilders>>;
```

## `DataToColumnBuilderRecord`

데이터 레코드를 Column builder 레코드로 변환.

```typescript
export type DataToColumnBuilderRecord<TData extends DataRecord> = {
  [K in keyof TData as TData[K] extends ColumnPrimitive ? K : never]: ColumnBuilder<TData[K] extends ColumnPrimitive ? TData[K] : never, any>;
};
```

## `IndexBuilder`

Index 정의 빌더. Fluent API로 index column, unique, 정렬 순서를 정의한다.

```typescript
export class IndexBuilder<TKeys extends string[]> {
  constructor(readonly meta: {
    columns: TKeys;
    name?: string;
    unique?: boolean;
    orderBy?: { [K in keyof TKeys]: "ASC" | "DESC" };
    description?: string;
  });

  name(name: string): IndexBuilder<TKeys>;
  unique(): IndexBuilder<TKeys>;
  orderBy(...orderBy: { [K in keyof TKeys]: "ASC" | "DESC" }): IndexBuilder<TKeys>;
  description(description: string): IndexBuilder<TKeys>;
}
```

## `createIndexFactory`

Index 팩토리 생성.

```typescript
export function createIndexFactory<TColumnKey extends string>(): {
  index<TKeys extends TColumnKey[]>(...columns: [...TKeys]): IndexBuilder<TKeys>;
};
```

## `ForeignKeyBuilder`

FK 관계 빌더 (N:1). DB에 실제 FK 제약조건을 생성한다. description 설정은 factory 함수의 opts 파라미터로 전달한다.

```typescript
export class ForeignKeyBuilder<TOwner extends TableBuilder, TTargetFn extends () => TableBuilder> {
  constructor(readonly meta: {
    ownerFn: () => TOwner;
    columns: string[];
    targetFn: TTargetFn;
    description?: string;
  });
}
```

## `ForeignKeyTargetBuilder`

FK 역참조 빌더 (1:N). include() 시 배열로 로드됨 (opts.single: true 시 단일 객체). description, single 설정은 factory 함수의 opts 파라미터로 전달한다.

```typescript
export class ForeignKeyTargetBuilder<TTargetTableFn extends () => TableBuilder, TIsSingle extends boolean> {
  constructor(readonly meta: {
    targetTableFn: TTargetTableFn;
    relationName: string;
    description?: string;
    isSingle?: TIsSingle;
  });
}
```

## `RelationKeyBuilder`

논리적 관계 빌더 (N:1). ForeignKeyBuilder와 동일하지만 DB에 FK 제약조건을 생성하지 않음. View에서도 사용 가능.

```typescript
export class RelationKeyBuilder<TOwner extends TableBuilder | ViewBuilder, TTargetFn extends () => TableBuilder | ViewBuilder> {
  constructor(readonly meta: {
    ownerFn: () => TOwner;
    columns: string[];
    targetFn: TTargetFn;
    description?: string;
  });
}
```

## `RelationKeyTargetBuilder`

논리적 역참조 빌더 (1:N). ForeignKeyTargetBuilder와 동일하지만 DB FK 미생성. View에서도 사용 가능.

```typescript
export class RelationKeyTargetBuilder<TTargetTableFn extends () => TableBuilder | ViewBuilder, TIsSingle extends boolean> {
  constructor(readonly meta: {
    targetTableFn: TTargetTableFn;
    relationName: string;
    description?: string;
    isSingle?: TIsSingle;
  });
}
```

## `createRelationFactory`

관계 빌더 팩토리 생성. Table은 FK + RelationKey 모두 사용 가능, View는 RelationKey만 사용 가능.

```typescript
export function createRelationFactory<TOwner, TColumnKey extends string>(
  ownerFn: () => TOwner,
): TOwner extends TableBuilder
  ? RelationFkFactory & RelationRkFactory
  : RelationRkFactory;
```

Table용 팩토리에서 사용 가능한 메서드:
- `foreignKey(columns, targetFn, opts?)`: N:1 FK 관계 정의 (DB FK 생성)
- `foreignKeyTarget(targetTableFn, relationName, opts?)`: 1:N FK 역참조 (single: true -> 단일 객체)
- `relationKey(columns, targetFn, opts?)`: N:1 논리적 관계 (DB FK 미생성)
- `relationKeyTarget(targetTableFn, relationName, opts?)`: 1:N 논리적 역참조

## `RelationBuilderRecord`

관계 builder 레코드 타입.

```typescript
export type RelationBuilderRecord = Record<string, ForeignKeyBuilder | ForeignKeyTargetBuilder | RelationKeyBuilder | RelationKeyTargetBuilder>;
```

## `ExtractRelationTarget`

FK/RelationKey에서 대상 타입 추출 (단일 객체, N:1 관계).

```typescript
export type ExtractRelationTarget<TRelation> = /* FK/RK의 대상 Table/View 타입 추론 */;
```

## `ExtractRelationTargetResult`

FKTarget/RelationKeyTarget에서 대상 타입 추출 (배열 또는 단일 객체, 1:N 관계).

```typescript
export type ExtractRelationTargetResult<TRelation> = /* isSingle: true -> 단일, false -> 배열 */;
```

## `InferDeepRelations`

관계 정의에서 심층 관계 타입 추론. include() 없이 접근 시 undefined가 되도록 모든 관계를 optional로 설정.

```typescript
export type InferDeepRelations<TRelations extends RelationBuilderRecord> = {
  [K in keyof TRelations]?: ExtractRelationTarget<TRelations[K]> | ExtractRelationTargetResult<TRelations[K]>;
};
```
