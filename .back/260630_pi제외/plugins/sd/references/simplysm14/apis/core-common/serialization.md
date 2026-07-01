# @simplysm/core-common — serialization

커스텀 값 타입을 보존하는 JSON/Worker 직렬화, XML 변환, 바이트 인코딩, ZIP 처리 묶음. 외부 전송·저장·압축 경계에서 함께 확인한다.

## json

`import { json } from "@simplysm/core-common"` 네임스페이스.

```ts
json.stringify(obj: unknown, options?: { space?: string | number; replacer?: (key: string | undefined, value: unknown) => unknown; redactBytes?: boolean }): string
json.parse<TResult = unknown>(json: string): TResult
```

- `obj` — 직렬화 대상이다. `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Set`, `Map`, `Error`, `Uint8Array` 를 `{ __type__, data }` 객체로 바꾼다.
- `options.space?: string | number` — `JSON.stringify` 의 들여쓰기 인자다.
- `options.replacer?: (key, value) => unknown` — 특수 타입 변환 전에 호출된다. `key` 는 루트에서 undefined 다.
- `options.redactBytes?: boolean` — true 면 Uint8Array data 를 `"__hidden__"` 으로 대체한다. 이렇게 만든 JSON 을 parse 하면 `SdError`.
- `toJSON` — 일반 객체에 `toJSON` 함수가 있으면 호출 결과를 다시 특수 타입 변환한다. Date/DateTime 등은 그 전에 처리된다.
- 순환 참조 — Array/일반 객체에서 현재 재귀 스택을 다시 만나면 `TypeError("Converting circular structure to JSON")`.
- undefined 처리 — 변환 결과가 null/undefined 인 객체 속성은 결과에서 제외된다.
- `parse<TResult>(json)` — `__type__` 과 `data` key 가 있는 객체를 타입 태그로 인식한다.
- 복원 태그 — `"Date"`, `"DateTime"`, `"DateOnly"`, `"Time"`, `"Uuid"`, `"Set"`, `"Map"`, `"Error"`, `"Uint8Array"` 를 복원한다.
- JSON null — `obj.nullToUndefined` 를 거쳐 모든 null 이 undefined 로 변환된다.
- parse 오류 — `parseBoolEnv(env("DEV"))` 가 true 이면 전체 JSON 을 메시지에 넣고, 아니면 JSON 길이만 넣은 `SdError` 를 throw 한다.

## xml

`import { xml } from "@simplysm/core-common"` 네임스페이스.

```ts
xml.parse(str: string, options?: { stripTagPrefix?: boolean }): unknown
xml.stringify(obj: unknown, options?: XmlBuilderOptions): string
```

- `str: string` — XML 문자열이다.
- `options.stripTagPrefix?: boolean` — true 면 요소 태그명의 첫 `:` 앞 네임스페이스 접두사를 제거한다. 속성 key 는 제거하지 않는다.
- parse 결과 구조 — 속성은 `$` 객체, 텍스트 노드는 `_` key, 루트보다 깊은 자식 요소는 배열로 만든다.
- `obj: unknown` — XML 로 만들 객체다.
- `options?: XmlBuilderOptions` — fast-xml-parser `XMLBuilder` 옵션에 그대로 덮어쓴다. 기본값은 속성 무시 안 함, 속성 그룹 `$`, 텍스트 노드 `_`, boolean attribute 억제 안 함이다.

## bytes

`import { bytes } from "@simplysm/core-common"` 네임스페이스. `Bytes` 는 `Uint8Array` 다.

- `concat(arrays: Bytes[]): Bytes` — 각 배열 길이를 합산해 새 Uint8Array 를 만들고 순서대로 `set` 한다.
- `toHex(bytes: Bytes): string` — 각 바이트를 2자리 소문자 hex 로 이어붙인다.
- `fromHex(hex: string): Bytes` — 짝수 길이 hex 문자열을 Uint8Array 로 바꾼다. 홀수 길이 또는 비 hex 문자가 있으면 `ArgumentError`.
- `toBase64(bytes: Bytes): string` — 자체 base64 테이블로 인코딩한다. 빈 배열은 빈 문자열, 남는 바이트는 `=` padding 으로 채운다.
- `fromBase64(base64: string): Bytes` — 공백과 끝 padding 을 제거한 뒤 base64 문자를 검증한다. 빈 문자열은 빈 Uint8Array, 비 base64 문자 또는 정규화 길이 `% 4 === 1` 이면 `ArgumentError`.

## transfer

`import { transfer } from "@simplysm/core-common"` 네임스페이스.

```ts
transfer.encode(obj: unknown): { result: unknown; transferList: ArrayBuffer[] }
transfer.decode(obj: unknown): unknown
```

- `encode(obj)` — Worker `postMessage` 에 넘길 수 있게 특수 타입을 태그 객체로 바꾼다.
- 지원 특수 타입 — `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error`, `Uint8Array`.
- Error data — `name`, `message`, `stack`, 선택 `code`, 선택 `detail`, 선택 `cause` 를 포함한다. `detail` 과 `cause` 는 재귀 인코딩한다.
- `Uint8Array` — result 는 원래 Uint8Array 이고, buffer 가 SharedArrayBuffer 가 아니면 `transferList` 에 추가한다. 같은 ArrayBuffer 는 중복 추가하지 않는다.
- Array/Map/Set/일반 객체 — 요소·key·value·속성을 재귀 인코딩한다.
- 순환 참조 — 현재 재귀 스택 객체를 다시 만나면 경로를 포함한 `TypeError` 를 throw 한다.
- 공유 객체 — 이미 인코딩한 객체는 cache 결과를 재사용한다.
- `decode(obj)` — 태그 객체를 원래 타입으로 복원하고 Array/Map/Set/일반 객체를 재귀 복원한다.
- decode Error — 새 `Error(message)` 를 만들고 `name`, `stack`, 선택 `code`, 선택 `cause`, 선택 `detail` 을 설정한다.

## ZipArchive

```ts
interface ZipArchiveProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}
class ZipArchive {
  constructor(data?: Blob | Bytes);
  extractAll(progressCallback?: (progress: ZipArchiveProgress) => void): Promise<Map<string, Bytes | undefined>>;
  get(fileName: string): Promise<Bytes | undefined>;
  exists(fileName: string): Promise<boolean>;
  write(fileName: string, bytes: Bytes): void;
  compress(): Promise<Bytes>;
  close(): Promise<void>;
}
```

- `data?: Blob | Bytes` — 있으면 읽기용 ZipReader 를 만든다. Uint8Array 는 `Uint8ArrayReader`, Blob 은 `BlobReader` 를 사용한다. 없으면 새 아카이브 캐시만 가진다.
- `ZipArchiveProgress.fileName` — 현재 처리 중인 ZIP entry 파일명이다.
- `ZipArchiveProgress.totalSize` — 디렉터리가 아닌 entry 의 `uncompressedSize` 합계다.
- `ZipArchiveProgress.extractedSize` — 누적 추출 바이트 수다. 진행 중에는 현재 entry 진행량을 더한 값이다.
- `extractAll(progressCallback?)` — 모든 비디렉터리 entry 를 추출해 내부 cache 에 저장하고 cache Map 을 반환한다. reader 가 없으면 현재 cache 를 반환한다.
- `progressCallback?: (progress) => void` — entry 시작, 진행 중, 완료 시 호출된다.
- `get(fileName)` — cache 에 있으면 cache 값을 반환하고, 없으면 ZIP entry 를 찾아 추출·cache 한다. reader/entry 가 없으면 undefined 를 cache 하거나 반환한다.
- `exists(fileName)` — cache 에 있으면 cache 값이 null/undefined 가 아닌지 확인하고, 아니면 entry 목록에서 파일명을 찾는다.
- `write(fileName, bytes)` — cache 에 파일 bytes 를 저장한다. 같은 이름을 다시 쓰면 cache 값이 바뀐다.
- `compress()` — `extractAll()` 로 cache 를 채운 뒤 cache 값이 있는 항목을 새 ZIP 으로 쓴다. undefined 값은 건너뛴다.
- `close()` — reader 를 닫고 cache 를 비운다.
