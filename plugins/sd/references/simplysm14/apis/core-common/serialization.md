# @simplysm/core-common — serialization

커스텀 값 타입을 보존하는 JSON/Worker 직렬화, XML 변환, 바이트 인코딩, ZIP 처리 묶음. 외부 전송·저장·압축 경계에서 함께 확인한다.

## json

`import { json } from "@simplysm/core-common"` 네임스페이스.

```ts
json.stringify(obj: unknown, options?: { space?: string | number; replacer?: (key: string | undefined, value: unknown) => unknown; redactBytes?: boolean }): string
json.parse<TResult = unknown>(json: string): TResult
```

`json.stringify`:

- `obj` — 직렬화 대상. `Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Set`, `Map`, `Error`, `Uint8Array` 를 `{ __type__, data }` 객체로 변환한다(전역 프로토타입 미수정 → Worker 안전).
- `options.space?: string | number` — `JSON.stringify` 들여쓰기 인자.
- `options.replacer?: (key, value) => unknown` — 특수 타입 변환 **전에** 호출된다. 루트 `key` 는 undefined.
- `options.redactBytes?: boolean` — true 면 Uint8Array data 를 `"__hidden__"` 으로 대체(로깅용). 이렇게 만든 JSON 은 `json.parse` 로 복원 불가(파싱 시 `SdError`).
- `toJSON` — 일반 객체에 `toJSON` 함수가 있으면 호출 결과를 다시 변환한다(Date/DateTime 등은 그 전에 처리됨).
- 순환 참조 — Array/일반 객체에서 현재 재귀 스택을 다시 만나면 `TypeError("Converting circular structure to JSON")`.
- undefined — 변환 결과가 null/undefined 인 객체 속성은 결과에서 제외된다.

`json.parse<TResult>`:

- `{ __type__, data }` key 를 가진 객체를 타입 태그로 인식해 `"Date"`, `"DateTime"`, `"DateOnly"`, `"Time"`, `"Uuid"`, `"Set"`, `"Map"`, `"Error"`, `"Uint8Array"` 를 복원한다. 사용자 데이터에 같은 형태가 있으면 의도치 않게 변환될 수 있다.
- 모든 JSON null 은 `obj.nullToUndefined` 를 거쳐 undefined 로 변환된다(simplysm null-free 규칙).
- 파싱 실패 — `parseBoolEnv(env("DEV"))` 가 true 면 전체 JSON 문자열을, 아니면 JSON 길이만 메시지에 담은 `SdError` 를 throw 한다.

## xml

`import { xml } from "@simplysm/core-common"` 네임스페이스. fast-xml-parser 래퍼.

```ts
xml.parse(str: string, options?: { stripTagPrefix?: boolean }): unknown
xml.stringify(obj: unknown, options?: XmlBuilderOptions): string
```

- `xml.parse(str, options?)` — 속성은 `$` 객체, 텍스트 노드는 `_` key, 루트보다 깊은 자식 요소는 배열로 만든다. `options.stripTagPrefix` true 면 요소 태그명의 첫 `:` 앞 네임스페이스 접두사를 제거한다(속성 key 는 유지).
- `xml.stringify(obj, options?)` — 객체를 XML 문자열로 직렬화한다. `options` 는 `XMLBuilder` 옵션에 덮어쓴다. 기본값: 속성 무시 안 함, 속성 그룹 `$`, 텍스트 노드 `_`, boolean attribute 억제 안 함.

## bytes

`import { bytes } from "@simplysm/core-common"` 네임스페이스. `Bytes` 는 `Uint8Array`.

- `concat(arrays: Bytes[]): Bytes` — 각 배열 길이를 합산해 새 Uint8Array 를 만들고 순서대로 `set` 한다.
- `toHex(bytes: Bytes): string` — 각 바이트를 2자리 소문자 hex 로 이어붙인다.
- `fromHex(hex: string): Bytes` — hex 문자열(대소문자 허용)을 Uint8Array 로 변환한다. 홀수 길이 또는 비 hex 문자가 있으면 `ArgumentError`.
- `toBase64(bytes: Bytes): string` — 자체 base64 테이블로 인코딩한다. 빈 배열은 빈 문자열, 남는 바이트는 `=` 패딩으로 채운다.
- `fromBase64(base64: string): Bytes` — 공백과 끝 패딩 제거 후 디코딩한다. 빈 문자열은 빈 Uint8Array. 비 base64 문자 또는 정규화 길이 `% 4 === 1` 이면 `ArgumentError`.

## transfer

`import { transfer } from "@simplysm/core-common"` 네임스페이스. Worker `postMessage` 전송용 직렬화/역직렬화(structuredClone 미지원 커스텀 타입 처리).

```ts
transfer.encode(obj: unknown): { result: unknown; transferList: ArrayBuffer[] }
transfer.decode(obj: unknown): unknown
```

- `encode(obj)` — 특수 타입(`Date`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `RegExp`, `Error`)을 태그 객체로 바꾸고 Array/Map/Set/일반 객체를 재귀 인코딩한다. `result` 와 함께 zero-copy 전송용 `transferList`(ArrayBuffer 배열)를 반환한다.
- Error data — `name`, `message`, `stack`, 선택 `code`, 선택 `detail`(재귀), 선택 `cause`(재귀)를 포함한다.
- `Uint8Array` — result 는 원래 Uint8Array 그대로, buffer 가 SharedArrayBuffer 가 아니면 `transferList` 에 추가한다(같은 ArrayBuffer 중복 추가 안 함).
- 순환 참조 — 현재 재귀 스택 객체를 다시 만나면 경로(`root`/`a.b` 등)를 포함한 `TypeError` 를 throw 한다. 동일 객체가 여러 곳에서 참조되면 캐시 결과를 재사용한다.
- `decode(obj)` — 태그 객체를 원래 타입으로 복원하고 Array/Map/Set/일반 객체를 재귀 복원한다. Error 는 새 `Error(message)` 에 `name`/`stack`/선택 `code`/`cause`/`detail` 을 설정한다.

## ZipArchive

`import { ZipArchive } from "@simplysm/core-common"`(직접 export). @zip.js/zip.js 래퍼이며 추출 결과를 내부 cache 에 저장해 중복 해제를 막는다.

```ts
interface ZipArchiveProgress {
  fileName: string;
  totalSize: number;
  extractedSize: number;
}
class ZipArchive {
  constructor(data?: Blob | Bytes);
  extractAll(
    progressCallback?: (progress: ZipArchiveProgress) => void,
  ): Promise<Map<string, Bytes | undefined>>;
  get(fileName: string): Promise<Bytes | undefined>;
  exists(fileName: string): Promise<boolean>;
  write(fileName: string, bytes: Bytes): void;
  compress(): Promise<Bytes>;
  close(): Promise<void>;
}
```

- `constructor(data?)` — `data` 가 있으면 읽기용 ZipReader 를 만든다(Uint8Array→`Uint8ArrayReader`, Blob→`BlobReader`). 없으면 빈 아카이브(cache 만 보유).
- `ZipArchiveProgress.fileName` — 현재 처리 중 entry 파일명. `totalSize` — 비디렉터리 entry 의 `uncompressedSize` 합계. `extractedSize` — 누적 추출 바이트(진행 중에는 현재 entry 진행량 가산).
- `extractAll(progressCallback?)` — 모든 비디렉터리 entry 를 추출해 cache 에 저장하고 cache Map 을 반환한다. reader 가 없으면 현재 cache 반환. `progressCallback` 은 entry 시작·진행·완료 시 호출된다.
- `get(fileName)` — cache 에 있으면 cache 값, 없으면 entry 를 찾아 추출·cache 한다. reader/entry 가 없으면 undefined 를 cache·반환.
- `exists(fileName)` — cache 에 있으면 값이 null/undefined 가 아닌지 확인, 아니면 entry 목록에서 파일명을 찾는다.
- `write(fileName, bytes)` — cache 에 파일 bytes 를 저장한다(같은 이름 재기록 시 cache 값 갱신). 실제 ZIP 은 `compress` 시 만들어진다.
- `compress()` — `extractAll()` 로 cache 를 채운 뒤 cache 값이 있는 항목을 새 ZIP 으로 쓴다(undefined 값은 건너뜀). 대용량은 메모리 사용에 주의.
- `close()` — reader 를 닫고 cache 를 비운다.
