# API Index — @simplysm/core-common

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Errors

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `SdError` | class | [sd-error.md](./errors/sd-error.md) | 원인 에러를 감싸 트리 구조 에러 체인을 구성할 때 |
| `ArgumentError` | class | [argument-error.md](./errors/argument-error.md) | 인자 유효성 오류를 YAML 형식 메시지로 표시할 때 |
| `NotImplementedError` | class | [not-implemented-error.md](./errors/not-implemented-error.md) | 미구현 기능이 호출되었음을 표시할 때 |
| `TimeoutError` | class | [timeout-error.md](./errors/timeout-error.md) | 대기 시간 초과를 시도 횟수와 함께 표시할 때 |

## Types (Value Objects)

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `DateTime` | class | [date-time.md](./types/date-time.md) | 날짜+시간을 불변 객체로 다룰 때 (밀리초 정밀도, 로컬 타임존) |
| `DateOnly` | class | [date-only.md](./types/date-only.md) | 시간 없이 날짜만 다룰 때 (주차 계산 지원) |
| `Time` | class | [time.md](./types/time.md) | 날짜 없이 시간만 다룰 때 (24시간 순환) |
| `Uuid` | class | [uuid.md](./types/uuid.md) | UUID v4를 생성하거나 검증할 때 |
| `LazyGcMap` | class | [lazy-gc-map.md](./types/lazy-gc-map.md) | 일정 시간 미접근 항목을 자동 삭제하는 캐시가 필요할 때 |

## Features

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `EventEmitter` | class | [event-emitter.md](./features/event-emitter.md) | 타입 안전한 이벤트 기반 통신이 필요할 때 |
| `DebounceQueue` | class | [debounce-queue.md](./features/debounce-queue.md) | 짧은 시간 내 다수 호출을 마지막 하나로 축약할 때 |
| `SerialQueue` | class | [serial-queue.md](./features/serial-queue.md) | 비동기 작업의 순차 실행을 보장할 때 |

## Extensions (Prototype)

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `Array Extensions` | prototype | [array.md](./extensions/array.md) | 배열 필터/정렬/그룹화/비교/변환이 필요할 때 |
| `Map Extensions` | prototype | [map.md](./extensions/map.md) | Map에서 기본값 생성 또는 값 업데이트가 필요할 때 |
| `Set Extensions` | prototype | [set.md](./extensions/set.md) | Set에 여러 값 일괄 추가 또는 토글이 필요할 때 |

## Utils (Namespace Imports)

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `obj` | namespace | [obj.md](./utils/obj.md) | 객체 깊은 복사/비교/병합, key 조작이 필요할 때 |
| `str` | namespace | [str.md](./utils/str.md) | 한국어 조사 처리, 케이스 변환이 필요할 때 |
| `num` | namespace | [num.md](./utils/num.md) | 문자열→숫자 파싱, 숫자 포맷이 필요할 때 |
| `bytes` | namespace | [bytes.md](./utils/bytes.md) | Uint8Array ↔ hex/base64 변환이 필요할 때 |
| `path` | namespace | [path.md](./utils/path.md) | POSIX 경로 결합/파일명 추출이 필요할 때 |
| `json` | namespace | [json.md](./utils/json.md) | 커스텀 타입 포함 JSON 직렬화/역직렬화가 필요할 때 |
| `xml` | namespace | [xml.md](./utils/xml.md) | XML 파싱/직렬화가 필요할 때 |
| `wait` | namespace | [wait.md](./utils/wait.md) | 조건 대기 또는 시간 대기가 필요할 때 |
| `transfer` | namespace | [transfer.md](./utils/transfer.md) | Worker 간 커스텀 타입 데이터 전송이 필요할 때 |
| `err` | namespace | [err.md](./utils/err.md) | catch 블록의 unknown 에러에서 메시지 추출할 때 |
| `dt` | namespace | [dt.md](./utils/dt.md) | 날짜/시간 포맷 문자열 변환이 필요할 때 |
| `primitive` | namespace | [primitive.md](./utils/primitive.md) | 런타임에 값의 PrimitiveTypeStr을 추론할 때 |

## Utils (Direct Exports)

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `js`, `ts`, `html`, `tsql`, `mysql`, `pgsql` | function | [template-strings.md](./utils/template-strings.md) | IDE 코드 하이라이팅이 필요한 태그드 템플릿 리터럴을 작성할 때 |
| `ZipArchive` | class | [zip-archive.md](./utils/zip-archive.md) | ZIP 파일 읽기/쓰기/압축/해제가 필요할 때 |

## Type Utilities

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `env`, `parseBoolEnv` | function | [env.md](./type-utils/env.md) | 환경변수를 읽거나 쓸 때 |
| `Bytes`, `PrimitiveTypeMap`, `PrimitiveTypeStr`, `PrimitiveType`, `DeepPartial`, `Type` | type | [common-types.md](./type-utils/common-types.md) | 공용 타입 정의가 필요할 때 |
