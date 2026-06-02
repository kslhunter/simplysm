# @simplysm/core-common — JSON / Worker 직렬화 (json / transfer)

커스텀 타입을 보존하며 직렬화/역직렬화할 때 함께 읽히는 묶음. `json`(문자열 ↔ 객체)과 `transfer`(Web Worker 메시지 ↔ 객체). 두 모듈 모두 `Date`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`Set`/`Map`/`Error`/`Uint8Array` 를 `{ __type__, data }` 태그 객체로 변환해 왕복 보존한다. (XML 직렬화 `xml` 네임스페이스는 README 의 "xml" 인라인 섹션 참조.)

## json

`import { json } from "@simplysm/core-common"`.

```typescript
json.stringify(obj: unknown, options?: {
  space?: string | number;
  replacer?: (key: string | undefined, value: unknown) => unknown;
  redactBytes?: boolean;
}): string;
json.parse<TResult = unknown>(json: string): TResult;
```

- `stringify(obj, options)` — 커스텀 타입을 태그 객체로 변환 후 `JSON.stringify`. 전역 프로토타입을 건드리지 않아 Worker 환경에서 안전.
  - `space` — 들여쓰기(숫자=공백 수, 문자열=들여쓰기 문자).
  - `replacer(key, value)` — 기본 타입 변환 **전에** 호출되는 커스텀 변환 훅.
  - `redactBytes: true` — `Uint8Array` 내용을 `"__hidden__"` 으로 대체(로깅용). 이 결과는 `parse` 로 복원 불가(복원 시도 시 `SdError`).
  - 순환 참조가 있으면 `TypeError`. `toJSON` 메서드가 있는 객체는 그 결과를 사용(Date/DateTime 등 커스텀 타입은 사전 변환 처리됨).
- `parse(json)` — 태그 객체를 원래 타입으로 복원. 복원 후 **모든 JSON null 을 undefined 로 변환**(simplysm null-free 규칙, `obj.nullToUndefined` 사용). 파싱 실패 시 `SdError`로 감싸 throw — `env("DEV")` 가 truthy 면 전체 JSON 문자열을, 아니면 길이만 메시지에 포함.

주의: 사용자 데이터에 우연히 `{ __type__: "Date"|..., data: ... }` 형태가 있으면 의도치 않게 타입으로 복원될 수 있음.

```typescript
const s = json.stringify({ at: new DateTime(), id: Uuid.generate() }, { space: 2 });
const o = json.parse<{ at: DateTime; id: Uuid }>(s); // 타입 복원, null→undefined
```

## transfer

`import { transfer } from "@simplysm/core-common"`. `structuredClone` 이 다루지 못하는 커스텀 타입을 Worker 로 보내기 위한 인코딩/디코딩.

```typescript
transfer.encode(obj: unknown): { result: unknown; transferList: ArrayBuffer[] };
transfer.decode(obj: unknown): unknown;
```

- `encode(obj)` — 커스텀 타입을 태그 객체로 변환한 `result` 와, zero-copy 전송 대상 `transferList`(Uint8Array 의 ArrayBuffer)를 반환. `postMessage(result, transferList)` 에 그대로 전달.
  - `Uint8Array` 는 태그하지 않고 그대로 두되 그 buffer 를 `transferList` 에 추가(`SharedArrayBuffer` 는 제외 — 이미 공유 메모리).
  - `Error` 는 `name`/`message`/`stack` 과 존재 시 `code`/`detail`/`cause` 까지 재귀 인코딩.
  - 순환 참조 시 경로 정보를 담아 `TypeError` throw. 같은 객체가 여러 번 참조되면 캐싱된 인코딩 재사용.
- `decode(obj)` — Worker 에서 받은 데이터의 태그 객체를 원래 타입으로 복원(`Date`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`RegExp`/`Error`, Array/Map/Set/객체 재귀). `Uint8Array` 는 그대로 통과.

```typescript
// 송신
const { result, transferList } = transfer.encode(data);
worker.postMessage(result, transferList);
// 수신
const decoded = transfer.decode(event.data);
```
