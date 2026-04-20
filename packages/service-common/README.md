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

| API | Type | Description |
|-----|------|-------------|
| `PROTOCOL_CONFIG` | const | 프로토콜 설정 상수 (최대 크기, 청킹 임계값, 청크 크기, GC 주기, 만료 시간) |
| `ServiceMessage` | type | 양방향 메시지의 유니언 타입 |
| `ServiceClientMessage` | type | 클라이언트 → 서버 메시지 유니언 |
| `ServiceServerMessage` | type | 서버 → 클라이언트 메시지 유니언 |
| `ServiceServerRawMessage` | type | 진행 상태를 포함한 서버 메시지 유니언 |
| `ServiceProgressMessage` | interface | 청크 수신 진행 상태 알림 |
| `ServiceErrorMessage` | interface | 서버 에러 알림 |
| `ServiceAuthMessage` | interface | 클라이언트 인증 메시지 (토큰) |
| `ServiceRequestMessage` | interface | 서비스 메서드 요청 |
| `ServiceResponseMessage` | interface | 서비스 메서드 응답 |
| `ServiceAddEventListenerMessage` | interface | 이벤트 리스너 추가 요청 |
| `ServiceRemoveEventListenerMessage` | interface | 이벤트 리스너 제거 요청 |
| `ServiceGetEventListenerInfosMessage` | interface | 이벤트 리스너 정보 목록 요청 |
| `ServiceEmitEventMessage` | interface | 이벤트 발생 요청 |
| `ServiceEventMessage` | interface | 서버 이벤트 알림 |
| `ServiceProtocol` | interface | 바이너리 프로토콜 인코더/디코더 |
| `ServiceMessageDecodeResult` | type | 디코딩 결과 유니언 (complete \| progress) |
| `createServiceProtocol` | function | ServiceProtocol 인스턴스 생성 팩토리 |

→ See [docs/protocol.md](./docs/protocol.md) for details.

### Service Types

| API | Type | Description |
|-----|------|-------------|
| `OrmService` | interface | DB 연결, 트랜잭션, 쿼리 실행 서비스 인터페이스 |
| `DbConnOptions` | type | DB 연결 옵션 타입 |
| `AutoUpdateService` | interface | 클라이언트 최신 버전 조회 서비스 인터페이스 |
| `AppStructureService` | interface | 앱 구조 항목 조회 서비스 인터페이스 |

→ See [docs/service-types.md](./docs/service-types.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `ServiceUploadResult` | interface | 파일 업로드 결과 |

→ See [docs/types.md](./docs/types.md) for details.

### App Structure

| API | Type | Description |
|-----|------|-------------|
| `AppStructureItem` | type | 앱 구조 항목 (그룹 또는 리프) |
| `AppStructureGroupItem` | interface | 자식을 가진 그룹 메뉴 항목 |
| `AppStructureLeafItem` | interface | 말단 메뉴 항목 (권한, URL 포함) |
| `AppStructureSubPermission` | interface | 리프 항목의 하위 권한 정의 |
| `FlatPermission` | interface | 플래트닝된 권한 결과 |
| `isUsableModules` | function | 개별 항목의 모듈 접근 가능 여부 판단 |
| `isUsableModulesChain` | function | 모듈 체인 전체의 접근 가능 여부 판단 |
| `getFlatPermissions` | function | 앱 구조 트리를 플래트닝하여 권한 배열 반환 |

→ See [docs/app-structure.md](./docs/app-structure.md) for details.

### Events

| API | Type | Description |
|-----|------|-------------|
| `ServiceEventDef` | interface | 타입 안전 이벤트 정의 인터페이스 |
| `defineEvent` | function | 타입 안전 이벤트를 정의하는 팩토리 함수 |

→ See [docs/events.md](./docs/events.md) for details.

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
