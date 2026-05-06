# CLAUDE.md — `@simplysm/service-client`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

`service-server` 를 호출하는 클라이언트 SDK. WebSocket(메시지) + HTTP(파일) 트랜스포트, 이벤트 구독, 진행률·취소, ORM 원격 호출. 빌드 타겟 `neutral`(브라우저·Node 양쪽에서 사용 가능).

## 구조

| 경로                                    | 내용                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `service-client.ts`                     | 진입 — `ServiceClient` API 호출 / 이벤트 구독.                             |
| `transport/service-transport.ts`        | 요청/응답 보내고 받기. 재연결·타임아웃·취소.                               |
| `transport/socket-provider.ts`          | WebSocket 추상화(브라우저 native vs Node `ws`).                            |
| `protocol/client-protocol-wrapper.ts`   | 메시지 프레이밍·시리얼라이즈(서버 쪽 wrapper 와 대칭).                     |
| `features/event-client.ts`              | `define-event` 로 정의된 이벤트 listen.                                    |
| `features/file-client.ts`               | 업/다운로드(진행률 콜백 포함).                                             |
| `features/orm/`                         | 원격 ORM — `service-server` 의 `orm-service` 를 호출해 로컬 `DbContext` 처럼 쓰게 함. |
| `workers/client-protocol.worker.ts`     | 무거운 프로토콜 처리(직렬화/압축)를 워커로 분리.                           |
| `types/`                                | 연결 옵션, 진행률 타입, 브라우저/Node worker 호환 shim.                    |

워크스페이스 의존: `@simplysm/core-common`, `@simplysm/orm-common`, `@simplysm/service-common`.

## 작업 시 주의

- 환경 분기는 `core-common` 의 `IS_BROWSER`/`IS_NODE` 를 활용. WebSocket·Worker 구현체가 양쪽에서 다르다.
- 새 빌트인 서비스 클라이언트는 보통 `features/` 에 추가. 시그니처는 `service-common/service-types` 에서 import.
- 재연결 시 미수신 응답 처리 정책을 깨지 마라(현재 구현은 응답 상관관계 ID 기반 재요청).
