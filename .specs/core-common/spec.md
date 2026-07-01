# core-common 개발 분석서

## 1. 개요

### 1.1 핵심 목적

브라우저·Node·Worker 공용 TypeScript 코드에서 반복적으로 쓰는 값 타입, 에러, 컬렉션 확장, 비동기 실행 보조, 직렬화·문자열·숫자·객체 유틸을 단일 패키지 진입점으로 제공한다. (근거: packages/core-common/package.json:2, packages/core-common/src/index.ts:8-56)

### 1.2 주요 목표

- 앱·라이브러리가 `@simplysm/core-common` 하나를 import 해 공용 API와 Array/Set/Map 확장을 함께 사용할 수 있다. (근거: packages/core-common/src/index.ts:4-56)
- 날짜·시간·UUID·바이트 같은 공용 값 타입을 생성·파싱·포맷·직렬화 흐름에서 보존한다. (근거: packages/core-common/src/types/date-time.ts:10, packages/core-common/src/types/date-only.ts:10, packages/core-common/src/types/time.ts:10, packages/core-common/src/types/uuid.ts:9, packages/core-common/src/utils/json.ts:37-181)
- 컬렉션·객체 데이터의 조회, 그룹화, 정렬, diff/merge, 깊은 복사·동등 비교를 소비자 타입이 유지되는 형태로 제공한다. (근거: packages/core-common/src/extensions/arr-ext.types.ts:12-287, packages/core-common/src/utils/obj.ts:19-949)
- 브라우저와 Node 공통 런타임에서 이벤트, 큐, 대기, lazy logger 를 사용할 수 있다. (근거: packages/core-common/src/features/event-emitter.ts:9-88, packages/core-common/src/features/debounce-queue.ts:21-53, packages/core-common/src/features/serial-queue.ts:17-41, packages/core-common/src/features/logger.ts:12)
- JSON/XML/ZIP/Worker 전송/경로/문자열/숫자 유틸을 패키지 네임스페이스로 제공한다. (근거: packages/core-common/src/index.ts:36-52)

### 1.3 소비자/이해관계자

- `@simplysm/*` 내부 패키지와 외부 앱에서 공용 타입·유틸을 import 하는 TypeScript 개발자. (근거: packages/core-common/src/index.ts:8-56)
- 브라우저·Node·WebWorker 공통 코드에서 런타임 차이를 줄여야 하는 라이브러리/앱 구현자. (근거: packages/core-common/tsconfig.json:4)
- 패키지 유지보수자와 테스트 작성자. (근거: packages/core-common/tests/env.spec.ts:4, packages/core-common/tests/extensions/array-extension.spec.ts:4, packages/core-common/tests/utils/json.spec.ts:4)

### 1.4 환경/플랫폼

- ESM 패키지이며 배포 진입점은 `dist/index.js`, 타입 진입점은 `dist/index.d.ts` 이다. (근거: packages/core-common/package.json:12-14)
- TypeScript 컴파일 lib 는 `ESNext`와 `WebWorker` 를 포함한다. (근거: packages/core-common/tsconfig.json:4)
- 런타임 API는 브라우저/Node 공통을 목표로 하되 일부 단위는 `process.env`, `import.meta.env`, `crypto.getRandomValues`, `EventTarget`, `CustomEvent`, 타이머, `Blob` 등 사용 가능 환경에 의존한다. (근거: packages/core-common/src/env.ts:4-26, packages/core-common/src/types/uuid.ts:46-56, packages/core-common/src/features/event-emitter.ts:9-88, packages/core-common/src/utils/wait.ts:35-51, packages/core-common/src/utils/zip.ts:35)
- 패키지 의존성은 `@zip.js/zip.js`, `consola`, `fast-xml-parser`, `yaml` 이다. (근거: packages/core-common/package.json:32-36)

## 2. 사용 시나리오

### 2.1 공용 진입점 import 후 컬렉션 확장 사용

관련 섹션: [단위.패키지 진입점과 프로토타입 설치], [단위.Array 확장], [단위.Set 확장], [단위.Map 확장]

흐름:
1. 소비자가 `@simplysm/core-common` 진입점을 import 한다.
2. 진입점 side effect 로 Array/Set/Map 프로토타입 확장이 설치된다.
3. 소비자는 배열·Set·Map 인스턴스에서 확장 메서드를 호출한다.

### 2.2 공용 값 타입을 파싱·포맷·전송에 사용

관련 섹션: [단위.DateTime], [단위.DateOnly], [단위.Time], [단위.Uuid], [단위.json 네임스페이스], [단위.transfer 네임스페이스], [타입.값 타입]

흐름:
1. 소비자가 문자열·숫자 tick·Date·바이트에서 값 타입 인스턴스를 만든다.
2. 값 타입을 포맷 문자열 또는 `toString()` 으로 문자열화한다.
3. JSON 직렬화나 Worker 전송 시 타입 마커를 통해 값 타입을 보존하고 복원한다.

### 2.3 컬렉션·객체 데이터 가공

관련 섹션: [단위.Array 확장], [단위.obj 네임스페이스], [단위.str 네임스페이스], [단위.num 네임스페이스], [타입.Array diff 결과], [타입.obj 옵션]

흐름:
1. 소비자가 배열 확장으로 단건 조회, 그룹화, Map/Object 변환, 정렬, diff/merge 를 수행한다.
2. 객체 네임스페이스로 깊은 복사·동등 비교·병합·체인 경로 접근·타입 안전 Object 헬퍼를 사용한다.
3. 문자열·숫자 보조 유틸로 표시·입력값을 정규화한다.

### 2.4 비동기 이벤트·큐 흐름 구성

관련 섹션: [단위.EventEmitter], [단위.DebounceQueue], [단위.SerialQueue], [단위.wait 네임스페이스], [단위.createLogger]

흐름:
1. 소비자가 타입 매핑 기반 이벤트를 발행·구독한다.
2. 짧은 시간에 반복되는 작업은 디바운스 큐로 마지막 요청만 처리한다.
3. 순서 보장이 필요한 작업은 직렬 큐에 넣어 순차 실행한다.
4. 조건 대기와 지연은 wait 유틸을 사용하고, 큐 내부 에러는 error 이벤트 또는 logger 로 노출한다.

### 2.5 외부 표현 형식 변환

관련 섹션: [단위.bytes 네임스페이스], [단위.xml 네임스페이스], [단위.ZipArchive], [단위.path 네임스페이스], [단위.template string tags]

흐름:
1. 소비자가 바이트 데이터를 hex/base64 로 변환하거나 결합한다.
2. XML 문자열을 객체로 파싱하거나 객체를 XML 로 만든다.
3. ZIP 파일을 읽고 파일별 추출·존재 확인·압축·종료를 수행한다.
4. 브라우저 친화 POSIX 경로와 들여쓰기 정규화 템플릿 태그를 사용한다.

## 3. 기타 요구사항

### 3.1 진입점 side effect 보존

- 요구 의도: `index.ts` import 시 Array → Set → Map 확장이 먼저 설치되어야 하며, package sideEffects 목록도 해당 파일을 보존해야 한다. (근거: packages/core-common/src/index.ts:4-6, packages/core-common/package.json:19-27)
- 관련 섹션: [단위.패키지 진입점과 프로토타입 설치], [공통 정의.프로토타입 확장]

### 3.2 공용 런타임 호환성

- 요구 의도: core-common 은 브라우저·Node·Worker 공통 패키지이므로 Node 전용 API 사용은 각 단위의 경계로 드러나야 한다. (근거: packages/core-common/tsconfig.json:4, packages/core-common/src/env.ts:24-38, packages/core-common/src/utils/wait.ts:45-51)
- 관련 섹션: [외부 의존.환경 변수 소스], [외부 의존.Web API], [외부 의존.타이머 API]

### 3.3 결측·null 처리 명시

- 요구 의도: 여러 유틸이 null/undefined 를 동일하게 결측으로 보거나 JSON parse 에서 null 을 undefined 로 바꾸므로, 결측 보존·삭제·변환 경계를 단위별로 명확히 해야 한다. (근거: packages/core-common/src/utils/obj.ts:795-824, packages/core-common/src/utils/json.ts:181-223)
- 관련 섹션: [공통 정의.결측], [단위.obj 네임스페이스], [단위.json 네임스페이스]

### 3.4 공개 타입 우선

- 요구 의도: 이 패키지는 다른 `@simplysm/*` 패키지의 기반이므로 공개 입력·출력·추론 타입을 유지해야 한다. (근거: packages/core-common/src/common.types.ts:21-63, packages/core-common/src/extensions/arr-ext.types.ts:12-287, packages/core-common/src/utils/obj.ts:901-949)
- 관련 섹션: [단위.공용 타입], [단위.Array 확장], [단위.obj 네임스페이스]

## 4. 산출 단위

| § | 이름 | kind | 한 줄 요약 |
| --- | --- | --- | --- |
| 4.1 | 패키지 진입점과 프로토타입 설치 | infra | 진입점 export 와 전역 컬렉션 확장 side effect |
| 4.2 | 공용 타입 | api | Bytes·PrimitiveType·DeepPartial·Type 공개 타입 |
| 4.3 | env / parseBoolEnv | api | 환경 변수 읽기·쓰기와 boolean 파싱 |
| 4.4 | createLogger | api | consola 태그 로거 lazy Proxy |
| 4.5 | 에러 클래스 | api | SdError 계열 공개 에러 |
| 4.6 | DateTime | api | 로컬 타임존 날짜시간 값 타입 |
| 4.7 | DateOnly | api | 날짜 전용 값 타입과 주차 계산 |
| 4.8 | Time | api | 24시간 순환 시간 값 타입 |
| 4.9 | Uuid | api | UUID 문자열·바이트 변환과 v4 생성 |
| 4.10 | LazyGcMap | api | 접근 시각 기반 자동 만료 Map |
| 4.11 | EventEmitter | api | 타입 안전 EventTarget 래퍼 |
| 4.12 | DebounceQueue | api | 마지막 요청 중심 비동기 디바운스 큐 |
| 4.13 | SerialQueue | api | 순차 실행 비동기 큐 |
| 4.14 | Array 확장 | api | ReadonlyArray/Array 프로토타입 확장 |
| 4.15 | Set 확장 | api | adds/toggle Set 프로토타입 확장 |
| 4.16 | Map 확장 | api | getOrCreate/update Map 프로토타입 확장 |
| 4.17 | obj 네임스페이스 | api | 객체 복사·비교·병합·경로·Object 헬퍼 |
| 4.18 | str 네임스페이스 | api | 한국어 조사·전각 변환·케이스 변환·삽입 |
| 4.19 | num 네임스페이스 | api | 숫자 파싱·빈값 판정·포맷 |
| 4.20 | path 네임스페이스 | api | POSIX 경로 결합·파일명·확장자 |
| 4.21 | bytes 네임스페이스 | api | Uint8Array 결합·hex/base64 변환 |
| 4.22 | json 네임스페이스 | api | 값 타입 보존 JSON 직렬화·역직렬화 |
| 4.23 | xml 네임스페이스 | api | XML 파싱·빌드 |
| 4.24 | transfer 네임스페이스 | api | Worker 전송용 encode/decode |
| 4.25 | err 네임스페이스 | api | unknown 에러 메시지·스택·객체 복원 |
| 4.26 | dt 네임스페이스 | api | 날짜 형식화 헬퍼 |
| 4.27 | primitive 네임스페이스 | api | 런타임 primitive 타입 문자열 판정 |
| 4.28 | wait 네임스페이스 | api | 조건 대기·시간 대기·이벤트 루프 양보 |
| 4.29 | template string tags | api | js/ts/html/sql 템플릿 들여쓰기 정규화 |
| 4.30 | ZipArchive | api | ZIP 파일 읽기·쓰기·압축·해제 |
| 4.31 | Array 확장 헬퍼 deep export | api | 정렬·중복 제거 내부 헬퍼의 deep import 표면 |

#### 4.1 패키지 진입점과 프로토타입 설치 [구현] (kind: infra)

관련 섹션: [공통 정의.프로토타입 확장], [외부 의존.패키지 배포 메타]

- 목적: 패키지 import 한 번으로 공개 API 전체와 컬렉션 프로토타입 확장 side effect 를 제공한다.
- 인터페이스·계약: `@simplysm/core-common` 진입점은 env, 에러, 값 타입, 기능 클래스, 유틸 네임스페이스, 직접 유틸, 공용 타입을 재내보낸다. (근거: packages/core-common/src/index.ts:8-56)
- 동작·내용: 진입점은 `arr-ext`, `set-ext`, `map-ext` 를 import 한다. `arr-ext` 자체가 `map-ext` 를 먼저 import 하므로 실제 평가 흐름은 Map 확장 → Array 확장 → Set 확장 → 진입점의 Map 확장 재import 확인 순서다. (근거: packages/core-common/src/index.ts:4-6, packages/core-common/src/extensions/arr-ext.ts:7)
- 경계·예외: tree-shaking 이 side effect import 를 제거하면 컬렉션 확장이 사라지므로 package sideEffects 에 source/dist 확장 파일과 index 가 등록되어야 한다. (근거: packages/core-common/package.json:19-27)
- 완료 기준: 진입점이 세 확장 파일을 side effect 로 import 하고, 각 확장 파일을 대상으로 하는 Array/Set/Map 확장 테스트 케이스가 존재하며, package sideEffects 목록이 확장 파일과 index 를 포함한다. (근거: packages/core-common/src/index.ts:4-6, packages/core-common/tests/extensions/array-extension.spec.ts:4, packages/core-common/tests/extensions/set-extension.spec.ts:4, packages/core-common/tests/extensions/map-extension.spec.ts:4)

#### 4.2 공용 타입 [구현] (kind: api)

관련 섹션: [타입.Bytes], [타입.PrimitiveType], [타입.DeepPartial], [타입.Type]

- 목적: 패키지 전반과 다른 패키지가 공유하는 바이너리·primitive·생성자·깊은 partial 타입을 제공한다.
- 인터페이스·계약: `Bytes = Uint8Array`, `PrimitiveTypeMap`, `PrimitiveTypeStr`, `PrimitiveType`, `DeepPartial<TObject>`, `Type<TInstance>` 를 export 한다. (근거: packages/core-common/src/common.types.ts:11-63)
- 동작·내용: `PrimitiveTypeMap` 은 string/number/boolean/DateTime/DateOnly/Time/Uuid/Bytes 를 값 타입 집합으로 묶고, `DeepPartial` 은 primitive 는 유지하면서 객체/배열 속성을 재귀 optional 로 만든다. (근거: packages/core-common/src/common.types.ts:21-53)
- 경계·예외: 런타임 값이 없는 타입 전용 산출물이다. `Type<TInstance>` 는 `Function` 확장 생성자 인터페이스다. (근거: packages/core-common/src/common.types.ts:63)
- 완료 기준: 이 타입들이 index 에서 재export 되어 소비자 import 타입으로 접근 가능하다. (근거: packages/core-common/src/index.ts:56)

#### 4.3 env / parseBoolEnv [구현] (kind: api)

관련 섹션: [외부 의존.환경 변수 소스]

- 목적: Node `process.env` 와 번들러 `import.meta.env` 를 공통 함수로 읽고, 문자열 환경값을 boolean 으로 해석한다.
- 인터페이스·계약: `parseBoolEnv(value: unknown): boolean`, `env(key: string): string | undefined`, `env(key: string, value: string): void`. (근거: packages/core-common/src/env.ts:15-26)
- 동작·내용: boolean true 값은 대소문자 무시 `true`, `1`, `yes`, `on` 뿐이며, 읽기는 `process.env` 값을 우선하고 없으면 `import.meta.env` 값을 문자열화한다. 쓰기는 `process` 존재 환경에서 `process.env[key] = value` 를 수행한다. (근거: packages/core-common/src/env.ts:15-38)
- 경계·예외: `process` 가 없는 런타임에서 쓰기는 no-op 이며 읽기는 `import.meta.env` fallback 만 사용한다. (근거: packages/core-common/src/env.ts:26-38)
- 완료 기준: true/false 문자열·undefined·빈 문자열 테스트 케이스가 존재한다. (근거: packages/core-common/tests/env.spec.ts:4-37)

#### 4.4 createLogger [구현] (kind: api)

관련 섹션: [외부 의존.consola]

- 목적: 모듈 레벨에서 선언해도 consola 설정 변경과 테스트 spy 를 늦게 반영하는 태그 logger 를 만든다.
- 인터페이스·계약: `createLogger(tag: string): ConsolaInstance`. (근거: packages/core-common/src/features/logger.ts:12)
- 동작·내용: 첫 속성 접근 시 `consola.withTag(tag)` 를 만들고, `get` trap 은 target 자체 속성(예: spy)을 cached 인스턴스보다 우선한다. `has`와 descriptor trap 도 consola 인스턴스와 target 을 함께 본다. (근거: packages/core-common/src/features/logger.ts:13-32)
- 경계·예외: logger 자체는 에러를 throw 하지 않으며, 실제 출력 동작은 외부 consola 설정에 의존한다.
- 완료 기준: 이 함수가 index 에서 재export 되고 큐·LazyGcMap 단위가 내부 오류 로깅에 사용한다. (근거: packages/core-common/src/index.ts:32, packages/core-common/src/features/debounce-queue.ts:21, packages/core-common/src/features/serial-queue.ts:17, packages/core-common/src/types/lazy-gc-map.ts:10)

#### 4.5 에러 클래스 [구현] (kind: api)

관련 섹션: [외부 의존.YAML]

- 목적: 원인 체인과 도메인별 메시지를 보존하는 공개 에러 타입을 제공한다.
- 인터페이스·계약: `SdError` 는 `(cause: Error, ...messages: string[])`, `(...messages: string[])`, `(arg1?: unknown, ...messages: string[])` 생성을 제공하고, `ArgumentError`, `NotImplementedError`, `TimeoutError` 클래스를 export 한다. (근거: packages/core-common/src/errors/sd-error.ts:5-13, packages/core-common/dist/errors/sd-error.d.ts:5-10, packages/core-common/src/errors/argument-error.ts:13, packages/core-common/src/errors/not-implemented-error.ts:9, packages/core-common/src/errors/timeout-error.ts:9)
- 동작·내용: `SdError` 는 Error cause 를 받으면 메시지를 역순 ` => ` 로 결합하고 cause stack 을 현재 stack 에 덧붙인다. Error 가 아닌 첫 인자는 `String()` 기반 메시지로 포함할 수 있다. `ArgumentError` 는 기본/커스텀 메시지와 인자 객체 YAML 을 메시지에 포함한다. `NotImplementedError` 는 `미구현`, `TimeoutError` 는 시도 횟수와 추가 메시지를 포함한다. (근거: packages/core-common/src/errors/sd-error.ts:9-40, packages/core-common/src/errors/argument-error.ts:15-28, packages/core-common/src/errors/not-implemented-error.ts:13-15, packages/core-common/src/errors/timeout-error.ts:14-20)
- 경계·예외: V8 `captureStackTrace` 는 존재할 때만 사용한다. non-Error 첫 인자 메시지화는 테스트로 확인된다. (근거: packages/core-common/src/errors/sd-error.ts:9-40, packages/core-common/tests/errors/errors.spec.ts:42-57)
- 완료 기준: cause 통합, 다단계 cause, stack 통합, ArgumentError YAML 메시지 테스트 케이스가 존재한다. (근거: packages/core-common/tests/errors/errors.spec.ts:7-71)

#### 4.6 DateTime [구현] (kind: api)

관련 섹션: [타입.값 타입], [단위.dt 네임스페이스]

- 목적: 로컬 타임존 기준 날짜+시간을 값 타입 형태로 다루며, 변경 메서드는 새 인스턴스를 반환한다.
- 인터페이스·계약: public `date: Date`, 기본 생성, 년/월/일/시/분/초/밀리초 생성, tick 생성, Date 복사 생성, `parse`, 읽기 getter, `set*`, `add*`, `toFormatString`, `toString` 을 제공한다. (근거: packages/core-common/src/types/date-time.ts:10-359)
- 동작·내용: `parse` 는 Date.parse 가능 문자열, `yyyy-MM-dd AM/PM HH:mm:ss[.fff]`, 한국어 오전/오후, `yyyyMMddHHmmss`, `yyyy-MM-dd HH:mm:ss[.fff]` 를 처리하고, setters/adders 는 새 인스턴스를 반환한다. 월·연도 변경 시 대상 월의 마지막 날로 clamp 된다. public `date` 는 `readonly` 참조이나 Date 객체 자체의 변경 가능성은 막지 않는다. (근거: packages/core-common/src/types/date-time.ts:11, packages/core-common/src/types/date-time.ts:64-140, packages/core-common/src/types/date-time.ts:196-333)
- 경계·예외: 지원하지 않는 문자열은 `ArgumentError`; `isValid` 는 내부 Date tick 이 NaN 인지 판정한다. `toString()` 기본 형식은 `yyyy-MM-ddTHH:mm:ss.fffzzz` 이다. (근거: packages/core-common/src/types/date-time.ts:137-140, packages/core-common/src/types/date-time.ts:187, packages/core-common/src/types/date-time.ts:359)
- 완료 기준: 생성자, parse 형식, AM/PM 12시 경계, set/add 새 인스턴스 반환, 산술, `isValid`, `toString` 테스트 케이스가 존재한다. (근거: packages/core-common/tests/types/date-time.spec.ts:4-261)

#### 4.7 DateOnly [구현] (kind: api)

관련 섹션: [타입.값 타입], [단위.dt 네임스페이스]

- 목적: 시간 없이 날짜만 보존하는 로컬 기준 값 타입과 주차 계산 API를 제공하며, 변경 메서드는 새 인스턴스를 반환한다.
- 인터페이스·계약: public `date: Date`, 기본/년월일/tick/Date 생성, `parse`, `getBaseYearMonthSeqForWeekSeq`, `getWeekSeqStartDate`, `getWeekSeqOfYear`, `getWeekSeqOfMonth`, `getDateByYearWeekSeq`, 읽기 getter, `setYear|setMonth|setDay`, `addYears|addMonths|addDays`, `toFormatString`, `toString` 을 제공한다. (근거: packages/core-common/src/types/date-only.ts:10-306)
- 동작·내용: `parse` 는 `yyyy-MM-dd`, `yyyyMMdd`, ISO/date-parse 가능 문자열을 처리한다. ISO 는 UTC tick 을 파싱한 뒤 파싱 대상 날짜의 timezone offset 으로 로컬 날짜에 맞춘다. 주차 계산은 주 시작 요일과 첫 주 최소 일수를 인자로 받으며, `getWeekSeqStartDate` 는 현재 주의 남은 일수가 첫 주 최소 일수보다 작으면 다음 주 시작일을 반환하는 구현 경계가 있다. public `date` 는 `readonly` 참조이나 Date 객체 자체의 변경 가능성은 막지 않는다. (근거: packages/core-common/src/types/date-only.ts:12, packages/core-common/src/types/date-only.ts:52-93, packages/core-common/src/types/date-only.ts:98-205)
- 경계·예외: 지원하지 않는 형식은 `ArgumentError`; Date 생성은 시간 정보를 버린다. 연/월 변경 시 대상 월의 마지막 날로 clamp 된다. `toString()` 기본 형식은 `yyyy-MM-dd` 이다. (근거: packages/core-common/src/types/date-only.ts:23-37, packages/core-common/src/types/date-only.ts:90-93, packages/core-common/src/types/date-only.ts:244-266, packages/core-common/src/types/date-only.ts:306)
- 완료 기준: 날짜 생성·파싱, 윤년/월 경계, format/string, 연/월/주차 계산 테스트 케이스가 존재한다. (근거: packages/core-common/tests/types/date-only.spec.ts:4-550)

#### 4.8 Time [구현] (kind: api)

관련 섹션: [타입.값 타입], [단위.dt 네임스페이스]

- 목적: 날짜 없이 하루 안의 시간을 24시간 순환 불변 값으로 다룬다.
- 인터페이스·계약: 기본/시분초밀리초/tick/Date 생성, `parse`, 읽기 getter, `set*`, `add*`, `toFormatString`, `toString` 을 제공한다. (근거: packages/core-common/src/types/time.ts:10-209)
- 동작·내용: tick 은 하루 밀리초로 modulo 정규화하고 음수는 24시간 범위로 되돌린다. `parse` 는 먼저 문자열 끝의 `AM/PM HH:mm[:ss[.fff]]`, 그 다음 문자열 끝의 `HH:mm[:ss[.fff]]`, 마지막으로 Date 로 파싱 가능한 ISO 8601 문자열을 로컬 시간 구성요소로 처리한다. (근거: packages/core-common/src/types/time.ts:23-50, packages/core-common/src/types/time.ts:59-104)
- 경계·예외: 지원하지 않는 문자열은 `ArgumentError`; 24시간 초과·음수 산술은 하루 안에서 순환한다. 시간 정규식은 시작 anchor 없이 문자열 끝 패턴을 보므로 timezone offset 이 `+09:00` 처럼 끝나는 ISO 문자열은 ISO 분기 전에 `09:00` suffix 로 파싱될 수 있다. `toString()` 기본 형식은 `HH:mm:ss.fff` 이다. (근거: packages/core-common/src/types/time.ts:59-104, packages/core-common/src/types/time.ts:164-185, packages/core-common/src/types/time.ts:209)
- 완료 기준: 정규화, parse 형식, AM/PM 12시, 음수 산술, `isValid`, format/string 테스트 케이스가 존재한다. (근거: packages/core-common/tests/types/time.spec.ts:4-438)

#### 4.9 Uuid [구현] (kind: api)

관련 섹션: [타입.값 타입], [타입.Bytes], [외부 의존.Web API]

- 목적: UUID 문자열을 검증·보관하고 UUID v4 생성과 16바이트 변환을 제공한다.
- 인터페이스·계약: `Uuid.generate()`, `Uuid.fromBytes(bytes: Bytes)`, `new Uuid(uuid: string)`, `toString()`, `toBytes()` 를 제공한다. (근거: packages/core-common/src/types/uuid.ts:46-89)
- 동작·내용: `generate` 는 16바이트 난수에 v4/version·variant 비트를 설정한다. `fromBytes` 와 `toBytes` 는 canonical UUID 문자열과 16바이트 배열을 상호 변환한다. (근거: packages/core-common/src/types/uuid.ts:46-70, packages/core-common/src/types/uuid.ts:84-108)
- 경계·예외: 생성자는 canonical UUID 정규식에 맞지 않으면 `ArgumentError`; `fromBytes` 는 길이가 16이 아니면 `ArgumentError`. (근거: packages/core-common/src/types/uuid.ts:62-80)
- 완료 기준: v4 형식, 2회 생성 결과 상이성, fromBytes/toBytes 역연산, 잘못된 형식·길이 테스트 케이스가 존재한다. (근거: packages/core-common/tests/types/uuid.spec.ts:4-70)

#### 4.10 LazyGcMap [구현] (kind: api)

관련 섹션: [외부 의존.타이머 API], [단위.createLogger]

- 목적: 마지막 접근 시각 기준으로 항목을 자동 만료시키는 Map 유사 저장소를 제공한다.
- 인터페이스·계약: `new LazyGcMap({ expireTime, gcInterval?, onExpire? })`, `size: number`, `has(): boolean`, `get(): TValue | undefined`, `set(): void`, `delete(): boolean`, `dispose(): void`, `clear(): void`, `getOrCreate(): TValue`, `values/keys/entries()` iterator. `gcInterval` 생략 시 `max(expireTime / 10, 1000)` 이다. (근거: packages/core-common/src/types/lazy-gc-map.ts:10-141)
- 동작·내용: `get`·`set`·`getOrCreate` 는 접근 시각을 갱신하고, 항목 추가 시 GC 타이머를 시작한다. 만료 처리가 실행 중이면 중복 실행을 건너뛰며, 경과 시간이 `expireTime` 보다 큰 항목만 만료 후보로 삼는다. 만료 시 `onExpire` 를 await 한 뒤 같은 항목 참조가 유지될 때만 삭제하며, 콜백 오류는 logger 로 기록하고 계속한다. (근거: packages/core-common/src/types/lazy-gc-map.ts:48-60, packages/core-common/src/types/lazy-gc-map.ts:101-112, packages/core-common/src/types/lazy-gc-map.ts:147-183)
- 경계·예외: `has` 는 접근 시각을 갱신하지 않는다. `clear` 는 항목과 타이머만 비워 이후 재사용 가능하다. `dispose` 후 대부분 메서드는 no-op/빈 결과이며 `getOrCreate` 는 Error 를 throw 한다. 비어 있으면 GC 타이머를 중지한다. (근거: packages/core-common/src/types/lazy-gc-map.ts:43-47, packages/core-common/src/types/lazy-gc-map.ts:68-95, packages/core-common/src/types/lazy-gc-map.ts:101-105)
- 완료 기준: 기본 Map 연산, LRU 갱신, onExpire, dispose/clear, iterator, dispose 후 안전성 테스트 케이스가 존재한다. (근거: packages/core-common/tests/types/lazy-gc-map.spec.ts:4-537)

#### 4.11 EventEmitter [구현] (kind: api)

관련 섹션: [외부 의존.Web API]

- 목적: 브라우저·Node 공통 `EventTarget` 기반 타입 안전 이벤트 발행/구독 API를 제공한다.
- 인터페이스·계약: `EventEmitter<TEvents>` 는 `on`, `off`, `emit`, `listenerCount`, `dispose` 를 제공하며 이벤트 이름은 `keyof TEvents & string` 이다. (근거: packages/core-common/src/features/event-emitter.ts:9-88)
- 동작·내용: 동일 이벤트에 같은 listener 중복 등록은 무시되고, 같은 listener 를 다른 이벤트에는 등록할 수 있다. 내부 wrapper 를 저장해 `off` 로 정확히 제거한다. (근거: packages/core-common/src/features/event-emitter.ts:24-62)
- 경계·예외: `emit` 은 `CustomEvent.detail` 로 첫 번째 data 를 전달한다. `dispose` 는 모든 이벤트 listener 를 제거한다. (근거: packages/core-common/src/features/event-emitter.ts:68-92)
- 완료 기준: 발행/수신, 제거, listenerCount, 중복 등록 방지 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/sd-event-emitter.spec.ts:11-183)

#### 4.12 DebounceQueue [구현] (kind: api)

관련 섹션: [단위.EventEmitter], [단위.createLogger], [타입.큐 오류 이벤트], [외부 의존.타이머 API]

- 목적: 짧은 시간에 반복 등록되는 비동기 작업 중 마지막 요청 중심으로 실행한다.
- 인터페이스·계약: `new DebounceQueue(delay?)`, `run(fn)`, `dispose()`; 오류 이벤트 타입은 `error: SdError`. (근거: packages/core-common/src/features/debounce-queue.ts:17-53)
- 동작·내용: `run` 은 pending 함수를 교체하고 기존 타이머를 취소한다. 실행 중 새 요청이 들어오면 현재 작업 완료 직후 지연 없이 반복 처리한다. 작업 오류는 `SdError` 로 감싸 error listener 가 있으면 emit, 없으면 logger 로 출력한다. (근거: packages/core-common/src/features/debounce-queue.ts:53-90)
- 경계·예외: dispose 후 새 작업은 무시되고, 대기 중 timer/pending 작업은 정리된다. delay 생략 시 `setTimeout` 기본 동작으로 다음 이벤트 루프에 실행된다. (근거: packages/core-common/src/features/debounce-queue.ts:32-50)
- 완료 기준: 마지막 요청, 지연 실행, 실행 중 추가 요청, 오류 이벤트, dispose 후 무시 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/debounce-queue.spec.ts:6-209)

#### 4.13 SerialQueue [구현] (kind: api)

관련 섹션: [단위.EventEmitter], [단위.wait 네임스페이스], [단위.createLogger], [타입.큐 오류 이벤트]

- 목적: 등록된 동기/비동기 작업을 하나씩 순서대로 실행한다.
- 인터페이스·계약: `new SerialQueue(gap = 0)`, `run(fn)`, `dispose()`; 오류 이벤트 타입은 `error: SdError`. (근거: packages/core-common/src/features/serial-queue.ts:17-41)
- 동작·내용: `run` 은 queue 에 함수를 추가하고 처리 루프를 시작한다. 처리 루프는 이미 실행 중이면 중복 시작하지 않고, 각 작업 오류를 `SdError` 로 감싸 emit/log 한 뒤 후속 작업을 계속 실행한다. gap 이 양수이고 후속 작업이 있으면 작업 사이에 wait time 을 둔다. (근거: packages/core-common/src/features/serial-queue.ts:41-75)
- 경계·예외: `dispose` 는 대기 queue 와 listener 를 비우지만 영구 비활성 플래그는 없으므로 이후 `run` 은 새 작업을 실행할 수 있다. (근거: packages/core-common/src/features/serial-queue.ts:33-38, packages/core-common/tests/utils/serial-queue.spec.ts:240)
- 완료 기준: 순차 실행, gap, 오류 후 계속, dispose 동작, 동기/비동기 혼합 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/serial-queue.spec.ts:4-285)

#### 4.14 Array 확장 [구현] (kind: api)

관련 섹션: [공통 정의.프로토타입 확장], [타입.Array diff 결과], [타입.TreeArray], [타입.ComparableType]

- 목적: 배열 조회·비동기 순회·그룹화·변환·트리화·중복 제거·정렬·diff/merge·집계·원본 변경 작업을 프로토타입 메서드로 제공한다.
- 인터페이스·계약: `ReadonlyArrayExt` 와 `MutableArrayExt` 가 `single`, `first`, `last`, `filterAsync`, `filterExists`, `ofType`, `mapAsync`, `mapMany`, `parallelAsync`, `groupBy`, `toMap`, `toArrayMap`, `toSetMap`, `toMapValues`, `toObject`, `toTree`, `distinct`, `orderBy`, `diffs`, `oneWayDiffs`, `merge`, `sum`, `min`, `max`, `shuffle`, `distinctThis`, `orderByThis`, `insert`, `remove`, `toggle`, `clear` 등을 선언한다. (근거: packages/core-common/src/extensions/arr-ext.types.ts:12-267)
- 동작·내용: 구현은 `Array.prototype` 에 non-enumerable/writable/configurable property 로 설치된다. `toMap` 중복 key 는 `ArgumentError`, `toObject` 는 기존 값이 null/undefined 가 아닐 때 중복 key 를 `ArgumentError` 로 처리한다. `single` 다중 결과와 정렬 비교 불가 타입도 `ArgumentError` 이다. (근거: packages/core-common/src/extensions/arr-ext.ts:146-176, packages/core-common/src/extensions/arr-ext.ts:639-650, packages/core-common/src/extensions/arr-ext.helpers.ts:31-58)
- 경계·예외: 비동기 map/filter 는 순차, `parallelAsync` 는 `Promise.all` 병렬이다. `groupBy`·객체 distinct 는 깊은 비교로 O(n²) 가능성이 있고, `keyFn`/원시 key/Map 기반 경로는 성능 최적화가 있다. 원본 변경 메서드는 Array 자신을 수정한다. helper 타입 `ComparableType` 은 boolean 을 포함하지만 public `orderBy*` selector 타입은 string/number/DateOnly/DateTime/Time/undefined 로 선언되어 있다. (근거: packages/core-common/src/extensions/arr-ext.types.ts:27-287, packages/core-common/src/extensions/arr-ext.helpers.ts:15-124)
- 완료 기준: array-extension 테스트 파일에 대표 정상·예외·원본 변경 케이스가 존재한다. (근거: packages/core-common/tests/extensions/array-extension.spec.ts:4-641)

#### 4.15 Set 확장 [구현] (kind: api)

관련 섹션: [공통 정의.프로토타입 확장]

- 목적: Set 에 다중 추가와 토글 편의 메서드를 제공한다.
- 인터페이스·계약: `Set<T>.adds(...values): this`, `Set<T>.toggle(value, addOrDel?): this`. (근거: packages/core-common/src/extensions/set-ext.ts:5-24)
- 동작·내용: `adds` 는 여러 값을 순서대로 `add`; `toggle` 은 `add` 강제, `del` 강제, 또는 존재 여부에 따른 자동 추가/삭제를 수행한다. (근거: packages/core-common/src/extensions/set-ext.ts:27-53)
- 경계·예외: Set 고유 동작에 따라 중복 항목은 하나로 유지된다. 메서드는 non-enumerable/writable/configurable 로 설치된다. (근거: packages/core-common/src/extensions/set-ext.ts:27-53)
- 완료 기준: 다중 추가, 중복 제거, 토글 add/del 테스트 케이스가 존재한다. (근거: packages/core-common/tests/extensions/set-extension.spec.ts:4-57)

#### 4.16 Map 확장 [구현] (kind: api)

관련 섹션: [공통 정의.프로토타입 확장]

- 목적: Map 값 생성·갱신 패턴을 간결하게 제공한다.
- 인터페이스·계약: `Map<K,V>.getOrCreate(key, newValue | newValueFn): V`, `Map<K,V>.update(key, updateFn): void`. (근거: packages/core-common/src/extensions/map-ext.ts:5-26)
- 동작·내용: key 가 없으면 값 또는 factory 결과를 저장하고 반환한다. `update` 는 현재 값 또는 undefined 를 updateFn 에 넘기고 반환값을 저장한다. (근거: packages/core-common/src/extensions/map-ext.ts:29-56)
- 경계·예외: V 가 함수 타입이면 두 번째 인자 함수는 factory 로 호출되므로 함수 자체를 저장하려면 factory 로 감싸야 한다. (근거: packages/core-common/src/extensions/map-ext.ts:8-16)
- 완료 기준: 값 직접 설정, factory 호출, 기존 값 반환, 함수 값 저장, update 테스트 케이스가 존재한다. (근거: packages/core-common/tests/extensions/map-extension.spec.ts:4-96)

#### 4.17 obj 네임스페이스 [구현] (kind: api)

관련 섹션: [공통 정의.결측], [타입.obj 옵션], [타입.값 타입]

- 목적: 객체 깊은 복사, 동등 비교, 병합, 3-way 병합, key 선택/제외, 체인 경로 접근, null 변환, 타입 안전 Object 헬퍼를 제공한다.
- 인터페이스·계약: `clone`, `equal`, `merge`, `merge3`, `omit`, `omitByFilter`, `pick`, `getChainValue`, `getChainValueByDepth`, `setChainValue`, `deleteChainValue`, `clearUndefined`, `clear`, `nullToUndefined`, `unflatten`, `keys`, `entries`, `fromEntries`, `map`, 타입 `EqualOptions`, `MergeOptions`, `Merge3KeyOptions`, `UndefToOptional`, `OptionalToUndef`. (근거: packages/core-common/src/utils/obj.ts:19-949)
- 동작·내용: clone 은 Date, DateTime, DateOnly, Time, Uuid, RegExp, Error, Uint8Array, Array, Map, Set, 객체를 처리한다. equal 은 Date, DateTime, DateOnly, Time, Uuid, RegExp, Array, Map, Set, 일반 객체를 비교하며 Error 전용 분기는 없어서 Error 는 열거 가능한 일반 객체 속성 비교 경로를 따른다. merge 는 source 기반 target 병합, merge3 는 source/origin/target 3-way 비교로 conflict 여부와 결과를 반환한다. (근거: packages/core-common/src/utils/obj.ts:19-124, packages/core-common/src/utils/obj.ts:170-419, packages/core-common/src/utils/obj.ts:452-595)
- 경계·예외: equal 의 object/map key 비교는 null/undefined 값을 결측처럼 제외한다. `clearUndefined` 는 이름과 달리 `== null` 인 key 를 삭제한다. `setChainValue`·`deleteChainValue` 의 빈 chain 과 `getChainValueByDepth` 의 depth < 1 은 `ArgumentError` 이며, `getChainValue(obj, "")` 는 원본 객체를 반환한다. `nullToUndefined` 는 원본을 mutate 하며 순환 참조를 보호한다. (근거: packages/core-common/src/utils/obj.ts:326-346, packages/core-common/src/utils/obj.ts:684-773, packages/core-common/src/utils/obj.ts:795-868)
- 완료 기준: clone/equal/merge/merge3/omit/pick/chain/clear/nullToUndefined/unflatten 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/object.spec.ts:4-837)

#### 4.18 str 네임스페이스 [구현] (kind: api)

관련 섹션: [공통 정의.결측]

- 목적: 문자열의 한국어 조사, 전각→반각 변환, 케이스 변환, 빈 문자열 판정, 삽입을 제공한다.
- 인터페이스·계약: `getKoreanSuffix`, `replaceFullWidth`, `toPascalCase`, `toCamelCase`, `toKebabCase`, `toSnakeCase`, `isNullOrEmpty`, `insert`. (근거: packages/core-common/src/utils/str.ts:30-213)
- 동작·내용: 조사는 마지막 한글 음절의 종성 여부와 `로`의 ㄹ 받침 예외를 반영한다. 전각 변환은 영문 대/소문자, 숫자, 공백, 괄호를 반각으로 치환한다. `toPascalCase`/`toCamelCase` 는 `-`, `_`, `.` 뒤 소문자와 첫 글자 대소문자를 처리한다. `toKebabCase`/`toSnakeCase` 는 첫 대문자와 `-`/`_` 선택 접두가 붙은 대문자 경계를 기준으로 하며 `.` 구분자는 별도 처리하지 않는다. (근거: packages/core-common/src/utils/str.ts:30-181)
- 경계·예외: 빈 문자열이나 한글 범위 밖 문자는 받침 없는 형태로 처리한다. `isNullOrEmpty` TS 표면은 `string | undefined` 이지만 런타임은 null 도 true 로 본다. (근거: packages/core-common/src/utils/str.ts:36-56, packages/core-common/src/utils/str.ts:201-203)
- 완료 기준: 조사 전체 타입, ㄹ 받침, 전각 변환, 케이스 변환, insert 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/string.spec.ts:4-259)

#### 4.19 num 네임스페이스 [구현] (kind: api)

관련 섹션: [공통 정의.결측]

- 목적: 표시/입력 문자열에서 숫자를 파싱하고 숫자 포맷과 빈 숫자 판정을 제공한다.
- 인터페이스·계약: `parseInt`, `parseRoundedInt`, `parseFloat`, `isNullOrEmpty`, `format`. (근거: packages/core-common/src/utils/num.ts:16-83)
- 동작·내용: parse 계열은 number 입력은 그대로/절삭/반올림하고, string 은 숫자·`.`·`-` 외 문자를 제거하되 선행 `-` 만 음수로 유지한다. `format` 은 `toLocaleString` 으로 천 단위와 최소/최대 소수 자릿수를 적용한다. (근거: packages/core-common/src/utils/num.ts:16-90)
- 경계·예외: 파싱 불가, 빈 문자열, 비문자열/비숫자 입력은 undefined. `isNullOrEmpty` 의 public 타입은 `number | undefined` 이지만 런타임 구현은 null/undefined/0 을 true 로 본다. (근거: packages/core-common/src/utils/num.ts:16-63)
- 완료 기준: 음수, 소수, 비숫자 제거, 파싱 실패, 포맷 자릿수 테스트 케이스가 존재하고, `isNullOrEmpty` 경계는 source 계약으로 확인된다. (근거: packages/core-common/tests/utils/number.spec.ts:4-130, packages/core-common/src/utils/num.ts:63)

#### 4.20 path 네임스페이스 [구현] (kind: api)

관련 섹션: [공통 정의.POSIX 경로]

- 목적: 브라우저/공용 코드에서 Node path 없이 POSIX 슬래시 경로 조작을 제공한다.
- 인터페이스·계약: `join(...segments)`, `basename(filePath, ext?)`, `extname(filePath)`. (근거: packages/core-common/src/utils/path.ts:14-36)
- 동작·내용: join 은 첫 세그먼트의 뒤 슬래시만 제거하고 이후 세그먼트는 앞뒤 슬래시를 제거한 뒤 빈 세그먼트를 제외한다. basename 은 마지막 `/` 뒤 이름과 선택 ext 제거를 수행하고, extname 은 마지막 `.` 뒤 확장자를 반환한다. (근거: packages/core-common/src/utils/path.ts:14-39)
- 경계·예외: Windows 백슬래시 경로는 지원하지 않는다. 숨김 파일처럼 첫 글자가 `.` 인 이름은 확장자 없음으로 처리한다. (근거: packages/core-common/src/utils/path.ts:1-7, packages/core-common/src/utils/path.ts:36-39)
- 완료 기준: 결합, 선행/중복 슬래시, basename ext 제거, 숨김 파일, 빈 문자열 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/path.spec.ts:4-66)

#### 4.21 bytes 네임스페이스 [구현] (kind: api)

관련 섹션: [타입.Bytes]

- 목적: `Uint8Array` 데이터를 결합하고 hex/base64 문자열과 상호 변환한다.
- 인터페이스·계약: `concat`, `toHex`, `fromHex`, `toBase64`, `fromBase64`. (근거: packages/core-common/src/utils/bytes.ts:32-107)
- 동작·내용: hex 는 소문자 출력·대소문자 입력 허용, base64 는 직접 테이블 기반으로 인코딩/디코딩하며 공백과 패딩을 정규화한다. (근거: packages/core-common/src/utils/bytes.ts:48-146)
- 경계·예외: hex 홀수 길이·잘못된 hex 문자, base64 잘못된 문자·길이 나머지 1은 `ArgumentError`. 빈 입력은 빈 Bytes/문자열로 처리한다. (근거: packages/core-common/src/utils/bytes.ts:63-80, packages/core-common/src/utils/bytes.ts:107-146)
- 완료 기준: 결합, 빈 배열, hex/base64 round-trip, 잘못된 입력, 대용량 base64 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/bytes-utils.spec.ts:4-181)

#### 4.22 json 네임스페이스 [구현] (kind: api)

관련 섹션: [공통 정의.타입 마커], [공통 정의.결측], [타입.JSON 직렬화 옵션], [외부 의존.환경 변수 소스]

- 목적: Simplysm 값 타입과 컬렉션·에러·바이트를 JSON 문자열 안에서 보존해 직렬화/역직렬화한다.
- 인터페이스·계약: `stringify(obj, { space?, replacer?, redactBytes? }?)`, `parse<TResult = unknown>(json): TResult`. (근거: packages/core-common/src/utils/json.ts:37-181)
- 동작·내용: Date, DateTime, DateOnly, Time, Uuid, Set, Map, Error, Uint8Array 를 `{ __type__, data }` 마커로 바꾼다. parse 는 마커를 감지해 인스턴스로 복원하고, 복원 후 일반 객체/배열 안의 JSON null 을 undefined 로 변환한다. (근거: packages/core-common/src/utils/json.ts:37-170, packages/core-common/src/utils/json.ts:181-223)
- 경계·예외: Array/일반 객체 순환 참조는 TypeError. Set/Map/Error cause 등 특수 타입 경유 순환은 동일 TypeError 보장이 없다. `redactBytes` 로 숨긴 Uint8Array 는 parse 시 `SdError`. 마커로 복원된 Set/Map 내부 null 은 `nullToUndefined` 순회 대상이 아니어서 남을 수 있다. 잘못된 JSON 은 DEV env true 일 때 원문 포함, 아니면 길이만 포함한 `SdError` 로 감싼다. 사용자 데이터가 같은 마커 형식을 쓰면 타입으로 복원될 수 있다. (근거: packages/core-common/src/utils/json.ts:58-151, packages/core-common/src/utils/json.ts:181-231, packages/core-common/src/utils/obj.ts:824-868)
- 완료 기준: 특수 타입 직렬화/복원, replacer, 동시 호출, toJSON, 순환 참조, redactBytes, DEV 오류 메시지 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/json.spec.ts:4-384)

#### 4.23 xml 네임스페이스 [구현] (kind: api)

관련 섹션: [타입.XML 객체 규약], [외부 의존.fast-xml-parser]

- 목적: XML 문자열과 JavaScript 객체를 공통 규약으로 변환한다.
- 인터페이스·계약: `parse(str, { stripTagPrefix? }?)`, `stringify(obj, options?)`. (근거: packages/core-common/src/utils/xml.ts:19-45)
- 동작·내용: 속성은 `$`, 텍스트 노드는 `_`, 루트 아래 자식 요소는 array 로 파싱한다. `stripTagPrefix` 는 태그 이름의 네임스페이스 접두사만 제거하고 속성 접두사는 유지한다. stringify 는 같은 `$`/`_` 규약으로 빌드한다. (근거: packages/core-common/src/utils/xml.ts:19-81)
- 경계·예외: XML parser/builder 예외는 외부 라이브러리 동작을 따른다. stripTagPrefix 는 첫 번째 `:` 이후 태그 이름을 사용한다. (근거: packages/core-common/src/utils/xml.ts:58-81)
- 완료 기준: 속성, 텍스트, 중첩, 배열, 네임스페이스 접두사, parse/stringify roundtrip 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/xml.spec.ts:4-134)

#### 4.24 transfer 네임스페이스 [구현] (kind: api)

관련 섹션: [공통 정의.타입 마커], [타입.Transfer 결과], [외부 의존.Web API]

- 목적: Worker 간 전송 전에 Simplysm 값 타입과 일반 객체를 structured-clone 친화 형태로 인코딩하고 다시 복원한다.
- 인터페이스·계약: `encode(obj): { result; transferList }`, `decode(obj): unknown`. (근거: packages/core-common/src/utils/transferable.ts:38-199)
- 동작·내용: Date, DateTime, DateOnly, Time, Uuid, RegExp, Error, Array, Map, Set, 일반 객체를 재귀 처리한다. Uint8Array 는 그대로 두되 SharedArrayBuffer 가 아니면 buffer 를 transferList 에 추가한다. 같은 객체가 여러 곳에서 참조되면 cache 된 인코딩 결과를 재사용한다. (근거: packages/core-common/src/utils/transferable.ts:38-194)
- 경계·예외: 현재 재귀 스택의 객체를 다시 만나면 경로 포함 TypeError. Error 의 cause/detail 은 재귀 처리되고 code 는 null/undefined 가 아닐 때만 원값으로 보존한다. decode 는 대체로 새 객체/인스턴스를 만들며 원본을 수정하지 않지만, Uint8Array 는 입력 인스턴스를 그대로 반환한다. (근거: packages/core-common/src/utils/transferable.ts:53-75, packages/core-common/src/utils/transferable.ts:108-137, packages/core-common/src/utils/transferable.ts:199-261)
- 완료 기준: 특수 타입, 컬렉션, 순환 참조, DAG 공유, 원본 유지, 왕복 변환 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/transferable.spec.ts:4-627)

#### 4.25 err 네임스페이스 [구현] (kind: api)

관련 섹션: [단위.에러 클래스]

- 목적: catch 된 unknown 값에서 메시지·스택을 안전하게 추출하고 plain object 를 Error 로 복원한다.
- 인터페이스·계약: `message(err)`, `stack(err)`, `fromObject(obj)`. (근거: packages/core-common/src/utils/error.ts:9-35)
- 동작·내용: Error 는 message 또는 stack/message 를 반환하고, Error 가 아닌 값은 `String(err)` 를 반환한다. fromObject 는 `new Error(obj.message)` 후 나머지 속성을 Object.assign 한다. (근거: packages/core-common/src/utils/error.ts:9-38)
- 경계·예외: fromObject 는 prototype 을 커스텀 에러로 복원하지 않고 기본 Error 인스턴스에 속성을 복사한다. (근거: packages/core-common/src/utils/error.ts:35-38)
- 완료 기준: message, stack fallback, non-Error 문자열화 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/error.spec.ts:4-22)

#### 4.26 dt 네임스페이스 [구현] (kind: api)

관련 섹션: [타입.DtNormalizedMonth]

- 목적: DateTime/DateOnly/Time 이 공유하는 월 정규화, 12→24시간 변환, 포맷 토큰 변환을 제공한다.
- 인터페이스·계약: `normalizeMonth(year, month, day)`, `convert12To24(rawHour, isPM)`, `format(formatString, args)`, `DtNormalizedMonth`. (근거: packages/core-common/src/utils/date-format.ts:4-123)
- 동작·내용: 월은 1~12 밖 값을 연도와 월로 정규화하고 day 는 대상 월 마지막 날로 clamp 한다. format 은 토큰 `yyyy`, `MM`, `ddd`, `tt`, `HH`, `fff`, `zzz` 등을 제공된 구성요소 기준으로 단순 치환한다. `yyyy` 는 `year.toString()`, `yy` 는 그 문자열의 `substring(2, 4)` 이다. (근거: packages/core-common/src/utils/date-format.ts:20-43, packages/core-common/src/utils/date-format.ts:123-226)
- 경계·예외: 구성요소가 없으면 해당 구성요소 분기의 직접 치환은 수행되지 않는다. 다만 치환은 정규식 순서대로 누적되므로 예를 들어 week 미계산 상태의 `ddd` 문자열도 day 분기에서 `d` 토큰 치환 영향을 받을 수 있다. timezone offset 은 분 단위 값의 부호와 절댓값으로 `z` 계열 토큰을 만든다. (근거: packages/core-common/src/utils/date-format.ts:123-226)
- 완료 기준: 모든 토큰 범주, 복합 형식, normalizeMonth overflow/underflow/day clamp 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/date-format.spec.ts:5-344)

#### 4.27 primitive 네임스페이스 [구현] (kind: api)

관련 섹션: [타입.PrimitiveType], [타입.값 타입]

- 목적: 런타임 값이 core-common primitive 집합 중 어느 타입인지 문자열 key 로 반환한다.
- 인터페이스·계약: `typeStr(value: PrimitiveTypeMap[PrimitiveTypeStr]): PrimitiveTypeStr`. (근거: packages/core-common/src/utils/primitive.ts:17)
- 동작·내용: string, number, boolean, DateTime, DateOnly, Time, Uuid, Uint8Array 를 각각 `PrimitiveTypeStr` 로 매핑한다. (근거: packages/core-common/src/utils/primitive.ts:17-25)
- 경계·예외: 지원하지 않는 값은 `ArgumentError`. TS 표면은 primitive 집합으로 제한되지만 런타임 방어가 존재한다. (근거: packages/core-common/src/utils/primitive.ts:26)
- 완료 기준: 각 primitive 와 지원하지 않는 타입 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/primitive.spec.ts:4-39)

#### 4.28 wait 네임스페이스 [구현] (kind: api)

관련 섹션: [단위.에러 클래스], [외부 의존.타이머 API]

- 목적: 조건 충족까지 polling, 지정 시간 대기, 이벤트 루프 양보를 제공한다.
- 인터페이스·계약: `until(forwarder, milliseconds?, maxCount?)`, `time(millisecond)`, `immediate()`. (근거: packages/core-common/src/utils/wait.ts:15-45)
- 동작·내용: `until` 은 첫 조건이 true 이면 즉시 반환하고, 아니면 기본 100ms 또는 지정 간격으로 반복한다. `time` 은 setTimeout Promise, `immediate` 는 `globalThis.setImmediate` 를 우선하고 없으면 `setTimeout(0)` 을 사용한다. (근거: packages/core-common/src/utils/wait.ts:15-51)
- 경계·예외: `maxCount` 초과 시 `TimeoutError(count)` 를 throw 한다. `maxCount` undefined 는 무제한이다. (근거: packages/core-common/src/utils/wait.ts:15-31)
- 완료 기준: time, 동기/비동기 조건, 즉시 true, TimeoutError, 기본 간격, maxCount=1 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/wait.spec.ts:4-103)

#### 4.29 template string tags [구현] (kind: api)

관련 섹션: [공통 정의.템플릿 문자열 정규화]

- 목적: IDE 하이라이팅용 언어별 태그 이름을 유지하면서 문자열 결합과 공통 들여쓰기 제거를 제공한다.
- 인터페이스·계약: `js`, `ts`, `html`, `tsql`, `mysql`, `pgsql` 태그 함수. (근거: packages/core-common/src/utils/template-strings.ts:12-62)
- 동작·내용: 모든 태그는 동일하게 보간값을 `String(value)` 로 합치되 null/undefined 는 빈 문자열로 처리하고, 앞뒤 빈 줄을 제거한 뒤 비어 있지 않은 줄의 최소 공통 공백 들여쓰기를 제거한다. (근거: packages/core-common/src/utils/template-strings.ts:64-96)
- 경계·예외: 언어별 차이는 런타임 동작이 아니라 에디터 하이라이팅 힌트뿐이다. 탭 들여쓰기 제거는 구현되지 않고 공백 기준이다. (근거: packages/core-common/src/utils/template-strings.ts:1-96)
- 완료 기준: 문자열 연결, 들여쓰기 제거, 앞뒤 빈 줄 제거, 중간 빈 줄 유지, undefined/복수 보간 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/template-strings.spec.ts:4-42)

#### 4.30 ZipArchive [구현] (kind: api)

관련 섹션: [타입.Bytes], [타입.ZipArchiveProgress], [외부 의존.zip.js]

- 목적: ZIP 데이터를 메모리에서 읽고, 파일별 추출·존재 확인·쓰기·압축·종료를 제공한다.
- 인터페이스·계약: `ZipArchiveProgress`, `new ZipArchive(data?: Blob | Bytes)`, `extractAll(progressCallback?)`, `get(fileName)`, `exists(fileName)`, `write(fileName, bytes)`, `compress()`, `close()`. (근거: packages/core-common/src/utils/zip.ts:14-197)
- 동작·내용: 생성자 data 가 Bytes 면 Uint8ArrayReader, Blob 이면 BlobReader 를 사용한다. 추출한 파일은 `_cache` 에 저장하고, `compress` 는 `extractAll()` 로 기존 파일을 모두 cache 한 뒤 cache 의 Bytes 항목을 ZipWriter 에 추가한다. (근거: packages/core-common/src/utils/zip.ts:35-50, packages/core-common/src/utils/zip.ts:57-188)
- 경계·예외: reader 가 없으면 `extractAll` 은 현재 cache 를 반환하고, `get`/`exists` 는 cache 를 먼저 확인하므로 write 된 파일은 reader 없이도 조회될 수 있다. cache 에 없고 reader 도 없으면 `get` 은 undefined, `exists` 는 false 다. 동일 파일명 write 는 cache 값을 덮어쓴다. close 는 reader 를 닫고 cache 를 비우지만 entries 참조는 유지되므로 close 이후 `get` 이 zip.js entry 를 통해 다시 읽을 수 있는 경우가 테스트에 존재한다. 이 테스트 주석은 cached data 라고 표현하지만 source 경로는 cache clear 이후 entries 재읽기다. 대용량 ZIP 은 compress 시 전체 파일을 메모리에 로드한다. (근거: packages/core-common/src/utils/zip.ts:57-197, packages/core-common/tests/utils/zip.spec.ts:190-206)
- 완료 기준: write+compress, 특수 파일명, 빈 zip, 덮어쓰기, extractAll progress, get cache, exists, close 테스트 케이스가 존재한다. (근거: packages/core-common/tests/utils/zip.spec.ts:7-206)

#### 4.31 Array 확장 헬퍼 deep export [구현] (kind: api)

관련 섹션: [단위.Array 확장], [타입.ComparableType]

- 목적: Array 확장 구현이 사용하는 비교·중복 제거 헬퍼가 source 파일 deep import 표면에 노출된 상태를 문서화한다.
- 인터페이스·계약: `toComparable(value)`, `compareForOrder(pp, pn, desc)`, `getDistinctIndices(items, options?)` 를 export 한다. 단, main index 에서 재export 되지는 않는다. (근거: packages/core-common/src/extensions/arr-ext.helpers.ts:15-63, packages/core-common/src/index.ts:8-56)
- 동작·내용: DateTime/DateOnly/Time 은 tick 으로 바꾸고, null/undefined 정렬 위치와 string/number/boolean 비교를 처리하며, 중복 제거는 matchAddress, keyFn, primitive key, 객체 깊은 비교 전략으로 유지할 index 집합을 만든다. (근거: packages/core-common/src/extensions/arr-ext.helpers.ts:15-124)
- 경계·예외: 비교 불가능한 타입 조합은 `ArgumentError`. 객체 깊은 비교 전략은 O(n²) 가능성이 있다. (근거: packages/core-common/src/extensions/arr-ext.helpers.ts:31-58, packages/core-common/src/extensions/arr-ext.helpers.ts:63-124)
- 완료 기준: [단위.Array 확장] 의 orderBy/distinct 관련 테스트 케이스가 존재해 헬퍼 동작을 간접 검증한다. (근거: packages/core-common/tests/extensions/array-extension.spec.ts:442-494)

## 5. 공통 정의

### 5.1 용어 사전

- **값 타입**: DateTime, DateOnly, Time, Uuid, Bytes 처럼 primitive 데이터 의미를 가진 공용 값 객체/바이너리. (근거: packages/core-common/src/common.types.ts:21-40)
- **결측**: 여러 유틸에서 null/undefined 를 값 없음으로 취급하는 상태. JSON parse 는 null 을 undefined 로 변환한다. (근거: packages/core-common/src/utils/obj.ts:824, packages/core-common/src/utils/json.ts:181-223)
- **프로토타입 확장**: Array/Set/Map prototype 에 non-enumerable 메서드를 설치하는 side effect. (근거: packages/core-common/src/extensions/arr-ext.ts:639-650, packages/core-common/src/extensions/set-ext.ts:27-53, packages/core-common/src/extensions/map-ext.ts:29-56)
- **타입 마커**: 직렬화 과정에서 `{ __type__, data }` 형태로 원래 런타임 타입을 보존하는 객체. (근거: packages/core-common/src/utils/json.ts:13-16, packages/core-common/src/utils/transferable.ts:78-137)
- **POSIX 경로**: 슬래시(`/`)만 구분자로 쓰는 경로. path 네임스페이스는 Windows 백슬래시를 지원하지 않는다. (근거: packages/core-common/src/utils/path.ts:1-7)

### 5.2 템플릿 문자열 정규화

- 앞뒤 빈 줄은 모두 제거하고, 빈 줄을 제외한 행들의 최소 공통 공백 들여쓰기를 제거한다. 보간값 null/undefined 는 빈 문자열로 합친다. (근거: packages/core-common/src/utils/template-strings.ts:64-96)

## 6. 핵심 타입·자료구조

### 6.1 [타입.Bytes]

설계 자연 도출 — [단위.공용 타입], [단위.bytes 네임스페이스], [단위.Uuid], [단위.ZipArchive] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| 자체 | `Uint8Array` | 필수 | Buffer 대신 쓰는 바이너리 타입 alias. (근거: packages/core-common/src/common.types.ts:11) |

제약: Uint8Array 동작과 동일하다.

### 6.2 [타입.PrimitiveType]

설계 자연 도출 — [단위.공용 타입], [단위.primitive 네임스페이스], [단위.Array 확장] 이 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| PrimitiveTypeMap | object type | 필수 | string/number/boolean/DateTime/DateOnly/Time/Uuid/Bytes 매핑. (근거: packages/core-common/src/common.types.ts:21-31) |
| PrimitiveTypeStr | keyof PrimitiveTypeMap | 필수 | primitive 문자열 key. (근거: packages/core-common/src/common.types.ts:35) |
| PrimitiveType | union | 필수 | 매핑 값 union + undefined. (근거: packages/core-common/src/common.types.ts:40) |

제약: 새 primitive 를 추가하면 `primitive.typeStr` 와 Array `ofType` 분기도 함께 확장되어야 한다.

### 6.3 [타입.DeepPartial]

설계 자연 도출 — [단위.공용 타입] 이 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| TObject | generic | 필수 | primitive 속성은 유지, 객체/배열 속성은 재귀 optional 처리. (근거: packages/core-common/src/common.types.ts:53) |

제약: primitive 여부는 [타입.PrimitiveType] 기준이다.

### 6.4 [타입.Type]

설계 자연 도출 — [단위.공용 타입], [단위.Array 확장] 이 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| constructor | `new (...args: unknown[]) => TInstance` | 필수 | 생성자 타입. (근거: packages/core-common/src/common.types.ts:63) |

제약: `Function` 을 확장한다.

### 6.5 [타입.값 타입]

설계 자연 도출 — [단위.DateTime], [단위.DateOnly], [단위.Time], [단위.Uuid], [단위.json 네임스페이스], [단위.transfer 네임스페이스] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| DateTime | class | 선택 | 로컬 날짜시간, tick/getters/format 지원. (근거: packages/core-common/src/types/date-time.ts:10) |
| DateOnly | class | 선택 | 날짜 전용, 주차 계산 지원. (근거: packages/core-common/src/types/date-only.ts:10) |
| Time | class | 선택 | 하루 시간, 24시간 modulo. (근거: packages/core-common/src/types/time.ts:10) |
| Uuid | class | 선택 | canonical UUID 문자열. (근거: packages/core-common/src/types/uuid.ts:9) |

제약: 값 타입들은 JSON/transfer/object clone/equal 에서 별도 처리된다.

### 6.6 [타입.Array diff 결과]

설계 자연 도출 — [단위.Array 확장] 이 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| ArrayDiffsResult | union | 필수 | `{ source: undefined; target }` insert, `{ source; target: undefined }` delete, `{ source; target }` update. (근거: packages/core-common/src/extensions/arr-ext.types.ts:274-277) |
| ArrayOneWayDiffResult | union | 필수 | create/update/same 단방향 결과. (근거: packages/core-common/src/extensions/arr-ext.types.ts:279-282) |

제약: `oneWayDiffs` 는 delete 를 표현하지 않는다.

### 6.7 [타입.TreeArray]

설계 자연 도출 — [단위.Array 확장] 이 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| children | `TreeArray<TNode>[]` | 필수 | `toTree` 가 원본 항목 복사본에 추가하는 자식 목록. (근거: packages/core-common/src/extensions/arr-ext.types.ts:284) |

제약: root 는 parentKey 값이 null/undefined 인 항목이다.

### 6.8 [타입.ComparableType]

설계 자연 도출 — [단위.Array 확장], [단위.dt 네임스페이스] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| 자체 | `string | number | boolean | DateTime | DateOnly | Time | undefined` | 필수 | orderBy 비교 허용 타입. (근거: packages/core-common/src/extensions/arr-ext.types.ts:287) |

제약: 날짜/시간 타입은 tick 으로 비교된다. (근거: packages/core-common/src/extensions/arr-ext.helpers.ts:15-20)

### 6.9 [타입.obj 옵션]

설계 자연 도출 — [단위.obj 네임스페이스] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| EqualOptions | object | 선택 | topLevelIncludes/topLevelExcludes/ignoreArrayIndex/shallow. (근거: packages/core-common/src/utils/obj.ts:138-153) |
| MergeOptions | object | 선택 | arrayProcess, useDelTargetNull. (근거: packages/core-common/src/utils/obj.ts:427-432) |
| Merge3KeyOptions | object | 선택 | keys, excludes, ignoreArrayIndex. (근거: packages/core-common/src/utils/obj.ts:524-531) |
| UndefToOptional / OptionalToUndef | type | 선택 | undefined/optional 속성 변환 타입. (근거: packages/core-common/src/utils/obj.ts:901-913) |

제약: topLevel 옵션은 최상위 객체 key 에만 적용된다.

### 6.10 [타입.JSON 직렬화 옵션]

설계 자연 도출 — [단위.json 네임스페이스] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| space | `string | number` | 선택 | JSON 들여쓰기. |
| replacer | `(key, value) => unknown` | 선택 | 특수 타입 변환 전에 적용. |
| redactBytes | `boolean` | 선택 | Uint8Array data 를 `__hidden__` 으로 대체. |

제약: redactBytes 결과는 parse 로 복원할 수 없다. (근거: packages/core-common/src/utils/json.ts:103-109, packages/core-common/src/utils/json.ts:216-221)

### 6.11 [타입.Transfer 결과]

설계 자연 도출 — [단위.transfer 네임스페이스] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| result | `unknown` | 필수 | 인코딩된 객체. (근거: packages/core-common/src/utils/transferable.ts:38-42) |
| transferList | `ArrayBuffer[]` | 필수 | Worker 전송 가능한 버퍼 목록. (근거: packages/core-common/src/utils/transferable.ts:38-43) |

제약: SharedArrayBuffer 는 transferList 에 추가하지 않는다. (근거: packages/core-common/src/utils/transferable.ts:83-90)

### 6.12 [타입.XML 객체 규약]

설계 자연 도출 — [단위.xml 네임스페이스] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| `$` | object | 선택 | XML 속성 그룹. (근거: packages/core-common/src/utils/xml.ts:19-34) |
| `_` | string | 선택 | 텍스트 노드. (근거: packages/core-common/src/utils/xml.ts:19-34) |

제약: 루트 아래 자식 요소는 array 로 파싱된다. (근거: packages/core-common/src/utils/xml.ts:28-31)

### 6.13 [타입.DtNormalizedMonth]

설계 자연 도출 — [단위.dt 네임스페이스], [단위.DateTime], [단위.DateOnly] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| year | number | 필수 | 정규화된 연도. |
| month | number | 필수 | 1~12 정규화 월. |
| day | number | 필수 | 대상 월 마지막 일 이하로 clamp 된 일. |

제약: month overflow/underflow 는 연도 변경으로 반영된다. (근거: packages/core-common/src/utils/date-format.ts:4-37)

### 6.14 [타입.큐 오류 이벤트]

설계 자연 도출 — [단위.DebounceQueue], [단위.SerialQueue] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| error | `SdError` | 필수 | 큐 작업 실행 중 오류를 감싼 이벤트 payload. (근거: packages/core-common/src/features/debounce-queue.ts:17-21, packages/core-common/src/features/serial-queue.ts:13-17) |

제약: error listener 가 없으면 logger 로 출력된다.

### 6.15 [타입.ZipArchiveProgress]

설계 자연 도출 — [단위.ZipArchive] 가 참조.

필드:

| 필드 | 타입 | 필수 | 비고 |
| --- | --- | --- | --- |
| fileName | string | 필수 | 현재 추출 파일명. |
| totalSize | number | 필수 | 전체 비디렉터리 항목 uncompressedSize 합. |
| extractedSize | number | 필수 | 현재까지 추출된 크기. |

제약: 진행률은 파일 시작, 파일 내부 onprogress, 파일 완료 시점에 호출될 수 있다. (근거: packages/core-common/src/utils/zip.ts:14-21, packages/core-common/src/utils/zip.ts:57-103)

## 7. 외부 의존·인터페이스

### 7.1 [외부 의존.패키지 배포 메타]

- 대상: package.json ESM/dist/types/sideEffects 설정.
- 방향·성격: 빌드·배포 도구가 읽는 메타데이터.
- 경유: `main`, `types`, `files`, `sideEffects` 필드. (근거: packages/core-common/package.json:12-27)
- 예외 처리: sideEffects 누락 시 컬렉션 확장 설치가 번들링에서 제거될 수 있다.
- 관련 섹션: [단위.패키지 진입점과 프로토타입 설치]

### 7.2 [외부 의존.환경 변수 소스]

- 대상: `process.env`, `import.meta.env`.
- 방향·성격: 읽기/쓰기.
- 경유: `env()` 와 json parse DEV 메시지 분기. (근거: packages/core-common/src/env.ts:24-38, packages/core-common/src/utils/json.ts:223-231)
- 예외 처리: process 미존재 환경에서 쓰기는 no-op, 읽기는 import.meta fallback.
- 관련 섹션: [단위.env / parseBoolEnv], [단위.json 네임스페이스]

### 7.3 [외부 의존.Web API]

- 대상: `crypto.getRandomValues`, `EventTarget`, `CustomEvent`, `ArrayBuffer`, `SharedArrayBuffer`, `Blob`.
- 방향·성격: 브라우저·Worker·Node 호환 Web API 사용.
- 경유: Uuid 난수 생성, EventEmitter 이벤트, transferList, ZipArchive Blob 입력. (근거: packages/core-common/src/types/uuid.ts:46-56, packages/core-common/src/features/event-emitter.ts:9-88, packages/core-common/src/utils/transferable.ts:83-90, packages/core-common/src/utils/zip.ts:35-43)
- 예외 처리: API 미지원 환경의 polyfill/런타임 보장은 이 패키지 내부에 별도 구현되어 있지 않다.
- 관련 섹션: [단위.Uuid], [단위.EventEmitter], [단위.transfer 네임스페이스], [단위.ZipArchive]

### 7.4 [외부 의존.타이머 API]

- 대상: `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `globalThis.setImmediate`.
- 방향·성격: 비동기 예약·대기·자동 GC.
- 경유: DebounceQueue, LazyGcMap, wait. (근거: packages/core-common/src/features/debounce-queue.ts:39-68, packages/core-common/src/types/lazy-gc-map.ts:135-199, packages/core-common/src/utils/wait.ts:35-51)
- 예외 처리: `setImmediate` 가 없으면 `setTimeout(0)` fallback.
- 관련 섹션: [단위.DebounceQueue], [단위.LazyGcMap], [단위.wait 네임스페이스]

### 7.5 [외부 의존.consola]

- 대상: `consola` 패키지.
- 방향·성격: 로그 인스턴스 생성/출력.
- 경유: `createLogger`, 큐·LazyGcMap 오류 로그. (근거: packages/core-common/src/features/logger.ts:1-32)
- 예외 처리: 출력/레벨/리포터 동작은 외부 consola 설정에 따른다.
- 관련 섹션: [단위.createLogger], [단위.DebounceQueue], [단위.SerialQueue], [단위.LazyGcMap]

### 7.6 [외부 의존.YAML]

- 대상: `yaml` 패키지.
- 방향·성격: 인자 객체를 문자열로 직렬화.
- 경유: `ArgumentError` 메시지. (근거: packages/core-common/src/errors/argument-error.ts:1-28)
- 예외 처리: YAML.stringify 실패에 대한 별도 catch 는 없다.
- 관련 섹션: [단위.에러 클래스]

### 7.7 [외부 의존.fast-xml-parser]

- 대상: `fast-xml-parser` XMLParser/XMLBuilder.
- 방향·성격: XML parse/build.
- 경유: xml 네임스페이스. (근거: packages/core-common/src/utils/xml.ts:4-51)
- 예외 처리: parse/build 실패는 외부 라이브러리 예외를 그대로 따른다.
- 관련 섹션: [단위.xml 네임스페이스]

### 7.8 [외부 의존.zip.js]

- 대상: `@zip.js/zip.js` reader/writer.
- 방향·성격: ZIP 읽기/쓰기.
- 경유: BlobReader, Uint8ArrayReader, Uint8ArrayWriter, ZipReader, ZipWriter. (근거: packages/core-common/src/utils/zip.ts:4-11)
- 예외 처리: 손상 ZIP·압축/해제 실패는 외부 라이브러리 예외를 따른다. close 는 reader 가 있을 때 닫는다.
- 관련 섹션: [단위.ZipArchive]

## 8. 본문 외 확정 사항

- 2026-07-02: init 분석 범위는 `packages/core-common` 워킹트리의 source/package/test 파일이다.
  - 근거: 사용자 지시 `init packages/core-common`
  - 영향: spec 은 기존 산출물 기준 역작성이다.

- 2026-07-02 [제외]: 생성 산출물·캐시·의존성 폴더는 산출 단위 도출에서 제외한다.
  - 근거: `packages/core-common/dist`, `.cache`, `node_modules` 는 source/test/package manifest 에서 재생성 또는 외부 설치되는 산출물이다.
  - 후속 처리: 빌드 산출 검증은 별도 빌드/배포 검증에서 수행.
  - 자료 위치: packages/core-common/dist, packages/core-common/.cache, packages/core-common/node_modules
