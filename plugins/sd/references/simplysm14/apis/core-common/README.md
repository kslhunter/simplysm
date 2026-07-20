# @simplysm/core-common

브라우저, Node 공용 기반 패키지. 값 타입, 에러 클래스, 컬렉션 프로토타입 확장, 객체 조작, 직렬화, 비동기 런타임, 문자열/숫자/경로 유틸을 제공함.
진입점 import 시 Array/Set/Map 프로토타입 확장이 전역 설치됨.

## 사용 트리거 인덱스

- **에러 클래스, err** — 원인 체인을 보존한 에러를 만들거나 `unknown` catch 값에서 메시지, 스택, Error 객체를 추출할 때. 자세히: [errors.md](./errors.md)
- **DateTime, DateOnly, Time, Uuid, dt** — 날짜/시간/UUID 값을 생성, 파싱, 포맷, 불변 산술, 주차 계산하거나 날짜 포맷 토큰을 확인할 때. 자세히: [value-types.md](./value-types.md)
- **Array / Set / Map 확장** — 배열 조회, 그룹화, 정렬, diff/merge, 트리 변환, Set/Map 편의 메서드를 쓸 때. 자세히: [collection-ext.md](./collection-ext.md)
- **obj 네임스페이스** — 깊은 복사, 동등 비교, 병합, 3-way 병합, 체인 경로 접근, 타입 안전 Object 헬퍼가 필요할 때. 자세히: [obj.md](./obj.md)
- **json, xml, bytes, transfer, ZipArchive** — 커스텀 값 타입 보존 직렬화, XML, hex/base64, Worker 전송, ZIP 읽기/쓰기를 다룰 때. 자세히: [serialization.md](./serialization.md)
- **EventEmitter, DebounceQueue, SerialQueue, LazyGcMap, wait** — 타입 안전 이벤트, 디바운스/직렬 실행, 자동 만료 Map, 비동기 대기 흐름이 필요할 때.
  자세히: [async-runtime.md](./async-runtime.md)
- **str** — 한국어 조사, 전각→반각, 케이스 변환, 빈 문자열 판별, 문자열 삽입이 필요할 때.
- **num** — 숫자 문자열 파싱, 0/null 판별, 천단위 포맷이 필요할 때.
- **path** — 브라우저/공용 코드에서 POSIX 슬래시 경로를 결합하거나 파일명, 확장자를 뽑을 때.
- **primitive** — 런타임 값에서 `PrimitiveTypeStr` 문자열 키를 얻을 때.
- **template string tags** — `js`, `ts`, `html`, `tsql`, `mysql`, `pgsql` 태그로 들여쓰기 정규화 문자열을 만들 때.
- **env, parseBoolEnv, createLogger** — 환경변수를 읽고 쓰거나 표준 lazy logger 를 만들 때. (createLogger 로 콘솔 로깅 코드 작성: [logging.md](../../manuals/logging.md))
- **공용 타입** — `Bytes`, `PrimitiveType*`, `DeepPartial`, `Type` 을 타입 인자로 사용할 때.

## str

`import { str } from "@simplysm/core-common"` 네임스페이스.

- `getKoreanSuffix(text: string, type: "을" | "은" | "이" | "와" | "랑" | "로" | "라"): string` — `text` 마지막 한글의 종성 유무에 따라 조사를 반환함.
  빈 문자열이나 한글 범위(0xAC00-0xD7A3) 밖 문자는 받침 없는 형태를 반환함.
  - `type` 별 반환: `"을"`=을/를, `"은"`=은/는, `"이"`=이/가, `"와"`=과/와, `"랑"`=이랑/랑, `"로"`=으로/로(종성이 ㄹ이면 로), `"라"`=이라/라.
- `replaceFullWidth(str: string): string` — 전각 영문 대/소문자, 전각 숫자, 전각 공백, 전각 괄호를 반각 문자로 치환함.
- `toPascalCase(str: string): string` — `-`, `_`, `.` 뒤 소문자를 대문자로 만들고 첫 글자를 대문자로 만듦.
- `toCamelCase(str: string): string` — `-`, `_`, `.` 뒤 소문자를 대문자로 만들고 첫 글자가 대문자이면 소문자로 만듦.
- `toKebabCase(str: string): string` — 대문자 앞에 `-` 를 넣고 소문자로 만듦.
- `toSnakeCase(str: string): string` — 대문자 앞에 `_` 를 넣고 소문자로 만듦.
- `isNullOrEmpty(str: string | undefined): str is "" | undefined` — null/undefined/빈 문자열이면 true 인 타입 가드임.
- `insert(str: string, index: number, insertString: string): string` — `index`(0 기준) 위치에 `insertString` 을 끼운 새 문자열을 반환함.

## num

`import { num } from "@simplysm/core-common"` 네임스페이스.

- `parseInt(text: unknown): number | undefined` — number 는 `Math.trunc`, string 은 숫자, `.`, `-` 외 문자를 제거한 뒤 정수로 파싱함.
  선행 `-` 만 음수 부호로 유지하므로 `"010-1234"` → `101234`. 파싱 불가면 undefined.
- `parseFloat(text: unknown): number | undefined` — number 는 그대로, string 은 숫자, `.`, `-` 외 문자를 제거한 뒤 실수로 파싱함.
  선행 `-` 만 음수로 유지. 파싱 불가면 undefined.
- `parseRoundedInt(text: unknown): number | undefined` — `parseFloat` 결과를 `Math.round` 로 반올림함. 파싱 불가면 undefined.
- `isNullOrEmpty(val: number | undefined): val is 0 | undefined` — null/undefined/0 이면 true 인 타입 가드임.
- `format(val: number | undefined, digit?: { max?: number; min?: number }): string | undefined` — `toLocaleString` 으로 천단위 구분 포맷함.
  `digit.max` 는 최대 소수 자릿수, `digit.min` 은 최소 소수 자릿수(부족 시 0 채움)임. `val` 이 undefined 면 undefined 반환.

## path

`import { path } from "@simplysm/core-common"` 네임스페이스. POSIX 슬래시(`/`) 경로만 지원하며 Windows 백슬래시 경로는 지원하지 않음(브라우저, Capacitor 용).

- `join(...segments: string[]): string` — 세그먼트를 `/` 로 결합함. 첫 세그먼트는 뒤 슬래시만, 이후 세그먼트는 앞뒤 슬래시를 제거하며 빈 세그먼트는 제외함.
- `basename(filePath: string, ext?: string): string` — 마지막 `/` 뒤 파일명을 반환함. `ext` 가 비어 있지 않고 파일명 끝과 일치하면 그 확장자를 제거함.
- `extname(filePath: string): string` — 마지막 `.` 뒤 확장자(`.` 포함)를 반환함. `.` 으로 시작하는 숨김 파일이나 확장자 없는 이름은 빈 문자열을 반환함.

## primitive

`import { primitive } from "@simplysm/core-common"` 네임스페이스.

- `typeStr(value: PrimitiveTypeMap[PrimitiveTypeStr]): PrimitiveTypeStr` — 값의 런타임 타입을 검사해 다음 중 하나를 반환함.
  - 값: `"string" | "number" | "boolean" | "DateTime" | "DateOnly" | "Time" | "Uuid" | "Bytes"`.
  - `Uint8Array` 는 `"Bytes"` 임.
  - 지원하지 않는 타입이면 `ArgumentError`.

## template string tags

`import { js, ts, html, tsql, mysql, pgsql } from "@simplysm/core-common"`.
모두 런타임 동작은 같고 차이는 에디터 하이라이팅 언어 힌트뿐임.
보간값을 `String(value)`(null/undefined 는 빈 문자열)로 합친 뒤 앞뒤 빈 줄과 공통 최소 들여쓰기를 제거함.

- `js(strings: TemplateStringsArray, ...values: unknown[]): string` — JavaScript 용.
- `ts(strings, ...values): string` — TypeScript 용.
- `html(strings, ...values): string` — HTML 용.
- `tsql(strings, ...values): string` — MSSQL T-SQL 용.
- `mysql(strings, ...values): string` — MySQL SQL 용.
- `pgsql(strings, ...values): string` — PostgreSQL SQL 용.

## env / parseBoolEnv / createLogger

`import { env, parseBoolEnv, createLogger } from "@simplysm/core-common"`.

- `env(key: string): string | undefined` — `process.env[key]` 를 우선 읽고, 값이 없으면 `import.meta.env[key]` 를 문자열로 반환함.
- `env(key: string, value: string): void` — `process.env[key] = value` 를 수행함. `process` 가 없는 런타임이면 쓰지 않음.
- `parseBoolEnv(value: unknown): boolean` — `"true"`, `"1"`, `"yes"`, `"on"`(대소문자 무시)만 true, 그 외는 false 임.
- `createLogger(tag: string): ConsolaInstance` — `consola.withTag(tag)` 생성을 첫 메서드 접근 시점까지 지연하는 Proxy 로거임.
  모듈 레벨에서 선언해도 이후의 consola 설정(level/reporters) 변경을 반영하며, 테스트 spy 호환을 위해 target 자체 속성을 cached 인스턴스보다 우선 조회함.
  콘솔 로깅 코드 작성: [logging.md](../../manuals/logging.md)

## 공용 타입

`import type { Bytes, PrimitiveTypeMap, PrimitiveTypeStr, PrimitiveType, DeepPartial, Type } from "@simplysm/core-common"`.

- `Bytes = Uint8Array` — Buffer 대신 쓰는 바이너리 타입임.
- `PrimitiveTypeMap` — `string`, `number`, `boolean`, `DateTime`, `DateOnly`, `Time`, `Uuid`, `Bytes` 키를 실제 값 타입에 매핑함(orm-common 과 공유).
- `PrimitiveTypeStr = keyof PrimitiveTypeMap` — 원시 타입 문자열 키 유니온임.
- `PrimitiveType = PrimitiveTypeMap[PrimitiveTypeStr] | undefined` — 지원 원시 값과 undefined 의 유니온임.
- `DeepPartial<TObject>` — `PrimitiveType` 속성은 그대로 두고 객체/배열 속성만 재귀적으로 optional 처리함.
- `Type<TInstance> extends Function` — `new (...args: unknown[]) => TInstance` 생성자 타입임. DI, 팩토리, `instanceof` 체크에 씀.
