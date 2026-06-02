# @simplysm/core-common

브라우저·Node 공용 유틸리티 패키지. 에러 계층, 불변 날짜/시간 값, 큐·이벤트·로거, 컬렉션 프로토타입 확장, 객체·문자열·숫자·바이트·경로·직렬화 네임스페이스, 타입 유틸리티를 제공한다. 패키지를 import 하면 부수효과로 `Array`/`Set`/`Map` 프로토타입 확장이 주입된다.

## 사용 트리거 인덱스

- **날짜·시간** — `DateTime`/`DateOnly`/`Time` 불변 값과 포맷(`dt`). 날짜 계산·주차·포맷이 필요할 때. 자세히: [datetime.md](./datetime.md)
- **컬렉션 확장** — `Array`/`Set`/`Map` 프로토타입 메서드(groupBy·distinct·orderBy·diffs·toTree·getOrCreate 등). 배열·맵·셋 가공 시. 자세히: [array-ext.md](./array-ext.md)
- **obj 네임스페이스** — 깊은 clone·equal·merge·merge3, 경로 접근, pick/omit, 키 변환. 객체 비교·병합·정리 시. 자세히: [obj.md](./obj.md)
- **직렬화 (json/xml/transfer)** — 커스텀 타입 보존 JSON·XML·Worker 전송. 영속화·통신·워커 전달 시. 자세히: [json-transfer.md](./json-transfer.md)
- **에러** — `SdError`/`ArgumentError`/`NotImplementedError`/`TimeoutError`. throw 시 메시지 체인·인자 덤프가 필요할 때. (아래 인라인)
- **env** — `env`/`parseBoolEnv`. 환경변수 read/write·불리언 파싱 시. (아래 인라인)
- **값 타입** — `Uuid`, `LazyGcMap`. UUID 생성·검증, 자동 만료 캐시 맵. (아래 인라인)
- **큐·이벤트·로거** — `DebounceQueue`/`SerialQueue`/`EventEmitter`/`createLogger`. 디바운스·직렬 실행·이벤트·태그 로깅 시. (아래 인라인)
- **문자열·숫자·바이트·경로 (str/num/bytes/path/wait/err/primitive)** — 케이스 변환·조사·파싱·포맷·hex/base64·POSIX 경로·대기. (아래 인라인)
- **코드 템플릿 태그·ZIP** — `js`/`ts`/`html`/`tsql`/`mysql`/`pgsql` 하이라이팅 태그, `ZipArchive`. (아래 인라인)
- **타입 유틸리티** — `Bytes`/`PrimitiveType*`/`DeepPartial`/`Type`. 원시 타입 매핑·생성자 타입이 필요할 때. (아래 인라인)

## 에러

`SdError` 를 루트로 한 계층. 메시지는 상위→하위→원인 순서로 `" => "` 결합되어 출력된다.

- `new SdError(cause: Error, ...messages)` / `new SdError(...messages)` — ES2024 `cause` 활용. `cause` 가 있으면 stack 에 원인 stack 을 이어 붙임. `messages` 는 역순 결합(뒤 인자가 더 하위).
- `new ArgumentError(argObj)` / `new ArgumentError(message, argObj)` — 유효하지 않은 인자용. `argObj` 를 YAML 로 메시지에 포함(기본 메시지 "잘못된 인자입니다.").
- `new NotImplementedError(message?)` — 미구현 분기·추상 스텁용. 메시지 "미구현(: message)".
- `new TimeoutError(count?, message?)` — 대기 초과용. `count` 는 시도 횟수. `wait.until` 이 최대 시도 초과 시 자동 throw.

```typescript
throw new SdError(err, "API 호출 실패");          // "API 호출 실패 => <원인 메시지>"
throw new ArgumentError("잘못된 사용자", { userId }); // YAML 인자 덤프 포함
```

## env

- `env(key): string | undefined` — 환경변수 읽기(`process.env` 우선, 없으면 `import.meta.env`).
- `env(key, value): void` — `process.env` 에 쓰기(process 가 있을 때만).
- `parseBoolEnv(value): boolean` — `"true"`/`"1"`/`"yes"`/`"on"`(대소문자 무시) → `true`, 그 외 → `false`.

## 값 타입

### Uuid

암호학적으로 안전한 UUID v4(`crypto.getRandomValues` 기반) 불변 값 객체.
- `Uuid.generate(): Uuid` — 새 v4 생성.
- `Uuid.fromBytes(bytes): Uuid` — 16바이트 `Uint8Array` 로 생성(길이≠16 이면 `ArgumentError`).
- `new Uuid(uuidStr)` — 형식(`8-4-4-4-12` hex) 검증, 불일치 시 `ArgumentError`.
- `toString(): string` / `toBytes(): Uint8Array` — 문자열·16바이트 변환.

### LazyGcMap

LRU 접근시간 기반 자동 만료 Map. **반드시 `dispose()` 호출** 해야 GC 타이머가 정리됨(아니면 메모리 누수).
- `new LazyGcMap({ gcInterval?, expireTime, onExpire? })` — `expireTime`(ms): 마지막 접근 후 이 시간 지나면 삭제. `gcInterval`(ms): GC 주기, 기본 `expireTime/10`(최소 1000). `onExpire(key, value)`: 만료 시 콜백(async 가능, 에러 시 로그 후 계속).
- `get(key)` — 조회(접근시간 갱신). `has(key)` — 존재 확인(갱신 안 함). `set(key, value)` — 저장(첫 set 에 GC 타이머 시작). `delete(key)` / `clear()`(인스턴스 재사용 가능) / `dispose()`(이후 사용 불가).
- `getOrCreate(key, factory)` — 없으면 `factory()` 로 생성·저장(dispose 후 호출 시 throw).
- `size` getter, `keys()`/`values()`/`entries()` 이터레이터.

## 큐·이벤트·로거

### EventEmitter\<TEvents\>

`EventTarget` 래퍼. `TEvents` 는 `{ 이벤트명: 데이터타입 }` 맵. 보통 상속해 사용.
- `on(type, listener)` / `off(type, listener)` — 등록/해제(같은 리스너 중복 등록은 무시).
- `emit(type, data?)` — 발행(데이터 타입이 `void` 면 인자 생략).
- `listenerCount(type): number` — 리스너 수.
- `dispose()` — 모든 리스너 제거.

### DebounceQueue (extends EventEmitter\<{ error: SdError }\>)

연속 호출 시 마지막만 실행하는 디바운스 큐. 실행 중 들어온 요청은 지연 없이 직후 즉시 처리.
- `new DebounceQueue(delay?)` — `delay`(ms) 생략 시 다음 이벤트 루프에 즉시.
- `run(fn)` — 대기 함수 교체(이전 대기 폐기). `dispose()` — 타이머·대기 정리.
- 작업 에러는 `"error"` 리스너가 있으면 emit, 없으면 내부 로거로 출력.

### SerialQueue (extends EventEmitter\<{ error: SdError }\>)

추가된 함수를 순차 실행. 한 작업이 실패해도 후속은 계속.
- `new SerialQueue(gap?)` — `gap`(ms) 작업 사이 간격(기본 0).
- `run(fn)` — 큐에 추가·실행. `dispose()` — 대기분 비움(실행 중 작업은 완료).
- 에러 처리는 DebounceQueue 와 동일.

### createLogger

- `createLogger(tag): ConsolaInstance` — `consola.withTag` 를 지연 생성하는 lazy 로거. 모듈 레벨에서 선언해도 이후 `setupConsola` 변경(level/reporters)이 반영됨. `vi.spyOn` 호환.

## 문자열·숫자·바이트·경로·대기

### str 네임스페이스
- `str.getKoreanSuffix(text, type)` — 받침에 따라 한국어 조사 반환. `type`: `"을"`(을/를)·`"은"`(은/는)·`"이"`(이/가)·`"와"`(과/와)·`"랑"`(이랑/랑)·`"로"`(으로/로, ㄹ받침 예외)·`"라"`(이라/라).
- `str.replaceFullWidth(s)` — 전각 영문·숫자·공백·괄호 → 반각.
- `str.toPascalCase`/`toCamelCase`/`toKebabCase`/`toSnakeCase(s)` — 케이스 변환(연속 대문자 분리, 기존 구분자 유지).
- `str.isNullOrEmpty(s): s is "" | undefined` — null/undefined/빈 문자열 타입 가드.
- `str.insert(s, index, insertString)` — 지정 위치에 문자열 삽입.

### num 네임스페이스
- `num.parseInt(text)` / `num.parseFloat(text)` — 비숫자 문자 제거 후 파싱(선행 `-` 만 음수 부호 유지). 실패 시 `undefined`. parseInt 는 소수부 버림.
- `num.parseRoundedInt(text)` — float 파싱 후 반올림 정수.
- `num.isNullOrEmpty(val): val is 0 | undefined` — null/undefined/0 타입 가드.
- `num.format(val, digit?)` — 천 단위 구분 문자열. `digit: { max?, min? }` 소수 자릿수(min 부족분 0 채움). val 이 undefined 면 undefined.

### bytes 네임스페이스 (`Bytes` = `Uint8Array`)
- `bytes.concat(arrays)` — 여러 Uint8Array 결합.
- `bytes.toHex(bytes)` / `bytes.fromHex(hex)` — hex 왕복(소문자 출력. fromHex 는 홀수 길이·비hex 문자 시 `ArgumentError`).
- `bytes.toBase64(bytes)` / `bytes.fromBase64(base64)` — base64 왕복(fromBase64 는 공백·패딩 정규화, 잘못된 문자·길이 시 `ArgumentError`).

### path 네임스페이스 (POSIX `/` 전용, 브라우저·Capacitor용)
- `path.join(...segments)` — 슬래시 결합(중복 슬래시 정리). `path.basename(filePath, ext?)` — 파일명(ext 일치 시 제거). `path.extname(filePath)` — 확장자(숨김 파일은 빈 문자열).

### wait 네임스페이스
- `wait.until(forwarder, milliseconds?, maxCount?)` — 조건이 true 될 때까지 대기. `milliseconds` 확인 간격(기본 100), `maxCount` 최대 시도(초과 시 `TimeoutError`, undefined 면 무제한).
- `wait.time(millisecond)` — 지정 ms 대기 Promise.

### err 네임스페이스
- `err.message(error): string` — `unknown` 에러에서 메시지 추출(`Error` 면 `.message`, 아니면 `String()`). catch 블록용.

### primitive 네임스페이스
- `primitive.typeStr(value): PrimitiveTypeStr` — 런타임 값 → 원시 타입 문자열(`"string"`|`"number"`|`"boolean"`|`"DateTime"`|`"DateOnly"`|`"Time"`|`"Uuid"`|`"Bytes"`). 미지원 타입은 `ArgumentError`.

## 코드 템플릿 태그·ZIP

코드 하이라이팅용 태그 함수(동작은 문자열 결합 + 공통 들여쓰기 정규화로 동일):
- `js`/`ts`/`html`/`tsql`/`mysql`/`pgsql` — 각각 JS·TS·HTML·MSSQL·MySQL·PostgreSQL 하이라이팅 의도. `` js`...` `` 형태로 사용.

### ZipArchive
ZIP 읽기/쓰기/압축/해제 클래스. 내부 캐시로 중복 해제 방지. **사용 후 `close()` 필수**.
- `new ZipArchive(data?)` — `data`(`Blob | Bytes`) 생략 시 새 아카이브.
- `get(fileName): Promise<Bytes | undefined>` — 특정 파일 추출. `exists(fileName): Promise<boolean>` — 존재 확인.
- `extractAll(progressCallback?): Promise<Map<string, Bytes | undefined>>` — 전체 추출. `progressCallback(progress)` 의 `progress: ZipArchiveProgress { fileName, totalSize, extractedSize }`.
- `write(fileName, bytes)` — 캐시에 파일 추가. `compress(): Promise<Bytes>` — 캐시 내용을 ZIP 으로 압축(내부에서 extractAll 호출, 대용량 메모리 주의). `close()` — 리더 닫고 캐시 비움.

## 타입 유틸리티

`common.types` 의 타입(네임스페이스 아닌 직접 export):
- `Bytes` = `Uint8Array` — 바이너리 타입 별칭.
- `PrimitiveTypeMap` — `{ string, number, boolean, DateTime, DateOnly, Time, Uuid, Bytes }` 원시 타입 매핑(orm-common 과 공유).
- `PrimitiveTypeStr` = `keyof PrimitiveTypeMap` — 원시 타입 문자열 key.
- `PrimitiveType` = `PrimitiveTypeMap[PrimitiveTypeStr] | undefined` — 원시 타입 union.
- `DeepPartial<TObject>` — 모든 속성을 재귀적으로 optional 로(원시 타입은 그대로, object/array 에만 재귀).
- `Type<TInstance>` — 클래스 생성자 타입(`new (...args) => TInstance`). DI·팩토리·`instanceof` 체크용.
