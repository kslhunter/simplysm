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

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| WebSocket 메시지 인코딩/디코딩 | [create-service-protocol.md](./protocol/create-service-protocol.md) |
| 프로토콜 상수 확인 (크기 제한, 청킹 등) | [protocol-config.md](./protocol/protocol-config.md) |
| 타입 안전 이벤트 정의 | [define-event.md](./events/define-event.md) |
| 메뉴 트리·권한 구조 정의 | [app-structure-item.md](./app-structure/app-structure-item.md) |
| 모듈 기반 권한 필터링 | [get-flat-permissions.md](./app-structure/get-flat-permissions.md) |
| ORM 서비스 타입 계약 확인 | [orm-service.md](./service-types/orm-service.md) |
| 메시지 타입 구조 파악 | [service-message.md](./protocol/service-message.md) |

## API Overview

### Protocol

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`PROTOCOL_CONFIG`](./protocol/protocol-config.md) | const | 프로토콜 크기 제한·청킹 임계값 등 설정 상수를 참조할 때 |
| [`ServiceMessage`](./protocol/service-message.md) | type | 양방향 메시지의 전체 유니언과 방향별 하위 유니언을 참조할 때 |
| [`ServiceProgressMessage`](./protocol/service-progress-message.md) | interface | 청크 수신 진행 상태를 처리할 때 |
| [`ServiceErrorMessage`](./protocol/service-error-message.md) | interface | 서버 에러 응답을 처리할 때 |
| [`ServiceAuthMessage`](./protocol/service-auth-message.md) | interface | 클라이언트 인증 토큰을 전송할 때 |
| [`ServiceRequestMessage`](./protocol/service-request-message.md) | interface | 서비스 메서드를 호출할 때 |
| [`ServiceResponseMessage`](./protocol/service-response-message.md) | interface | 서비스 메서드 응답을 처리할 때 |
| [`ServiceAddEventListenerMessage`](./protocol/service-add-event-listener-message.md) | interface | 이벤트 리스너를 등록할 때 |
| [`ServiceRemoveEventListenerMessage`](./protocol/service-remove-event-listener-message.md) | interface | 이벤트 리스너를 제거할 때 |
| [`ServiceGetEventListenerInfosMessage`](./protocol/service-get-event-listener-infos-message.md) | interface | 등록된 이벤트 리스너 정보를 조회할 때 |
| [`ServiceEmitEventMessage`](./protocol/service-emit-event-message.md) | interface | 클라이언트에서 이벤트를 발생시킬 때 |
| [`ServiceEventMessage`](./protocol/service-event-message.md) | interface | 서버에서 수신된 이벤트 알림을 처리할 때 |
| [`createServiceProtocol`](./protocol/create-service-protocol.md) | function | WebSocket 메시지를 인코딩/디코딩할 때 (자동 청킹·재조립 포함) |

### Service Types

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`OrmService`](./service-types/orm-service.md) | interface | DB 연결·트랜잭션·쿼리 실행의 서버-클라이언트 타입 계약을 정의할 때 |
| [`AutoUpdateService`](./service-types/auto-update-service.md) | interface | 클라이언트 자동 업데이트 버전 조회 타입 계약을 정의할 때 |
| [`AppStructureService`](./service-types/app-structure-service.md) | interface | 앱 구조 항목을 서버에서 조회하는 타입 계약을 정의할 때 |

### Types

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`ServiceUploadResult`](./types/service-upload-result.md) | interface | 파일 업로드 결과를 타입으로 사용할 때 |

### App Structure

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`AppStructureItem`](./app-structure/app-structure-item.md) | type | 앱 메뉴 트리·권한 구조를 정의할 때 |
| [`isUsableModules`](./app-structure/is-usable-modules.md) | function | 단일 항목의 모듈 접근 가능 여부를 판단할 때 |
| [`isUsableModulesChain`](./app-structure/is-usable-modules-chain.md) | function | 트리 경로 전체의 모듈 접근 가능 여부를 판단할 때 |
| [`getFlatPermissions`](./app-structure/get-flat-permissions.md) | function | 앱 구조 트리를 플래트닝하여 권한 목록을 얻을 때 |

### Events

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`defineEvent`](./events/define-event.md) | function | 서버-클라이언트 간 타입 안전 이벤트를 정의할 때 |

## Usage Examples

### 프로토콜 인코딩/디코딩

```typescript
import { createServiceProtocol } from "@simplysm/service-common";

const protocol = createServiceProtocol();

// 메시지 인코딩 (3MB 초과 시 자동 청킹)
const { chunks, totalSize } = protocol.encode(uuid, {
  name: "OrmService.connect",
  body: [{ configName: "default" }],
});

// 메시지 디코딩 (청크 자동 재조립)
for (const chunk of chunks) {
  const result = protocol.decode(chunk);
  if (result.type === "complete") {
    // result.message: 재조립된 메시지
  }
}

// 사용 후 반드시 해제
protocol.dispose();
```

### 타입 안전 이벤트 정의

```typescript
import { defineEvent } from "@simplysm/service-common";

// 서버에서 이벤트 정의 + 타입 export
export const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// 서버에서 이벤트 발생 (제네릭 타입 파라미터 + 문자열 이름 패턴)
await server.emitEvent<typeof OrderUpdated>("OrderUpdated", (info) => info.orderId === 123, { status: "shipped" });

// 클라이언트에서 구독 (import type으로 타입만 가져옴)
import type { OrderUpdated } from "@server-package";
await client.addListener<typeof OrderUpdated>("OrderUpdated", { orderId: 123 }, async (data) => {
  // data.status는 string으로 타입 추론됨
});
```

### 앱 구조 권한 플래트닝

```typescript
import { getFlatPermissions, isUsableModules } from "@simplysm/service-common";
import type { AppStructureItem } from "@simplysm/service-common";

const items: AppStructureItem<string>[] = [
  {
    code: "admin",
    title: "관리",
    children: [
      { code: "user", title: "사용자", perms: ["use", "edit"] },
    ],
  },
  {
    code: "report",
    title: "리포트",
    modules: ["moduleA"],
    perms: ["use"],
  },
];

// 활성 모듈 기준으로 권한 플래트닝
const perms = getFlatPermissions(items, ["moduleA"]);
// [{ codeChain: ["admin", "user", "use"], ... }, { codeChain: ["admin", "user", "edit"], ... }, ...]

// 개별 모듈 접근 가능 여부 확인
const canAccess = isUsableModules(["moduleA", "moduleB"], undefined, ["moduleA"]); // true (OR 조건)
```

## 이 패키지를 쓰지 말아야 할 때

- 서버 로직 구현 (서비스 메서드 등록, WebSocket 핸들링) → `@simplysm/service-server`
- 클라이언트에서 서버 호출 (RPC, 이벤트 구독) → `@simplysm/service-client`
- v14 소비앱에서 타입만 필요할 때 → 서버 패키지에서 직접 `import type`
