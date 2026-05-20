# @simplysm/core-common

공통 유틸리티(타입·에러·큐·이벤트·변환·확장 메서드·환경변수). simplysm 모든 패키지의 공용 기반.

## 사용 트리거 인덱스

- **에러 클래스** — throw 시 트리 메시지/원인 체인 필요할 때. (자세히: 아래 [에러 클래스](#에러-클래스))
  - `SdError` — 일반 에러 (cause 체인, "상위 => 하위" 메시지)
  - `ArgumentError` — 인자 검증 실패 (인자 객체를 YAML 로 메시지에 첨부)
  - `NotImplementedError` — 미구현 분기/추상 메서드
  - `TimeoutError` — 대기 시간 초과 (`wait.until` 에서 자동 throw)
- **날짜·시간·UUID·캐시 타입** (자세히: [types.md](./types.md))
  - `DateTime` — 불변 날짜+시간 (밀리초 정밀도, 로컬 타임존). 변환·산술·포맷.
  - `DateOnly` — 불변 날짜만 (`yyyy-MM-dd`). ISO 8601 주차(`getWeekSeqOfYear`/`Month`).
  - `Time` — 불변 시간만 (`HH:mm:ss.fff`, 24h 순환).
  - `Uuid` — UUID v4 (`Uuid.generate()`), bytes 변환.
  - `LazyGcMap` — 마지막 접근 후 N ms 만료 LRU Map. **`dispose()` 필수**.
- **큐·이벤트 features** (자세히: [features.md](./features.md))
  - `EventEmitter<TEvents>` — 타입 안전 이벤트 (브라우저·Node 공용).
  - `DebounceQueue` — 연속 호출 중 마지막만 실행 (입력 자동완성·일괄 상태 변경).
  - `SerialQueue` — 순차 실행 (작업 사이 gap 옵션, 에러 발생 후에도 계속 실행).
- **유틸리티 네임스페이스** (자세히: [utils.md](./utils.md))
  - `obj` — 객체 깊은 복사/비교/병합(`clone`/`equal`/`merge`), 3-way merge, `omit`/`pick`/`map`, 체인 경로(`"a.b[0].c"`) get/set/delete, `unflatten`, `clearUndefined`.
  - `str` — 한글 조사(`getKoreanSuffix`), 전각→반각(`replaceFullWidth`), case 변환(`toPascalCase`/`toCamelCase`/`toKebabCase`/`toSnakeCase`), `isNullOrEmpty`, `insert`.
  - `num` — 비숫자 섞인 문자열 파싱(`parseInt`/`parseFloat`/`parseRoundedInt`), `isNullOrEmpty`(0 포함 타입 가드), 천 단위 + 소수점 포맷(`format`).
  - `bytes` — `Uint8Array` 결합(`concat`), hex/base64 인코딩·디코딩.
  - `path` — POSIX 경로 join/basename/extname (브라우저용, 슬래시 전용).
  - `json` — 커스텀 타입(Date/DateTime/DateOnly/Time/Uuid/Set/Map/Error/Uint8Array) 마커 직렬화 `stringify`/`parse`, null→undefined 복원.
  - `xml` — fast-xml-parser 래퍼 `parse`/`stringify`, `stripTagPrefix` 옵션.
  - `wait` — `wait.time(ms)`, `wait.until(cond, interval, maxCount)` (초과 시 `TimeoutError`).
  - `transfer` — Worker postMessage 용 `encode`/`decode`, `Uint8Array.buffer` zero-copy transferList.
  - `err` — 미지의 에러를 메시지 문자열로(`err.message`).
  - `dt` — date-format 저수준 `format`/`normalizeMonth`/`convert12To24` (`DateTime`/`DateOnly`/`Time` 내부용, 직접 사용 드묾).
  - `primitive` — 런타임 값 타입 추론(`primitive.typeStr`) → `PrimitiveTypeStr`.
- **Array/Set/Map 전역 확장 메서드** — `index.ts` import 시 자동 적용. (자세히: [extensions.md](./extensions.md))
  - Array 조회: `.single()` (0/1개 단언), `.first()`/`.last()` (조건부 find), `.filterExists()` (null 제거), `.ofType()`.
  - Array 비동기: `.filterAsync()`/`.mapAsync()`/`.mapManyAsync()` (순차), `.parallelAsync()` (`Promise.all`).
  - Array 변환: `.groupBy()`, `.toMap()`, `.toArrayMap()`, `.toSetMap()`, `.toObject()`, `.toTree("id", "parentId")`.
  - Array 중복·정렬: `.distinct({ keyFn })`, `.orderBy()`/`.orderByDesc()`, `.shuffle()`.
  - Array 비교·병합: `.diffs(target, { keys })` (INSERT/DELETE/UPDATE), `.oneWayDiffs()`, `.merge()`.
  - Array 집계: `.sum()`, `.min()`, `.max()`.
  - Array mutable: `.distinctThis()`, `.orderByThis()`, `.insert()`, `.remove()`, `.toggle()`, `.clear()`.
  - Set: `.adds(...)`, `.toggle(value, "add"|"del"?)`.
  - Map: `.getOrCreate(key, defaultOrFactory)`, `.update(key, (v) => newV)`.
- **환경변수** — `env(key)`/`env(key, value)`, `parseBoolEnv(v)`. `process.env` 우선, fallback `import.meta.env`. (자세히: 아래 [환경변수](#환경변수))
- **템플릿 문자열 태그** — IDE 코드 하이라이팅 + indent trim. `js`/`ts`/`html`/`tsql`/`mysql`/`pgsql` (모두 동일 동작, 하이라이팅 차별화 목적). (자세히: 아래 [템플릿 문자열 태그](#템플릿-문자열-태그))
- **ZIP 처리** — `ZipArchive(data?)`: 읽기·쓰기·압축·해제. `get/exists/write/extractAll/compress/close`. 사용 후 **`await archive.close()`** 필수. (자세히: 아래 [ZIP 처리](#zip-처리))
- **공통 타입** (자세히: 아래 [공통 타입](#공통-타입))
  - `Bytes` — `Uint8Array` 별칭 (Node `Buffer` 대체).
  - `PrimitiveTypeMap`/`PrimitiveTypeStr`/`PrimitiveType` — string/number/boolean/DateTime/DateOnly/Time/Uuid/Bytes 매핑 (orm-common 공유).
  - `DeepPartial<T>` — 재귀 optional (원시 타입은 그대로).
  - `Type<T>` — 클래스 생성자 타입 (DI·팩토리 패턴).

## 에러 클래스

```typescript
new SdError(cause: Error, ...messages: string[])
new SdError(...messages: string[])
// 메시지는 역순 결합: "상위 => 하위 => 원인". cause stack을 현재 stack에 append.

new ArgumentError(argObj)
new ArgumentError(message, argObj)
// 인자 객체를 YAML 형식으로 메시지에 포함.

new NotImplementedError(message?)   // "미구현: <message>"
new TimeoutError(count?, message?)  // "대기 시간 초과(N회 시도): <message>". wait.until 에서 자동 throw.
```

모두 `SdError` 상속. `name` 자동 설정.

## 환경변수

```typescript
env("PORT")             // string | undefined (process.env → import.meta.env)
env("PORT", "3000")     // void (process.env 에 기록, process 없으면 무시)
parseBoolEnv(v)         // "true"|"1"|"yes"|"on" → true (대소문자 무시)
```

## 템플릿 문자열 태그

```typescript
import { js, ts, html, tsql, mysql, pgsql } from "@simplysm/core-common";

const code = ts`
  interface User { name: string; }
`;
// → "interface User { name: string; }" (앞뒤 빈 줄·공통 들여쓰기 제거)
```

모두 동일 함수, IDE 하이라이팅 차별화 목적.

## ZIP 처리

```typescript
import { ZipArchive } from "@simplysm/core-common";

// 읽기
const archive = new ZipArchive(zipBytes);   // Blob 또는 Uint8Array
try {
  const content = await archive.get("file.txt");           // Bytes | undefined
  const exists = await archive.exists("file.txt");         // boolean
  const all = await archive.extractAll(onProgress?);       // Map<fileName, Bytes|undefined>
} finally {
  await archive.close();                                   // 필수
}

// 쓰기
const archive = new ZipArchive();
archive.write("file.txt", bytes);
const zipBytes = await archive.compress();    // 내부적으로 extractAll → 전체 메모리 로드
await archive.close();
```

`extractAll` 진행률 콜백: `{ fileName, totalSize, extractedSize }`. `compress()` 는 전체 파일을 메모리에 로드하므로 대용량 ZIP 주의.

## 공통 타입

```typescript
type Bytes = Uint8Array;                          // Buffer 대체

type PrimitiveTypeMap = {                          // orm-common 공유
  string: string; number: number; boolean: boolean;
  DateTime: DateTime; DateOnly: DateOnly; Time: Time;
  Uuid: Uuid; Bytes: Bytes;
};
type PrimitiveTypeStr = keyof PrimitiveTypeMap;
type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;

type DeepPartial<T>;                              // 재귀 optional, 원시 타입 유지
interface Type<T> extends Function { new (...args: unknown[]): T; }
```
