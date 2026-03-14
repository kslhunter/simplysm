# @simplysm/core-common

Simplysm 프레임워크의 기반 유틸리티 패키지. 플랫폼 중립적인 타입, 유틸리티 함수, 에러 클래스, 확장 메서드를 제공한다.

## 설치

```bash
npm install @simplysm/core-common
```

## 의존성

- `@zip.js/zip.js` -- ZIP 파일 처리
- `consola` -- 로깅
- `fast-xml-parser` -- XML 파싱/직렬화
- `yaml` -- YAML 직렬화 (ArgumentError 메시지용)

## 문서

| 카테고리 | 설명 |
|---------|------|
| [타입](docs/types.md) | DateTime, DateOnly, Time, Uuid, LazyGcMap 등 불변 타입 |
| [유틸리티](docs/utilities.md) | obj, str, num, bytes, json, xml, zip 등 네임스페이스 유틸리티 |
| [기능](docs/features.md) | EventEmitter, DebounceQueue, SerialQueue, 에러 클래스, 확장 메서드 |

## 빠른 시작

### 날짜/시간 타입

```typescript
import { DateTime, DateOnly, Time } from "@simplysm/core-common";

const now = new DateTime();
const tomorrow = now.addDays(1);
const formatted = now.toFormatString("yyyy-MM-dd HH:mm:ss");

const today = new DateOnly();
const weekInfo = today.getWeekSeqOfYear(); // { year, weekSeq }

const time = Time.parse("14:30:00");
const later = time.addHours(2); // 24시간 래핑
```

### 유틸리티 함수

```typescript
import { obj, str, json, bytes } from "@simplysm/core-common";

// 객체 딥 클론/비교/병합
const cloned = obj.clone(source);
const isEqual = obj.equal(a, b);
const merged = obj.merge(source, target);

// 문자열 변환
str.toPascalCase("hello-world"); // "HelloWorld"
str.toKebabCase("HelloWorld");   // "hello-world"

// JSON (커스텀 타입 지원)
const serialized = json.stringify({ date: new DateTime() });
const parsed = json.parse<{ date: DateTime }>(serialized);

// 바이너리
const hex = bytes.toHex(data);
const b64 = bytes.toBase64(data);
```

### 이벤트 에미터

```typescript
import { EventEmitter } from "@simplysm/core-common";

const emitter = new EventEmitter<{ change: string; error: Error }>();
emitter.on("change", (data) => { /* ... */ });
emitter.emit("change", "updated");
```

### 배열 확장 메서드

```typescript
import "@simplysm/core-common"; // side-effect import

const items = [1, 2, 3, 4, 5];
items.first();                    // 1
items.last();                     // 5
items.distinct();                 // 중복 제거
items.orderBy((x) => x);         // 정렬
items.groupBy((x) => x % 2);     // 그룹화
items.sum();                      // 15
```

### ZIP 처리

```typescript
import { ZipArchive } from "@simplysm/core-common";

await using zip = new ZipArchive(data);
const content = await zip.get("file.txt");
zip.write("new-file.txt", bytes);
const compressed = await zip.compress();
```

### 에러 클래스

```typescript
import { SdError, ArgumentError, TimeoutError } from "@simplysm/core-common";

// 에러 체인 (=> 구분자로 조인)
throw new SdError(originalError, "추가 컨텍스트");
// 메시지: "추가 컨텍스트 => 원본 에러 메시지"

// 인자 에러 (YAML 형식)
throw new ArgumentError({ userId: -1, name: "" });
```
