# @simplysm/core-common

브라우저와 Node.js 모두에서 사용 가능한 순수 공통 유틸리티 패키지. 다른 `@simplysm/*` 패키지에 대한 내부 의존성이 없는 리프 패키지다.

## Installation

```bash
npm install @simplysm/core-common
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| 날짜/시간 연산 | [DateTime](./types/date-time.md), [DateOnly](./types/date-only.md), [Time](./types/time.md) |
| 배열 필터/정렬/그룹화/비교 | [Array Extensions](./extensions/array.md) |
| 객체 복사/비교/병합 | [obj](./utils/obj.md) |
| JSON 직렬화 (커스텀 타입 포함) | [json](./utils/json.md) |
| 에러 체인 구성 | [SdError](./errors/sd-error.md) |
| 이벤트 기반 통신 | [EventEmitter](./features/event-emitter.md) |
| 비동기 제어 (디바운스/직렬) | [DebounceQueue](./features/debounce-queue.md), [SerialQueue](./features/serial-queue.md) |
| UUID 생성 | [Uuid](./types/uuid.md) |
| 환경변수 접근 | [env](./type-utils/env.md) |
| Worker 간 데이터 전송 | [transfer](./utils/transfer.md) |
| ZIP 파일 처리 | [ZipArchive](./utils/zip-archive.md) |
| 바이너리 변환 (hex/base64) | [bytes](./utils/bytes.md) |
| 문자열 케이스 변환/한국어 조사 | [str](./utils/str.md) |
| 자동 만료 캐시 | [LazyGcMap](./types/lazy-gc-map.md) |

## API Overview

### Errors

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`SdError`](./errors/sd-error.md) | class | 원인 에러를 감싸 트리 구조 에러 체인을 구성할 때 |
| [`ArgumentError`](./errors/argument-error.md) | class | 인자 유효성 오류를 YAML 형식 메시지로 표시할 때 |
| [`NotImplementedError`](./errors/not-implemented-error.md) | class | 미구현 기능이 호출되었음을 표시할 때 |
| [`TimeoutError`](./errors/timeout-error.md) | class | 대기 시간 초과를 시도 횟수와 함께 표시할 때 |

### Types (Value Objects)

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`DateTime`](./types/date-time.md) | class | 날짜+시간을 불변 객체로 다룰 때 (밀리초 정밀도, 로컬 타임존) |
| [`DateOnly`](./types/date-only.md) | class | 시간 없이 날짜만 다룰 때 (주차 계산 지원) |
| [`Time`](./types/time.md) | class | 날짜 없이 시간만 다룰 때 (24시간 순환) |
| [`Uuid`](./types/uuid.md) | class | UUID v4를 생성하거나 검증할 때 |
| [`LazyGcMap`](./types/lazy-gc-map.md) | class | 일정 시간 미접근 항목을 자동 삭제하는 캐시가 필요할 때 |

### Features

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`EventEmitter`](./features/event-emitter.md) | class | 타입 안전한 이벤트 기반 통신이 필요할 때 (`events`/`eventemitter3` 대체) |
| [`DebounceQueue`](./features/debounce-queue.md) | class | 짧은 시간 내 다수 호출을 마지막 하나로 축약할 때 |
| [`SerialQueue`](./features/serial-queue.md) | class | 비동기 작업의 순차 실행을 보장할 때 |

### Extensions (Prototype)

`@simplysm/core-common`을 import하면 `Array`, `Map`, `Set` 프로토타입 확장이 자동 등록된다.

| Entry | 언제 쓰나 |
|-------|-----------|
| [`Array Extensions`](./extensions/array.md) | 배열 필터/정렬/그룹화/비교/변환이 필요할 때 |
| [`Map Extensions`](./extensions/map.md) | Map에서 기본값 생성(`getOrCreate`) 또는 값 업데이트(`update`)가 필요할 때 |
| [`Set Extensions`](./extensions/set.md) | Set에 여러 값 일괄 추가(`adds`) 또는 토글(`toggle`)이 필요할 때 |

### Utils (Namespace Imports)

```typescript
import { obj, str, num, bytes, path, json, xml, wait, transfer, err, dt, primitive } from "@simplysm/core-common";
```

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`obj`](./utils/obj.md) | namespace | 객체 깊은 복사/비교/병합, key 조작, 체인 경로 접근이 필요할 때 |
| [`str`](./utils/str.md) | namespace | 한국어 조사 처리, 케이스 변환, 전각→반각 변환이 필요할 때 |
| [`num`](./utils/num.md) | namespace | 문자열→숫자 파싱, 숫자 포맷이 필요할 때 |
| [`bytes`](./utils/bytes.md) | namespace | Uint8Array ↔ hex/base64 변환, 결합이 필요할 때 |
| [`path`](./utils/path.md) | namespace | POSIX 경로 결합/파일명 추출이 필요할 때 (브라우저 환경용) |
| [`json`](./utils/json.md) | namespace | DateTime/Uuid 등 커스텀 타입을 포함한 JSON 직렬화/역직렬화가 필요할 때 |
| [`xml`](./utils/xml.md) | namespace | XML 파싱/직렬화가 필요할 때 |
| [`wait`](./utils/wait.md) | namespace | 조건 대기(`until`) 또는 시간 대기(`time`)가 필요할 때 |
| [`transfer`](./utils/transfer.md) | namespace | Worker 간 커스텀 타입 데이터 전송이 필요할 때 |
| [`err`](./utils/err.md) | namespace | catch 블록의 unknown 에러에서 메시지를 추출할 때 |
| [`dt`](./utils/dt.md) | namespace | 날짜/시간 포맷 문자열 변환, 월 정규화가 필요할 때 |
| [`primitive`](./utils/primitive.md) | namespace | 런타임에 값의 PrimitiveTypeStr을 추론할 때 |

### Utils (Direct Exports)

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`js`, `ts`, `html`, `tsql`, `mysql`, `pgsql`](./utils/template-strings.md) | function | IDE 코드 하이라이팅이 필요한 태그드 템플릿 리터럴을 작성할 때 |
| [`ZipArchive`](./utils/zip-archive.md) | class | ZIP 파일 읽기/쓰기/압축/해제가 필요할 때 |

### Type Utilities

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`env`, `parseBoolEnv`](./type-utils/env.md) | function | 환경변수를 읽거나 쓸 때 (`process.env`/`import.meta.env` 직접 접근 대신) |
| [`Bytes`, `PrimitiveTypeMap`, `PrimitiveTypeStr`, `PrimitiveType`, `DeepPartial`, `Type`](./type-utils/common-types.md) | type/interface | 공용 타입 정의가 필요할 때 |

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
