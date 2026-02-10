# @simplysm/core-common

심플리즘 프레임워크의 공통 유틸리티 패키지이다.
Node.js와 브라우저 환경 모두에서 사용 가능한(neutral) 기본 모듈로, 날짜/시간 타입, 에러 클래스, 객체/배열/문자열 유틸리티, JSON 직렬화, ZIP 처리, 프로토타입 확장 등을 제공한다.

## 설치

```bash
npm install @simplysm/core-common
# 또는
pnpm add @simplysm/core-common
```

## 초기화

애플리케이션 엔트리 포인트(예: `index.ts`, `main.ts`)에서 패키지를 임포트하세요:

```typescript
import "@simplysm/core-common";
```

이 임포트는 Array, Map, Set 프로토타입 확장을 전역으로 활성화합니다.
확장 메서드(`getOrCreate()`, `toggle()` 등)를 사용하려면 반드시 앱 시작 시 임포트해야 합니다.

## 주요 모듈

### Errors

커스텀 에러 클래스들이다. 모두 `SdError`를 기반으로 cause 체인을 지원한다.

| 클래스 | 설명 |
|--------|------|
| `SdError` | 기본 에러 클래스 (cause 체인으로 오류 추적, 중첩된 스택 자동 통합) |
| `ArgumentError` | 인자 검증 에러 (YAML 포맷팅) |
| `NotImplementedError` | 미구현 기능 표시 |
| `TimeoutError` | 타임아웃 에러 |

```typescript
import { SdError, ArgumentError, NotImplementedError, TimeoutError } from "@simplysm/core-common";

// SdError: cause 체인으로 에러 추적
try {
  await fetch(url);
} catch (err) {
  throw new SdError(err, "API 호출 실패", "사용자 로드 실패");
  // 결과 메시지: "사용자 로드 실패 => API 호출 실패 => 원본 에러 메시지"
}

// ArgumentError: 인수 객체를 YAML 형식으로 출력
throw new ArgumentError("유효하지 않은 사용자", { userId: 123 });
// 결과 메시지: "유효하지 않은 사용자\n\nuserId: 123"

// NotImplementedError: 미구현 분기 표시
switch (type) {
  case "A": return handleA();
  case "B": throw new NotImplementedError(`타입 ${type} 처리`);
}

// TimeoutError: 대기 시간 초과
throw new TimeoutError(5, "API 응답 대기 초과");
// 결과 메시지: "대기 시간이 초과되었습니다(5회): API 응답 대기 초과"
```

### Types

불변(immutable) 커스텀 타입 클래스들이다. 모든 변환 메서드는 새 인스턴스를 반환한다.

| 클래스 | 설명 |
|--------|------|
| `DateTime` | 날짜+시간 (밀리초 단위, 로컬 타임존 기준) |
| `DateOnly` | 날짜만 (시간 제외) |
| `Time` | 시간만 (날짜 제외, 24시간 순환) |
| `Uuid` | UUID v4 (`crypto.getRandomValues` 기반) |
| `LazyGcMap` | 자동 만료 기능이 있는 Map (LRU 방식) |

#### DateTime

```typescript
import { DateTime } from "@simplysm/core-common";

// 생성
const now = new DateTime();                          // 현재 시간
const dt = new DateTime(2025, 1, 15, 10, 30, 0);    // 연월일시분초
const fromTick = new DateTime(1705312200000);         // tick (밀리초)
const fromDate = new DateTime(new Date());            // Date 객체

// 파싱
DateTime.parse("2025-01-15 10:30:00");               // yyyy-MM-dd HH:mm:ss
DateTime.parse("2025-01-15 10:30:00.123");           // yyyy-MM-dd HH:mm:ss.fff
DateTime.parse("20250115103000");                     // yyyyMMddHHmmss
DateTime.parse("2025-01-15 오전 10:30:00");           // 한국어 오전/오후
DateTime.parse("2025-01-15T10:30:00Z");              // ISO 8601

// 속성 (읽기 전용)
dt.year;       // 2025
dt.month;      // 1 (1-12)
dt.day;        // 15
dt.hour;       // 10
dt.minute;     // 30
dt.second;     // 0
dt.millisecond; // 0
dt.tick;       // 밀리초 타임스탬프
dt.dayOfWeek;  // 요일 (일~토: 0~6)
dt.isValid;    // 유효성 검사

// 불변 변환 (새 인스턴스 반환)
dt.setYear(2026);         // 연도 변경
dt.setMonth(3);           // 월 변경 (일자 자동 조정)
dt.addDays(7);            // 7일 후
dt.addHours(-2);          // 2시간 전
dt.addMonths(1);          // 1개월 후

// 포맷팅
dt.toFormatString("yyyy-MM-dd");               // "2025-01-15"
dt.toFormatString("yyyy년 M월 d일 (ddd)");     // "2025년 1월 15일 (수)"
dt.toFormatString("tt h:mm:ss");               // "오전 10:30:00"
dt.toString();                                  // "2025-01-15T10:30:00.000+09:00"
```

#### DateOnly

```typescript
import { DateOnly } from "@simplysm/core-common";

// 생성 및 파싱
const today = new DateOnly();
const d = new DateOnly(2025, 1, 15);
DateOnly.parse("2025-01-15");     // 타임존 영향 없음
DateOnly.parse("20250115");       // 타임존 영향 없음

// 불변 변환
d.addDays(30);
d.addMonths(-1);
d.setMonth(2);  // 1월 31일 -> 2월 28일 (자동 조정)

// 주차 계산 (ISO 8601 표준)
d.getWeekSeqOfYear();    // { year: 2025, weekSeq: 3 }
d.getWeekSeqOfMonth();   // { year: 2025, monthSeq: 1, weekSeq: 3 }

// 미국식 주차 (일요일 시작, 첫 주 1일 이상)
d.getWeekSeqOfYear(0, 1);

// 주차로 날짜 역산
DateOnly.getDateByYearWeekSeq({ year: 2025, weekSeq: 2 }); // 2025-01-06 (월요일)

// 포맷팅
d.toFormatString("yyyy년 MM월 dd일"); // "2025년 01월 15일"
d.toString();                          // "2025-01-15"
```

#### Time

```typescript
import { Time } from "@simplysm/core-common";

// 생성 및 파싱
const now = new Time();
const t = new Time(14, 30, 0);
Time.parse("14:30:00");           // HH:mm:ss
Time.parse("14:30:00.123");       // HH:mm:ss.fff
Time.parse("오후 2:30:00");       // 한국어 오전/오후

// 24시간 순환
t.addHours(12);    // 14:30 + 12시간 = 02:30 (다음 날이 아닌 순환)
t.addMinutes(-60); // 14:30 - 60분 = 13:30

// 포맷팅
t.toFormatString("tt h:mm"); // "오후 2:30"
t.toString();                 // "14:30:00.000"
```

#### Uuid

```typescript
import { Uuid } from "@simplysm/core-common";

// 새 UUID 생성 (암호학적으로 안전)
const id = Uuid.new();

// 문자열에서 생성
const fromStr = new Uuid("550e8400-e29b-41d4-a716-446655440000");

// 바이트 변환
const bytes = id.toBytes();           // Uint8Array (16바이트)
const fromBytes = Uuid.fromBytes(bytes);

id.toString(); // "550e8400-e29b-41d4-a716-446655440000"
```

#### LazyGcMap

```typescript
import { LazyGcMap } from "@simplysm/core-common";

// using 문 사용 (권장)
using map = new LazyGcMap<string, object>({
  gcInterval: 10000,  // GC 실행 간격: 10초
  expireTime: 60000,  // 항목 만료 시간: 60초
  onExpire: (key, value) => {
    console.log(`만료됨: ${key}`);
  },
});

map.set("key1", { data: "hello" });
map.get("key1");                       // 접근 시간 갱신 (LRU)
map.getOrCreate("key2", () => ({}));   // 없으면 생성 후 반환
map.has("key1");                       // 접근 시간 갱신 안 함
map.delete("key1");
```

### Features

비동기 작업 제어 및 이벤트 처리 클래스들이다. 모두 `using` 문 또는 `dispose()`를 지원한다.

| 클래스 | 설명 |
|--------|------|
| `DebounceQueue` | 비동기 디바운스 큐 (마지막 요청만 실행) |
| `SerialQueue` | 비동기 직렬 큐 (순차 실행) |
| `EventEmitter` | EventTarget 래퍼 (type-safe 이벤트) |

#### DebounceQueue

```typescript
import { DebounceQueue } from "@simplysm/core-common";

using queue = new DebounceQueue(300); // 300ms 디바운스

// 에러 처리
queue.on("error", (err) => console.error(err));

// 마지막 호출만 실행됨
queue.run(() => console.log("1")); // 무시됨
queue.run(() => console.log("2")); // 무시됨
queue.run(() => console.log("3")); // 300ms 후 실행됨
```

#### SerialQueue

```typescript
import { SerialQueue } from "@simplysm/core-common";

using queue = new SerialQueue(100); // 작업 사이 100ms 간격

queue.on("error", (err) => console.error(err));

queue.run(async () => { await fetch("/api/1"); });
queue.run(async () => { await fetch("/api/2"); }); // 1번 완료 후 실행
queue.run(async () => { await fetch("/api/3"); }); // 2번 완료 후 실행
```

#### EventEmitter

```typescript
import { EventEmitter } from "@simplysm/core-common";

interface MyEvents {
  data: string;
  error: Error;
  done: void;
}

class MyService extends EventEmitter<MyEvents> {
  process(): void {
    this.emit("data", "결과 데이터");
    this.emit("done"); // void 타입은 인자 없이 호출
  }
}

const service = new MyService();
service.on("data", (data) => console.log(data)); // data: string (타입 추론)
service.off("data", listener);                   // 리스너 제거
service.listenerCount("data");                   // 등록된 리스너 수
service.dispose();                                // 모든 리스너 제거
```

### Utils

유틸리티 함수들이다.

#### 객체 유틸리티 (obj)

| 함수 | 설명 |
|------|------|
| `objClone` | 깊은 복사 (순환 참조, 커스텀 타입 지원) |
| `objEqual` | 깊은 비교 (키 포함/제외, 배열 순서 무시 옵션) |
| `objMerge` | 깊은 병합 (source + target, 배열 처리 옵션) |
| `objMerge3` | 3-way 병합 (충돌 감지) |
| `objOmit` | 특정 키 제외 |
| `objPick` | 특정 키만 선택 |
| `objGetChainValue` | 체인 경로로 값 조회 (`"a.b[0].c"`) |
| `objSetChainValue` | 체인 경로로 값 설정 |
| `objDeleteChainValue` | 체인 경로로 값 삭제 |
| `objKeys` | 타입 안전한 `Object.keys` |
| `objEntries` | 타입 안전한 `Object.entries` |
| `objFromEntries` | 타입 안전한 `Object.fromEntries` |
| `objMap` | 객체의 각 엔트리를 변환하여 새 객체 반환 |

```typescript
import {
  objClone, objEqual, objMerge, objMerge3,
  objOmit, objPick, objGetChainValue, objSetChainValue,
  objKeys, objEntries, objMap,
} from "@simplysm/core-common";

// 깊은 복사 (DateTime, Uuid 등 커스텀 타입도 지원)
const cloned = objClone({ date: new DateTime(), nested: { arr: [1, 2] } });

// 깊은 비교
objEqual({ a: 1, b: [2] }, { a: 1, b: [2] });                       // true
objEqual(arr1, arr2, { ignoreArrayIndex: true });                     // 배열 순서 무시
objEqual(obj1, obj2, { topLevelExcludes: ["updatedAt"] });            // 특정 키 제외

// 깊은 병합
objMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } });
// { a: 1, b: { c: 2, d: 3 } }

// 3-way 병합 (충돌 감지)
const { conflict, result } = objMerge3(
  { a: 1, b: 2 },  // source (변경본 1)
  { a: 1, b: 1 },  // origin (기준본)
  { a: 2, b: 1 },  // target (변경본 2)
);
// conflict: false, result: { a: 2, b: 2 }

// 키 선택/제외
objOmit(user, ["password", "email"]);
objPick(user, ["name", "age"]);

// 체인 경로
objGetChainValue(obj, "a.b[0].c");
objSetChainValue(obj, "a.b[0].c", "value");

// 타입 안전한 Object 유틸리티
objKeys(obj);       // (keyof typeof obj)[]
objEntries(obj);    // [keyof typeof obj, typeof obj[keyof typeof obj]][]
objMap(colors, (key, rgb) => [null, `rgb(${rgb})`]); // 값만 변환 (키 유지)
```

#### JSON 유틸리티 (json)

| 함수 | 설명 |
|------|------|
| `jsonStringify` | 커스텀 타입 지원 JSON 직렬화 |
| `jsonParse` | 커스텀 타입 복원 JSON 역직렬화 |

`DateTime`, `DateOnly`, `Time`, `Uuid`, `Date`, `Set`, `Map`, `Error`, `Uint8Array` 타입을 `__type__` 메타데이터로 직렬화/복원한다.

```typescript
import { jsonStringify, jsonParse, DateTime, Uuid } from "@simplysm/core-common";

const data = {
  createdAt: new DateTime(2025, 1, 15),
  id: Uuid.new(),
  tags: new Set(["a", "b"]),
  meta: new Map([["key", "value"]]),
  file: new Uint8Array([1, 2, 3]),
};

// 직렬화 (커스텀 타입 보존)
const json = jsonStringify(data, { space: 2 });

// 역직렬화 (커스텀 타입 복원)
const parsed = jsonParse(json);
// parsed.createdAt instanceof DateTime === true
// parsed.id instanceof Uuid === true
// parsed.tags instanceof Set === true

// 로깅용: 바이너리 데이터 숨김
jsonStringify(data, { redactBytes: true });
// Uint8Array 내용이 "__hidden__"으로 대체됨
```

#### XML 유틸리티 (xml)

| 함수 | 설명 |
|------|------|
| `xmlParse` | XML 문자열을 객체로 파싱 (속성: `$`, 텍스트: `_`) |
| `xmlStringify` | 객체를 XML 문자열로 직렬화 |

```typescript
import { xmlParse, xmlStringify } from "@simplysm/core-common";

const obj = xmlParse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }

const xml = xmlStringify(obj);
// '<root id="1"><item>hello</item></root>'

// namespace prefix 제거
xmlParse('<ns:root><ns:item>text</ns:item></ns:root>', { stripTagPrefix: true });
// { root: { item: [{ _: "text" }] } }
```

#### 문자열 유틸리티 (str)

| 함수 | 설명 |
|------|------|
| `strGetSuffix` | 한글 조사 처리 (을/를, 은/는, 이/가, 과/와, 이랑/랑, 으로/로, 이라/라) |
| `strReplaceFullWidth` | 전각 문자를 반각 문자로 변환 |
| `strToPascalCase` | PascalCase 변환 |
| `strToCamelCase` | camelCase 변환 |
| `strToKebabCase` | kebab-case 변환 |
| `strToSnakeCase` | snake_case 변환 |
| `strIsNullOrEmpty` | undefined/null/빈 문자열 체크 (타입 가드) |
| `strInsert` | 문자열 특정 위치에 삽입 |

```typescript
import {
  strGetSuffix, strToCamelCase, strToKebabCase,
  strIsNullOrEmpty, strReplaceFullWidth,
} from "@simplysm/core-common";

// 한글 조사
strGetSuffix("사과", "을"); // "를"
strGetSuffix("책", "이");   // "이"
strGetSuffix("서울", "로"); // "로" (ㄹ 받침은 "로")

// 케이스 변환
strToCamelCase("hello-world");   // "helloWorld"
strToKebabCase("HelloWorld");    // "hello-world"

// 빈 문자열 체크 (타입 가드)
if (strIsNullOrEmpty(name)) {
  // name: "" | undefined
} else {
  // name: string (비어있지 않은 문자열)
}

// 전각 -> 반각
strReplaceFullWidth("Ａ１２３（株）"); // "A123(株)"
```

#### 숫자 유틸리티 (num)

| 함수 | 설명 |
|------|------|
| `numParseInt` | 문자열을 정수로 파싱 (숫자 외 문자 제거) |
| `numParseFloat` | 문자열을 실수로 파싱 |
| `numParseRoundedInt` | 실수를 반올림하여 정수 반환 |
| `numFormat` | 천단위 구분자 포맷팅 |
| `numIsNullOrEmpty` | undefined/null/0 체크 (타입 가드) |

```typescript
import { numParseInt, numParseFloat, numFormat, numIsNullOrEmpty } from "@simplysm/core-common";

numParseInt("12,345원");                    // 12345
numParseFloat("3.14%");                     // 3.14
numFormat(1234567, { max: 2 });             // "1,234,567"
numFormat(1234, { min: 2, max: 2 });        // "1,234.00"

if (numIsNullOrEmpty(count)) {
  // count: 0 | undefined
}
```

#### 날짜/시간 포맷 (date-format)

| 함수 | 설명 |
|------|------|
| `formatDate` | 포맷 문자열에 따라 날짜/시간을 문자열로 변환 |
| `normalizeMonth` | 월 설정 시 연도/월/일 정규화 |

C#과 동일한 포맷 문자열을 지원한다:

| 포맷 | 설명 | 예시 |
|------|------|------|
| `yyyy` | 4자리 연도 | 2024 |
| `yy` | 2자리 연도 | 24 |
| `MM` | 0 패딩 월 | 01~12 |
| `M` | 월 | 1~12 |
| `ddd` | 요일 (한글) | 일, 월, 화, 수, 목, 금, 토 |
| `dd` | 0 패딩 일 | 01~31 |
| `d` | 일 | 1~31 |
| `tt` | 오전/오후 | 오전, 오후 |
| `HH` | 0 패딩 24시간 | 00~23 |
| `hh` | 0 패딩 12시간 | 01~12 |
| `mm` | 0 패딩 분 | 00~59 |
| `ss` | 0 패딩 초 | 00~59 |
| `fff` | 밀리초 (3자리) | 000~999 |
| `zzz` | 타임존 오프셋 | +09:00 |

```typescript
import { formatDate, normalizeMonth } from "@simplysm/core-common";

formatDate("yyyy-MM-dd", { year: 2024, month: 3, day: 15 });
// "2024-03-15"

formatDate("yyyy년 M월 d일 (ddd)", { year: 2024, month: 3, day: 15 });
// "2024년 3월 15일 (금)"

normalizeMonth(2025, 13, 15); // { year: 2026, month: 1, day: 15 }
normalizeMonth(2025, 2, 31);  // { year: 2025, month: 2, day: 28 }
```

#### 바이트 유틸리티 (bytes)

| 함수 | 설명 |
|------|------|
| `bytesConcat` | 여러 Uint8Array 연결 |
| `bytesToHex` | Uint8Array를 hex 문자열로 변환 |
| `bytesFromHex` | hex 문자열을 Uint8Array로 변환 |
| `bytesToBase64` | Uint8Array를 base64 문자열로 변환 |
| `bytesFromBase64` | base64 문자열을 Uint8Array로 변환 |

```typescript
import { bytesConcat, bytesToHex, bytesFromHex, bytesToBase64, bytesFromBase64 } from "@simplysm/core-common";

bytesConcat([new Uint8Array([1, 2]), new Uint8Array([3, 4])]);
// Uint8Array([1, 2, 3, 4])

bytesToHex(new Uint8Array([255, 0, 127]));  // "ff007f"
bytesFromHex("ff007f");                      // Uint8Array([255, 0, 127])

bytesToBase64(new Uint8Array([72, 101, 108, 108, 111]));  // "SGVsbG8="
bytesFromBase64("SGVsbG8=");                               // Uint8Array([72, 101, 108, 108, 111])
```

#### 비동기 대기 (wait)

| 함수 | 설명 |
|------|------|
| `waitTime` | 지정 시간만큼 대기 |
| `waitUntil` | 조건이 참이 될 때까지 대기 (최대 시도 횟수 제한) |

```typescript
import { waitTime, waitUntil } from "@simplysm/core-common";

await waitTime(1000); // 1초 대기

// 조건 충족 대기 (100ms 간격, 최대 50회 = 5초)
await waitUntil(() => isReady, 100, 50);
// 50회 초과 시 TimeoutError 발생
```

#### Worker 데이터 변환 (transferable)

| 함수 | 설명 |
|------|------|
| `transferableEncode` | 커스텀 타입을 Worker 전송 가능 형태로 직렬화 |
| `transferableDecode` | Worker에서 받은 데이터를 커스텀 타입으로 역직렬화 |

```typescript
import { transferableEncode, transferableDecode } from "@simplysm/core-common";

// Worker로 전송
const { result, transferList } = transferableEncode(data);
worker.postMessage(result, transferList);

// Worker에서 수신
const decoded = transferableDecode(event.data);
```

#### 경로 유틸리티 (path)

Node.js `path` 모듈 대체용이다. POSIX 스타일 경로(`/`)만 지원한다.

| 함수 | 설명 |
|------|------|
| `pathJoin` | 경로 조합 (`path.join` 대체) |
| `pathBasename` | 파일명 추출 (`path.basename` 대체) |
| `pathExtname` | 확장자 추출 (`path.extname` 대체) |

```typescript
import { pathJoin, pathBasename, pathExtname } from "@simplysm/core-common";

pathJoin("/home", "user", "file.txt"); // "/home/user/file.txt"
pathBasename("/home/user/file.txt");   // "file.txt"
pathBasename("file.txt", ".txt");      // "file"
pathExtname("file.txt");               // ".txt"
```

#### 템플릿 리터럴 태그 (template-strings)

IDE 코드 하이라이팅을 위한 태그 함수들이다. 실제 동작은 문자열 조합 + 들여쓰기 정리이다.

| 함수 | 설명 |
|------|------|
| `js` | JavaScript 코드 하이라이팅 |
| `ts` | TypeScript 코드 하이라이팅 |
| `html` | HTML 마크업 하이라이팅 |
| `tsql` | MSSQL T-SQL 하이라이팅 |
| `mysql` | MySQL SQL 하이라이팅 |
| `pgsql` | PostgreSQL SQL 하이라이팅 |

```typescript
import { tsql } from "@simplysm/core-common";

const query = tsql`
  SELECT TOP 10 *
  FROM Users
  WHERE Name LIKE '%${keyword}%'
`;
```

#### 기타 유틸리티

| 함수/타입 | 설명 |
|-----------|------|
| `getPrimitiveTypeStr` | 런타임 값에서 `PrimitiveTypeStr` 추론 |
| `env` | 환경 변수 객체 (`DEV`, `VER` 등) |

```typescript
import { getPrimitiveTypeStr, env } from "@simplysm/core-common";

getPrimitiveTypeStr("hello");        // "string"
getPrimitiveTypeStr(123);            // "number"
getPrimitiveTypeStr(new DateTime()); // "DateTime"

if (env.DEV) {
  console.log("개발 모드");
}
console.log(`버전: ${env.VER}`);
```

### Zip

ZIP 파일 압축/해제 유틸리티이다. `await using`으로 리소스를 자동 정리할 수 있다.

| 클래스 | 설명 |
|--------|------|
| `ZipArchive` | ZIP 파일 읽기/쓰기/압축/해제 |

```typescript
import { ZipArchive } from "@simplysm/core-common";

// ZIP 파일 읽기
await using archive = new ZipArchive(zipBytes);
const content = await archive.get("file.txt");
const exists = await archive.exists("data.json");

// 전체 압축 해제 (진행률 표시)
const files = await archive.extractAll((progress) => {
  console.log(`${progress.fileName}: ${progress.extractedSize}/${progress.totalSize}`);
});

// ZIP 파일 생성
await using newArchive = new ZipArchive();
newArchive.write("file.txt", textBytes);
newArchive.write("data.json", jsonBytes);
const zipBytes = await newArchive.compress();
```

### Type Utilities

TypeScript 유틸리티 타입들이다.

| 타입 | 설명 |
|------|------|
| `Bytes` | `Uint8Array`의 별칭 (`Buffer` 대체) |
| `PrimitiveTypeStr` | 원시 타입 문자열 키 (`"string"`, `"number"`, `"boolean"`, `"DateTime"`, `"DateOnly"`, `"Time"`, `"Uuid"`, `"Bytes"`) |
| `PrimitiveTypeMap` | `PrimitiveTypeStr`에서 실제 타입으로의 매핑 |
| `PrimitiveType` | 모든 Primitive 타입의 유니온 |
| `DeepPartial<T>` | 모든 속성을 재귀적으로 optional로 변환 |
| `Type<T>` | 생성자 타입 (의존성 주입, 팩토리 패턴용) |
| `ObjUndefToOptional<T>` | `undefined`를 가진 프로퍼티를 optional로 변환 |
| `ObjOptionalToUndef<T>` | optional 프로퍼티를 `required + undefined` 유니온으로 변환 |

```typescript
import type { DeepPartial, Type, Bytes } from "@simplysm/core-common";

// DeepPartial: 깊은 Partial
interface Config {
  db: { host: string; port: number };
}
const partial: DeepPartial<Config> = { db: { host: "localhost" } };

// Type: 생성자 타입
function create<T>(ctor: Type<T>): T {
  return new ctor();
}

// Bytes: Buffer 대체
const data: Bytes = new Uint8Array([1, 2, 3]);
```

### Extensions

Array, Map, Set 프로토타입 확장이다. `import "@simplysm/core-common"`으로 활성화된다.

#### Array 확장 메서드

**조회**:

| 메서드 | 설명 |
|--------|------|
| `single(predicate?)` | 단일 요소 반환 (2개 이상이면 에러) |
| `first(predicate?)` | 첫 번째 요소 반환 |
| `last(predicate?)` | 마지막 요소 반환 |

**필터링**:

| 메서드 | 설명 |
|--------|------|
| `filterExists()` | `null`/`undefined` 제거 |
| `ofType(type)` | 타입별 필터 (`PrimitiveTypeStr` 또는 생성자) |
| `filterAsync(predicate)` | 비동기 필터 |

**매핑/변환**:

| 메서드 | 설명 |
|--------|------|
| `mapAsync(selector)` | 비동기 매핑 (순차 실행) |
| `mapMany(selector?)` | flat + filterExists |
| `mapManyAsync(selector?)` | 비동기 mapMany |
| `parallelAsync(fn)` | 병렬 비동기 매핑 (`Promise.all`) |

**그룹화/변환**:

| 메서드 | 설명 |
|--------|------|
| `groupBy(keySelector, valueSelector?)` | 키별 그룹화 |
| `toMap(keySelector, valueSelector?)` | Map 변환 (키 중복 시 에러) |
| `toMapAsync(keySelector, valueSelector?)` | 비동기 Map 변환 |
| `toArrayMap(keySelector, valueSelector?)` | `Map<K, V[]>` 변환 |
| `toSetMap(keySelector, valueSelector?)` | `Map<K, Set<V>>` 변환 |
| `toMapValues(keySelector, valueSelector)` | 그룹별 집계 Map |
| `toObject(keySelector, valueSelector?)` | `Record<string, V>` 변환 |
| `toTree(key, parentKey)` | 트리 구조 변환 |

**중복 제거**:

| 메서드 | 설명 |
|--------|------|
| `distinct(options?)` | 중복 제거 (새 배열 반환) |
| `distinctThis(options?)` | 중복 제거 (원본 수정) |

**정렬**:

| 메서드 | 설명 |
|--------|------|
| `orderBy(selector?)` | 오름차순 정렬 (새 배열 반환) |
| `orderByDesc(selector?)` | 내림차순 정렬 (새 배열 반환) |
| `orderByThis(selector?)` | 오름차순 정렬 (원본 수정) |
| `orderByDescThis(selector?)` | 내림차순 정렬 (원본 수정) |

**비교/병합**:

| 메서드 | 설명 |
|--------|------|
| `diffs(target, options?)` | 두 배열의 차이 비교 |
| `oneWayDiffs(orgItems, keyProp, options?)` | 단방향 차이 비교 (create/update/same) |
| `merge(target, options?)` | 배열 병합 |

**집계**:

| 메서드 | 설명 |
|--------|------|
| `sum(selector?)` | 합계 |
| `min(selector?)` | 최솟값 |
| `max(selector?)` | 최댓값 |

**변형 (원본 수정)**:

| 메서드 | 설명 |
|--------|------|
| `insert(index, ...items)` | 특정 위치에 삽입 |
| `remove(itemOrSelector)` | 항목 제거 |
| `toggle(item)` | 있으면 제거, 없으면 추가 |
| `clear()` | 모든 항목 제거 |
| `shuffle()` | 셔플 (새 배열 반환) |

```typescript
import "@simplysm/core-common";

const users = [
  { id: 1, name: "Alice", dept: "dev" },
  { id: 2, name: "Bob", dept: "dev" },
  { id: 3, name: "Charlie", dept: "hr" },
];

// 조회
users.single((u) => u.id === 1);       // { id: 1, ... }
users.first();                           // { id: 1, ... }
users.last();                            // { id: 3, ... }

// 그룹화
users.groupBy((u) => u.dept);
// [{ key: "dev", values: [...] }, { key: "hr", values: [...] }]

// Map 변환
users.toMap((u) => u.id);               // Map<number, User>
users.toArrayMap((u) => u.dept);         // Map<string, User[]>

// 정렬
users.orderBy((u) => u.name);
users.orderByDesc((u) => u.id);

// 필터링
[1, null, 2, undefined, 3].filterExists(); // [1, 2, 3]

// 중복 제거
[1, 2, 2, 3, 3].distinct(); // [1, 2, 3]

// 비동기 매핑 (순차 실행)
await ids.mapAsync(async (id) => await fetchUser(id));

// 병렬 비동기 매핑
await ids.parallelAsync(async (id) => await fetchUser(id));
```

#### Map 확장 메서드

| 메서드 | 설명 |
|--------|------|
| `getOrCreate(key, value)` | 키에 해당하는 값이 없으면 새 값 설정 후 반환 |
| `update(key, updateFn)` | 키에 해당하는 값을 함수로 업데이트 |

```typescript
const map = new Map<string, number[]>();

// 값이 없으면 생성 후 반환
const arr = map.getOrCreate("key", []);
arr.push(1);

// 팩토리 함수로 생성 (계산 비용이 큰 경우)
map.getOrCreate("key2", () => expensiveComputation());

// 값 업데이트
const countMap = new Map<string, number>();
countMap.update("key", (v) => (v ?? 0) + 1); // 카운터 증가
```

#### Set 확장 메서드

| 메서드 | 설명 |
|--------|------|
| `adds(...values)` | 여러 값을 한 번에 추가 |
| `toggle(value, addOrDel?)` | 값 토글 (있으면 제거, 없으면 추가) |

```typescript
const set = new Set<number>([1, 2, 3]);

set.adds(4, 5, 6);       // {1, 2, 3, 4, 5, 6}
set.toggle(2);            // 2가 있으므로 제거 -> {1, 3, 4, 5, 6}
set.toggle(7);            // 7이 없으므로 추가 -> {1, 3, 4, 5, 6, 7}
set.toggle(8, "add");     // 강제 추가
set.toggle(1, "del");     // 강제 제거
```

## 주의사항

### 프로토타입 확장 충돌

이 패키지는 Array, Map, Set 프로토타입을 확장한다.
동일한 메서드명을 확장하는 다른 라이브러리와 함께 사용 시 충돌이 발생할 수 있다.
충돌 시 로드 순서에 따라 마지막에 정의된 구현이 적용된다.

### 타임존 처리

`DateOnly.parse()`, `DateTime.parse()` 사용 시:
- `yyyy-MM-dd`, `yyyyMMdd` 형식: 문자열에서 직접 파싱 (타임존 영향 없음)
- ISO 8601 형식 (`2024-01-15T00:00:00Z`): UTC로 해석 후 로컬 변환

서버와 클라이언트 타임존이 다른 경우 `yyyy-MM-dd` 형식을 적극 활용한다.

### 메모리 관리 (LazyGcMap)

`LazyGcMap`은 내부 GC 타이머가 있으므로 반드시 정리해야 한다.

```typescript
// using 문 사용 (권장)
// gcInterval: GC 실행 간격 (ms), expireTime: 항목 만료 시간 (ms)
using map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 }); // 10초 간격 GC, 60초 후 만료

// 또는 명시적 dispose() 호출
const map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 }); // 10초 간격 GC, 60초 후 만료
try {
  // ... 사용
} finally {
  map.dispose();
}
```

### jsonStringify의 __type__ 예약어

`jsonStringify`/`jsonParse`는 `__type__`과 `data` 키를 가진 객체를 타입 복원에 사용한다.
사용자 데이터에 `{ __type__: "DateTime", data: "..." }` 형태가 있으면 의도치 않게 타입 변환될 수 있으므로 주의한다.

### 순환 참조

- `objClone`: 순환 참조 지원 (WeakMap으로 추적)
- `jsonStringify`: 순환 참조 시 TypeError 발생
- `transferableEncode`: 순환 참조 시 TypeError 발생 (경로 정보 포함)

## 라이선스

Apache-2.0
