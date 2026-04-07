# @simplysm/service-common

서비스 클라이언트와 서버가 공유하는 프로토콜, 메시지 타입, 서비스 인터페이스 정의 패키지.

## Installation

```bash
npm install @simplysm/service-common
```

## API Overview

### Protocol

| API | Type | Description |
|-----|------|-------------|
| `PROTOCOL_CONFIG` | const | 프로토콜 설정 상수 (최대 크기, 청킹 임계값, 청크 크기, GC 주기, 만료 시간) |
| `ServiceMessage` | type | 모든 서비스 메시지의 유니언 타입 |
| `ServiceServerMessage` | type | 서버 → 클라이언트 메시지 유니언 (응답, 에러, 이벤트 알림) |
| `ServiceServerRawMessage` | type | `ServiceProgressMessage \| ServiceServerMessage` |
| `ServiceClientMessage` | type | 클라이언트 → 서버 메시지 유니언 (요청, 인증, 이벤트 관련) |
| `ServiceProgressMessage` | interface | 청크 수신 진행 상태 알림 메시지 |
| `ServiceErrorMessage` | interface | 서버 에러 알림 메시지 |
| `ServiceAuthMessage` | interface | 클라이언트 인증 메시지 (토큰) |
| `ServiceRequestMessage` | interface | 서비스 메서드 요청 메시지 |
| `ServiceResponseMessage` | interface | 서비스 메서드 응답 메시지 |
| `ServiceAddEventListenerMessage` | interface | 이벤트 리스너 추가 메시지 |
| `ServiceRemoveEventListenerMessage` | interface | 이벤트 리스너 제거 메시지 |
| `ServiceGetEventListenerInfosMessage` | interface | 이벤트 리스너 정보 목록 요청 메시지 |
| `ServiceEmitEventMessage` | interface | 이벤트 발생 메시지 |
| `ServiceEventMessage` | interface | 서버 이벤트 알림 메시지 |
| `ServiceProtocol` | interface | 바이너리 프로토콜 인코더/디코더 인터페이스 |
| `ServiceMessageDecodeResult` | type | 디코딩 결과 (complete 또는 progress) |
| `createServiceProtocol` | function | ServiceProtocol 인스턴스 팩토리 함수 |

-> See [docs/protocol.md](./docs/protocol.md) for details.

### Service Types

| API | Type | Description |
|-----|------|-------------|
| `OrmService` | interface | DB 연결, 트랜잭션 관리, 쿼리 실행 인터페이스 |
| `DbConnOptions` | type | 데이터베이스 연결 옵션 |
| `AutoUpdateService` | interface | 클라이언트 최신 버전 정보 조회 인터페이스 |

-> See [docs/service-types.md](./docs/service-types.md) for details.

### Types

| API | Type | Description |
|-----|------|-------------|
| `ServiceUploadResult` | interface | 파일 업로드 결과 (경로, 파일명, 크기) |

-> See [docs/types.md](./docs/types.md) for details.

### Events

| API | Type | Description |
|-----|------|-------------|
| `ServiceEventDef` | interface | defineEvent()로 생성된 이벤트 정의 (타입 마커 포함) |
| `defineEvent` | function | 타입 안전한 서비스 이벤트를 정의하는 팩토리 함수 |

-> See [docs/events.md](./docs/events.md) for details.

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

const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// 서버에서 이벤트 발생
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });

// 클라이언트에서 구독
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  // data.status는 string으로 타입 추론됨
});
```
