# @simplysm/core-common — 직렬화 (json / xml / transfer)

커스텀 타입을 보존하며 직렬화/역직렬화할 때 함께 읽히는 묶음. `json`(문자열 ↔ 객체), `xml`(XML ↔ 객체), `transfer`(Web Worker 전송용). 세 모듈 모두 `DateTime`/`DateOnly`/`Time`/`Uuid`/`Set`/`Map`/`Error`/`Uint8Array` 등을 `__type__` 태그 객체로 변환해 왕복 보존한다.

## json 네임스페이스

`import { json } from "@simplysm/core-common"`. 전역 프로토타입을 건드리지 않아 Worker 환경 안전.

- `json.stringify(obj, options?): string` — 커스텀 타입(Date/DateTime/DateOnly/Time/Uuid/Set/Map/Error/Uint8Array)을 `{ __type__, data }` 로 변환 후 직렬화. `options`:
  - `space?: string | number` — 들여쓰기(숫자=공백 수, 문자열=들여쓰기 문자열).
  - `replacer?: (key, value) => unknown` — 기본 타입 변환 **전에** 호출되는 커스텀 변환기.
  - `redactBytes?: boolean` — true 면 `Uint8Array` 내용을 `"__hidden__"` 로 대체(로깅용). 이 결과는 `json.parse` 로 복원 불가.
  - 순환 참조는 `TypeError`, `toJSON` 메서드가 있으면 호출(위 커스텀 타입은 예외), `undefined` 속성은 제외.
- `json.parse<T>(json): T` — `__type__`/`data` 태그를 보고 커스텀 타입 복원. 모든 JSON `null` 을 `undefined` 로 변환(simplysm null-free 규칙). 사용자 데이터에 우연히 `{ __type__, data }` 형태가 있으면 오변환 위험. `redactBytes` 로 가려진 바이트를 만나면 `SdError`. 파싱 실패 시 `SdError`(환경변수 `DEV` 가 truthy 면 전체 JSON, 아니면 길이만 메시지에 포함).

```typescript
const text = json.stringify({ at: new DateTime(), bin: new Uint8Array([1, 2]) }, { space: 2 });
const back = json.parse<{ at: DateTime; bin: Uint8Array }>(text); // 타입 복원됨
```

## xml 네임스페이스

`import { xml } from "@simplysm/core-common"`. `fast-xml-parser` 기반.

- `xml.parse(str, options?): unknown` — XML → 객체. 속성은 `$` 객체로, 텍스트 노드는 `_` key 로, 자식 요소는 배열로 변환(루트 제외). `options.stripTagPrefix?: boolean` 면 태그의 네임스페이스 접두사(`ns:tag`)를 제거(속성 접두사는 유지).
- `xml.stringify(obj, options?): string` — 객체 → XML. `options` 는 fast-xml-parser 의 `XmlBuilderOptions`(기본값을 덮어쓸 때만 사용).

```typescript
xml.parse('<root id="1"><item>hi</item></root>');
// { root: { $: { id: "1" }, item: [{ _: "hi" }] } }
```

## transfer 네임스페이스

`import { transfer } from "@simplysm/core-common"`. Web Worker 간 데이터 전송용. `structuredClone` 이 못 다루는 커스텀 타입을 처리하고, `Uint8Array` 의 버퍼를 zero-copy 전송 목록에 담는다.

- `transfer.encode(obj): { result, transferList }` — 커스텀 타입을 `{ __type__, data }` 로 변환한 `result` 와 transfer 대상 `ArrayBuffer[]`(transferList) 반환. `worker.postMessage(result, transferList)` 형태로 사용. 순환 참조 시 경로 포함 `TypeError`. 같은 객체 다중 참조는 인코딩 결과 캐시 재사용. `SharedArrayBuffer` 는 transferList 에 넣지 않음.
- `transfer.decode(obj): unknown` — 수신한 태그 객체를 커스텀 타입으로 복원(Date/DateTime/DateOnly/Time/Uuid/RegExp/Error, Map/Set/Array/객체 재귀). `Uint8Array` 는 그대로.

`json` 과 차이: transfer 는 날짜류를 tick(숫자)으로 저장하고 `RegExp` 를 지원하며 `Uint8Array` 를 직렬화하지 않고 버퍼째 넘긴다. JSON 문자열이 아니라 구조화 클론 가능한 객체를 만든다.

```typescript
const { result, transferList } = transfer.encode(payload);
worker.postMessage(result, transferList);
// 수신 측
const data = transfer.decode(event.data);
```
