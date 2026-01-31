# @simplysm/service-client

심플리즘 서비스의 클라이언트 모듈이다. 서버와의 WebSocket 통신 및 서비스 호출을 담당한다.

## 설치

```bash
npm install @simplysm/service-client
# or
pnpm add @simplysm/service-client
```

## 주요 기능

### ServiceClient

서버와의 연결 및 서비스 호출을 관리한다.

```typescript
import { ServiceClient } from "@simplysm/service-client";

const client = new ServiceClient({
  host: "localhost",
  port: 8080,
  ssl: false,
});

await client.connectAsync();

// 서비스 호출
const result = await client.sendAsync("MyService", "myMethod", [param1, param2]);

await client.closeAsync();
```

### EventClient

서버로부터의 이벤트를 수신한다.

```typescript
import { EventClient } from "@simplysm/service-client";

const eventClient = new EventClient(serviceClient);

// 이벤트 구독
eventClient.on("eventName", (data) => {
  console.log("Received:", data);
});

// 구독 해제
eventClient.off("eventName");
```

### FileClient

파일 업로드/다운로드를 처리한다.

```typescript
import { FileClient } from "@simplysm/service-client";

const fileClient = new FileClient(serviceClient);

// 파일 업로드
await fileClient.uploadAsync("/path/to/file.txt", buffer, {
  onProgress: (progress) => console.log(`${progress}%`),
});

// 파일 다운로드
const data = await fileClient.downloadAsync("/path/to/file.txt", {
  onProgress: (progress) => console.log(`${progress}%`),
});
```

### ORM 클라이언트

서버의 ORM 서비스를 통해 데이터베이스에 접근한다.

```typescript
import { OrmClientConnector, OrmClientDbContextExecutor } from "@simplysm/service-client";
import { DbContext } from "@simplysm/orm-common";

const connector = new OrmClientConnector(serviceClient);

await connector.connectAsync(async (db: DbContext) => {
  const users = await db.from(User).resultAsync();
});
```

## 클래스 구조

| 클래스 | 설명 |
|-------|------|
| `ServiceClient` | 메인 서비스 클라이언트 |
| `ServiceTransport` | WebSocket 전송 계층 |
| `SocketProvider` | 소켓 프로바이더 |
| `ClientProtocolWrapper` | 프로토콜 래퍼 |
| `EventClient` | 이벤트 클라이언트 |
| `FileClient` | 파일 클라이언트 |
| `OrmClientConnector` | ORM 커넥터 |
| `OrmClientDbContextExecutor` | ORM 실행기 |

## 진행률 콜백

파일 업로드/다운로드 시 진행률을 추적할 수 있다.

```typescript
interface ProgressOptions {
  onProgress?: (percent: number) => void;
}
```

## 라이선스

Apache-2.0
