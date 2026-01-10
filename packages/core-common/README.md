# @simplysm/core-common

> SIMPLYSM 프레임워크의 공통 유틸리티 패키지

[![npm version](https://img.shields.io/npm/v/@simplysm/core-common.svg)](https://www.npmjs.com/package/@simplysm/core-common)
[![license](https://img.shields.io/npm/l/@simplysm/core-common.svg)](https://github.com/kslhunter/simplysm/blob/master/LICENSE)

브라우저와 Node.js 환경에서 모두 사용 가능한 TypeScript 공통 유틸리티 라이브러리입니다.

## 설치

```bash
npm install @simplysm/core-common
# or
yarn add @simplysm/core-common
```

## 주요 기능

### 🔧 유틸리티 함수

#### ObjectUtils
객체 조작을 위한 강력한 유틸리티

```typescript
import { ObjectUtils } from "@simplysm/core-common";

// 깊은 복사 (순환 참조 지원)
const cloned = ObjectUtils.clone(original);

// 깊은 비교
ObjectUtils.equal(obj1, obj2);

// 깊은 병합
const merged = ObjectUtils.merge(obj1, obj2);

// 체인 값 접근
const value = ObjectUtils.getChainValue(obj, "user.profile.name");

// 객체 필터링
const picked = ObjectUtils.pick(obj, ["id", "name"]);
const omitted = ObjectUtils.omit(obj, ["password", "secret"]);
```

#### StringUtils
문자열 처리 유틸리티

```typescript
import { StringUtils } from "@simplysm/core-common";

// 케이스 변환
StringUtils.toPascalCase("hello-world");  // "HelloWorld"
StringUtils.toCamelCase("HelloWorld");    // "helloWorld"
StringUtils.toKebabCase("HelloWorld");    // "hello-world"

// 한국어 조사 처리
StringUtils.getSuffix("사과", "을");  // "를"
StringUtils.getSuffix("책", "을");    // "을"

// 전각→반각 변환
StringUtils.replaceSpecialDefaultChar("ＡＢＣ１２３");  // "ABC123"
```

#### NumberUtils
숫자 처리 유틸리티

```typescript
import { NumberUtils } from "@simplysm/core-common";

// 안전한 파싱
NumberUtils.parseInt("123.45");  // 123
NumberUtils.parseFloat("123.45");  // 123.45

// 반올림 파싱
NumberUtils.parseRoundedInt(123.7);  // 124

// 포맷팅
NumberUtils.format(1234567.89);  // "1,234,567.89"
NumberUtils.format(1234567.89, 1);  // "1,234,567.9"
```

### 📦 커스텀 타입 클래스

#### Uuid
UUID v4 생성 및 변환

```typescript
import { Uuid } from "@simplysm/core-common";

const id = Uuid.new();  // 새 UUID 생성
const fromString = new Uuid("550e8400-e29b-41d4-a716-446655440000");

// Buffer 변환
const buffer = id.toBuffer();
const fromBuffer = Uuid.fromBuffer(buffer);
```

#### DateTime, DateOnly, Time
불변 날짜/시간 클래스 (setter 없음)

```typescript
import { DateTime, DateOnly, Time } from "@simplysm/core-common";

// DateTime
const now = new DateTime();
const tomorrow = now.addDays(1);  // 새 인스턴스 반환
const nextYear = now.setYear(2026);  // 새 인스턴스 반환

// DateOnly
const today = new DateOnly();
const nextMonth = today.addMonths(1);

// Time
const currentTime = new Time();
const later = currentTime.addHours(2);
```

#### LazyGcMap
자동 만료 기능이 있는 Map (LRU + GC)

```typescript
import { LazyGcMap } from "@simplysm/core-common";

const cache = new LazyGcMap<string, Data>({
  gcInterval: 10000,  // 10초마다 GC
  expireTime: 60000,  // 60초 미접근 시 만료
  onExpire: (key, value) => {
    console.log(`${key} expired`);
  }
});

cache.set("key", data);
const value = cache.get("key");  // 접근 시 만료 시간 갱신
```

### 🎨 프로토타입 확장

#### Array 확장
함수형 프로그래밍 패턴

```typescript
// 정렬
[3, 1, 2].orderBy(x => x);  // [1, 2, 3]
users.orderByDesc(u => u.age);

// 집계
numbers.sum();
numbers.min();
numbers.max();
numbers.sum(x => x.price);

// 필터링
users.single(u => u.id === 1);  // 단일 요소 (없으면 undefined, 여러 개면 에러)
users.last(u => u.active);

// 그룹화
users.groupBy(u => u.department);
users.toMap(u => u.id, u => u.name);

// 비동기 처리
await items.mapAsync(async item => await process(item));
await items.parallelAsync(async item => await process(item)); // 전체 병렬 처리
```

#### Map 확장

```typescript
const map = new Map<string, number>();

// 없으면 생성
map.getOrCreate("key", 0);
map.getOrCreate("key", () => computeValue());

// 함수를 값으로 저장하는 경우
const fnMap = new Map<string, () => void>();
fnMap.getOrCreate("key", () => myFn);  // 팩토리로 감싸기

// 업데이트
map.update("key", (prev) => (prev ?? 0) + 1);
```

> **주의**: `getOrCreate`에서 두 번째 인자가 함수면 팩토리로 호출됩니다. 함수 자체를 값으로 저장하려면 팩토리로 감싸세요.

#### Set 확장

```typescript
const set = new Set<string>();

// 여러 값 추가
set.adds("a", "b", "c");

// 토글
set.toggle("item");  // 있으면 제거, 없으면 추가
set.toggle("item", "add");  // 강제 추가
set.toggle("item", "del");  // 강제 제거
```

### 🔄 데이터 변환

#### JsonConvert
커스텀 타입 지원 JSON 변환

```typescript
import { JsonConvert } from "@simplysm/core-common";

const obj = {
  id: new Uuid("..."),
  createdAt: new DateTime(),
  tags: new Set(["a", "b"]),
  metadata: new Map([["key", "value"]])
};

const json = JsonConvert.stringify(obj);  // 커스텀 타입 자동 변환
const restored = JsonConvert.parse(json);  // 원본 타입 복원
```

지원 타입: `Uuid`, `DateTime`, `DateOnly`, `Time`, `Buffer`, `Date`, `Set`, `Map`, `Error`

#### XmlConvert
XML 파싱 및 생성

```typescript
import { XmlConvert } from "@simplysm/core-common";

// 파싱
const obj = XmlConvert.parse(xmlString);

// 생성
const xml = XmlConvert.stringify(obj);
```

### 🔁 Worker 데이터 전송

#### TransferableConvert
Worker 간 데이터 전송을 위한 직렬화/역직렬화

```typescript
import { TransferableConvert } from "@simplysm/core-common";

// Worker에 전송할 데이터 준비
const data = {
  id: new Uuid("550e8400-e29b-41d4-a716-446655440000"),
  createdAt: new DateTime(),
  buffer: Buffer.from("hello"),
};

const { result, transferList } = TransferableConvert.encode(data);
worker.postMessage(result, transferList);

// Worker에서 데이터 복원
const decoded = TransferableConvert.decode(event.data);
```

지원 타입: `Uuid`, `DateTime`, `DateOnly`, `Time`, `Buffer`, `Map`, `Set`, `Error` (+ cause, detail)

### 🗜️ ZIP 파일 처리

```typescript
import { SdZip } from "@simplysm/core-common";

// 생성
const zip = new SdZip();
zip.write("file1.txt", Buffer.from("content 1"));
zip.write("file2.txt", Buffer.from("content 2"));
const zipBuffer = await zip.compressAsync();

// 추출
const result = new SdZip(zipBuffer);
const files = await result.extractAllAsync();
const content = await result.getAsync("file1.txt");
```

### ⏱️ 비동기 제어

#### Wait
대기 유틸리티

```typescript
import { Wait } from "@simplysm/core-common";

// 시간 대기
await Wait.time(1000);  // 1초 대기

// 조건 대기
await Wait.until(() => ready, 100, 5000);  // 100ms마다 체크, 5초 타임아웃
```

#### SdAsyncFnDebounceQueue
디바운스 큐 (마지막 요청만 실행)

```typescript
import { SdAsyncFnDebounceQueue } from "@simplysm/core-common";

const queue = new SdAsyncFnDebounceQueue(300);  // 300ms 디바운스

queue.run(async () => {
  await saveData();
});

queue.on("error", (err) => {
  console.error(err);
});
```

#### SdAsyncFnSerialQueue
직렬 큐 (순차 실행)

```typescript
import { SdAsyncFnSerialQueue } from "@simplysm/core-common";

const queue = new SdAsyncFnSerialQueue(100);  // 작업 간 100ms 간격

queue.run(async () => await task1());
queue.run(async () => await task2());
queue.run(async () => await task3());
```

### ❌ 에러 클래스

#### SdError
에러 체이닝 지원 (ES2022 cause)

```typescript
import { SdError } from "@simplysm/core-common";

try {
  // ...
} catch (err) {
  throw new SdError(err, "상위 작업 실패", "추가 컨텍스트");
}
```

#### ArgumentError
인수 오류 (YAML 포맷)

```typescript
import { ArgumentError } from "@simplysm/core-common";

if (age < 0) {
  throw new ArgumentError({ age, expected: ">= 0" });
}
```

#### TimeoutError
타임아웃 오류

```typescript
import { TimeoutError } from "@simplysm/core-common";

throw new TimeoutError(5000);  // 5000ms 타임아웃
```

## 타입 유틸리티

### PrimitiveType
ORM과 공유하는 Primitive 타입

```typescript
import { PrimitiveTypeMap, PrimitiveTypeStr, getPrimitiveTypeStr } from "@simplysm/core-common";

type PrimitiveTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  DateTime: DateTime;
  DateOnly: DateOnly;
  Time: Time;
  Uuid: Uuid;
  Buffer: Buffer;
};

const typeStr = getPrimitiveTypeStr(value);  // "string" | "number" | ...
```

### DeepPartial
깊은 Partial 타입

```typescript
import { DeepPartial } from "@simplysm/core-common";

type User = {
  id: string;
  profile: {
    name: string;
    age: number;
  };
};

const partialUser: DeepPartial<User> = {
  profile: { name: "John" }  // age 생략 가능
};
```

## 개발 가이드

### 프로젝트 구조

```
packages/core-common/
├── src/
│   ├── errors/          # 에러 클래스
│   ├── types/           # 커스텀 타입 (Uuid, DateTime 등)
│   ├── extensions/      # 프로토타입 확장 (Array, Map, Set)
│   ├── utils/           # 유틸리티 함수
│   ├── zip/             # ZIP 처리
│   ├── types.ts         # 타입 유틸리티
│   └── index.ts         # 진입점
└── tests/               # 테스트 (475개, 커버리지 86%+)
```

### 테스트

```bash
# 타입 체크
npx tsc --noEmit -p packages/core-common/tsconfig.json

# ESLint
npx eslint "packages/core-common/**/*.ts"

# 테스트 실행
npx vitest run packages/core-common
```

## 의존성

- **yaml**: YAML 파싱/생성
- **@zip.js/zip.js**: ZIP 파일 처리
- **fast-xml-parser**: XML 파싱/생성

## 브라우저 지원

Node.js 내장 모듈 폴리필(`esbuild-plugins-node-modules-polyfill`)을 사용하여 브라우저에서도 동작합니다.

```typescript
import path from "path";  // 브라우저에서도 사용 가능
Buffer.from("hello");     // 브라우저에서도 사용 가능
```

## 라이선스

MIT © 김석래

## 관련 패키지

- `@simplysm/core-browser` - 브라우저 전용 유틸리티
- `@simplysm/core-node` - Node.js 전용 유틸리티
- `@simplysm/orm-common` - ORM 쿼리 빌더
