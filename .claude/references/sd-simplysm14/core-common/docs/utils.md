# Utils

## `obj` namespace

깊은 복사, 비교, 병합, 객체 조작 유틸리티.

### `obj.clone<TObj>(source: TObj): TObj`

깊은 복사. 순환 참조 지원. `DateTime`, `DateOnly`, `Time`, `Uuid`, `Uint8Array`, `Error`, `Date`, `RegExp`, `Map`, `Set`, `Array` 등 커스텀 타입 복사를 지원한다.

```typescript
const copied = obj.clone({ nested: { data: [1, 2, 3] } });
```

### `obj.equal(source, target, options?): boolean`

깊은 동등성 비교. `EqualOptions` 참조.

```typescript
obj.equal(a, b, { topLevelExcludes: ["updatedAt"] });
obj.equal(arr1, arr2, { ignoreArrayIndex: true }); // 순서 무시 비교 (O(n²))
```

### `EqualOptions` (interface)

| Field | Type | Description |
|-------|------|-------------|
| `topLevelIncludes` | `string[] \| undefined` | 비교할 key 목록 (최상위 레벨만) |
| `topLevelExcludes` | `string[] \| undefined` | 비교에서 제외할 key 목록 (최상위 레벨만) |
| `ignoreArrayIndex` | `boolean \| undefined` | 배열 순서 무시 여부. `true`이면 O(n²) |
| `shallow` | `boolean \| undefined` | 얕은 비교 여부 |

### `obj.merge<TSource, TMergeTarget>(source, target, options?): TSource & TMergeTarget`

두 객체를 깊은 병합. `source` 기준으로 `target` 값으로 덮어씀.

### `MergeOptions` (interface)

| Field | Type | Description |
|-------|------|-------------|
| `arrayKeys` | `string[] \| undefined` | 배열 항목 병합 시 key로 사용할 속성명 |
| `excludes` | `string[] \| undefined` | 병합에서 제외할 속성명 |

### `obj.merge3<TSource>(source, target1, target2, keyOptions): TSource`

3방향 병합. `source`에서 분기된 `target1`, `target2`의 변경사항을 병합한다.

### `Merge3KeyOptions` (interface)

| Field | Type | Description |
|-------|------|-------------|
| `keys` | `string[]` | 배열 항목 식별 key 속성명 |
| `excludes` | `string[] \| undefined` | 병합에서 제외할 속성명 |

### `obj.omit<T, K extends keyof T>(obj, keys): Omit<T, K>`

객체에서 지정된 key를 제외한 새 객체 반환.

```typescript
const noId = obj.omit(user, ["id", "password"]);
```

### `obj.omitByFilter<T>(obj, predicate): Partial<T>`

함수 조건으로 필터링한 새 객체 반환.

```typescript
const filtered = obj.omitByFilter(data, (key, value) => value !== undefined);
```

### `obj.pick<T, K extends keyof T>(obj, keys): Pick<T, K>`

객체에서 지정된 key만 포함한 새 객체 반환.

```typescript
const onlyName = obj.pick(user, ["name", "email"]);
```

### `obj.getChainValue(obj, chain, optional?): unknown`

체인 표현식으로 중첩 객체 값 읽기.

```typescript
obj.getChainValue(data, "user.profile.name");
obj.getChainValue(data, "items[0].id", true); // optional: 오류 없이 undefined 반환
```

### `obj.getChainValueByDepth<TObject, TKey>(obj, keys): unknown`

키 배열의 순서대로 깊이 접근.

### `obj.setChainValue(obj, chain, value): void`

체인 표현식으로 중첩 객체 값 쓰기.

### `obj.deleteChainValue(obj, chain): void`

체인 표현식으로 중첩 객체 값 삭제.

### `obj.clearUndefined<T extends object>(obj): T`

`undefined` 값인 속성을 모두 삭제한다.

### `obj.clear<T>(obj): Record<string, never>`

객체의 모든 속성을 삭제한다.

### `obj.nullToUndefined<TObject>(obj): TObject | undefined`

JSON `null` 값을 재귀적으로 `undefined`로 변환한다.

### `obj.unflatten(flatObj): Record<string, unknown>`

`"a.b.c"` 형식의 키를 가진 평면 객체를 중첩 객체로 변환.

### `obj.keys<T>(obj): (keyof T)[]`

`Object.keys`의 타입 안전 래퍼.

### `obj.entries<T>(obj): Entries<T>`

`Object.entries`의 타입 안전 래퍼.

### `obj.fromEntries<T>(entryPairs): object`

`Object.fromEntries`의 타입 안전 래퍼.

### `obj.map<TSource, TNewKey, TNewValue>(source, fn): Record<TNewKey, TNewValue>`

객체의 각 항목을 변환하여 새 객체 생성.

### `UndefToOptional<TObject>` (type)

`{ a: string | undefined }` → `{ a?: string }` 변환 (undefined 타입을 optional로).

### `OptionalToUndef<TObject>` (type)

`{ a?: string }` → `{ a: string | undefined }` 변환 (optional을 undefined 포함 타입으로).

---

## `str` namespace

문자열 유틸리티 함수.

| Function | Signature | Description |
|----------|-----------|-------------|
| `getKoreanSuffix` | `(text, type) => string` | 받침 유무에 따라 적절한 한국어 조사 반환 |
| `replaceFullWidth` | `(str) => string` | 전각 문자를 반각 문자로 변환 |
| `toPascalCase` | `(str) => string` | PascalCase로 변환 |
| `toCamelCase` | `(str) => string` | camelCase로 변환 |
| `toKebabCase` | `(str) => string` | kebab-case로 변환 |
| `toSnakeCase` | `(str) => string` | snake_case로 변환 |
| `isNullOrEmpty` | `(str) => str is "" \| undefined` | 빈 문자열 또는 undefined 검사 (타입 가드) |
| `insert` | `(str, index, insertString) => string` | 특정 위치에 문자열 삽입 |

`getKoreanSuffix` 지원 타입: `"을"`, `"은"`, `"이"`, `"와"`, `"랑"`, `"로"`, `"라"`

```typescript
str.getKoreanSuffix("Apple", "을") // "를"
str.getKoreanSuffix("책", "이")    // "이"
str.toCamelCase("HelloWorld")      // "helloWorld"
str.toKebabCase("HelloWorld")      // "hello-world"
```

---

## `num` namespace

숫자 유틸리티 함수.

| Function | Signature | Description |
|----------|-----------|-------------|
| `parseInt` | `(text) => number \| undefined` | 문자열을 정수로 파싱. 비숫자 문자 제거 후 파싱 |
| `parseFloat` | `(text) => number \| undefined` | 문자열을 float로 파싱. 비숫자 문자 제거 후 파싱 |
| `parseRoundedInt` | `(text) => number \| undefined` | float로 파싱 후 반올림하여 정수 반환 |
| `isNullOrEmpty` | `(val) => val is 0 \| undefined` | undefined, null, 0 검사 (타입 가드) |
| `format` | `(val, digit?) => string \| undefined` | 천 단위 구분자가 포함된 문자열로 포맷 |

`num.format` digit 옵션:

| Field | Type | Description |
|-------|------|-------------|
| `max` | `number \| undefined` | 최대 소수점 자릿수 |
| `min` | `number \| undefined` | 최소 소수점 자릿수 (부족하면 0으로 채움) |

```typescript
num.parseInt("1,234")        // 1234
num.format(1234.567, { max: 2 }) // "1,234.57"
num.format(1234, { min: 2 })     // "1,234.00"
```

---

## `bytes` namespace

`Uint8Array` 유틸리티 함수.

| Function | Signature | Description |
|----------|-----------|-------------|
| `concat` | `(arrays: Bytes[]) => Bytes` | 여러 Uint8Array 결합 |
| `toHex` | `(bytes) => string` | Uint8Array를 소문자 hex 문자열로 변환 |
| `fromHex` | `(hex) => Bytes` | hex 문자열을 Uint8Array로 변환 |
| `toBase64` | `(bytes) => string` | Uint8Array를 Base64 문자열로 변환 |
| `fromBase64` | `(base64) => Bytes` | Base64 문자열을 Uint8Array로 변환 |

```typescript
bytes.toHex(new Uint8Array([255, 0, 127])) // "ff007f"
bytes.fromHex("ff007f") // Uint8Array([255, 0, 127])
bytes.toBase64(new Uint8Array([72, 101, 108, 108, 111])) // "SGVsbG8="
```

---

## `path` namespace

POSIX 스타일 경로 유틸리티 (Node.js `path` 모듈 대체, 브라우저 환경 지원).

**주의**: 슬래시(`/`)만 지원한다. Windows 백슬래시(`\`)는 지원하지 않는다.

| Function | Signature | Description |
|----------|-----------|-------------|
| `join` | `(...segments: string[]) => string` | 경로 결합 |
| `basename` | `(filePath, ext?) => string` | 파일명 추출 |
| `extname` | `(filePath) => string` | 파일 확장자 추출. 숨김 파일은 빈 문자열 반환 |

```typescript
path.join("/a/b", "c/d")  // "/a/b/c/d"
path.basename("/a/b/c.ts")        // "c.ts"
path.basename("/a/b/c.ts", ".ts") // "c"
path.extname("/a/b/c.ts")         // ".ts"
path.extname(".gitignore")        // ""
```

---

## `json` namespace

커스텀 타입을 지원하는 JSON 직렬화/역직렬화.

### `json.stringify(obj, options?): string`

`DateTime`, `DateOnly`, `Time`, `Uuid`, `Set`, `Map`, `Error`, `Uint8Array` 등 커스텀 타입 직렬화 지원.

옵션:

| Field | Type | Description |
|-------|------|-------------|
| `space` | `string \| number \| undefined` | JSON 들여쓰기 |
| `replacer` | `(key, value) => unknown \| undefined` | 커스텀 replacer. 기본 타입 변환 전에 호출됨 |
| `redactBytes` | `boolean \| undefined` | `true`이면 Uint8Array 내용을 `"__hidden__"`으로 대체 (로깅용). 이 옵션으로 직렬화된 결과는 `parse()`로 복원 불가 |

### `json.parse<TResult>(json): TResult`

`__type__` 마커 기반으로 커스텀 타입 복원. JSON `null` 값은 `undefined`로 변환된다.

```typescript
const serialized = json.stringify({ date: new DateTime(), id: Uuid.generate() });
const restored = json.parse(serialized); // DateTime, Uuid 복원됨
```

---

## `xml` namespace

XML 파싱/직렬화 (fast-xml-parser 래퍼).

### `xml.parse(str, options?): unknown`

XML 문자열을 객체로 파싱. 파싱 결과 구조:
- 속성: `$` 객체에 그룹화
- 텍스트 노드: `_` key에 저장
- 자식 요소: 배열로 변환 (루트 요소 제외)

| Option | Type | Description |
|--------|------|-------------|
| `stripTagPrefix` | `boolean \| undefined` | 태그 접두사(네임스페이스) 제거 여부 |

```typescript
xml.parse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }
```

### `xml.stringify(obj, options?): string`

객체를 XML 문자열로 직렬화. `options`는 `fast-xml-parser`의 `XmlBuilderOptions`.

```typescript
xml.stringify({ root: { $: { id: "1" }, item: [{ _: "hello" }] } });
// '<root id="1"><item>hello</item></root>'
```

---

## `wait` namespace

비동기 대기 유틸리티.

### `wait.until(forwarder, milliseconds?, maxCount?): Promise<void>`

조건이 `true`가 될 때까지 대기.

| Parameter | Type | Description |
|-----------|------|-------------|
| `forwarder` | `() => boolean \| Promise<boolean>` | 조건 함수 |
| `milliseconds` | `number \| undefined` | 확인 간격 (ms). 기본값: 100 |
| `maxCount` | `number \| undefined` | 최대 시도 횟수. 초과하면 `TimeoutError` 발생. `undefined`이면 무제한 |

### `wait.time(millisecond): Promise<void>`

지정된 시간(ms)만큼 대기.

```typescript
await wait.until(() => isReady, 100, 50); // 100ms 간격, 최대 50회
await wait.time(1000); // 1초 대기
```

---

## `transfer` namespace

Worker 간 데이터 전송을 위한 직렬화/역직렬화. `structuredClone`이 지원하지 않는 커스텀 타입을 처리한다.

지원 타입: `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error`, `Uint8Array`, `Array`, `Map`, `Set`, 일반 객체

### `transfer.encode(obj): { result: unknown; transferList: ArrayBuffer[] }`

객체를 Worker로 전송 가능한 형태로 직렬화. 순환 참조 감지 및 객체 캐싱 지원.

### `transfer.decode(obj): unknown`

직렬화된 객체를 Simplysm 타입을 사용하는 객체로 역직렬화.

```typescript
// Worker로 데이터 전송
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);

// Worker에서 수신
const decoded = transfer.decode(event.data);
```

---

## `err` namespace

에러 메시지 추출 유틸리티.

### `err.message(err: unknown): string`

`catch` 블록의 `unknown` 에러에서 메시지를 추출한다. `Error` 인스턴스이면 `message` 속성을 반환하고, 그렇지 않으면 `String(err)` 결과를 반환한다.

```typescript
try {
  doSomething();
} catch (e) {
  console.log(err.message(e)); // 항상 string
}
```

---

## `dt` namespace

날짜/시간 포맷 유틸리티. 주로 `DateTime`, `DateOnly`, `Time` 클래스 내부에서 사용되지만 직접 호출도 가능하다.

### `dt.format(formatString, args): string`

형식 문자열에 따라 날짜/시간을 문자열로 변환.

지원 형식 패턴:

| 패턴 | 설명 | 예시 |
|------|------|------|
| `yyyy` | 4자리 연도 | `2024` |
| `yy` | 2자리 연도 | `24` |
| `MM` | 0 채움 월 | `01~12` |
| `M` | 월 | `1~12` |
| `ddd` | 요일 (한국어) | `일, 월, 화, 수, 목, 금, 토` |
| `dd` | 0 채움 일 | `01~31` |
| `d` | 일 | `1~31` |
| `tt` | 오전/오후 | `AM, PM` |
| `hh` | 0 채움 12시간 | `01~12` |
| `h` | 12시간 | `1~12` |
| `HH` | 0 채움 24시간 | `00~23` |
| `H` | 24시간 | `0~23` |
| `mm` | 0 채움 분 | `00~59` |
| `m` | 분 | `0~59` |
| `ss` | 0 채움 초 | `00~59` |
| `s` | 초 | `0~59` |
| `fff` | 밀리초 (3자리) | `000~999` |
| `ff` | 밀리초 (2자리) | `00~99` |
| `f` | 밀리초 (1자리) | `0~9` |
| `zzz` | 타임존 오프셋 (±HH:mm) | `+09:00` |
| `zz` | 타임존 오프셋 (±HH) | `+09` |
| `z` | 타임존 오프셋 (±H) | `+9` |

### `dt.normalizeMonth(year, month, day): DtNormalizedMonth`

월 설정 시 연/월/일 정규화. 월이 1-12 범위를 벗어나면 연도를 조정한다.

### `DtNormalizedMonth` (interface)

| Field | Type | Description |
|-------|------|-------------|
| `year` | `number` | 정규화된 연도 |
| `month` | `number` | 정규화된 월 (1-12) |
| `day` | `number` | 정규화된 일 |

### `dt.convert12To24(rawHour, isPM): number`

12시간 형식을 24시간 형식으로 변환.

---

## `primitive` namespace

### `primitive.typeStr(value: PrimitiveTypeMap[PrimitiveTypeStr]): PrimitiveTypeStr`

런타임에 값의 타입을 확인하고 해당하는 `PrimitiveTypeStr`을 반환한다.

```typescript
primitive.typeStr("hello")        // "string"
primitive.typeStr(123)            // "number"
primitive.typeStr(new DateTime()) // "DateTime"
primitive.typeStr(new Uint8Array()) // "Bytes"
```

---

## Direct Exports

### Template String Tags

IDE 코드 하이라이팅 지원용 태그드 템플릿 리터럴. 실제 동작은 문자열 결합 + 들여쓰기 정규화다.

| Function | Description |
|----------|-------------|
| `js` | JavaScript 코드 하이라이팅용 |
| `ts` | TypeScript 코드 하이라이팅용 |
| `html` | HTML 마크업 하이라이팅용 |
| `tsql` | MSSQL T-SQL 하이라이팅용 |
| `mysql` | MySQL SQL 하이라이팅용 |
| `pgsql` | PostgreSQL SQL 하이라이팅용 |

모든 태그 함수의 시그니처:

```typescript
function tagName(strings: TemplateStringsArray, ...values: unknown[]): string
```

들여쓰기 정규화: 앞뒤 빈 줄을 제거하고 최소 들여쓰기를 제거한다.

```typescript
const query = tsql`
  SELECT TOP 10 *
  FROM Users
  WHERE Name = ${name}
`;
// "SELECT TOP 10 *\nFROM Users\nWHERE Name = ..."
```

### `ZipArchive`

ZIP 파일의 읽기, 쓰기, 압축, 해제를 처리하는 클래스. 동일 파일의 중복 해제를 방지하기 위해 내부 캐싱을 사용한다.

```typescript
export class ZipArchive {
  constructor(data?: Blob | Bytes);

  async extractAll(progressCallback?: (progress: ZipArchiveProgress) => void): Promise<Map<string, Bytes | undefined>>;
  async get(fileName: string): Promise<Bytes | undefined>;
  async exists(fileName: string): Promise<boolean>;
  write(fileName: string, bytes: Bytes): void;
  async compress(): Promise<Bytes>;
  async close(): Promise<void>;
  async [Symbol.asyncDispose](): Promise<void>;
}
```

| Method | Description |
|--------|-------------|
| `constructor(data?)` | ZIP 데이터로 생성. 생략하면 새 아카이브 생성 |
| `extractAll(progressCallback?)` | 모든 파일 추출. 진행률 콜백 지원 |
| `get(fileName)` | 특정 파일 추출. 캐싱 사용 |
| `exists(fileName)` | 파일 존재 여부 확인 |
| `write(fileName, bytes)` | 파일 쓰기 (캐시에 저장) |
| `compress()` | 캐시된 파일을 ZIP으로 압축 |
| `close()` | 리더 닫기 및 캐시 비우기 |
| `[Symbol.asyncDispose]()` | `await using` 문 지원 |

```typescript
// ZIP 파일 읽기
await using archive = new ZipArchive(zipBytes);
const content = await archive.get("file.txt");

// ZIP 파일 생성
await using newArchive = new ZipArchive();
newArchive.write("file.txt", textBytes);
const zipBytes = await newArchive.compress();

// 진행률 표시
await using archive2 = new ZipArchive(zipBytes);
const files = await archive2.extractAll((progress) => {
  console.log(`${progress.fileName}: ${progress.extractedSize}/${progress.totalSize}`);
});
```

### `ZipArchiveProgress` (interface)

| Field | Type | Description |
|-------|------|-------------|
| `fileName` | `string` | 현재 처리 중인 파일 이름 |
| `totalSize` | `number` | 전체 파일 크기 합계 (bytes) |
| `extractedSize` | `number` | 현재까지 추출된 크기 (bytes) |

---

## Type Utilities

### `Bytes`

`Uint8Array`의 별칭. `Buffer` 대신 사용한다.

```typescript
export type Bytes = Uint8Array;
```

### `PrimitiveTypeMap`

원시 타입 문자열 key → 타입 매핑.

| Key | Type |
|-----|------|
| `"string"` | `string` |
| `"number"` | `number` |
| `"boolean"` | `boolean` |
| `"DateTime"` | `DateTime` |
| `"DateOnly"` | `DateOnly` |
| `"Time"` | `Time` |
| `"Uuid"` | `Uuid` |
| `"Bytes"` | `Bytes` |

### `PrimitiveTypeStr`

`keyof PrimitiveTypeMap` — 원시 타입 문자열 key union.

```typescript
export type PrimitiveTypeStr = "string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes";
```

### `PrimitiveType`

원시 타입 union (`PrimitiveTypeMap[PrimitiveTypeStr] | undefined`).

### `DeepPartial<TObject>`

객체의 모든 속성을 재귀적으로 `optional`로 변환. 원시 타입은 그대로 유지하고 object/array 타입에만 재귀적으로 `Partial`을 적용한다.

```typescript
export type DeepPartial<TObject> = Partial<{
  [K in keyof TObject]: TObject[K] extends PrimitiveType ? TObject[K] : DeepPartial<TObject[K]>;
}>;
```

### `Type<TInstance>` (interface)

생성자 타입.

```typescript
export interface Type<TInstance> extends Function {
  new (...args: unknown[]): TInstance;
}
```

```typescript
function create<T>(ctor: Type<T>): T {
  return new ctor();
}
```
