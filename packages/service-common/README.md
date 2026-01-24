# @simplysm/service-common

심플리즘 서비스의 공통 모듈입니다. 클라이언트와 서버 간 통신 프로토콜 및 서비스 타입 정의를 제공합니다.

## 설치

```bash
npm install @simplysm/service-common
# or
pnpm add @simplysm/service-common
```

## 주요 기능

### ServiceProtocol

클라이언트-서버 간 메시지 프로토콜을 정의합니다.

```typescript
import { ServiceProtocol } from "@simplysm/service-common";

// 요청 인코딩
const encoded = ServiceProtocol.encodeRequest(requestId, serviceName, methodName, params);

// 응답 디코딩
const response = ServiceProtocol.decodeResponse(data);
```

### 서비스 타입 정의

각 서비스의 인터페이스를 정의합니다.

#### OrmService

```typescript
import type { IOrmService } from "@simplysm/service-common";

// ORM 서비스 메서드
interface IOrmService {
  executeAsync(queries: string[]): Promise<any[][]>;
  executeDefsAsync(defs: QueryDef[]): Promise<any[][]>;
}
```

#### CryptoService

```typescript
import type { ICryptoService } from "@simplysm/service-common";

// 암호화 서비스 메서드
interface ICryptoService {
  encryptAsync(data: string): Promise<string>;
  decryptAsync(encryptedData: string): Promise<string>;
}
```

#### SmtpService

```typescript
import type { ISmtpService } from "@simplysm/service-common";

// SMTP 서비스 메서드
interface ISmtpService {
  sendAsync(options: SmtpSendOptions): Promise<void>;
}
```

#### AutoUpdateService

```typescript
import type { IAutoUpdateService } from "@simplysm/service-common";

// 자동 업데이트 서비스 메서드
interface IAutoUpdateService {
  getLastVersionAsync(clientName: string): Promise<string>;
  downloadAsync(clientName: string, version: string): Promise<Uint8Array>;
}
```

## 프로토콜 타입

| 타입 | 설명 |
|------|------|
| `ProtocolRequest` | 요청 메시지 |
| `ProtocolResponse` | 응답 메시지 |
| `ProtocolEvent` | 이벤트 메시지 |
| `ProtocolError` | 에러 메시지 |

## 라이선스

Apache-2.0
