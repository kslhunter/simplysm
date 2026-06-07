# @simplysm/core-common — 직렬화 (json·xml·bytes·transfer)

커스텀 값 타입을 보존하는 직렬화/역직렬화 묶음. JSON 문자열, XML, hex/base64 바이트, Worker 전송 형태를 다룰 때 함께 참조. `json`·`transfer` 는 `DateTime`/`DateOnly`/`Time`/`Uuid`/`Map`/`Set`/`Error`/`Uint8Array`(transfer 는 `RegExp` 추가)를 `__type__` 태그로 보존·복원.

## json (`import { json } from "@simplysm/core-common"`)

- `stringify(obj, options?): string` — 커스텀 타입 포함 직렬화. `options`:
  - `space?: string | number` — JSON 들여쓰기.
  - `replacer?: (key, value) => unknown` — 기본 타입 변환 **전** 호출되는 커스텀 변환기.
  - `redactBytes?: boolean` — true 면 `Uint8Array` 내용을 `"__hidden__"` 으로 가림(로깅용). 이 결과는 `parse` 로 복원 불가.
  - 순환 참조 시 `TypeError`. 전역 프로토타입을 수정하지 않아 Worker 안전. undefined 값은 결과에서 제외.
- `parse<T>(json: string): T` — 역직렬화. `__type__`/`data` 마커로 타입 복원. **모든 JSON null 을 undefined 로 변환**(simplysm null-free 규칙). 사용자 데이터에 `{ __type__, data }` 형태가 있으면 의도치 않게 타입으로 변환될 수 있음에 주의. `redactBytes` 로 가려진 바이트를 만나면 `SdError`. 파싱 실패 시 `SdError`(개발 모드 `env("DEV")` 면 전체 JSON, 운영 모드면 길이만 메시지에 포함).

```ts
import { json } from "@simplysm/core-common";
const s = json.stringify({ at: new DateTime(), id: Uuid.generate() });
const o = json.parse<{ at: DateTime; id: Uuid }>(s); // 타입 복원됨
```

## xml (`import { xml } from "@simplysm/core-common"`)

`fast-xml-parser` 래퍼. 속성은 `$` 객체, 텍스트 노드는 `_` key, 자식 요소는 배열(루트 제외)로 표현.

- `parse(str, options?: { stripTagPrefix?: boolean }): unknown` — XML→객체. `stripTagPrefix` 면 태그의 네임스페이스 접두사(`ns:tag`)를 제거(속성 접두사는 유지).
- `stringify(obj, options?: XmlBuilderOptions): string` — 객체→XML. `options` 는 fast-xml-parser 빌더 옵션을 그대로 덮어씀.

```ts
xml.parse('<root id="1"><item>hello</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hello" }] } }
```

## bytes (`import { bytes } from "@simplysm/core-common"`)

`Uint8Array`(=`Bytes`) 인코딩 유틸. 모두 자체 구현(브라우저·Node 공용).

- `concat(arrays: Bytes[]): Bytes` — 여러 바이트 배열 결합.
- `toHex(bytes): string` — 소문자 hex 문자열.
- `fromHex(hex): Bytes` — hex→바이트. 홀수 길이·비hex 문자면 `ArgumentError`.
- `toBase64(bytes): string` — base64 문자열.
- `fromBase64(base64): Bytes` — base64→바이트(공백·패딩 정규화). 비base64 문자·잘못된 길이면 `ArgumentError`.

## transfer (`import { transfer } from "@simplysm/core-common"`)

Worker 간 전송용 직렬화. `structuredClone` 이 못 다루는 커스텀 타입을 `__type__` 태그 객체로 변환하되 `Uint8Array` 는 그대로 두고 그 `ArrayBuffer` 를 transfer 목록에 담아 zero-copy 전송.

- `encode(obj): { result: unknown; transferList: ArrayBuffer[] }` — 전송 가능한 형태로 인코딩. `result` 를 `postMessage` 본문, `transferList` 를 전송 목록으로 사용. 순환 참조 시 경로 정보 포함 `TypeError`, 동일 객체 다중 참조는 캐시 재사용(`SharedArrayBuffer` 는 transferList 제외).
- `decode(obj): unknown` — 수신측에서 `__type__` 태그를 다시 값 타입으로 복원.

```ts
import { transfer } from "@simplysm/core-common";
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);
// 수신측: const data = transfer.decode(event.data);
```

주의: `json` 은 문자열 직렬화(바이트는 hex 로), `transfer` 는 객체 그대로 전송(바이트는 zero-copy). 두 경로 모두 같은 커스텀 값 타입을 보존하지만 산출물 형태가 다름 — 저장·전송 매체에 맞게 선택.
