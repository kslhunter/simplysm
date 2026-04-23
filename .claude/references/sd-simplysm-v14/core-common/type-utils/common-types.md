# Common Types

공유 타입 정의. `Buffer` 대신 사용하는 바이너리 타입, ORM과 공유하는 원시 타입, 범용 유틸리티 타입을 제공한다.

```typescript
import { Bytes, PrimitiveTypeMap, PrimitiveTypeStr, PrimitiveType, DeepPartial, Type } from "@simplysm/core-common";
```

## Types

### `Bytes`

```typescript
export type Bytes = Uint8Array;
```

`Buffer` 대신 사용하는 바이너리 타입 별칭.

### `PrimitiveTypeMap`

```typescript
export type PrimitiveTypeMap = {
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

원시 타입 문자열 key → 실제 타입 매핑. `@simplysm/orm-common`과 공유한다.

### `PrimitiveTypeStr`

```typescript
export type PrimitiveTypeStr = keyof PrimitiveTypeMap;
// "string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes"
```

원시 타입 문자열 key union.

### `PrimitiveType`

```typescript
export type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;
// string | number | boolean | DateTime | DateOnly | Time | Uuid | Bytes | undefined
```

원시 타입 union.

### `DeepPartial<TObject>`

```typescript
export type DeepPartial<TObject> = Partial<{
  [K in keyof TObject]: TObject[K] extends PrimitiveType ? TObject[K] : DeepPartial<TObject[K]>;
}>;
```

객체의 모든 속성을 재귀적으로 optional로 변환한다. 원시 타입(`PrimitiveType`)은 그대로 유지하고, object/array 타입에만 재귀적으로 `Partial`을 적용한다.

### `Type<TInstance>`

```typescript
export interface Type<TInstance> extends Function {
  new (...args: unknown[]): TInstance;
}
```

생성자 타입. 의존성 주입, 팩토리 패턴, instanceof 체크 등에 활용한다.

## Usage

```typescript
import { Bytes, PrimitiveTypeStr, DeepPartial, Type } from "@simplysm/core-common";

// Bytes
const data: Bytes = new Uint8Array([1, 2, 3]);

// PrimitiveTypeStr
const typeStr: PrimitiveTypeStr = "DateTime";

// DeepPartial
interface Config {
  server: { host: string; port: number };
  db: { name: string; user: string };
}
const partial: DeepPartial<Config> = {
  server: { host: "localhost" },  // port 생략 가능
};

// Type<T>
function create<T>(ctor: Type<T>): T {
  return new ctor();
}
class MyService {}
const svc = create(MyService);
```
