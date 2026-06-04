# @simplysm/core-common

브라우저·Node 공용 유틸리티 패키지. 날짜/시간 값 타입, 에러 클래스, 배열/객체 조작, 직렬화, 비동기 큐, 로거, 환경변수 접근을 제공. 워크스페이스 거의 모든 패키지의 기반.

> 부수효과 주의: 이 패키지를 import 하면 `Array.prototype`·`Set.prototype`·`Map.prototype` 에 확장 메서드가 설치됨(전역 prototype 변경). 확장 메서드는 `array.toMap(...)` 처럼 메서드로 직접 호출.

## 사용 트리거 인덱스

- **에러 클래스** — `throw` 할 때, 에러 원인 체인을 만들 때, catch 에서 분기할 때. SdError/ArgumentError/NotImplementedError/TimeoutError. 자세히: [errors.md](./errors.md)
- **날짜/시간 값 타입** — 날짜·시간을 불변 값으로 다루거나 파싱·포맷·산술할 때. DateTime/DateOnly/Time + `dt` 포맷 네임스페이스. 자세히: [datetime.md](./datetime.md)
- **배열 확장 메서드** — 배열을 그룹화·정렬·중복제거·Map변환·트리화·diff/merge 할 때. `Array.prototype` 확장. 자세히: [array-ext.md](./array-ext.md)
- **객체 유틸 (`obj` 네임스페이스)** — 깊은 복사/비교/병합, 체인 경로 접근, key 변환을 할 때. 자세히: [obj.md](./obj.md)
- **직렬화/Worker 전송** — 커스텀 타입(DateTime·Uuid·Map·Set·Error 등) 포함 데이터를 JSON·XML·바이트·Worker 메시지로 주고받을 때. `json`/`xml`/`bytes`/`transfer` 네임스페이스. 자세히: [serialization.md](./serialization.md)
- **비동기 큐·이벤트·대기** — 디바운스/직렬 실행, 타입 안전 이벤트, 조건 대기, 자동 만료 Map 이 필요할 때. DebounceQueue/SerialQueue/EventEmitter/wait/LazyGcMap. 자세히: [async-runtime.md](./async-runtime.md)
- **로거** — 모듈 어디서든 로그를 찍을 때 (아래 인라인).
- **환경변수** — 환경변수를 읽고/쓰고/boolean 파싱할 때 (아래 인라인).
- **문자열/숫자/경로 유틸** — 한국어 조사, 케이스 변환, 숫자 파싱·포맷, POSIX 경로 조작 (아래 인라인).
- **UUID·ZIP·템플릿 태그·Set/Map 확장·공용 타입** — 그 외 단발성 유틸 (아래 인라인).

## 로거

`createLogger(tag)` — consola 기반 lazy logger 인스턴스 생성. 모듈 레벨에서 호출해도 안전(첫 메서드 접근 시점까지 `consola.withTag` 생성을 지연하므로 이후 `setupConsola()` 의 level/reporters 변경이 반영됨).

- tag: string — 로그 prefix 로 표시되는 태그. 형식은 `<도메인>:<역할>` 또는 단일 토큰 권장. 메시지 본문에 `[패키지명]` 수동 prefix 를 넣지 말 것 — 그 역할은 tag 가 담당.

```ts
import { createLogger } from "@simplysm/core-common";
const logger = createLogger("capacitor:auto-update");
logger.info("최신 버전 확인 중");
logger.error("checkPermissions 실패", err);
```

`console.*` 직접 호출·`consola.withTag()` 직접 호출 금지 — 항상 `createLogger` 사용.

## 환경변수

- `env(key)`: → `string | undefined` — 환경변수 읽기. `process.env[key]` 우선, 없으면 `import.meta.env[key]` fallback. Node·브라우저(Vite) 양쪽에서 동작.
- `env(key, value)`: → `void` — `process.env[key]` 에 값 쓰기 (Node 환경에서만 적용, 브라우저에선 무동작).
- `parseBoolEnv(value)`: → `boolean` — 환경변수 문자열을 boolean 으로 해석. `"true"|"1"|"yes"|"on"` (대소문자 무시) 이면 true, 그 외(빈 값·undefined 포함) false. 플래그성 env 판정에 사용.

```ts
import { env, parseBoolEnv } from "@simplysm/core-common";
if (parseBoolEnv(env("DEV"))) { /* 개발 모드 분기 */ }
```

## 문자열 유틸 (`str` 네임스페이스)

- `str.getKoreanSuffix(text, type)`: → string — 받침 유무로 한국어 조사 선택. type: `"을"`(을/를)·`"은"`(은/는)·`"이"`(이/가)·`"와"`(과/와)·`"랑"`(이랑/랑)·`"로"`(으로/로, 받침 ㄹ 은 "로")·`"라"`(이라/라). 빈 문자열·한글 아님이면 받침 없음 조사 반환. 동적 메시지 조립에 사용.
- `str.replaceFullWidth(s)`: → string — 전각 영문/숫자/공백/괄호를 반각으로 변환. OCR·외부 입력 정규화에 사용.
- `str.toPascalCase(s)` / `toCamelCase(s)` / `toKebabCase(s)` / `toSnakeCase(s)`: → string — 케이스 변환. `-`·`_`·`.` 구분자와 대문자 경계를 인식. 코드 생성·식별자 정규화에 사용.
- `str.isNullOrEmpty(s)`: → `s is "" | undefined` — null/undefined/빈 문자열 판정(타입 가드). false 분기에서 non-empty string 으로 좁혀짐.
- `str.insert(s, index, insertString)`: → string — index 위치에 문자열 삽입한 새 문자열.

```ts
import { str } from "@simplysm/core-common";
`${name}${str.getKoreanSuffix(name, "을")} 저장했습니다`;
```

## 숫자 유틸 (`num` 네임스페이스)

- `num.parseInt(text)`: → `number | undefined` — 비숫자 문자 제거 후 정수 파싱. 소수점은 버림(`"12.34"`→12). 선행 `-` 만 음수 부호로 유지, 중간 `-` 제거(`"010-1234"`→101234). 파싱 불가면 undefined.
- `num.parseFloat(text)`: → `number | undefined` — 위와 동일 규칙으로 실수 파싱.
- `num.parseRoundedInt(text)`: → `number | undefined` — float 파싱 후 반올림한 정수. 소수 입력을 반올림 정수로 받을 때.
- `num.isNullOrEmpty(val)`: → `val is 0 | undefined` — null/undefined/0 판정(타입 가드). false 분기에서 0 아닌 숫자로 좁혀짐.
- `num.format(val, digit?)`: → string(또는 입력이 undefined 면 undefined) — 천 단위 구분자 포함 포맷. `digit.max`=최대 소수 자릿수, `digit.min`=최소 소수 자릿수(부족분 0 채움). `format(1234.567, { max: 2 })`→`"1,234.57"`.

## 경로 유틸 (`path` 네임스페이스)

POSIX 스타일(슬래시 `/`)만 지원. 브라우저·Capacitor 환경용. Windows 백슬래시 경로 미지원.

- `path.join(...segments)`: → string — 세그먼트를 `/` 로 결합. 중간 중복 슬래시·빈 세그먼트 정리.
- `path.basename(filePath, ext?)`: → string — 파일명 추출. ext 가 주어지고 끝나면 그 확장자 제거.
- `path.extname(filePath)`: → string — 확장자 추출(`.` 포함). 숨김 파일(`.gitignore`)은 빈 문자열(Node 와 동일).

## UUID (`Uuid` 클래스)

- `Uuid.generate()`: → Uuid — `crypto.getRandomValues` 기반 암호학적 안전 UUID v4 생성.
- `new Uuid(uuidStr)` — 문자열로 생성. 형식 불일치면 ArgumentError throw.
- `Uuid.fromBytes(bytes)`: → Uuid — 16바이트 Uint8Array 로 생성. 길이≠16 이면 ArgumentError.
- 인스턴스: `toString()` → 문자열, `toBytes()` → 16바이트 Uint8Array.

## ZIP (`ZipArchive` 클래스)

ZIP 읽기/쓰기/압축/해제. 동일 파일 중복 해제 방지용 내부 캐시 사용. 사용 후 `close()` 필수.

- `new ZipArchive(data?)` — data(`Blob | Uint8Array`) 주면 읽기용, 생략하면 새 아카이브.
- `extractAll(progressCallback?)`: → `Promise<Map<string, Bytes | undefined>>` — 모든 파일 추출. 콜백은 `{ fileName, totalSize, extractedSize }` 진행률 수신.
- `get(fileName)`: → `Promise<Bytes | undefined>` — 단일 파일 추출(없으면 undefined).
- `exists(fileName)`: → `Promise<boolean>` — 파일 존재 여부.
- `write(fileName, bytes)`: → void — 파일을 캐시에 등록(아직 압축 전).
- `compress()`: → `Promise<Bytes>` — 캐시된 전체 파일을 ZIP 바이트로 압축. 내부적으로 `extractAll()` 호출(대용량 시 메모리 주의).
- `close()`: → `Promise<void>` — 리더 닫고 캐시 비움.

## 템플릿 태그 (코드 하이라이팅용)

`js` / `ts` / `html` / `tsql` / `mysql` / `pgsql` — 모두 동일 동작: 템플릿 리터럴을 문자열로 결합하고 공통 들여쓰기를 제거(앞뒤 빈 줄 제거). IDE 하이라이팅·가독성 목적이며 SQL 이스케이프 등 기능 차이는 없음.

```ts
import { ts } from "@simplysm/core-common";
const code = ts`
  interface User { name: string; }
`; // 들여쓰기 정규화된 문자열
```

## Set 확장 메서드 (`Set.prototype`)

- `set.adds(...values)`: → this — 여러 값을 한 번에 add. 체이닝 가능.
- `set.toggle(value, addOrDel?)`: → this — 값 토글. `addOrDel` 생략 시 있으면 제거/없으면 추가, `"add"`=강제 추가, `"del"`=강제 제거. 조건부 추가/제거를 한 줄로.

## Map 확장 메서드 (`Map.prototype`)

- `map.getOrCreate(key, newValue)` / `getOrCreate(key, newValueFn)`: → V — key 없으면 값(또는 팩토리 호출 결과) 설정 후 반환, 있으면 기존 값. 주의: V 가 함수 타입이면 두 번째 인자 함수가 팩토리로 인식되어 호출됨 — 함수를 값으로 저장하려면 `() => myFn` 으로 감쌀 것.
- `map.update(key, updateFn)`: → void — `updateFn(현재값 | undefined)` 결과로 값 설정. key 가 없어도 호출됨. 카운터 증가·배열 누적에 사용. 예: `m.update(k, v => (v ?? 0) + 1)`.

## 공용 타입 (`common.types`)

- `Bytes` = `Uint8Array` — 바이너리 데이터 별칭. Buffer 대신 사용.
- `PrimitiveTypeMap` — 원시 타입 문자열 → 실제 타입 매핑(`string`/`number`/`boolean`/`DateTime`/`DateOnly`/`Time`/`Uuid`/`Bytes`). orm-common 과 공유.
- `PrimitiveTypeStr` = `keyof PrimitiveTypeMap` — 원시 타입 문자열 key union.
- `PrimitiveType` — 모든 원시 타입 값의 union(+ undefined).
- `DeepPartial<T>` — 모든 속성을 재귀적으로 optional 화. 원시/날짜 타입은 그대로 두고 object/array 만 재귀.
- `Type<TInstance>` — 클래스 생성자 타입(`new (...args) => TInstance`). DI·팩토리·instanceof 체크에 사용.

## 원시 타입 추론 (`primitive` 네임스페이스)

- `primitive.typeStr(value)`: → PrimitiveTypeStr — 런타임 값에서 원시 타입 문자열 추론(`"hello"`→`"string"`, `new DateTime()`→`"DateTime"`, `Uint8Array`→`"Bytes"`). 지원 안 되는 타입이면 ArgumentError. ORM 컬럼 타입 판정 등에 사용.

## 에러 메시지 추출 (`err` 네임스페이스)

- `err.message(e)`: → string — `unknown` 에러에서 메시지 추출. Error 면 `.message`, 아니면 `String(e)`. catch 블록의 `unknown` 을 안전하게 문자열화할 때.
