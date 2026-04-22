# @simplysm/core-common

브라우저와 Node.js 모두에서 사용 가능한 순수 공통 유틸리티 패키지. 다른 `@simplysm/*` 패키지에 대한 내부 의존성이 없는 리프 패키지다.

## Installation

```bash
npm install @simplysm/core-common
```

## API Overview

### Errors

| Entry | Kind | Description |
|-------|------|-------------|
| [`SdError`](./docs/errors/sd-error.md) | class | 트리 구조 에러 체인 지원. 메시지를 역순으로 결합 (상위 => 하위 => 원인) |
| [`ArgumentError`](./docs/errors/argument-error.md) | class | 인자 유효성 오류. 인자 객체를 YAML 형식으로 메시지에 포함 |
| [`NotImplementedError`](./docs/errors/not-implemented-error.md) | class | 미구현 기능 호출 시 발생 |
| [`TimeoutError`](./docs/errors/timeout-error.md) | class | 대기 시간 초과 시 발생 (시도 횟수 포함) |

### Types (Value Objects)

| Entry | Kind | Description |
|-------|------|-------------|
| [`DateTime`](./docs/types/date-time.md) | class | 불변 날짜시간 (밀리초 정밀도, 로컬 타임존) |
| [`DateOnly`](./docs/types/date-only.md) | class | 불변 날짜 (시간 제외, 주차 계산 지원) |
| [`Time`](./docs/types/time.md) | class | 불변 시간 (24시간 순환, 날짜 제외) |
| [`Uuid`](./docs/types/uuid.md) | class | UUID v4 (`crypto.getRandomValues` 기반) |
| [`LazyGcMap`](./docs/types/lazy-gc-map.md) | class | 자동 만료 기능이 있는 LRU Map |

### Features

| Entry | Kind | Description |
|-------|------|-------------|
| [`EventEmitter`](./docs/features/event-emitter.md) | class | 타입 안전 EventEmitter (EventTarget 기반, 브라우저/Node.js 모두 지원) |
| [`DebounceQueue`](./docs/features/debounce-queue.md) | class | 비동기 디바운스 큐 (짧은 시간 내 다수 호출 시 마지막만 실행) |
| [`SerialQueue`](./docs/features/serial-queue.md) | class | 비동기 직렬 큐 (순차 실행 보장) |

### Extensions (Prototype)

`@simplysm/core-common`을 import하면 `Array`, `Map`, `Set` 프로토타입 확장이 자동 등록된다.

| Entry | Description |
|-------|-------------|
| [`Array Extensions`](./docs/extensions/array.md) | 불변 메서드 (`single`, `groupBy`, `diffs`, `toTree` 등) + 가변 메서드 (`remove`, `insert`, `toggle` 등) |
| [`Map Extensions`](./docs/extensions/map.md) | `getOrCreate`, `update` |
| [`Set Extensions`](./docs/extensions/set.md) | `adds`, `toggle` |

### Utils (Namespace Imports)

```typescript
import { obj, str, num, bytes, path, json, xml, wait, transfer, err, dt, primitive } from "@simplysm/core-common";
```

| Entry | Kind | Description |
|-------|------|-------------|
| [`obj`](./docs/utils/obj.md) | namespace | `clone`, `equal`, `merge`, `merge3`, `omit`, `pick`, `getChainValue`, `setChainValue`, `keys`, `entries`, `map` 등 |
| [`str`](./docs/utils/str.md) | namespace | `getKoreanSuffix`, `toPascalCase`, `toCamelCase`, `toKebabCase`, `toSnakeCase`, `isNullOrEmpty`, `insert`, `replaceFullWidth` |
| [`num`](./docs/utils/num.md) | namespace | `parseInt`, `parseFloat`, `parseRoundedInt`, `isNullOrEmpty`, `format` |
| [`bytes`](./docs/utils/bytes.md) | namespace | `concat`, `toHex`, `fromHex`, `toBase64`, `fromBase64` |
| [`path`](./docs/utils/path.md) | namespace | `join`, `basename`, `extname` (POSIX 경로만 지원) |
| [`json`](./docs/utils/json.md) | namespace | `stringify`, `parse` (커스텀 타입 지원) |
| [`xml`](./docs/utils/xml.md) | namespace | `parse`, `stringify` |
| [`wait`](./docs/utils/wait.md) | namespace | `until`, `time` |
| [`transfer`](./docs/utils/transfer.md) | namespace | `encode`, `decode` (Worker 전송용) |
| [`err`](./docs/utils/err.md) | namespace | `message` (unknown 에러 메시지 추출) |
| [`dt`](./docs/utils/dt.md) | namespace | `format`, `normalizeMonth`, `convert12To24` |
| [`primitive`](./docs/utils/primitive.md) | namespace | `typeStr` |

### Utils (Direct Exports)

| Entry | Kind | Description |
|-------|------|-------------|
| [`js`, `ts`, `html`, `tsql`, `mysql`, `pgsql`](./docs/utils/template-strings.md) | function | IDE 코드 하이라이팅용 태그드 템플릿 리터럴 |
| [`ZipArchive`](./docs/utils/zip-archive.md) | class | ZIP 파일 읽기/쓰기/압축/해제 (캐싱, 진행률 콜백 지원) |

### Type Utilities

| Entry | Kind | Description |
|-------|------|-------------|
| [`env`, `parseBoolEnv`](./docs/type-utils/env.md) | function | 환경변수 get/set. `process.env`/`import.meta.env` 직접 접근 대신 사용 |
| [`Bytes`, `PrimitiveTypeMap`, `PrimitiveTypeStr`, `PrimitiveType`, `DeepPartial`, `Type`](./docs/type-utils/common-types.md) | type/interface | 공용 타입 정의 |

## Usage Examples

### 프로토타입 확장 사용

```typescript
import "@simplysm/core-common";

const users = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
const user = users.single((u) => u.id === 1);
const grouped = users.groupBy((u) => u.name[0]);
const sorted = users.orderBy((u) => u.name);
const diffs = newUsers.diffs(oldUsers, { keys: ["id"] });

const cache = new Map<string, number[]>();
const arr = cache.getOrCreate("key", []);

const set = new Set<string>();
set.adds("a", "b", "c");
```

### 에러 체인 처리

```typescript
import { SdError } from "@simplysm/core-common";

try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API 호출 실패", "사용자 로드 실패");
  // message: "사용자 로드 실패 => API 호출 실패 => 원본 에러 메시지"
}
```

### 네임스페이스 유틸리티 사용

```typescript
import { obj, str, json, DateTime, Uuid } from "@simplysm/core-common";

const copied = obj.clone({ nested: { data: [1, 2, 3] } });
const isEqual = obj.equal(a, b, { topLevelExcludes: ["updatedAt"] });
const noId = obj.omit(user, ["id"]);

const suffix = str.getKoreanSuffix("파일", "을"); // "을"
const camel = str.toCamelCase("HelloWorld");       // "helloWorld"

const serialized = json.stringify({ date: new DateTime(), id: Uuid.generate() });
const restored = json.parse(serialized); // DateTime, Uuid 타입 복원됨
```

### 비동기 큐 사용

```typescript
import { DebounceQueue, SerialQueue } from "@simplysm/core-common";

const dq = new DebounceQueue(300);
dq.on("error", (err) => console.error(err));
dq.run(() => saveData());

const sq = new SerialQueue();
sq.run(async () => await step1());
sq.run(async () => await step2()); // step1 완료 후 실행
```

### DateTime 사용

```typescript
import { DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";

const now = new DateTime();
const parsed = DateTime.parse("2025-01-15 10:30:00");
const formatted = now.toFormatString("yyyy-MM-dd HH:mm:ss");
const nextMonth = now.addMonths(1);

const today = new DateOnly();
const id = Uuid.generate();
```
