# @simplysm/core-common
브라우저·Node 공통 유틸·타입·에러·확장 메서드 패키지. import 시 Array/Map/Set 프로토타입 확장이 자동 적용됨.

## 사용 트리거 인덱스
- **`env`, `parseBoolEnv`, `__DEV__`** — 환경변수 읽기/쓰기 또는 빌드 시점 dev 플래그 분기. (인라인)
- **에러 클래스 (`SdError`, `ArgumentError`, `NotImplementedError`, `TimeoutError`)** — 도메인별 에러 throw 또는 instanceof 분기. (인라인)
- **공통 타입 유틸 (`Bytes`, `Type<T>`, `DeepPartial<T>`, `PrimitiveType*`)** — 타입 시그니처 작성, 생성자/원시타입 타입화. (인라인)
- **날짜·시간·UUID·LazyGcMap 클래스** — 도메인 값 객체 생성/파싱/연산. 자세히: [types.md](./types.md)
- **이벤트·큐 클래스 (`EventEmitter`, `DebounceQueue`, `SerialQueue`)** — 입력 디바운싱, 작업 직렬화, 타입 안전 이벤트 발행. 자세히: [features.md](./features.md)
- **Array/Map/Set 확장 메서드** — `single`/`first`/`groupBy`/`toMap`/`distinct`/`orderBy`/`diffs`/`merge`/`toTree`, `Map.getOrCreate`/`update`, `Set.adds`/`toggle` 등. 자세히: [extensions.md](./extensions.md)
- **`obj`/`str`/`num`/`bytes`/`path`/`json`/`xml`/`wait`/`transfer`/`err`/`dt`/`primitive` 네임스페이스 + `js`/`ts`/`html`/`tsql`/`mysql`/`pgsql` 태그, `ZipArchive`** — 객체 복제·동등성·병합, 문자열 파싱·casing, JSON/XML 직렬화, Worker 전송, 날짜 포맷팅 등. 자세히: [utils.md](./utils.md)

## env

```ts
env(key: string): string | undefined
env(key: string, value: string): void   // process.env에 set
parseBoolEnv(value: unknown): boolean   // "true"|"1"|"yes"|"on" (대소문자 무시) → true
declare const __DEV__: boolean          // 빌드 시 define으로 치환 (라이브러리 빌드에선 미치환)
```
- `env(key)`: `process.env[key]` 우선, 없으면 `import.meta.env[key]`. 둘 다 없으면 `undefined`. Node/브라우저 양쪽 안전.

## 에러 클래스

모두 `SdError` 상속. ES2024 `cause` 사용. V8에서 `captureStackTrace` + cause stack 결합.

```ts
new SdError(cause: Error, ...messages: string[])   // "상위msg => ... => cause.message"
new SdError(...messages: string[])                  // 메시지 가변 인자, 역순 " => " join
new ArgumentError(argObj)                           // "잘못된 인자입니다.\n\n<YAML>"
new ArgumentError(message, argObj)                  // message + YAML 첨부
new NotImplementedError(message?)                   // "미구현[: message]"
new TimeoutError(count?, message?)                  // "대기 시간 초과[(N회 시도)][: message]"
```
- `cause`: 원인 Error. 메시지·stack이 결합되어 디버깅 가능.
- `messages`: 가변 인자, **역순으로** ` => ` join (상위 컨텍스트가 앞).
- `ArgumentError.argObj`: 검사 실패한 인자 객체. `yaml` 라이브러리로 YAML 렌더되어 메시지 끝에 첨부.

## 공통 타입 유틸 (`common.types.ts`)

```ts
type Bytes = Uint8Array                                    // 바이너리 표준 타입 (Buffer 대체)
interface Type<T> extends Function { new (...args: unknown[]): T }   // 클래스 생성자 타입
type DeepPartial<T>                                        // 재귀 Partial (원시타입은 그대로)

type PrimitiveTypeMap = {                                  // 원시 타입 ↔ 문자열 키 매핑
  string, number, boolean, DateTime, DateOnly, Time, Uuid, Bytes
}
type PrimitiveTypeStr = keyof PrimitiveTypeMap             // "string"|"number"|...
type PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined   // 값 union
```
- `Type<T>`: DI/팩토리/instanceof 체크용. `new ctor()` 호출 가능.
- `DeepPartial<T>`: 객체·array는 재귀 Partial. 원시·`DateTime`/`DateOnly`/`Time`/`Uuid`/`Bytes`는 leaf로 유지.
- `PrimitiveType*`: `@simplysm/orm-common`과 공유. `primitive.typeStr(value)` 런타임 추론과 한 쌍.

## 부수 효과 (import 시 자동 적용)

`@simplysm/core-common`을 한 번이라도 import하면 `Array.prototype`·`Map.prototype`·`Set.prototype`에 확장 메서드가 enumerable=false로 추가됨. 글로벌 인터페이스(`Array<T>`, `ReadonlyArray<T>`, `Map<K,V>`, `Set<T>`)도 ambient declare됨.
