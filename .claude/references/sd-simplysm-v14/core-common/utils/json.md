# json

JSON 변환 유틸리티 네임스페이스. `DateTime`, `DateOnly`, `Time`, `Uuid`, `Set`, `Map`, `Error`, `Uint8Array` 등 커스텀 타입을 지원하는 직렬화/역직렬화를 제공한다.

```typescript
import { json } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `stringify` | `(obj, options?) => string` | 객체를 JSON 문자열로 직렬화 |
| `parse` | `<TResult = unknown>(json: string) => TResult` | JSON 문자열을 객체로 역직렬화. null 값은 undefined로 변환 |

## `stringify` — options

| Field | Type | Description |
|-------|------|-------------|
| `space` | `string \| number` | JSON 들여쓰기 |
| `replacer` | `(key, value) => unknown` | 커스텀 replacer. 기본 타입 변환 전에 호출됨 |
| `redactBytes` | `boolean` | `true`이면 `Uint8Array` 내용을 `"__hidden__"`으로 대체 (로깅용). 이 옵션으로 직렬화된 결과는 `parse()`로 복원 불가 |

## 지원 타입

| 타입 | 직렬화 형식 |
|------|-------------|
| `DateTime` | `{ __type__: "DateTime", data: "yyyy-MM-ddTHH:mm:ss.fffzzz" }` |
| `DateOnly` | `{ __type__: "DateOnly", data: "yyyy-MM-dd" }` |
| `Time` | `{ __type__: "Time", data: "HH:mm:ss.fff" }` |
| `Uuid` | `{ __type__: "Uuid", data: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }` |
| `Date` | `{ __type__: "Date", data: ISO8601 }` |
| `Set` | `{ __type__: "Set", data: [...] }` |
| `Map` | `{ __type__: "Map", data: [[k, v], ...] }` |
| `Error` | `{ __type__: "Error", data: { name, message, stack, ... } }` |
| `Uint8Array` | `{ __type__: "Uint8Array", data: "hex문자열" }` |

`parse()`는 JSON null 값을 undefined로 변환한다. 이는 simplysm 프레임워크의 null-free 규칙을 위한 의도적인 동작이다.

## Usage

```typescript
import { json, DateTime, Uuid } from "@simplysm/core-common";

// 커스텀 타입 지원 직렬화
const serialized = json.stringify({
  date: new DateTime(),
  id: Uuid.generate(),
  data: new Uint8Array([1, 2, 3]),
});

// 커스텀 타입 복원
const restored = json.parse<{ date: DateTime; id: Uuid }>(serialized);
// restored.date는 DateTime 인스턴스

// 로깅용 (바이너리 숨김)
const logStr = json.stringify({ data: sensitiveBytes }, { redactBytes: true });
```
