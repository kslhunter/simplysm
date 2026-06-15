# @simplysm/core-common — serialization

커스텀 값 타입을 보존하는 직렬화/역직렬화 묶음. JSON 문자열, XML, hex/base64 바이트, Worker 전송 형태를 다룰 때 사용. `json`·`transfer` 는 값 타입을 `__type__` 태그 객체로 보존·복원한다. `import { json, xml, bytes, transfer } from "@simplysm/core-common"`.

## json (커스텀 타입 보존 JSON)

`DateTime`/`DateOnly`/`Time`/`Uuid`/`Set`/`Map`/`Error`/`Uint8Array` 를 `{ __type__, data }` 형태로 직렬화하고 복원. `Date.prototype.toJSON` 같은 전역 프로토타입을 수정하지 않아 Worker 환경에서 안전.

- `json.stringify(obj, options?): string`
  - `options.space?: string | number` — 들여쓰기.
  - `options.replacer?: (key, value) => unknown` — 기본 타입 변환 **전에** 호출되는 커스텀 replacer.
  - `options.redactBytes?: boolean` — true 면 `Uint8Array` 내용을 `"__hidden__"` 으로 대체(로깅용). 이렇게 직렬화하면 `json.parse` 로 복원 불가(복원 시 `SdError` throw).
  - 순환 참조가 있으면 `TypeError`. 객체에 `toJSON` 이 있으면 호출해 그 결과를 사용(위 커스텀 타입은 사전 변환되므로 제외). undefined 값은 결과에서 제외.
- `json.parse<T>(json): T` — `__type__` 태그를 보고 원래 타입 복원. **모든 JSON null 은 undefined 로 변환됨**(simplysm null-free 규칙). 파싱 실패 시 `SdError`(개발 모드 `env("DEV")` 가 truthy 면 메시지에 전체 JSON, 운영 모드면 길이만).

> 주의: 사용자 데이터에 `{ __type__: "Date"|"DateTime"|..., data: ... }` 형태가 있으면 의도치 않게 타입으로 복원될 수 있음.

```ts
const text = json.stringify({ at: new DateTime(), id: Uuid.generate() });
const back = json.parse<{ at: DateTime; id: Uuid }>(text); // 타입 복원됨
```

## xml

`fast-xml-parser` 래퍼. 속성은 `$` 객체, 텍스트 노드는 `_` key, 자식 요소는 배열(루트 제외)로 표현.

- `xml.parse(str, options?: { stripTagPrefix?: boolean }): unknown` — XML→객체. `stripTagPrefix:true` 면 태그명의 네임스페이스 접두사(`ns:tag`)를 제거(속성 접두사는 유지).
- `xml.stringify(obj, options?: XmlBuilderOptions): string` — 객체→XML. `fast-xml-parser` 의 `XmlBuilderOptions` 를 그대로 전달(기본 옵션에 덮어씀).

```ts
xml.parse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }
```

## bytes (Uint8Array 인코딩)

`import { bytes } from "@simplysm/core-common"`. 모두 `Bytes`(= `Uint8Array`) 대상.

- `bytes.concat(arrays: Bytes[]): Bytes` — 여러 배열 결합한 새 배열.
- `bytes.toHex(bytes): string` — 소문자 hex 문자열.
- `bytes.fromHex(hex): Bytes` — hex→바이트(대소문자 허용). 홀수 길이거나 비 hex 문자면 `ArgumentError`.
- `bytes.toBase64(bytes): string` — base64 인코딩(자체 구현, 패딩 `=` 포함).
- `bytes.fromBase64(base64): Bytes` — base64→바이트. 공백·패딩 정규화 후 검증. 비 base64 문자나 `% 4 === 1` 잔여 길이면 `ArgumentError`.

```ts
bytes.toHex(new Uint8Array([255, 0, 127])); // "ff007f"
bytes.fromBase64("SGVsbG8=");               // Uint8Array([72,101,108,108,111])
```

## transfer (Worker 전송 직렬화)

`import { transfer } from "@simplysm/core-common"`. `structuredClone` 이 지원하지 않는 커스텀 타입을 처리해 Worker `postMessage` 로 보낼 수 있게 함. 지원: `Date`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`RegExp`/`Error`(cause·code·detail 포함)/`Uint8Array`/`Array`/`Map`/`Set`/일반 객체. 다른 TypedArray 는 일반 객체로 처리됨.

- `transfer.encode(obj): { result: unknown; transferList: ArrayBuffer[] }` — 전송 가능 형태로 변환. `Uint8Array` 의 `ArrayBuffer` 는 zero-copy 전송을 위해 `transferList` 에 추가(`SharedArrayBuffer` 는 제외). 순환 참조면 경로 정보를 담은 `TypeError`. 같은 객체가 여러 곳에서 참조되면 인코딩 결과를 캐싱 재사용.
- `transfer.decode(obj): unknown` — `encode` 결과(또는 Worker 에서 받은 데이터)를 원래 타입으로 복원.

```ts
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);
// 수신 측
const decoded = transfer.decode(event.data);
```
