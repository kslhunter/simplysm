# @simplysm/core-common

브라우저·Node 공용 기반 유틸. 날짜/시간 값 타입, 에러 클래스, 배열/Set/Map 프로토타입 확장, 객체 조작, 직렬화(json/xml/bytes/transfer), 비동기 큐·이벤트·대기, 문자열/숫자/경로 유틸, 로거·환경변수·원시타입 매핑을 제공.

## 사용 트리거 인덱스

- **에러 클래스 (SdError·ArgumentError·NotImplementedError·TimeoutError)** — 원인 체인을 묶은 에러를 throw 하거나 `err.message` 를 안전 추출할 때. 자세히: [errors.md](./errors.md)
- **날짜/시간 값 타입 (DateTime·DateOnly·Time·Uuid)** — 불변 날짜/시간/식별자 값을 만들고 파싱·산술·포맷·주차계산할 때. 자세히: [value-types.md](./value-types.md)
- **배열/Set/Map 확장** — `arr.single/groupBy/toMap/toTree/distinct/orderBy/diffs/oneWayDiffs/merge` 등 프로토타입 확장 메서드와 `Set.adds/toggle`, `Map.getOrCreate/update` 를 쓸 때. 자세히: [collection-ext.md](./collection-ext.md)
- **객체 조작 (obj 네임스페이스)** — `obj.clone/equal/merge/merge3/pick/omit/getChainValue/keys/entries/map` 등 깊은 복사·비교·병합·체인 접근이 필요할 때. 자세히: [obj.md](./obj.md)
- **직렬화 (json·xml·bytes·transfer)** — 커스텀 타입(DateTime/Uuid/Map/Error 등) 포함 객체를 JSON/XML 문자열, hex/base64, Worker 전송 형태로 변환할 때. 자세히: [serialization.md](./serialization.md)
- **비동기 런타임 (큐·이벤트·대기·LazyGcMap)** — `DebounceQueue`/`SerialQueue` 로 호출 흐름을 제어하거나, `EventEmitter` 로 타입 안전 이벤트를 다루거나, `wait.until/time`, 자동 만료 Map 이 필요할 때. 자세히: [async-runtime.md](./async-runtime.md)
- **str (문자열 유틸)** — 한국어 조사 선택, 전각→반각, 케이스 변환, 빈문자열 판별, 삽입. (아래 인라인)
- **num (숫자 유틸)** — 비숫자 제거 후 정수/실수 파싱, 0/null 판별, 천단위 포맷. (아래 인라인)
- **path (POSIX 경로 유틸)** — 브라우저용 join/basename/extname. (아래 인라인)
- **primitive (원시타입 추론)** — 런타임 값에서 `PrimitiveTypeStr` 추론. (아래 인라인)
- **template-strings (코드 하이라이팅 태그)** — `js/ts/html/tsql/mysql/pgsql` 템플릿 태그로 들여쓰기 정규화. (아래 인라인)
- **env / createLogger** — 환경변수 읽기·쓰기, 모듈 레벨 안전 lazy 로거 생성. (아래 인라인)
- **공용 타입 (common.types)** — `PrimitiveType`/`PrimitiveTypeStr`/`PrimitiveTypeMap`/`Bytes`/`DeepPartial`/`Type`. (아래 인라인)

> `dt` (날짜 포맷 헬퍼) 네임스페이스도 `import { dt }` 로 노출되지만, 보통 `DateTime`/`DateOnly`/`Time` 의 `toFormatString` 을 통해 간접 사용한다. 포맷 토큰 표는 [value-types.md](./value-types.md) 참조.

## str (문자열 유틸)

`import { str } from "@simplysm/core-common"` 네임스페이스.

- `getKoreanSuffix(text: string, type: "을"|"은"|"이"|"와"|"랑"|"로"|"라"): string` — 마지막 글자 받침 유무로 한국어 조사를 선택. type 은 조사 쌍 식별자: `"을"`=을/를, `"은"`=은/는, `"이"`=이/가, `"와"`=과/와, `"랑"`=이랑/랑, `"로"`=으로/로(받침이 ㄹ이면 "로"), `"라"`=이라/라. 한글(0xAC00~0xD7A3)이 아니거나 빈 문자열이면 받침 없는 형태 반환. 동적 메시지 조립 시 사용.
- `replaceFullWidth(str: string): string` — 전각 영문(Ａ-Ｚ/ａ-ｚ)·숫자(０-９)·공백·괄호(（）)를 반각으로 치환. 외부 입력(엑셀·스캐너) 정규화 시.
- `toPascalCase(str: string): string` — `-`/`_`/`.` 구분자 뒤 글자와 첫 글자를 대문자화. 식별자 변환 시.
- `toCamelCase(str: string): string` — 구분자 뒤 글자는 대문자화하되 첫 글자는 소문자화.
- `toKebabCase(str: string): string` — 대문자 앞에 `-` 삽입 후 소문자화. 연속 대문자도 글자별 분리(`XMLParser`→`x-m-l-parser`), 기존 `-`/`_` 구분자는 유지.
- `toSnakeCase(str: string): string` — `toKebabCase` 와 동일 규칙이되 구분자가 `_`.
- `isNullOrEmpty(str: string | undefined): str is "" | undefined` — null/undefined/빈문자열이면 true 인 타입 가드. else 분기에서 비어있지 않은 string 으로 좁혀짐.
- `insert(str: string, index: number, insertString: string): string` — index 위치(0 기준)에 문자열 삽입한 새 문자열.

```ts
import { str } from "@simplysm/core-common";
const label = "사과" + str.getKoreanSuffix("사과", "을") + " 담았습니다."; // "사과를 담았습니다."
```

## num (숫자 유틸)

`import { num } from "@simplysm/core-common"` 네임스페이스. 파싱 계열은 비숫자 문자(0-9·`-`·`.` 외)를 먼저 제거하므로 `"010-1234"` 같은 입력도 받음(선행 `-`만 부호로 유지, 중간 `-` 는 제거).

- `parseInt(text: unknown): number | undefined` — 정수 파싱. number 면 `Math.trunc`, 소수 문자열이면 정수부만, 빈 문자열·`"-"`·파싱 불가면 undefined.
- `parseFloat(text: unknown): number | undefined` — 실수 파싱. number 는 그대로, 파싱 불가면 undefined.
- `parseRoundedInt(text: unknown): number | undefined` — `parseFloat` 후 `Math.round`. 반올림 정수가 필요할 때.
- `isNullOrEmpty(val: number | undefined): val is 0 | undefined` — null/undefined/0 이면 true 인 타입 가드. else 분기에서 0 아닌 number 로 좁혀짐.
- `format(val: number | undefined, digit?: { max?: number; min?: number }): string | undefined` — `toLocaleString` 기반 천단위 구분자 포맷. `max`=최대 소수 자릿수, `min`=최소 소수 자릿수(부족분 0 채움). val 이 undefined 면 undefined 반환.

```ts
import { num } from "@simplysm/core-common";
num.format(1234.567, { max: 2 }); // "1,234.57"
num.parseInt("010-1234-5678");    // 1012345678
```

## path (POSIX 경로 유틸)

`import { path } from "@simplysm/core-common"` 네임스페이스. POSIX 슬래시(`/`) 경로만 지원(Windows 백슬래시 미지원). 브라우저·Capacitor 환경용 Node `path` 대체.

- `join(...segments: string[]): string` — 슬래시로 결합하며 첫 세그먼트는 끝 슬래시만, 이후 세그먼트는 앞뒤 슬래시·빈 세그먼트 제거.
- `basename(filePath: string, ext?: string): string` — 마지막 세그먼트 추출. `ext` 가 끝과 일치하면 제거.
- `extname(filePath: string): string` — 마지막 `.` 이후 확장자(`.` 포함). 숨김파일(`.gitignore` 처럼 앞 `.`)은 빈 문자열.

## primitive (원시타입 추론)

`import { primitive } from "@simplysm/core-common"` 네임스페이스.

- `typeStr(value): PrimitiveTypeStr` — 런타임 값에서 `"string"|"number"|"boolean"|"DateTime"|"DateOnly"|"Time"|"Uuid"|"Bytes"`(Uint8Array→`"Bytes"`) 중 해당 문자열 반환. 지원하지 않는 타입이면 `ArgumentError` throw. ORM/직렬화에서 값 타입을 문자열 키로 다룰 때.

## template-strings (코드 하이라이팅 태그)

`import { js, ts, html, tsql, mysql, pgsql } from "@simplysm/core-common"`. 모두 동일 동작 — 보간값을 문자열로 합친 뒤 공통 최소 들여쓰기를 제거하고 앞뒤 빈 줄을 잘라냄(보간값이 null/undefined 면 빈 문자열). 함수별 차이는 IDE 하이라이팅 언어 힌트뿐(js/ts/html/T-SQL/MySQL/PostgreSQL). 런타임 검증·이스케이프는 하지 않음.

```ts
import { ts } from "@simplysm/core-common";
const code = ts`
  interface User {
    name: string;
  }
`; // 앞 공통 들여쓰기 제거된 문자열
```

## env / createLogger

`import { env, parseBoolEnv, createLogger } from "@simplysm/core-common"`.

- `env(key: string): string | undefined` — 환경변수 읽기. `process.env` 우선, 없으면 `import.meta.env` fallback(Node 에선 보통 undefined).
- `env(key: string, value: string): void` — `process.env[key]` 에 쓰기(process 없는 런타임이면 무시).
- `parseBoolEnv(value: unknown): boolean` — `"true"/"1"/"yes"/"on"`(대소문자 무시)이면 true, 그 외 false. 환경변수 boolean 해석 시.
- `createLogger(tag: string): ConsolaInstance` — consola 태그 로거를 첫 메서드 접근 시점까지 지연 생성하는 Proxy. 모듈 레벨에서 선언해도 이후 `setupConsola` 의 level/reporters 변경이 child 인스턴스에 반영됨. `consola.withTag()` 직접 호출 대신 사용(로깅 표준 매뉴얼 강제). tag 형식은 `<도메인>:<역할>` 또는 단일 토큰.

```ts
import { createLogger, env, parseBoolEnv } from "@simplysm/core-common";
const logger = createLogger("MyModule");
if (parseBoolEnv(env("DEV"))) logger.debug("dev mode");
```

## 공용 타입 (common.types)

`import type { ... } from "@simplysm/core-common"`. orm-common 등과 공유되는 원시타입 매핑·유틸 타입.

- `Bytes = Uint8Array` — 바이너리 값 타입(Node `Buffer` 대신 사용).
- `PrimitiveTypeMap` — 원시타입 문자열 key → 실제 타입 매핑(`string/number/boolean/DateTime/DateOnly/Time/Uuid/Bytes`).
- `PrimitiveTypeStr = keyof PrimitiveTypeMap` — 위 매핑의 key 유니온.
- `PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined` — 모든 원시 값 유니온(undefined 포함).
- `DeepPartial<TObject>` — 원시타입은 그대로 두고 객체/배열만 재귀적으로 optional 화. 부분 패치 입력 타입에.
- `Type<TInstance>` — `new (...args: unknown[]) => TInstance` 생성자 타입. 팩토리·DI·`instanceof` 분기에서 클래스를 값으로 받을 때.
