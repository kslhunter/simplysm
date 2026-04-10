# @simplysm/core-common

브라우저와 Node.js 모두에서 사용 가능한 순수 공통 유틸리티 패키지. 다른 `@simplysm/*` 패키지에 대한 내부 의존성이 없는 리프 패키지다.

## Installation

```bash
npm install @simplysm/core-common
```

## API Overview

### Errors

| API | Type | Description |
|-----|------|-------------|
| `SdError` | class | 트리 구조 에러 체인 지원. 메시지를 역순으로 결합 (상위 => 하위 => 원인) |
| `ArgumentError` | class | 인자 유효성 오류. 인자 객체를 YAML 형식으로 메시지에 포함 |
| `NotImplementedError` | class | 미구현 기능 호출 시 발생 |
| `TimeoutError` | class | 대기 시간 초과 시 발생 (시도 횟수 포함) |

→ See [docs/errors.md](./docs/errors.md) for details.

### Types (Value Objects)

| API | Type | Description |
|-----|------|-------------|
| `DateTime` | class | 불변 날짜시간 (밀리초 정밀도, 로컬 타임존) |
| `DateOnly` | class | 불변 날짜 (시간 제외, 주차 계산 지원) |
| `Time` | class | 불변 시간 (24시간 순환, 날짜 제외) |
| `Uuid` | class | UUID v4 (crypto.getRandomValues 기반) |
| `LazyGcMap<TKey, TValue>` | class | 자동 만료 기능이 있는 LRU Map |

→ See [docs/types.md](./docs/types.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `EventEmitter<TEvents>` | class | 타입 안전 EventEmitter (EventTarget 기반, 브라우저/Node.js 모두 지원) |
| `DebounceQueue` | class | 비동기 디바운스 큐 (짧은 시간 내 다수 호출 시 마지막만 실행) |
| `SerialQueue` | class | 비동기 직렬 큐 (순차 실행 보장) |

→ See [docs/features.md](./docs/features.md) for details.

### Extensions (Prototype)

Array, Map, Set 프로토타입 확장이 자동 등록됨 (side-effect import):

| API | Type | Description |
|-----|------|-------------|
| **Array Methods (Immutable)** | | `single`, `first`, `last`, `filterExists`, `ofType`, `groupBy`, `toMap`, `toMapAsync`, `toArrayMap`, `toSetMap`, `toMapValues`, `toObject`, `toTree`, `distinct`, `orderBy`, `orderByDesc`, `diffs`, `oneWayDiffs`, `merge`, `sum`, `min`, `max`, `shuffle`, `mapAsync`, `filterAsync`, `mapMany`, `mapManyAsync`, `parallelAsync` |
| **Array Methods (Mutable)** | | `remove`, `insert`, `toggle`, `clear`, `distinctThis`, `orderByThis`, `orderByDescThis` |
| **Map Extensions** | | `getOrCreate`, `update` |
| **Set Extensions** | | `adds`, `toggle` |
| `ArrayDiffsResult<T, P>` | type | diffs() 결과 타입 (INSERT/DELETE/UPDATE) |
| `ArrayOneWayDiffResult<T>` | type | oneWayDiffs() 결과 타입 (create/update/same) |
| `TreeArray<T>` | type | toTree() 결과 타입 (children 속성 추가) |
| `ComparableType` | type | 정렬/비교 가능한 타입 union |

→ See [docs/extensions.md](./docs/extensions.md) for details.

### Environment

| API | Type | Description |
|-----|------|-------------|
| `env` | function | 환경변수 get/set. `env(key)` 읽기, `env(key, value)` 쓰기 |
| `parseBoolEnv` | function | 환경변수 값을 boolean으로 파싱 ("true"/"1"/"yes"/"on" -> true) |

### Utils (Namespace Imports)

| API | Type | Description |
|-----|------|-------------|
| `obj` | namespace | clone, equal, merge, merge3, omit, omitByFilter, pick, getChainValue, getChainValueByDepth, setChainValue, deleteChainValue, clearUndefined, clear, nullToUndefined, unflatten, keys, entries, fromEntries, map |
| `str` | namespace | getKoreanSuffix, replaceFullWidth, toPascalCase, toCamelCase, toKebabCase, toSnakeCase, isNullOrEmpty, insert |
| `num` | namespace | parseInt, parseFloat, parseRoundedInt, isNullOrEmpty, format |
| `bytes` | namespace | concat, toHex, fromHex, toBase64, fromBase64 |
| `path` | namespace | join, basename, extname |
| `json` | namespace | stringify, parse |
| `xml` | namespace | parse, stringify |
| `wait` | namespace | until, time |
| `transfer` | namespace | encode, decode |
| `err` | namespace | message |
| `dt` | namespace | format, normalizeMonth, convert12To24 |
| `primitive` | namespace | typeStr |

→ See [docs/utils.md](./docs/utils.md) for details.

### Utils (Direct Exports)

| API | Type | Description |
|-----|------|-------------|
| `js` | function | JavaScript 코드 하이라이팅용 태그드 템플릿 리터럴 |
| `ts` | function | TypeScript 코드 하이라이팅용 태그드 템플릿 리터럴 |
| `html` | function | HTML 마크업 하이라이팅용 태그드 템플릿 리터럴 |
| `tsql` | function | MSSQL T-SQL 하이라이팅용 태그드 템플릿 리터럴 |
| `mysql` | function | MySQL SQL 하이라이팅용 태그드 템플릿 리터럴 |
| `pgsql` | function | PostgreSQL SQL 하이라이팅용 태그드 템플릿 리터럴 |
| `ZipArchive` | class | ZIP 파일 읽기/쓰기/압축/해제 (캐싱, 진행률 콜백 지원) |
| `ZipArchiveProgress` | interface | ZipArchive 진행률 콜백 데이터 |

### Type Utilities

| API | Type | Description |
|-----|------|-------------|
| `Bytes` | type | `Uint8Array` 별칭 (Buffer 대신 사용) |
| `PrimitiveTypeMap` | type | 원시 타입 문자열 key -> 타입 매핑 |
| `PrimitiveTypeStr` | type | 원시 타입 문자열 key union (`"string" \| "number" \| ...`) |
| `PrimitiveType` | type | 원시 타입 union (`string \| number \| boolean \| DateTime \| ...`) |
| `DeepPartial<T>` | type | 모든 속성을 재귀적으로 optional로 변환 |
| `Type<T>` | interface | 생성자 타입 (`new (...args) => T`) |
| `EqualOptions` | interface | obj.equal() 옵션 |
| `MergeOptions` | interface | obj.merge() 옵션 |
| `Merge3KeyOptions` | interface | obj.merge3() key 옵션 |
| `DtNormalizedMonth` | interface | dt.normalizeMonth() 결과 타입 |
| `UndefToOptional<T>` | type | undefined 타입을 optional로 변환 |
| `OptionalToUndef<T>` | type | optional 속성을 undefined 포함 타입으로 변환 |

→ See [docs/utils.md](./docs/utils.md) for details.

## Usage Examples

### 프로토타입 확장 사용

```typescript
import "@simplysm/core-common";

// Array 확장
const users = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
const user = users.single((u) => u.id === 1);
const grouped = users.groupBy((u) => u.name);
const sorted = users.orderBy((u) => u.name);
const diffs = newUsers.diffs(oldUsers, { keys: ["id"] });

// Map 확장
const cache = new Map<string, number[]>();
const arr = cache.getOrCreate("key", []);

// Set 확장
const set = new Set<string>();
set.adds("a", "b", "c"); // 여러 항목 추가
```

### 에러 체인 처리

```typescript
import { SdError } from "@simplysm/core-common";

try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API 호출 실패", "사용자 로드 실패");
  // 결과 메시지: "사용자 로드 실패 => API 호출 실패 => 원본 에러 메시지"
}
```

### 네임스페이스 유틸리티 사용

```typescript
import { obj, str, json, DateTime, Uuid } from "@simplysm/core-common";

// 깊은 복사 및 비교
const copied = obj.clone({ nested: { data: [1, 2, 3] } });
const isEqual = obj.equal(a, b, { topLevelExcludes: ["updatedAt"] });
const merged = obj.merge(defaults, overrides);

// obj.omit, obj.pick
const noId = obj.omit(user, ["id"]);
const onlyName = obj.pick(user, ["name", "email"]);

// 한국어 조사 처리
const suffix = str.getKoreanSuffix("파일", "을"); // "을"
const camel = str.toCamelCase("HelloWorld"); // "helloWorld"

// 커스텀 타입 지원 JSON 직렬화
const serialized = json.stringify({
  date: new DateTime(),
  id: Uuid.generate()
});
const restored = json.parse(serialized); // DateTime, Uuid 타입 복원됨
```

### 비동기 큐 사용

```typescript
import { DebounceQueue, SerialQueue } from "@simplysm/core-common";

// 디바운스 큐: 짧은 시간 내 재호출 시 이전 호출 무시
const dq = new DebounceQueue(300);
dq.on("error", (err) => console.error(err));
dq.run(() => saveData());
dq.run(() => saveData()); // 첫 번째 호출 무시, 300ms 후 마지막만 실행

// 직렬 큐: 순차 실행
const sq = new SerialQueue();
sq.run(async () => await step1());
sq.run(async () => await step2()); // step1 완료 후 실행
sq.run(async () => await step3()); // step2 완료 후 실행
```

### DateTime 사용

```typescript
import { DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

const now = new DateTime();
const specific = new DateTime(2025, 1, 15, 10, 30, 0);
const parsed = DateTime.parse("2025-01-15 10:30:00");
const formatted = now.toFormatString("yyyy-MM-dd HH:mm:ss");
const today = new DateOnly();
const id = Uuid.generate();
```

### 자동 만료 Map 사용

```typescript
import { LazyGcMap } from "@simplysm/core-common";

const cache = new LazyGcMap<string, Data>({
  expireTime: 60_000,
  onExpire: async (key, value) => {
    await value.cleanup();
  },
});
try {
  cache.set("key", data);
  const val = cache.get("key"); // 접근 시간 갱신
} finally {
  cache.dispose();
}
```

### EventEmitter 사용

```typescript
import { EventEmitter } from "@simplysm/core-common";

interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

class MyService extends EventEmitter<MyEvents> {
  async load() {
    this.emit("data", "Loading...");
    this.emit("done"); // void 타입은 인자 없이 호출
  }
}

const svc = new MyService();
svc.on("data", (data) => console.log(data)); // data: string
svc.on("done", () => console.log("completed"));
await svc.load();
```
