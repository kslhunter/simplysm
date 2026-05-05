# API Index — @simplysm/service-common

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Protocol

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `createServiceProtocol` | function | [create-service-protocol.md](./protocol/create-service-protocol.md) | WebSocket 메시지를 인코딩/디코딩할 때 |
| `PROTOCOL_CONFIG` | const | [protocol-config.md](./protocol/protocol-config.md) | 프로토콜 크기 제한·청킹 임계값 등 설정 상수를 참조할 때 |
| `ServiceMessage` | type | [service-message.md](./protocol/service-message.md) | 양방향 메시지의 전체 유니언과 방향별 하위 유니언을 참조할 때 |
| `ServiceProgressMessage` | interface | [service-progress-message.md](./protocol/service-progress-message.md) | 청크 수신 진행 상태를 처리할 때 |
| `ServiceErrorMessage` | interface | [service-error-message.md](./protocol/service-error-message.md) | 서버 에러 응답을 처리할 때 |
| `ServiceAuthMessage` | interface | [service-auth-message.md](./protocol/service-auth-message.md) | 클라이언트 인증 토큰을 전송할 때 |
| `ServiceRequestMessage` | interface | [service-request-message.md](./protocol/service-request-message.md) | 서비스 메서드를 호출할 때 |
| `ServiceResponseMessage` | interface | [service-response-message.md](./protocol/service-response-message.md) | 서비스 메서드 응답을 처리할 때 |
| `ServiceAddEventListenerMessage` | interface | [service-add-event-listener-message.md](./protocol/service-add-event-listener-message.md) | 이벤트 리스너를 등록할 때 |
| `ServiceRemoveEventListenerMessage` | interface | [service-remove-event-listener-message.md](./protocol/service-remove-event-listener-message.md) | 이벤트 리스너를 제거할 때 |
| `ServiceGetEventListenerInfosMessage` | interface | [service-get-event-listener-infos-message.md](./protocol/service-get-event-listener-infos-message.md) | 등록된 이벤트 리스너 정보를 조회할 때 |
| `ServiceEmitEventMessage` | interface | [service-emit-event-message.md](./protocol/service-emit-event-message.md) | 클라이언트에서 이벤트를 발생시킬 때 |
| `ServiceEventMessage` | interface | [service-event-message.md](./protocol/service-event-message.md) | 서버에서 수신된 이벤트 알림을 처리할 때 |

## Events

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `defineEvent` | function | [define-event.md](./events/define-event.md) | 서버-클라이언트 간 타입 안전 이벤트를 정의할 때 |

## App Structure

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `AppStructureItem` | type | [app-structure-item.md](./app-structure/app-structure-item.md) | 앱 메뉴 트리·권한 구조를 정의할 때 |
| `getFlatPermissions` | function | [get-flat-permissions.md](./app-structure/get-flat-permissions.md) | 앱 구조 트리를 플래트닝하여 권한 목록을 얻을 때 |
| `isUsableModules` | function | [is-usable-modules.md](./app-structure/is-usable-modules.md) | 단일 항목의 모듈 접근 가능 여부를 판단할 때 |
| `isUsableModulesChain` | function | [is-usable-modules-chain.md](./app-structure/is-usable-modules-chain.md) | 트리 경로 전체의 모듈 접근 가능 여부를 판단할 때 |

## Service Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `OrmService` | interface | [orm-service.md](./service-types/orm-service.md) | DB 연결·트랜잭션·쿼리 실행의 서버-클라이언트 타입 계약을 확인할 때 |
| `AutoUpdateService` | interface | [auto-update-service.md](./service-types/auto-update-service.md) | 클라이언트 자동 업데이트 버전 조회 타입 계약을 확인할 때 |
| `AppStructureService` | interface | [app-structure-service.md](./service-types/app-structure-service.md) | 앱 구조 항목을 서버에서 조회하는 타입 계약을 확인할 때 |

## Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `ServiceUploadResult` | interface | [service-upload-result.md](./types/service-upload-result.md) | 파일 업로드 결과를 타입으로 사용할 때 |
