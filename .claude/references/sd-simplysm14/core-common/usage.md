# @simplysm/core-common

브라우저와 Node.js 모두에서 사용 가능한 순수 공통 유틸리티 패키지. 다른 `@simplysm/*` 패키지에 대한 내부 의존성이 없는 리프 패키지다.

## Installation

```bash
npm install @simplysm/core-common
```

## API Overview

### Environment

| API | Type | Description |
|-----|------|-------------|
| `env` | function | 환경변수 get/set. `env(key)` 읽기, `env(key, value)` 쓰기 |
| `parseBoolEnv` | function | 환경변수 값을 boolean으로 파싱 ("true"/"1"/"yes"/"on" -> true) |

-> See [docs/environment.md](./docs/environment.md) for details.

### Extensions (Prototype)

| API | Type | Description |
|-----|------|-------------|
| `Array` extensions | side-effect | `single`, `first`, `last`, `filterExists`, `ofType`, `groupBy`, `toMap`, `toArrayMap`, `toSetMap`, `toMapValues`, `toObject`, `toTree`, `distinct`, `orderBy`, `orderByDesc`, `diffs`, `oneWayDiffs`, `merge`, `sum`, `min`, `max`, `shuffle`, `mapAsync`, `filterAsync`, `mapMany`, `mapManyAsync`, `parallelAsync`, `remove`, `insert`, `toggle`, `clear`, `distinctThis`, `orderByThis`, `orderByDescThis` |
| `Map` extensions | side-effect | `getOrCreate`, `update` |
| `Set` extensions | side-effect | `adds`, `toggle` |
| `ArrayDiffsResult` | type | diffs() 결과 타입 (INSERT/DELETE/UPDATE) |
| `ArrayOneWayDiffResult` | type | oneWayDiffs() 결과 타입 (create/update/same) |
| `TreeArray` | type | toTree() 결과 타입 (children 속성 추가) |
| `ComparableType` | type | 정렬/비교 가능한 타입 union |

-> See [docs/extensions.md](./docs/extensions.md) for details.

### Errors

| API | Type | Description |
|-----|------|-------------|
| `SdError` | class | 트리 구조 에러 체인 지원. 메시지를 역순으로 결합 (상위 => 하위 => 원인) |
| `ArgumentError` | class | 인자 유효성 오류. 인자 객체를 YAML 형식으로 메시지에 포함 |
| `NotImplementedError` | class | 미구현 기능 호출 시 발생 |
| `TimeoutError` | class | 대기 시간 초과 시 발생 (시도 횟수 포함) |

-> See [docs/errors.md](./docs/errors.md) for details.

### Types (Value Objects)

| API | Type | Description |
|-----|------|-------------|
| `DateTime` | class | 불변 날짜시간 (밀리초 정밀도, 로컬 타임존) |
| `DateOnly` | class | 불변 날짜 (시간 제외, 주차 계산 지원) |
| `Time` | class | 불변 시간 (24시간 순환, 날짜 제외) |
| `Uuid` | class | UUID v4 (crypto.getRandomValues 기반) |
| `LazyGcMap` | class | 자동 만료 기능이 있는 LRU Map |

-> See [docs/types.md](./docs/types.md) for details.

### Features

| API | Type | Description |
|-----|------|-------------|
| `EventEmitter` | class | 타입 안전 EventEmitter (EventTarget 기반, 브라우저/Node.js 모두 지원) |
| `DebounceQueue` | class | 비동기 디바운스 큐 (마지막 요청만 실행) |
| `SerialQueue` | class | 비동기 직렬 큐 (순차 실행 보장) |

-> See [docs/features.md](./docs/features.md) for details.

### Utils (Namespace Imports)

| API | Type | Description |
|-----|------|-------------|
| `obj` | namespace | 깊은 복사(clone), 비교(equal), 병합(merge, merge3), omit, pick, 체인 접근 |
| `str` | namespace | 한국어 조사 처리, 전각->반각, 케이스 변환, isNullOrEmpty, insert |
| `num` | namespace | parseInt, parseFloat, parseRoundedInt, isNullOrEmpty, format |
| `bytes` | namespace | Uint8Array 유틸: concat, toHex, fromHex, toBase64, fromBase64 |
| `path` | namespace | POSIX 경로 유틸: join, basename, extname |
| `json` | namespace | 커스텀 타입 지원 JSON 직렬화/역직렬화 (stringify, parse) |
| `xml` | namespace | XML 파싱/직렬화 (fast-xml-parser 래퍼) |
| `wait` | namespace | 비동기 대기: until (조건 대기), time (지연) |
| `transfer` | namespace | Worker 간 전송 가능한 객체 직렬화: encode, decode |
| `err` | namespace | 에러 메시지 추출: message(unknown) -> string |
| `dt` | namespace | 날짜 포맷: format, normalizeMonth, convert12To24 |
| `primitive` | namespace | 원시 타입 추론: typeStr(value) -> PrimitiveTypeStr |

-> See [docs/utils.md](./docs/utils.md) for details.

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

-> See [docs/template-strings-and-zip.md](./docs/template-strings-and-zip.md) for details.

### Type Utilities

| API | Type | Description |
|-----|------|-------------|
| `Bytes` | type | `Uint8Array` 별칭 (Buffer 대신 사용) |
| `PrimitiveTypeMap` | type | 원시 타입 문자열 key -> 타입 매핑 |
| `PrimitiveTypeStr` | type | 원시 타입 문자열 key union (`"string" \| "number" \| ...`) |
| `PrimitiveType` | type | 원시 타입 union (`string \| number \| boolean \| DateTime \| ...`) |
| `DeepPartial` | type | 모든 속성을 재귀적으로 optional로 변환 |
| `Type` | interface | 생성자 타입 (`new (...args) => T`) |
| `UndefToOptional` | type | undefined 가능 속성을 optional로 변환 |
| `OptionalToUndef` | type | optional 속성을 필수 + undefined union으로 변환 |

-> See [docs/type-utilities.md](./docs/type-utilities.md) for details.

## Usage Examples

### 프로토타입 확장 사용

```typescript
import "@simplysm/core-common";

// Array 확장
const users = [{ id: 1, name: "A" }, { id: 2, name: "B" }];
const user = users.single((u) => u.id === 1);
const grouped = users.groupBy((u) => u.name);
const sorted = users.orderBy((u) => u.name);

// Map 확장
const cache = new Map<string, number[]>();
const arr = cache.getOrCreate("key", []);
```

### 네임스페이스 유틸리티 사용

```typescript
import { obj, str, json, DateTime } from "@simplysm/core-common";

const copied = obj.clone({ nested: { data: [1, 2, 3] } });
const isEqual = obj.equal(a, b, { topLevelExcludes: ["updatedAt"] });
const merged = obj.merge(defaults, overrides);

const suffix = str.getKoreanSuffix("파일", "을"); // "을"
const camel = str.toCamelCase("HelloWorld"); // "helloWorld"

const serialized = json.stringify({ date: new DateTime(), id: Uuid.generate() });
const restored = json.parse(serialized); // DateTime, Uuid 타입 복원됨
```

### 비동기 큐 사용

```typescript
import { DebounceQueue, SerialQueue } from "@simplysm/core-common";

const dq = new DebounceQueue(300);
dq.on("error", (err) => { /* 에러 처리 */ });
dq.run(() => saveData()); // 300ms 내 재호출 시 이전 호출 무시

const sq = new SerialQueue();
sq.run(async () => await step1());
sq.run(async () => await step2()); // step1 완료 후 실행
```
