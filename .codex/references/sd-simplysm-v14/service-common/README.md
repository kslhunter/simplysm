# @simplysm/service-common

> 서비스 클라이언트(`@simplysm/service-client`)와 서버(`@simplysm/service-server`)가 공유하는 바이너리 프로토콜, 메시지 타입, 서비스 인터페이스, 앱 구조 정의 패키지.
> 의존성: `@simplysm/core-common`, `@simplysm/orm-common`. Node.js 및 브라우저 양쪽에서 사용 가능.

## 소비앱 설치 안내 (v14)

v14에서는 `import type`으로 타입을 직접 가져올 수 있으므로, 이전 버전에서 클라이언트-서버 간 타입 공유를 위해 필요하던 중간 패키지(`@simplysm/service-common`, `@simplysm/orm-common`)는 **소비앱의 의존성으로 불필요**하다. 서버 패키지(`@simplysm/service-server`, `@simplysm/orm-node`)의 타입을 직접 import하여 사용한다.

```typescript
// v14: 서버 패키지에서 타입을 직접 import — common 패키지 의존성 불필요
import type { ServiceMethods } from "@simplysm/service-server";
```

## Installation

```bash
npm install @simplysm/service-common
```

## 하려는 작업 → 읽을 파일

### 통신 프로토콜

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| WebSocket 메시지를 인코딩/디코딩 (자동 청킹·재조립 포함) | [create-service-protocol.md](./protocol/create-service-protocol.md) |
| 프로토콜 크기 제한·청킹 임계값 등 설정 상수를 참조 | [protocol-config.md](./protocol/protocol-config.md) |
| 메시지 타입 구조(유니언, 방향별 분류)를 파악 | [service-message.md](./protocol/service-message.md) |

### 이벤트

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 서버-클라이언트 간 타입 안전 이벤트를 정의 | [define-event.md](./events/define-event.md) |

### 앱 구조·권한

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 앱 메뉴 트리·권한 구조를 정의 | [app-structure-item.md](./app-structure/app-structure-item.md) |
| 앱 구조 트리를 플래트닝하여 권한 목록을 산출 | [get-flat-permissions.md](./app-structure/get-flat-permissions.md) |
| 단일 항목의 모듈 접근 가능 여부를 판단 | [is-usable-modules.md](./app-structure/is-usable-modules.md) |
| 트리 경로 전체의 모듈 접근 가능 여부를 판단 | [is-usable-modules-chain.md](./app-structure/is-usable-modules-chain.md) |

### 서비스 타입 계약

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| DB 연결·트랜잭션·쿼리 실행의 서버-클라이언트 타입 계약을 확인 | [orm-service.md](./service-types/orm-service.md) |
| 클라이언트 자동 업데이트 버전 조회 타입 계약을 확인 | [auto-update-service.md](./service-types/auto-update-service.md) |
| 앱 구조 항목을 서버에서 조회하는 타입 계약을 확인 | [app-structure-service.md](./service-types/app-structure-service.md) |

### 공통 타입

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 파일 업로드 결과 타입을 사용 | [service-upload-result.md](./types/service-upload-result.md) |

## 이 패키지를 쓰지 말아야 할 때

- 서버 로직 구현 (서비스 메서드 등록, WebSocket 핸들링) → `@simplysm/service-server`
- 클라이언트에서 서버 호출 (RPC, 이벤트 구독) → `@simplysm/service-client`
- v14 소비앱에서 타입만 필요할 때 → 서버 패키지에서 직접 `import type`

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
