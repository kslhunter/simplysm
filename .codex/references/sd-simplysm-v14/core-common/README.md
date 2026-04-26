# @simplysm/core-common

> 브라우저와 Node.js 모두에서 사용 가능한 순수 공통 유틸리티 패키지. 다른 `@simplysm/*` 패키지에 대한 내부 의존성이 없는 리프 패키지다. 에러 클래스, 값 타입(`DateTime`, `Uuid` 등), 프로토타입 확장(`Array`, `Map`, `Set`), 비동기 큐, 네임스페이스 유틸리티 함수를 제공한다.

## Installation

```bash
npm install @simplysm/core-common
```

## 하려는 작업 → 읽을 파일

### 날짜·시간 다루기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 날짜+시간을 불변 객체로 다루기 (파싱, 포맷, 산술 연산) | [date-time.md](./types/date-time.md) |
| 시간 없이 날짜만 다루기 (주차 계산 포함) | [date-only.md](./types/date-only.md) |
| 날짜 없이 시간만 다루기 (24시간 순환) | [time.md](./types/time.md) |
| 날짜/시간 포맷 문자열 변환, 월 정규화 | [dt.md](./utils/dt.md) |

### 컬렉션 조작

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 배열 필터/정렬/그룹화/비교/변환 | [array.md](./extensions/array.md) |
| Map에서 기본값 생성(`getOrCreate`) 또는 값 업데이트(`update`) | [map.md](./extensions/map.md) |
| Set에 여러 값 일괄 추가(`adds`) 또는 토글(`toggle`) | [set.md](./extensions/set.md) |

### 객체 조작

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 객체 깊은 복사/비교/병합, 3-way 병합, key 조작, 체인 경로 접근 | [obj.md](./utils/obj.md) |

### 직렬화·변환

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| DateTime/Uuid 등 커스텀 타입을 포함한 JSON 직렬화/역직렬화 | [json.md](./utils/json.md) |
| Worker 간 커스텀 타입 데이터 전송 (직렬화/역직렬화) | [transfer.md](./utils/transfer.md) |
| XML 파싱/직렬화 | [xml.md](./utils/xml.md) |
| ZIP 파일 읽기/쓰기/압축/해제 | [zip-archive.md](./utils/zip-archive.md) |
| Uint8Array ↔ hex/base64 변환, 결합 | [bytes.md](./utils/bytes.md) |

### 에러 처리

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 원인 에러를 감싸 트리 구조 에러 체인을 구성 | [sd-error.md](./errors/sd-error.md) |
| 인자 유효성 오류를 YAML 형식 메시지로 표시 | [argument-error.md](./errors/argument-error.md) |
| 미구현 기능 호출 표시 | [not-implemented-error.md](./errors/not-implemented-error.md) |
| 대기 시간 초과 표시 | [timeout-error.md](./errors/timeout-error.md) |
| catch 블록의 unknown 에러에서 메시지 추출 | [err.md](./utils/err.md) |

### 이벤트·비동기 제어

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 타입 안전한 이벤트 기반 통신 (`events`/`eventemitter3` 대체) | [event-emitter.md](./features/event-emitter.md) |
| 짧은 시간 내 다수 호출을 마지막 하나로 축약 | [debounce-queue.md](./features/debounce-queue.md) |
| 비동기 작업의 순차 실행 보장 | [serial-queue.md](./features/serial-queue.md) |

### 식별자·캐시

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| UUID v4 생성 또는 검증 | [uuid.md](./types/uuid.md) |
| 일정 시간 미접근 항목을 자동 삭제하는 캐시 | [lazy-gc-map.md](./types/lazy-gc-map.md) |

### 문자열·숫자 처리

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 한국어 조사 처리, 케이스 변환, 전각→반각 변환 | [str.md](./utils/str.md) |
| 문자열→숫자 파싱, 숫자 포맷 | [num.md](./utils/num.md) |
| IDE 코드 하이라이팅이 필요한 태그드 템플릿 리터럴 | [template-strings.md](./utils/template-strings.md) |

### 환경·경로·타입

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 환경변수 읽기/쓰기 (`process.env`/`import.meta.env` 직접 접근 대신) | [env.md](./type-utils/env.md) |
| POSIX 경로 결합/파일명 추출 (브라우저 환경용) | [path.md](./utils/path.md) |
| 조건 대기(`until`) 또는 시간 대기(`time`) | [wait.md](./utils/wait.md) |
| 런타임에 값의 PrimitiveTypeStr 추론 | [primitive.md](./utils/primitive.md) |
| 공용 타입 정의 (`Bytes`, `PrimitiveType`, `DeepPartial`, `Type`) | [common-types.md](./type-utils/common-types.md) |

## 이 패키지를 쓰지 말아야 할 때

- 브라우저 전용 API (DOM, `window` 등) → `@simplysm/core-browser`
- Node.js 전용 파일 시스템/프로세스 → `@simplysm/core-node`
- 서버/클라이언트 통신 → `@simplysm/service-server`, `@simplysm/service-client`

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
