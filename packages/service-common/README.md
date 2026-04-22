# @simplysm/service-common

서비스 클라이언트와 서버가 공유하는 바이너리 프로토콜, 메시지 타입, 서비스 인터페이스, 앱 구조 정의 패키지.

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

## API Overview

### Protocol

| Entry | Kind | Description |
|-------|------|-------------|
| [`PROTOCOL_CONFIG`](./docs/protocol/protocol-config.md) | const | 프로토콜 설정 상수 (최대 크기, 청킹 임계값, 청크 크기, GC 주기, 만료 시간) |
| [`ServiceMessage`](./docs/protocol/service-message.md) | type | 양방향 메시지 유니언 (`ServiceClientMessage`, `ServiceServerMessage`, `ServiceServerRawMessage` 포함) |
| [`ServiceProgressMessage`](./docs/protocol/service-progress-message.md) | interface | 청크 수신 진행 상태 알림 |
| [`ServiceErrorMessage`](./docs/protocol/service-error-message.md) | interface | 서버 에러 알림 |
| [`ServiceAuthMessage`](./docs/protocol/service-auth-message.md) | interface | 클라이언트 인증 메시지 (토큰) |
| [`ServiceRequestMessage`](./docs/protocol/service-request-message.md) | interface | 서비스 메서드 요청 |
| [`ServiceResponseMessage`](./docs/protocol/service-response-message.md) | interface | 서비스 메서드 응답 |
| [`ServiceAddEventListenerMessage`](./docs/protocol/service-add-event-listener-message.md) | interface | 이벤트 리스너 추가 요청 |
| [`ServiceRemoveEventListenerMessage`](./docs/protocol/service-remove-event-listener-message.md) | interface | 이벤트 리스너 제거 요청 |
| [`ServiceGetEventListenerInfosMessage`](./docs/protocol/service-get-event-listener-infos-message.md) | interface | 이벤트 리스너 정보 목록 요청 |
| [`ServiceEmitEventMessage`](./docs/protocol/service-emit-event-message.md) | interface | 이벤트 발생 요청 |
| [`ServiceEventMessage`](./docs/protocol/service-event-message.md) | interface | 서버 이벤트 알림 |
| [`createServiceProtocol`](./docs/protocol/create-service-protocol.md) | function | ServiceProtocol 인스턴스 생성 팩토리 (`ServiceProtocol`, `ServiceMessageDecodeResult` 포함) |

### Service Types

| Entry | Kind | Description |
|-------|------|-------------|
| [`OrmService`](./docs/service-types/orm-service.md) | interface | DB 연결, 트랜잭션, 쿼리 실행 서비스 인터페이스 (`DbConnOptions` 포함) |
| [`AutoUpdateService`](./docs/service-types/auto-update-service.md) | interface | 클라이언트 최신 버전 조회 서비스 인터페이스 |
| [`AppStructureService`](./docs/service-types/app-structure-service.md) | interface | 앱 구조 항목 조회 서비스 인터페이스 |

### Types

| Entry | Kind | Description |
|-------|------|-------------|
| [`ServiceUploadResult`](./docs/types/service-upload-result.md) | interface | 파일 업로드 결과 |

### App Structure

| Entry | Kind | Description |
|-------|------|-------------|
| [`AppStructureItem`](./docs/app-structure/app-structure-item.md) | type | 앱 구조 항목 유니언 (`AppStructureGroupItem`, `AppStructureLeafItem`, `AppStructureSubPermission`, `FlatPermission` 포함) |
| [`isUsableModules`](./docs/app-structure/is-usable-modules.md) | function | 단일 항목의 모듈 접근 가능 여부 판단 |
| [`isUsableModulesChain`](./docs/app-structure/is-usable-modules-chain.md) | function | 모듈 체인 전체의 접근 가능 여부 판단 |
| [`getFlatPermissions`](./docs/app-structure/get-flat-permissions.md) | function | 앱 구조 트리를 플래트닝하여 권한 배열 반환 |

### Events

| Entry | Kind | Description |
|-------|------|-------------|
| [`defineEvent`](./docs/events/define-event.md) | function | 타입 안전 이벤트를 정의하는 팩토리 함수 (`ServiceEventDef` 포함) |

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
