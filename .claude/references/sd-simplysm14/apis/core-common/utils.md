# @simplysm/core-common — utils

네임스페이스 import: `import { obj, str, num, bytes, path, json, xml, wait, transfer, err, dt, primitive } from "@simplysm/core-common";`

## obj — 객체 조작

### 복사·비교·병합

```typescript
obj.clone(src)                                        // 깊은 복사. 순환 참조·DateTime/DateOnly/Time/Uuid/
                                                      //   Uint8Array/Date/RegExp/Error(cause)/Map/Set 지원.
                                                      //   함수/Symbol 은 참조 유지, WeakMap/WeakSet 미지원.
obj.equal(a, b, opt?)                                 // 깊은 동등. opt: { topLevelIncludes?, topLevelExcludes?,
                                                      //   ignoreArrayIndex?, shallow? }
                                                      //   include/exclude 는 최상위 객체 키에만 적용. shallow=true 면 1단계 참조 비교.
obj.merge(source, target, opt?)                       // 깊은 병합 (불변, 새 객체). opt:
                                                      //   { arrayProcess?: "replace"|"concat", useDelTargetNull? }
obj.merge3(source, origin, target, optionsObj?)       // 3-way merge. { conflict, result }
                                                      //   optionsObj 는 key별 { keys?, excludes?, ignoreArrayIndex? }
```

### 키 조작

```typescript
obj.omit(o, ["k1","k2"])
obj.omitByFilter(o, (k) => k.startsWith("_"))
obj.pick(o, ["k1","k2"])
obj.keys(o) / obj.entries(o) / obj.fromEntries(pairs)  // 타입 안전 Object.* 래퍼
obj.map(o, (k, v) => [newK | null, newV])              // entry 변환 (newK=null 이면 원래 키 유지)
```

### 체인 경로 (`"a.b[0].c"` 형식)

```typescript
obj.getChainValue(o, "a.b[0].c")
obj.getChainValue(o, "a.b[0].c", true)   // optional: 중간 null 만나면 undefined
obj.setChainValue(o, "a.b.c", v)         // 중간 객체 자동 생성
obj.deleteChainValue(o, "a.b.c")
obj.getChainValueByDepth(o, key, depth, optional?)  // 같은 key 로 N단계 하강
```

### 변환 (원본 변형 — `@mutates`)

```typescript
obj.clearUndefined(o)     // null/undefined 값 키 제거
obj.clear(o)              // 모든 키 제거
obj.nullToUndefined(o)    // 재귀, null → undefined
obj.unflatten({ "a.b.c": 1 })  // → { a: { b: { c: 1 } } }
```

### 타입 유틸

```typescript
obj.UndefToOptional<T>    // { a: string|undefined } → { a?: string|undefined }
obj.OptionalToUndef<T>    // { a?: string } → { a: string|undefined }
```

## str — 문자열

```typescript
str.getKoreanSuffix(text, "을"|"은"|"이"|"와"|"랑"|"로"|"라")
                                  // 받침 유무로 조사 결정. "로" 는 ㄹ 받침이면 "로".
str.replaceFullWidth(s)           // 전각 영숫자/공백/괄호 → 반각
str.toPascalCase(s) / toCamelCase(s) / toKebabCase(s) / toSnakeCase(s)
                                  // case 함수는 기존 -/_ 구분자 보존, 연속 대문자 개별 분리 ("XMLParser" → "x-m-l-parser")
str.isNullOrEmpty(s)              // null|undefined|"" 타입 가드
str.insert(s, idx, insertStr)
```

## num — 숫자

```typescript
num.parseInt(text)        // 비숫자 제거 후 정수 파싱. 선행 - 만 음수 부호, 중간 - 제거. 소수점은 trunc.
num.parseFloat(text)
num.parseRoundedInt(text) // float 후 반올림
num.isNullOrEmpty(v)      // null|undefined|0 타입 가드
num.format(v, { max?, min? })  // 천 단위 + 소수점 자릿수. toLocaleString 기반
```

## bytes — Uint8Array

```typescript
bytes.concat([a, b, ...])
bytes.toHex(u8) / bytes.fromHex(hex)            // 소문자 hex. 홀수 길이/잘못된 문자 시 ArgumentError
bytes.toBase64(u8) / bytes.fromBase64(b64)      // 표준 base64 (+/, = 패딩). 공백 자동 제거
```

## path — POSIX 경로 (브라우저용)

```typescript
path.join(...segs)            // 슬래시만 지원, 백슬래시 X
path.basename(p, ext?)
path.extname(p)               // 숨김 파일(".gitignore")은 빈 문자열
```

## json — 커스텀 타입 지원 JSON

```typescript
json.stringify(obj, { space?, replacer?, redactBytes? })
                              // Date/DateTime/DateOnly/Time/Uuid/Set/Map/Error/Uint8Array 를 { __type__, data } 로.
                              //   redactBytes=true 면 Uint8Array 내용을 "__hidden__"로 (parse 복원 불가).
                              //   순환 참조 시 TypeError. 전역 prototype 미수정 (Worker 안전).
json.parse<T>(str)            // __type__ 마커 복원. 모든 null → undefined (simplysm null-free 규칙).
                              //   에러 시 SdError. DEV 환경에서만 메시지에 전체 JSON 포함.
```

## xml — fast-xml-parser 래퍼

```typescript
xml.parse(str, { stripTagPrefix? })
   // 결과: 속성은 `$` 객체, 텍스트는 `_` 키, 자식 요소는 배열 (루트 제외).
   //   stripTagPrefix=true 면 "ns:tag" → "tag" (속성은 유지).
xml.stringify(obj, options?)  // fast-xml-parser XmlBuilderOptions
```

## wait — 대기

```typescript
await wait.time(ms)
await wait.until(() => cond, intervalMs=100, maxCount?)   // maxCount 초과 시 TimeoutError
```

## transfer — Worker 전송

`structuredClone` 미지원 타입 처리. Date/DateTime/DateOnly/Time/Uuid/RegExp/Error(cause/code/detail)/Uint8Array/Map/Set/Array/Object.

```typescript
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);          // Uint8Array.buffer 가 transferList 에 zero-copy
const decoded = transfer.decode(event.data);
```

순환 참조 시 `TypeError("순환 참조 감지됨: <path>")`. 같은 객체 다중 참조는 인코딩 결과 캐싱.

## err — 에러 메시지

```typescript
err.message(unknownErr)   // Error 면 .message, 아니면 String(err)
```

## dt — date-format 저수준

`DateTime/DateOnly/Time#toFormatString` 내부에서 사용. 직접 사용 드묾.

```typescript
dt.format(formatStr, { year?, month?, day?, hour?, minute?, second?, millisecond?, timezoneOffsetMinutes? })
   // 토큰은 types.md 의 "date-format 토큰" 참조
dt.normalizeMonth(year, month, day)    // 월 1-12 정규화 + 일 클램프
dt.convert12To24(rawHour, isPM)        // 12시간 → 24시간
```

## primitive — 런타임 타입 추론

```typescript
primitive.typeStr(value)
// string/number/boolean/DateTime/DateOnly/Time/Uuid/Bytes 중 하나 반환.
// 미지원 타입은 ArgumentError.
```
