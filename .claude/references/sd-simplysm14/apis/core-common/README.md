# @simplysm/core-common

런타임 무관(Node.js·브라우저·Worker) 공통 유틸리티 패키지. 값 타입(날짜·UUID), 에러 트리, 비동기 큐/이벤트, Array/Set/Map 프로토타입 확장, 객체/문자열/숫자/바이트/경로/JSON/XML 유틸 네임스페이스를 제공. 패키지를 import 하면 부수효과로 `Array`/`Set`/`Map` 프로토타입 확장이 주입된다.

## 사용 트리거 인덱스

- **에러 클래스** (`SdError`/`ArgumentError`/`NotImplementedError`/`TimeoutError`) — 원인 체인을 가진 에러를 throw 하거나 `instanceof` 로 분기할 때. 자세히: [errors.md](./errors.md)
- **날짜/시간 값 타입** (`DateTime`/`DateOnly`/`Time`, `dt` 네임스페이스) — 불변 날짜·시간 값을 만들고 파싱·산술·포맷할 때. 자세히: [datetime.md](./datetime.md)
- **Array 확장 메서드** (`Array.prototype` 전역 확장) — `single`/`groupBy`/`distinct`/`orderBy`/`diffs`/`toTree` 등 컬렉션 가공이 필요할 때. 자세히: [array-ext.md](./array-ext.md)
- **객체 유틸** (`obj` 네임스페이스, `DeepPartial`/`Type`) — 깊은 복사·동등성·병합·체인 경로 접근·타입 안전 키 순회가 필요할 때. 자세히: [obj.md](./obj.md)
- **JSON/Worker 직렬화** (`json`/`transfer` 네임스페이스) — 커스텀 타입(날짜·UUID·Map·Set·Error)을 보존하며 JSON 또는 Worker 메시지로 직렬화할 때. 자세히: [json-transfer.md](./json-transfer.md)
- **비동기 런타임** (`DebounceQueue`/`SerialQueue`/`EventEmitter`/`LazyGcMap`/`createLogger`) — 디바운스·직렬 실행·타입 안전 이벤트·자동 만료 캐시·태그 로거가 필요할 때. 자세히: [async-runtime.md](./async-runtime.md)
- **`Uuid`** — UUID v4 생성·검증·바이트 변환이 필요할 때. (아래 인라인 "값 타입 보조 — Uuid")
- **환경변수** (`env`/`parseBoolEnv`) — process.env / import.meta.env 를 런타임 무관하게 읽고 쓸 때. (아래 인라인 "환경변수")
- **Set/Map 확장** (`Set.prototype.adds`/`toggle`, `Map.prototype.getOrCreate`/`update`) — Set/Map 을 체이닝으로 다룰 때. (아래 인라인 "Set/Map 확장")
- **문자열 유틸** (`str` 네임스페이스) — 한국어 조사·케이스 변환·전각 변환·빈 문자열 가드가 필요할 때. (아래 인라인 "str")
- **숫자 유틸** (`num` 네임스페이스) — 느슨한 정수/실수 파싱·천단위 포맷이 필요할 때. (아래 인라인 "num")
- **바이트 유틸** (`bytes` 네임스페이스) — Uint8Array hex/base64/concat 변환이 필요할 때. (아래 인라인 "bytes")
- **경로 유틸** (`path` 네임스페이스) — 브라우저에서 POSIX 경로 join/basename/extname 이 필요할 때. (아래 인라인 "path")
- **XML 유틸** (`xml` 네임스페이스) — XML 파싱/직렬화가 필요할 때. (아래 인라인 "xml")
- **대기 유틸** (`wait` 네임스페이스) — 조건 폴링·지연이 필요할 때. (아래 인라인 "wait")
- **에러 메시지 추출** (`err` 네임스페이스) — catch 의 `unknown` 에서 메시지 문자열을 뽑을 때. (아래 인라인 "err")
- **원시 타입 추론** (`primitive` 네임스페이스, `PrimitiveType*`/`Bytes`) — 런타임 값에서 ORM 원시 타입 문자열을 얻을 때. (아래 인라인 "primitive / 공통 타입")
- **코드 템플릿 태그** (`js`/`ts`/`html`/`tsql`/`mysql`/`pgsql`) — IDE 하이라이팅 + 들여쓰기 정규화가 필요할 때. (아래 인라인 "템플릿 태그")
- **`ZipArchive`** — ZIP 읽기/쓰기/압축/해제가 필요할 때. (아래 인라인 "ZipArchive")

## 값 타입 보조 — Uuid

```typescript
class Uuid {
  static generate(): Uuid;               // crypto.getRandomValues 기반 v4 생성
  static fromBytes(bytes: Bytes): Uuid;  // 16바이트 Uint8Array → Uuid (16바이트 아니면 ArgumentError)
  constructor(uuid: string);             // 형식 검증 후 보관 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx, 위반 시 ArgumentError)
  toString(): string;                    // UUID 문자열 반환
  toBytes(): Bytes;                       // 16바이트 Uint8Array 반환
}
```

- `generate()` — 새 랜덤 UUID 가 필요할 때(엔티티 PK 등). 암호학적으로 안전한 난수 사용.
- `fromBytes(bytes)` / `toBytes()` — 바이너리 저장/전송과 문자열 표현 사이를 오갈 때. 입력 바이트 길이가 16 이 아니면 `ArgumentError` throw.
- `new Uuid(str)` — 외부에서 받은 문자열을 검증해 값으로 승격할 때. 형식 불일치 시 `ArgumentError` throw.

```typescript
const id = Uuid.generate();
const restored = new Uuid(id.toString());
```

## 환경변수 — env / parseBoolEnv

```typescript
function env(key: string): string | undefined;     // 읽기: process.env 우선, 없으면 import.meta.env
function env(key: string, value: string): void;     // 쓰기: process.env[key] = value (process 존재 시)
function parseBoolEnv(value: unknown): boolean;      // "true"/"1"/"yes"/"on"(대소문자 무시) → true, 그 외 false
```

- `env(key)` — 단일 인자. Node 면 `process.env`, 브라우저(Vite) 면 `import.meta.env` 에서 조회. 둘 다 없으면 `undefined`. "값 없음"을 빈 문자열로 치환하지 않음.
- `env(key, value)` — 2번째 인자 전달 시 쓰기 모드. `process` 가 없는 환경(순수 브라우저)에서는 아무 동작 안 함.
- `parseBoolEnv(value)` — boolean 플래그용 환경변수를 해석할 때. 위 4개 리터럴만 true.

```typescript
if (parseBoolEnv(env("DEV"))) { /* 개발 모드 */ }
```

## Set/Map 확장

전역 `Set.prototype` / `Map.prototype` 에 메서드를 추가(import 시 자동 적용, `enumerable: false`).

```typescript
interface Set<T> {
  adds(...values: T[]): this;                       // 여러 값 일괄 추가, this 반환(체이닝)
  toggle(value: T, addOrDel?: "add" | "del"): this; // 토글: 인자 생략 시 있으면 제거/없으면 추가
}
interface Map<K, V> {
  getOrCreate(key: K, newValue: V): V;              // 값 직접 지정 (key 없을 때만 set)
  getOrCreate(key: K, newValueFn: () => V): V;      // 팩토리 지연 생성 (비싼 연산용)
  update(key: K, updateFn: (v: V | undefined) => V): void; // 현재 값(없으면 undefined) → 새 값으로 갱신
}
```

- `Set.toggle(value, addOrDel)` — `addOrDel` 생략 시 존재 여부로 자동 토글, `"add"` 면 강제 추가, `"del"` 면 강제 제거. 조건부 선택 상태(`isOn ? "add" : "del"`) 표현에 사용.
- `Map.getOrCreate` — 2번째 인자가 함수면 팩토리로 인식되어 호출됨. 함수 자체를 값으로 저장하려면 `() => myFn` 처럼 한 번 더 감싼다.
- `Map.update` — key 가 없어도 `updateFn(undefined)` 가 호출되어 새 값이 set 됨. 카운터 증가(`(v) => (v ?? 0) + 1`)·배열 누적에 사용.

```typescript
new Set([1, 2]).adds(3, 4).toggle(2); // {1, 3, 4}
countMap.update("k", (v) => (v ?? 0) + 1);
```

## str

`import * as str` 로 사용하는 문자열 유틸 네임스페이스.

```typescript
str.getKoreanSuffix(text: string, type: "을"|"은"|"이"|"와"|"랑"|"로"|"라"): string;
str.replaceFullWidth(str: string): string;
str.toPascalCase(str: string): string;
str.toCamelCase(str: string): string;
str.toKebabCase(str: string): string;
str.toSnakeCase(str: string): string;
str.isNullOrEmpty(str: string | undefined): str is "" | undefined;
str.insert(str: string, index: number, insertString: string): string;
```

- `getKoreanSuffix(text, type)` — 마지막 글자 받침 유무로 조사 선택. `type` 은 쌍의 대표 글자: `"을"`=을/를, `"은"`=은/는, `"이"`=이/가, `"와"`=과/와, `"랑"`=이랑/랑, `"로"`=으로/로(단 받침 ㄹ이면 "로"), `"라"`=이라/라. 한글 아닌 글자로 끝나면 받침 없음 처리.
- `replaceFullWidth(str)` — 전각 영문/숫자/공백/괄호를 반각으로. 스캔된 바코드·일본어 입력 정규화에 사용.
- `toPascalCase`/`toCamelCase`/`toKebabCase`/`toSnakeCase` — `-` `_` `.` 구분자 또는 대문자 경계 기준 케이스 변환. kebab/snake 는 연속 대문자를 각각 분리(`XMLParser`→`x-m-l-parser`)하고 기존 구분자는 보존.
- `isNullOrEmpty(str)` — 타입 가드. true 면 `"" | undefined`, false 면 비어있지 않은 `string` 으로 좁혀짐.
- `insert(str, index, insertString)` — 지정 위치에 삽입한 새 문자열 반환(원본 불변).

```typescript
str.getKoreanSuffix("사과", "을"); // "를"
str.toKebabCase("HelloWorld");      // "hello-world"
```

## num

```typescript
num.parseInt(text: unknown): number | undefined;        // 비숫자 제거 후 정수 (소수점 이하 버림)
num.parseFloat(text: unknown): number | undefined;      // 비숫자 제거 후 실수
num.parseRoundedInt(text: unknown): number | undefined; // parseFloat 후 반올림
num.isNullOrEmpty(val: number | undefined): val is 0 | undefined;
num.format(val: number, digit?: { max?: number; min?: number }): string;
```

- `parseInt`/`parseFloat` — `0-9 . -` 외 문자를 제거하고 파싱. 선행 `-` 만 음수 부호로 유지하고 중간 하이픈은 제거(`"010-1234"`→`101234`). 파싱 불가 시 결측(`undefined`) 그대로 반환. 숫자 입력은 그대로(정수는 trunc).
- `parseRoundedInt` — 소수 반올림이 필요할 때(`"12.6"`→13).
- `isNullOrEmpty(val)` — 타입 가드. null/undefined/0 이면 true → `0 | undefined`. "0 과 미입력을 같이 비움 처리"가 필요한 화면 가드용.
- `format(val, digit)` — `toLocaleString` 기반 천단위 구분. `digit.max` 최대 소수 자릿수, `digit.min` 최소(부족분 0 채움). `val` 이 결측이면 결과도 `undefined`(오버로드).

```typescript
num.parseInt("1,234원");        // 1234
num.format(1234.5, { min: 2 }); // "1,234.50"
```

## bytes

```typescript
bytes.concat(arrays: Bytes[]): Bytes;
bytes.toHex(bytes: Bytes): string;       // 소문자 hex
bytes.fromHex(hex: string): Bytes;        // 홀수 길이/비hex 문자 → ArgumentError
bytes.toBase64(bytes: Bytes): string;
bytes.fromBase64(base64: string): Bytes;  // 비base64 문자/잘못된 길이 → ArgumentError
```

- `concat(arrays)` — 여러 Uint8Array 를 하나로 이어붙인 새 배열. 청크 결합에 사용.
- `toHex`/`fromHex` — 바이너리를 16진 문자열로 표기/복원. `fromHex` 는 길이가 짝수이고 `[0-9a-fA-F]` 만 허용(위반 시 throw).
- `toBase64`/`fromBase64` — Node 의존 없는 자체 구현 base64. `fromBase64` 는 공백/패딩 정규화 후 검증, 길이 나머지 1 이면 throw.

## path

```typescript
path.join(...segments: string[]): string;              // POSIX(슬래시) join, 중복 슬래시 정리
path.basename(filePath: string, ext?: string): string;  // 마지막 세그먼트, ext 일치 시 제거
path.extname(filePath: string): string;                 // 확장자(점 포함), 숨김파일은 ""
```

- POSIX 슬래시(`/`) 전용. Windows 백슬래시 경로는 미지원. 브라우저·Capacitor 환경에서 Node `path` 대체용.
- `basename(p, ext)` — `ext` 가 끝과 일치하면 그만큼 잘라 확장자 없는 이름 반환.
- `extname` — `.gitignore` 같은 선행 점 파일은 빈 문자열(`""`).

## xml

```typescript
xml.parse(str: string, options?: { stripTagPrefix?: boolean }): unknown;
xml.stringify(obj: unknown, options?: XmlBuilderOptions): string;
```

- `parse` — `fast-xml-parser` 기반. 속성은 `$` 객체, 텍스트는 `_` 키, 자식 요소는 배열로. `stripTagPrefix: true` 면 `ns:tag` 의 네임스페이스 접두사 제거(속성 접두사는 유지).
- `stringify` — `$`(속성)·`_`(텍스트) 규약으로 XML 문자열 생성. `options` 로 fast-xml-parser 빌더 옵션 덮어쓰기.

```typescript
xml.parse('<root id="1"><item>hi</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hi" }] } }
```

## wait

```typescript
wait.until(forwarder: () => boolean | Promise<boolean>, milliseconds?: number, maxCount?: number): Promise<void>;
wait.time(millisecond: number): Promise<void>;
```

- `until(fn, interval, maxCount)` — `fn` 이 true 될 때까지 `interval`(기본 100ms) 간격으로 폴링. 첫 호출에서 true 면 즉시 반환. `maxCount` 지정 시 초과하면 `TimeoutError` throw(미지정이면 무제한).
- `time(ms)` — `setTimeout` 기반 지연 Promise.

```typescript
await wait.until(() => ready, 100, 50); // 최대 50회(5초) 폴링
await wait.time(300);
```

## err

```typescript
err.message(error: unknown): string; // Error 면 .message, 아니면 String(error)
```

- catch 블록의 `unknown` 에러에서 안전하게 메시지 문자열을 뽑을 때.

```typescript
try { /* ... */ } catch (e) { logger.error(err.message(e)); }
```

## primitive / 공통 타입

```typescript
primitive.typeStr(value: PrimitiveTypeMap[PrimitiveTypeStr]): PrimitiveTypeStr; // 런타임 값 → 원시 타입 문자열

type Bytes = Uint8Array;
type PrimitiveTypeMap = { string; number; boolean; DateTime; DateOnly; Time; Uuid; Bytes };
type PrimitiveTypeStr = keyof PrimitiveTypeMap;
type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined;
```

- `primitive.typeStr(value)` — 값의 런타임 타입을 보고 `"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"` 중 하나 반환. 위 8종 외 값이면 `ArgumentError` throw. ORM 컬럼 타입 추론과 공유.
- `Bytes` — 바이너리 표준 별칭(`Uint8Array`). Buffer 대신 사용.
- `PrimitiveType` — 원시 타입 union + `undefined`. 결측 보존을 위해 `undefined` 포함.
- `DeepPartial<T>` / `Type<T>` 타입 유틸은 [obj.md](./obj.md) 의 "타입 유틸리티" 참조.

## 템플릿 태그

```typescript
js / ts / html / tsql / mysql / pgsql (strings: TemplateStringsArray, ...values: unknown[]): string;
```

- 6개 태그 모두 동작은 동일: 보간 후 공통 들여쓰기 제거 + 앞뒤 빈 줄 trim. 차이는 IDE 의 언어 하이라이팅 힌트뿐(태그 이름이 곧 언어). 보간 값이 null/undefined 면 빈 문자열로 치환.

```typescript
const sql = mysql`
  SELECT *
  FROM users
`; // 공통 들여쓰기가 제거된 두 줄
```

## ZipArchive

```typescript
class ZipArchive {
  constructor(data?: Blob | Bytes);  // 데이터 생략 시 새(쓰기용) 아카이브
  extractAll(progressCallback?: (p: { fileName: string; totalSize: number; extractedSize: number }) => void): Promise<Map<string, Bytes | undefined>>;
  get(fileName: string): Promise<Bytes | undefined>;
  exists(fileName: string): Promise<boolean>;
  write(fileName: string, bytes: Bytes): void;  // 캐시에만 기록
  compress(): Promise<Bytes>;
  close(): Promise<void>;
}
```

- `constructor(data)` — `Blob`/`Bytes` 전달 시 읽기용, 생략 시 쓰기용 빈 아카이브.
- `get`/`exists` — 단일 파일 추출/존재 확인. 결과는 내부 캐시에 보관해 재추출 방지.
- `extractAll(cb)` — 전체 추출. `cb` 는 파일별 진행(`fileName`, 전체 바이트 `totalSize`, 누적 추출 `extractedSize`)을 보고.
- `write(name, bytes)` — 캐시에만 기록. 실제 압축 산출은 `compress()` 호출 시.
- `compress()` — 캐시(필요 시 `extractAll`)의 모든 파일을 ZIP 바이트로. 대용량은 전부 메모리 로드되므로 주의.
- `close()` — 리더 닫고 캐시 비움. `try/finally` 에서 호출 권장.

```typescript
const archive = new ZipArchive(zipBytes);
try {
  const content = await archive.get("file.txt");
} finally {
  await archive.close();
}
```
