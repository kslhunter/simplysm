# 유틸리티

네임스페이스로 그룹화된 유틸리티 함수들.

## obj -- 객체 유틸리티

### 클론/비교/병합

```typescript
import { obj } from "@simplysm/core-common";

// 딥 클론 (순환 참조, 커스텀 타입 지원)
// 지원: DateTime, DateOnly, Time, Uuid, Uint8Array, Date, RegExp, Error, Map, Set, Array
// 함수/Symbol은 참조 유지, 프로토타입 체인 유지
const cloned = obj.clone(source);

// 딥 비교
obj.equal(a, b);
obj.equal(a, b, { shallow: true });                    // 1단계만 비교
obj.equal(a, b, { ignoreArrayIndex: true });           // 배열 순서 무시 (O(n^2))
obj.equal(a, b, { topLevelIncludes: ["name", "age"] }); // 특정 키만 비교 (최상위만)
obj.equal(a, b, { topLevelExcludes: ["updatedAt"] });  // 특정 키 제외 (최상위만)

// 딥 병합
obj.merge(source, target);
obj.merge(source, target, { arrayProcess: "concat" });   // 배열 연결 (Set 기반 중복 제거)
obj.merge(source, target, { arrayProcess: "replace" });  // 배열 교체 (기본값)
obj.merge(source, target, { useDelTargetNull: true });   // target이 null이면 키 삭제

// 3-way 병합
const { conflict, result } = obj.merge3(source, origin, target);
// source와 origin 같고 target 다름 -> target 값 사용
// target과 origin 같고 source 다름 -> source 값 사용
// 세 값 모두 다름 -> conflict = true, origin 값 유지

// 키별 비교 옵션
obj.merge3(source, origin, target, {
  name: { keys: ["first", "last"] },
  tags: { ignoreArrayIndex: true },
});
```

### 객체 조작

```typescript
// pick/omit
obj.pick(item, ["name", "age"]);               // { name, age }
obj.omit(item, ["password"]);                  // password 제외
obj.omitByFilter(item, (key) => key.startsWith("_")); // 조건부 제외

// 체인 접근 (점 표기법)
obj.getChainValue(data, "user.address[0].city");
obj.getChainValue(data, "user.name", true);       // optional: 중간 경로 없으면 undefined
obj.setChainValue(data, "user.name", "new");      // 중간 경로 없으면 자동 생성
obj.deleteChainValue(data, "user.temp");           // 중간 경로 없으면 무시

// 깊이 기반 체인 접근
obj.getChainValueByDepth(data, "parent", 2);       // data.parent.parent
obj.getChainValueByDepth(data, "parent", 2, true); // optional 모드

// 기타
obj.clearUndefined(data);                    // undefined 키 제거 (mutate)
obj.clear(data);                             // 모든 키 제거 (mutate)
obj.nullToUndefined(data);                   // null -> undefined (재귀, mutate, 순환 참조 안전)
obj.unflatten({ "a.b.c": 1 });               // { a: { b: { c: 1 } } }
```

### 타입 유틸리티

```typescript
obj.keys(myObj);                             // 타입 안전한 Object.keys
obj.entries(myObj);                          // 타입 안전한 Object.entries
obj.fromEntries(pairs);                      // 타입 안전한 Object.fromEntries

// 객체 엔트리 변환
obj.map(colors, (key, rgb) => [null, `rgb(${rgb})`]);
// key를 null로 반환하면 원래 key 유지, 새 key를 반환하면 key 변환

type A = obj.UndefToOptional<{ a: string | undefined }>; // { a?: string | undefined }
type B = obj.OptionalToUndef<{ a?: string }>;            // { a: string | undefined }
```

---

## str -- 문자열 유틸리티

```typescript
import { str } from "@simplysm/core-common";

str.toPascalCase("hello-world");   // "HelloWorld"
str.toCamelCase("hello-world");    // "helloWorld"
str.toKebabCase("HelloWorld");     // "hello-world"
str.toSnakeCase("HelloWorld");     // "hello_world"

str.isNullOrEmpty(value);          // value is "" | undefined (타입 가드)
str.insert("abcde", 2, "XY");     // "abXYcde"
str.replaceFullWidth("ABC");    // "ABC" (전각 -> 반각)

// 한국어 조사
str.getKoreanSuffix("사과", "을");  // "를"
str.getKoreanSuffix("바나나", "을"); // "을"
str.getKoreanSuffix("칼", "로");    // "로" (ㄹ 종성 특수 처리)
// 지원 타입: "을"(을/를), "은"(은/는), "이"(이/가), "와"(과/와), "랑"(이랑/랑), "로"(으로/로), "라"(이라/라)
```

---

## num -- 숫자 유틸리티

```typescript
import { num } from "@simplysm/core-common";

// 파싱 (비숫자 문자 자동 제거)
num.parseInt("1,234원");           // 1234
num.parseFloat("$1,234.56");       // 1234.56
num.parseRoundedInt("1.7");        // 2

num.isNullOrEmpty(value);          // value is 0 | undefined (타입 가드)

// 포맷 (천 단위 구분자)
num.format(1234567);               // "1,234,567"
num.format(1234.5678, { max: 2 }); // "1,234.57"
num.format(1234.5, { min: 2 });    // "1,234.50"
num.format(1234.5, { min: 2, max: 4 }); // "1,234.50"
```

---

## bytes -- 바이너리 유틸리티

```typescript
import { bytes } from "@simplysm/core-common";

bytes.concat([arr1, arr2, arr3]);  // Uint8Array 연결
bytes.toHex(data);                 // 소문자 hex 문자열
bytes.fromHex("48656c6c6f");       // Uint8Array
bytes.toBase64(data);              // base64 인코딩
bytes.fromBase64(b64str);          // base64 디코딩
```

---

## json -- JSON 직렬화

커스텀 타입(DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array, Date, RegExp 등)을 지원하는 JSON 직렬화/역직렬화.

내부적으로 `__type__`/`data` 형식의 태그 객체를 사용하여 타입 정보를 보존한다.

```typescript
import { json, DateTime } from "@simplysm/core-common";

// 직렬화 (커스텀 타입 자동 처리)
const str = json.stringify({
  date: new DateTime(),
  id: Uuid.generate(),
  items: new Set([1, 2, 3]),
  mapping: new Map([["a", 1]]),
});

// 역직렬화 (타입 자동 복원, null -> undefined 변환)
const data = json.parse<{ date: DateTime }>(str);

// 옵션
json.stringify(obj, { space: 2 });           // 들여쓰기
json.stringify(obj, { redactBytes: true });  // Uint8Array를 "__hidden__"로 대체 (로깅용)
json.stringify(obj, { replacer: (key, value) => value }); // 커스텀 replacer
```

**주의사항:**
- `parse()`는 모든 JSON null을 undefined로 변환한다 (simplysm 프레임워크의 null-free 규칙)
- `redactBytes: true`로 직렬화한 결과는 `parse()`로 복원 불가 (SdError 발생)
- 순환 참조가 있으면 TypeError 발생

---

## xml -- XML 처리

```typescript
import { xml } from "@simplysm/core-common";

// 파싱 (속성은 $ 객체, 텍스트는 _ 키, 자식 요소는 배열)
const obj = xml.parse('<root attr="1"><child>text</child></root>');
// { root: { $: { attr: "1" }, child: [{ _: "text" }] } }

// 네임스페이스 접두사 제거
xml.parse(xmlStr, { stripTagPrefix: true });

// 직렬화
const xmlStr = xml.stringify(obj);
// fast-xml-parser의 XmlBuilderOptions를 두 번째 인자로 전달 가능
xml.stringify(obj, { format: true });
```

---

## path -- 경로 유틸리티

POSIX 스타일 전용 경로 유틸리티. 브라우저 환경과 Capacitor 플러그인을 위해 설계되었다. Windows 백슬래시 경로는 지원하지 않는다.

```typescript
import { path } from "@simplysm/core-common";

path.join("a", "b", "c.txt");       // "a/b/c.txt"
path.basename("/a/b/file.ts");      // "file.ts"
path.basename("/a/b/file.ts", ".ts"); // "file"
path.extname("/a/b/file.ts");       // ".ts"
path.extname("/a/b/.gitignore");    // "" (숨김 파일은 빈 문자열)
```

---

## wait -- 비동기 대기

```typescript
import { wait } from "@simplysm/core-common";

// 조건 충족까지 대기
await wait.until(() => isReady, 100, 50);
// 100ms 간격으로 체크, 최대 50회 (초과 시 TimeoutError)
// 첫 호출에서 true면 즉시 반환

// 시간 대기
await wait.time(1000); // 1초 대기
```

---

## err -- 에러 처리

```typescript
import { err } from "@simplysm/core-common";

try { /* ... */ } catch (e) {
  const message = err.message(e); // unknown 타입에서 안전하게 메시지 추출
  // Error 인스턴스면 .message, 아니면 String(e)
}
```

---

## dt -- 날짜 포맷

```typescript
import { dt } from "@simplysm/core-common";

// 포맷 (DateTime/DateOnly/Time의 toFormatString이 내부적으로 사용)
dt.format("yyyy-MM-dd", { year: 2024, month: 1, day: 15 });
dt.format("HH:mm:ss", { hour: 14, minute: 30, second: 0 });

// 월 정규화
dt.normalizeMonth(2024, 13, 1);    // { year: 2025, month: 1, day: 1 }
dt.normalizeMonth(2025, 2, 31);    // { year: 2025, month: 2, day: 28 }

// 12시간 -> 24시간 변환
dt.convert12To24(12, false);       // 0 (12 AM = 0시)
dt.convert12To24(12, true);        // 12 (12 PM = 12시)
dt.convert12To24(2, true);         // 14 (PM 2시 = 14시)
```

---

## primitive -- 프리미티브 타입 판별

```typescript
import { primitive } from "@simplysm/core-common";

primitive.typeStr("hello");           // "string"
primitive.typeStr(123);               // "number"
primitive.typeStr(true);              // "boolean"
primitive.typeStr(new DateTime());    // "DateTime"
primitive.typeStr(new DateOnly());    // "DateOnly"
primitive.typeStr(new Time());        // "Time"
primitive.typeStr(new Uuid("..."));   // "Uuid"
primitive.typeStr(new Uint8Array());  // "Bytes"
```

---

## transfer -- Worker 데이터 전송

Worker `postMessage`용 직렬화/역직렬화. 순환 참조 감지(경로 포함 TypeError), 커스텀 타입 지원.

지원 타입: Date, DateTime, DateOnly, Time, Uuid, RegExp, Error(cause/code/detail 포함), Uint8Array, Array, Map, Set, plain object.

```typescript
import { transfer } from "@simplysm/core-common";

// Worker로 전송
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);
// Uint8Array의 ArrayBuffer가 자동으로 transferList에 추가됨
// SharedArrayBuffer는 transferList에 포함되지 않음

// Worker에서 수신
const original = transfer.decode(event.data);
```

---

## 템플릿 문자열 태그

IDE 구문 강조를 위한 태그 함수. 들여쓰기 자동 정규화 (공통 들여쓰기 제거, 앞뒤 빈 줄 제거).

```typescript
import { js, ts, html, tsql, mysql, pgsql } from "@simplysm/core-common";

const query = tsql`
  SELECT *
  FROM Users
  WHERE id = ${userId}
`;

const markup = html`
  <div class="container">
    <h1>${title}</h1>
  </div>
`;

// js, ts, mysql, pgsql도 동일하게 동작
```

---

## ZipArchive -- ZIP 처리

`@zip.js/zip.js` 기반 ZIP 파일 처리. 내부 캐싱으로 동일 파일 중복 해제를 방지한다.

```typescript
import { ZipArchive } from "@simplysm/core-common";

// ZIP 읽기 (await using 지원)
await using zip = new ZipArchive(blobOrBytes);
const fileData = await zip.get("path/to/file.txt");
const exists = await zip.exists("file.txt");

// 전체 파일 추출 (진행률 콜백)
const allFiles = await zip.extractAll((progress) => {
  // progress: { fileName, totalSize, extractedSize }
});
// 반환: Map<string, Bytes | undefined>

// ZIP 생성
await using newZip = new ZipArchive();
newZip.write("file1.txt", data1);
newZip.write("dir/file2.txt", data2);
const compressed = await newZip.compress();

// 수동 정리 (await using을 사용하지 않는 경우)
await zip.close();
```

| 메서드 | 시그니처 | 설명 |
|--------|---------|------|
| `get` | `get(fileName: string): Promise<Bytes \| undefined>` | 파일 추출 (캐시 사용) |
| `exists` | `exists(fileName: string): Promise<boolean>` | 파일 존재 여부 |
| `extractAll` | `extractAll(cb?): Promise<Map<string, Bytes \| undefined>>` | 전체 추출 |
| `write` | `write(fileName: string, bytes: Bytes): void` | 파일 쓰기 (캐시에 저장) |
| `compress` | `compress(): Promise<Bytes>` | 캐시 내용을 ZIP으로 압축 |
| `close` | `close(): Promise<void>` | 리더 닫기 및 캐시 정리 |
