# @simplysm/core-common — 직렬화 / Worker 전송

커스텀 타입(DateTime·DateOnly·Time·Uuid·Map·Set·Error·Uint8Array 등)을 포함한 데이터를 JSON·XML·바이트·Worker 메시지로 주고받을 때 함께 읽히는 묶음. JSON·transfer 는 `__type__` 태그 방식으로 표준 직렬화가 잃어버리는 타입을 복원함.

## json 네임스페이스

- `json.stringify(obj, options?)`: → string — 커스텀 타입 보존 JSON 직렬화. Date/DateTime/DateOnly/Time/Uuid/Set/Map/Error/Uint8Array 를 `{ __type__, data }` 형태로 변환. 전역 프로토타입을 건드리지 않아 Worker 환경에서도 안전. 순환 참조면 TypeError.
  - options.space?: `string | number` — 들여쓰기(숫자=공백 수, 문자열=들여쓰기 문자).
  - options.replacer?: `(key, value) => unknown` — 기본 타입 변환 **전에** 호출되는 커스텀 변환.
  - options.redactBytes?: boolean — true 면 Uint8Array 내용을 `"__hidden__"` 로 대체(로깅용). 이 결과는 `json.parse` 로 복원 불가.
- `json.parse<T>(json)`: → T — `json.stringify` 결과 역직렬화. `__type__` 태그를 보고 원래 타입 복원. **모든 JSON null 은 undefined 로 변환**됨(null-free 규칙). `redactBytes` 로 가려진 Uint8Array 를 만나면 SdError. 파싱 실패 시 SdError(개발 모드 `env("DEV")` 이면 전체 JSON, 운영이면 길이만 메시지에 포함).
  - 주의: 사용자 데이터에 `{ __type__: "Date"|..., data: ... }` 형태가 우연히 들어 있으면 의도치 않게 타입으로 변환될 수 있음.

```ts
import { json } from "@simplysm/core-common";
const text = json.stringify({ at: new DateTime(), ids: new Set([1, 2]) });
const back = json.parse<{ at: DateTime; ids: Set<number> }>(text); // 타입 복원
```

## transfer 네임스페이스 (Worker 전송)

`structuredClone` 이 못 다루는 커스텀 타입을 Worker 로 보내기 위한 인코딩/디코딩. `postMessage` 의 transferList(zero-copy)와 연동.

- `transfer.encode(obj)`: → `{ result, transferList }` — 직렬화 가능한 형태로 변환. Uint8Array 의 ArrayBuffer 를 transferList 에 모아 zero-copy 전송 준비(SharedArrayBuffer 는 제외). Date/DateTime/DateOnly/Time/Uuid/RegExp/Error(cause·code·detail 포함)는 `__type__` 태그로 변환, Array/Map/Set/일반 객체는 재귀. 같은 객체 재참조는 캐시 재사용. **순환 참조면 TypeError(경로 포함)**.
- `transfer.decode(obj)`: → unknown — Worker 수신 데이터를 커스텀 타입으로 복원(encode 의 역).

```ts
import { transfer } from "@simplysm/core-common";
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);
// worker 측: const decoded = transfer.decode(event.data);
```

json 과의 차이: transfer 는 날짜를 tick(숫자)로 인코딩하고 RegExp 를 지원하며 Uint8Array 를 변환 없이 transferList 로 넘김(메모리 효율). 문자열 산출물이 필요하면 json, Worker 간 객체 전송이면 transfer.

## bytes 네임스페이스 (Uint8Array 인코딩)

- `bytes.concat(arrays)`: → Bytes — 여러 Uint8Array 결합.
- `bytes.toHex(b)`: → string — 소문자 hex 문자열.
- `bytes.fromHex(hex)`: → Bytes — hex(대소문자 허용)→바이트. 홀수 길이·비 hex 문자면 ArgumentError.
- `bytes.toBase64(b)`: → string — Base64 인코딩(표준 패딩 `=`).
- `bytes.fromBase64(b64)`: → Bytes — Base64 디코딩. 공백·패딩 정규화 후 비 base64 문자·잘못된 길이면 ArgumentError.

## xml 네임스페이스

`fast-xml-parser` 래퍼. 속성은 `$` 객체, 텍스트 노드는 `_` key, 자식 요소는 배열로 표현.

- `xml.parse(str, options?)`: → unknown — XML→객체. `options.stripTagPrefix?: boolean` true 면 태그의 네임스페이스 접두사(`ns:tag`→`tag`) 제거(속성 접두사는 유지).
- `xml.stringify(obj, options?)`: → string — 객체→XML. options 는 `fast-xml-parser` 의 `XmlBuilderOptions`(선택).

```ts
import { xml } from "@simplysm/core-common";
xml.parse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }
```
