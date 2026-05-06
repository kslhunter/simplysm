# CLAUDE.md — `@simplysm/service-common`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

`service-server` ↔ `service-client` 사이의 **프로토콜 정의·공용 타입**. 빌드 타겟 `neutral`. 양쪽이 공유하므로 환경 의존 코드 금지.

## 구조

| 경로                             | 내용                                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `protocol/protocol.types.ts`     | 요청/응답/이벤트 메시지 스키마.                                                                 |
| `protocol/create-service-protocol.ts` | 서비스 정의 빌더 — 서버·클라이언트가 같은 정의에서 타입을 도출.                            |
| `service-types/`                 | 빌트인 서비스 시그니처 — `app-structure-service.types`, `auto-update-service.types`, `orm-service.types`. |
| `app-structure/`                 | 권한·메뉴 트리·페이지 메타 등 앱 구조 타입과 유틸.                                              |
| `define-event.ts`                | 타입 안전 이벤트 정의 헬퍼 — 서버에서 emit, 클라이언트에서 listen.                              |
| `types.ts`                       | 공용 enum/유틸 타입.                                                                            |

워크스페이스 의존: `@simplysm/core-common`, `@simplysm/orm-common`(ORM 서비스 시그니처 공유용).

## 작업 시 주의

- 새 빌트인 서비스 추가 흐름: 여기 `service-types/<name>.types.ts` 정의 → server 에 핸들러(`service-server/src/services/<name>-service.ts`) → client 에서 `ServiceClient` 로 호출.
- 메시지 포맷 변경은 서버·클라이언트 양쪽이 동시에 배포되어야 호환된다. 점진 변경(필드 추가)을 우선하고 필드 제거는 단계적으로.
- Node·DOM API 사용 금지(빌드 타겟 `neutral`).
