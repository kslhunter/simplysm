# WBS: 이벤트 API를 서비스 API 패턴으로 통일

## 프로젝트 개요

- **배경:** service-* 패키지에서 서버 서비스는 `import type` + 문자열 이름으로 클라이언트에서 타입 안전하게 사용할 수 있지만, 이벤트는 `defineEvent()`의 런타임 값이 필요하여 서버 패키지에서 `import type`으로 공유할 수 없다. 서버와의 통신 방식(서비스 호출, 이벤트 구독/발행)이 일관되지 않다.
- **환경:** `@simplysm` 모노레포 v14. 이벤트 관련 패키지: `service-common`, `service-client`, `service-server`. 라이브러리 내부 소비자: `angular` 패키지.
- **전제조건:** 없음
- **기술적 제약:** `verbatimModuleSyntax` 사용 중이므로 서버 패키지에서 값 import 시 빌드 에러 발생. 반드시 `import type`만으로 동작해야 함.
- **참조 자료:**
  - `packages/service-common/src/define-event.ts` — 현재 `defineEvent()`, `ServiceEventDef` 타입 정의
  - `packages/service-client/src/features/event-client.ts` — 현재 클라이언트 이벤트 구독/발행 구현
  - `packages/service-client/src/service-client.ts` — `ServiceClient` 공개 API (addListener, emitEvent)
  - `packages/service-server/src/transport/socket/websocket-handler.ts` — 서버 이벤트 브로드캐스트
  - `packages/service-server/src/service-server.ts` — `ServiceServer.emitEvent`

## Impact Mapping

- **Goal:** 서버-클라이언트 통신 API를 단일 패턴으로 통일하여 학습 비용 제거 및 일관된 개발 경험 확보
  - **Actor:** simplysm 라이브러리 소비앱 개발자
    - **Impact:** 이벤트도 서비스와 동일한 방식(`import type` + 문자열 이름)으로 정의·사용하여 별도 공유 패키지나 값 import 없이 타입 안전한 이벤트 통신 구현
      - **Deliverable:** 이벤트 API 시그니처를 서비스 패턴과 동일하게 변경 (제네릭 타입 파라미터 + 문자열 이벤트 이름)

## Feature Breakdown

### Epic 1. 이벤트 API 통일

#### [x] Feature 1.1 이벤트 API 시그니처 변경

**의존성:** 없음

**범위:**

- `EventClient`의 `addListener`, `removeListener`, `emit` 메서드 시그니처를 `eventDef` 값 대신 `eventName` 문자열 + 제네릭 타입 파라미터로 변경
- `ServiceClient`의 `addListener`, `emitEvent` 공개 메서드 시그니처 동일 변경
- `ServiceServer.emitEvent`, `WebSocketHandler.emit` 서버측 시그니처 동일 변경
- 라이브러리 내부 소비자(angular 패키지 `SdSharedDataProvider` 등) 호출부 마이그레이션
- 기존 테스트 코드 마이그레이션

**경계:**

- `defineEvent()` 함수와 `ServiceEventDef` 타입 자체는 변경하지 않음 (서버에서 이벤트 정의에 계속 사용)
- `service-common`의 프로토콜 메시지 타입(`evt:add`, `evt:on` 등)은 변경하지 않음 (와이어 프로토콜은 이미 문자열 이름 기반)

**근거:**

- 사용자 요청: "service랑 완전히 동일한 방식으로 통일되게 하여, 서버와의 통신을 하는법을 일관성있게 구현해야함"
- 현재 서비스 패턴: `client.getService<ServiceMethods<typeof X>>("Name")` — 제네릭 + 문자열
- 현재 이벤트 패턴: `client.addListener(eventDefValue, info, cb)` — 런타임 값 필요

#### [x] Feature 1.2 이벤트 프록시 패턴 (`getEvent()`)

**의존성:** Feature 1.1

**범위:**

- `ServiceClient`에 `getEvent<TEventDef>(eventName)` 메서드 추가 — 서비스의 `getService<T>(name)` 패턴과 동일
- 반환 객체에 `addListener(info, cb)`, `removeListener(key)`, `emit(infoSelector, data)` 메서드 포함
- 반환 타입 인터페이스 (`EventProxy<TEventDef>`) 정의
- `ServiceServer`에도 동일한 `getEvent<TEventDef>(eventName)` 메서드 추가 — `emit(infoSelector, data)` 포함
- 기존 `addListener`, `removeListener`, `emitEvent` 메서드는 유지 (하위 호환)
- 라이브러리 내부 소비자(`SdSharedDataProvider`)를 `getEvent()` 패턴으로 마이그레이션
- 테스트 코드 추가

**경계:**

- 기존 `addListener`, `removeListener`, `emitEvent` 메서드를 제거하지 않음
- Angular 소비 프로젝트의 `AppServiceProvider` 패턴은 라이브러리 범위 밖 (사용 예시만 문서에 기재)

**근거:**

- 사용자 요청: 서비스는 `AppServiceProvider`에 getter 1회 등록으로 사용하는데, 이벤트는 그런 패턴이 없음
- 합의된 방향: `getService()` 패턴과 동일하게 `getEvent()` 메서드 추가
- 현재 이벤트 사용 시 매번 `<typeof EventDef>` 제네릭 + 이벤트 이름 문자열을 반복해야 하는 불편함 해소

## 제외 사항

- 없음
