# @simplysm/core-common — utils

`utils/` 네임스페이스 일괄 export. import는 `import { obj, str, ..., js, ZipArchive } from "@simplysm/core-common"`.

## `obj` — 객체 조작

```ts
obj.clone<T>(source): T
  // 깊은 복사. 순환 참조 지원. Date/DateTime/DateOnly/Time/Uuid/RegExp/Error/Uint8Array/Array/Map/Set 모두 별도 처리.
  // 프로토타입 체인 유지(Object.setPrototypeOf). 함수·Symbol은 참조 유지. WeakMap/WeakSet 미지원. getter/setter는 현재 값으로 평가.

obj.equal(source, target, options?: EqualOptions): boolean
interface EqualOptions {
  topLevelIncludes?: string[]   // 지정한 key만 비교 (최상위만, 객체 속성에만 적용)
  topLevelExcludes?: string[]   // 지정한 key 제외 (최상위만)
  ignoreArrayIndex?: boolean    // array 순서 무시. true면 O(n²) (permutation 매칭)
  shallow?: boolean             // 1단계 참조 비교
}
  // null != null 분기, custom 타입은 tick/toString 기반 비교.

obj.merge<S, T>(source, target, opt?: MergeOptions): S & T
interface MergeOptions {
  arrayProcess?: "replace" | "concat"   // 기본 "replace"(target으로 교체). "concat"=합집합(Set 중복 제거)
  useDelTargetNull?: boolean            // target이 null이면 결과 key 삭제
}
  // 불변 (새 객체 반환). 타입 다르면 target으로 덮어씀. Map은 재귀 머지.

obj.merge3(source, origin, target, optionsObj?: Record<key, Merge3KeyOptions>):
  { conflict: boolean; result: O & S & T }
  // 3-way merge. source==origin → target 채택, target==origin → source 채택,
  // source==target → 채택, 셋 다 다름 → conflict=true + origin 유지
interface Merge3KeyOptions { keys?; excludes?; ignoreArrayIndex? }   // equal과 동일

obj.omit(item, omitKeys[]): Omit<T, K>
obj.omitByFilter(item, (key) => boolean): T          // @internal
obj.pick(item, keys[]): Pick<T, K>

obj.getChainValue(o, "a.b[0].c", optional?: true): unknown
obj.getChainValueByDepth(o, key, depth, optional?): T[K]   // 같은 key로 depth회 하강
obj.setChainValue(o, chain, value): void
obj.deleteChainValue(o, chain): void

obj.clearUndefined(o): T                              // @mutates null/undefined key 삭제
obj.clear(o): {}                                      // @mutates 전체 비우기
obj.nullToUndefined(o): T                             // @mutates null→undefined (재귀, 순환 안전)
obj.unflatten({ "a.b.c": 1 }): { a: { b: { c: 1 } } }   // @internal

obj.keys(o): (keyof T)[]                              // 타입 안전 Object.keys
obj.entries(o): [K, V][]                              // 타입 안전 Object.entries
obj.fromEntries(pairs): Record
obj.map(o, (key, value) => [newKey | null, newValue]): Record
  // null newKey → 기존 key 유지. key/value 동시 변환

type UndefToOptional<T>                               // { a, b: T|undefined } → { a, b?: T }
type OptionalToUndef<T>                               // { a, b? } → { a, b: T|undefined }
```

## `str` — 문자열

```ts
str.getKoreanSuffix(text, type: "을"|"은"|"이"|"와"|"랑"|"로"|"라"): string
  // 받침 유무로 조사 자동. "로"는 ㄹ 받침 예외(받침 있어도 "로"). 한글 외 문자→무받침 취급.
str.replaceFullWidth(str): string                    // 전각 영숫자/공백/괄호 → 반각
str.toPascalCase(s) / toCamelCase / toKebabCase / toSnakeCase
  // PascalCase: 하이픈/언더/점 + 소문자 → 대문자. 첫글자 대문자화.
  // kebab/snake: 대문자/대문자그룹 분리. 기존 구분자는 유지 (혼합 시 "hello-_world").
str.isNullOrEmpty(s): s is "" | undefined            // 타입 가드
str.insert(s, index, insertString): string
```

## `num` — 숫자

```ts
num.parseInt(text): number | undefined               // 숫자 외 문자 제거. 선행 - 만 음수, 중간 - 제거. "010-1234-5678"→1012345678
num.parseFloat(text): number | undefined
num.parseRoundedInt(text): number | undefined        // parseFloat 후 Math.round
num.isNullOrEmpty(n): n is 0 | undefined             // 타입 가드 (0/null/undefined)
num.format(val, digit?: { max?, min? }): string      // toLocaleString. min 부족분은 0 패딩
```

## `bytes` — Uint8Array

```ts
bytes.concat(arrs: Bytes[]): Bytes
bytes.toHex(b): string                               // 소문자
bytes.fromHex(hex): Bytes                            // 홀수 길이/무효 문자 → ArgumentError
bytes.toBase64(b): string
bytes.fromBase64(s): Bytes                           // 공백·패딩 정규화. 무효 문자/길이 → ArgumentError
```

## `path` — POSIX 경로 (브라우저용, `/` 만 지원)

```ts
path.join(...segments): string                       // 슬래시 정규화
path.basename(filePath, ext?): string                // ext 제거 옵션
path.extname(filePath): string                       // 숨김파일(.gitignore)은 "" (Node 동일)
```

## `json` — 커스텀 타입 지원 JSON

```ts
json.stringify(obj, options?: {
  space?: number | string,
  replacer?: (key, value) => unknown,
  redactBytes?: boolean,                             // Uint8Array → "__hidden__" (로깅용, parse 시 throw)
}): string
json.parse<T>(str): T
```
- 사전 변환으로 `{ __type__, data }` 태그 객체 생성: Date/DateTime/DateOnly/Time/Uuid/Set/Map/Error(cause·code·detail 포함)/Uint8Array(hex). `Date.prototype.toJSON` 미수정 → Worker 안전.
- 순환 참조 → `TypeError`.
- `parse`는 `nullToUndefined` 적용 (모든 JSON `null` → `undefined`, simplysm null-free 규칙).
- 파싱 실패 시 `__DEV__` 환경에서는 메시지에 전체 JSON 포함, 아니면 길이만.

## `xml` — XML (fast-xml-parser 래퍼)

```ts
xml.parse(str, options?: { stripTagPrefix?: boolean }): unknown
xml.stringify(obj, options?: XmlBuilderOptions): string
```
- 속성은 `$` 그룹, 텍스트 노드는 `_` key. 1단계 깊이 미만은 단일 객체, 이상은 array.
- `stripTagPrefix`: `"ns:tag"`에서 접두사 제거 (속성은 유지).

## `wait` — 타이밍

```ts
wait.time(ms): Promise<void>                         // setTimeout Promise화
wait.until(forwarder, ms = 100, maxCount?): Promise<void>
  // forwarder가 true 반환할 때까지 ms 간격 폴링. maxCount 초과 시 TimeoutError(count)
```

## `transfer` — Worker 직렬화

```ts
transfer.encode(obj): { result: unknown; transferList: ArrayBuffer[] }
transfer.decode(obj): unknown
```
- `worker.postMessage(result, transferList)` 패턴. Uint8Array는 zero-copy 전송, SharedArrayBuffer는 transferList 제외.
- 지원: Date/DateTime/DateOnly/Time/Uuid/RegExp, Error(cause·code·detail), Array/Map/Set/일반 객체. 그 외 TypedArray는 일반 객체로 처리됨.
- 순환 참조 → `TypeError("순환 참조 감지됨: <path>")`. 같은 객체 다중 참조는 캐시 재사용.

## `err` — 에러 메시지

```ts
err.message(err: unknown): string                    // Error.message 또는 String(err)
```

## `dt` — 날짜·시간 포맷 내부 헬퍼

```ts
dt.format(formatStr, args: { year?, month?, day?, hour?, minute?, second?, millisecond?, timezoneOffsetMinutes? }): string
dt.normalizeMonth(year, month, day): { year, month, day }   // 월 오버플로 + 일수 보정
dt.convert12To24(rawHour, isPM): number                     // 12 AM=0, 12 PM=12
```
- format 토큰: `yyyy yy`, `MM M`, `ddd`(요일 한글), `dd d`, `tt`(AM/PM), `hh h`(12시간), `HH H`(24시간), `mm m`, `ss s`, `fff ff f`(밀리초), `zzz zz z`(타임존 ±HH:mm/±HH/±H). 긴 토큰 우선.

## `primitive` — PrimitiveType 런타임

```ts
primitive.typeStr(value): PrimitiveTypeStr           // 값 → "string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"
```
- 미지원 타입 → `ArgumentError`.

## 직접 export — 템플릿 태그

`js`, `ts`, `html`, `tsql`, `mysql`, `pgsql` — 모두 같은 동작 (IDE 코드 하이라이팅용). 들여쓰기 정규화: 앞뒤 빈 줄 제거 + 모든 줄에서 공통 최소 들여쓰기만큼 dedent.

```ts
const sql = mysql`
  SELECT * FROM users
  LIMIT 10
`;
```

## 직접 export — `ZipArchive` (`@zip.js/zip.js` 래퍼)

```ts
class ZipArchive {
  constructor(data?: Blob | Bytes)                   // 없으면 새 아카이브
  extractAll(progressCb?: (p: { fileName, totalSize, extractedSize }) => void): Promise<Map<string, Bytes>>
  get(fileName): Promise<Bytes | undefined>          // 캐싱됨
  exists(fileName): Promise<boolean>
  write(fileName, bytes): void                       // 캐시에만 저장
  compress(): Promise<Bytes>                         // 캐시된 모든 파일을 ZIP으로 (extractAll 호출 → 전체 메모리 적재)
  close(): Promise<void>                             // reader 닫고 캐시 비움
}
interface ZipArchiveProgress { fileName, totalSize, extractedSize }
```
- 같은 파일 재추출 방지를 위해 내부 `_cache: Map<filename, Bytes>` 사용.
- 대용량 ZIP 의 `compress()` 는 메모리 주의 (스트리밍 X).
