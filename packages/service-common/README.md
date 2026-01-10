# @simplysm/service-common

> SIMPLYSM 프레임워크의 서비스 프로토콜 및 공통 타입 패키지

[![npm version](https://img.shields.io/npm/v/@simplysm/service-common.svg)](https://www.npmjs.com/package/@simplysm/service-common)
[![license](https://img.shields.io/npm/l/@simplysm/service-common.svg)](https://github.com/kslhunter/simplysm/blob/master/LICENSE)

service-client와 service-server가 공유하는 프로토콜 및 타입 정의 라이브러리입니다.

## 설치

```bash
npm install @simplysm/service-common
# or
yarn add @simplysm/service-common
```

## 주요 기능

### 🔌 ServiceProtocol

Binary Protocol V2 기반 메시지 인코더/디코더. 대용량 메시지 청킹과 자동 GC를 지원합니다.

```
프로토콜 구조 (28 bytes header + JSON body)
┌────────────────────────────────────────────────────────┐
│ UUID (16 bytes) │ Total Size (8 bytes) │ Index (4 bytes) │
├────────────────────────────────────────────────────────┤
│                      Body (JSON)                        │
└────────────────────────────────────────────────────────┘
```

```typescript
import { ServiceProtocol } from "@simplysm/service-common";
import { Uuid } from "@simplysm/core-common";

const protocol = new ServiceProtocol();

// 인코딩 (대용량 메시지 자동 청킹)
const { chunks, totalSize } = protocol.encode(
  Uuid.new(),
  { name: "auth", body: { token: "jwt-token" } }
);

// 디코딩 (청킹된 메시지 자동 조합)
const result = protocol.decode(buffer);
if (result.type === "complete") {
  console.log(result.message);
} else {
  console.log(`Progress: ${result.completedSize}/${result.totalSize}`);
}
```

**프로토콜 상수**:
| 상수 | 값 | 설명 |
|------|-----|------|
| MAX_TOTAL_SIZE | 100MB | 메시지 최대 크기 |
| SPLIT_MESSAGE_SIZE | 3MB | 청킹 임계값 |
| CHUNK_SIZE | 300KB | 청크 크기 |
| GC Interval | 10초 | 미완성 메시지 정리 주기 |
| Expire Time | 60초 | 미완성 메시지 만료 시간 |

### 📨 메시지 타입

클라이언트-서버 간 통신에 사용되는 메시지 타입들입니다.

#### Client → Server

| 메시지 | 용도 |
|--------|------|
| `IServiceAuthMessage` | JWT 토큰 인증 |
| `IServiceRequestMessage` | `${service}.${method}` 호출 |
| `IServiceAddEventListenerMessage` | 이벤트 리스너 등록 |
| `IServiceRemoveEventListenerMessage` | 이벤트 리스너 제거 |
| `IServiceGetEventListenerInfosMessage` | 이벤트 리스너 목록 조회 |
| `IServiceEmitEventMessage` | 이벤트 발생 |

#### Server → Client

| 메시지 | 용도 |
|--------|------|
| `IServiceResponseMessage` | 메소드 응답 |
| `IServiceErrorMessage` | 에러 알림 |
| `IServiceReloadMessage` | 클라이언트 리로드 명령 |
| `IServiceProgressMessage` | 전송 진행률 |
| `IServiceEventMessage` | 이벤트 발생 알림 |

### 🎯 ServiceEventListener

이벤트 리스너 타입 정의용 추상 클래스. mangle-safe한 이벤트 식별을 지원합니다.

```typescript
import { ServiceEventListener } from "@simplysm/service-common";

// 이벤트 정의
export class SharedDataChangeEvent extends ServiceEventListener<
  { name: string; filter: unknown },     // 이벤트 정보 타입
  (string | number)[] | undefined        // 이벤트 데이터 타입
> {
  readonly eventName = "SharedDataChangeEvent";  // 필수! (mangle 안전)
}

// 타입 추출
type Info = SharedDataChangeEvent["$info"];  // { name: string; filter: unknown }
type Data = SharedDataChangeEvent["$data"];  // (string | number)[] | undefined

// 이벤트명 접근 (인스턴스 생성 불필요)
const name = SharedDataChangeEvent.prototype.eventName;
```

**특징**:
- `abstract readonly eventName`: 상속 시 필수 구현 (컴파일 에러로 강제)
- `declare readonly $info/$data`: 타입 추출용, JS 코드 생성 안 함
- `prototype.eventName`: 인스턴스 생성 없이 이벤트명 조회 가능

### 🛠️ 서비스 인터페이스

빌트인 서비스 인터페이스 정의입니다.

```typescript
import type {
  IOrmService,
  ICryptoService,
  IAutoUpdateService,
  ISmtpService
} from "@simplysm/service-common";
```

| 인터페이스 | 설명 |
|-----------|------|
| `IOrmService` | DB 연결/쿼리 서비스 |
| `ICryptoService` | 암호화 서비스 |
| `IAutoUpdateService` | 자동 업데이트 서비스 |
| `ISmtpService` | 이메일 전송 서비스 |

#### IOrmService 예시

```typescript
interface IOrmService {
  getInfo(opt: TDbConnOptions & { configName: string }): Promise<{ dialect: Dialect; database?: string; schema?: string }>;
  connect(opt: Record<string, unknown>): Promise<number>;
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(connId: number, defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<unknown[][]>;
  bulkInsert(connId: number, tableName: string, columnDefs: ColumnMeta[], records: Record<string, unknown>[]): Promise<void>;
}
```

## 프로젝트 구조

```
packages/service-common/
├── src/
│   ├── protocol/
│   │   ├── protocol.types.ts      # 메시지 타입 정의
│   │   └── service-protocol.ts    # 인코딩/디코딩
│   ├── service-types/
│   │   ├── orm-service.types.ts
│   │   ├── crypto-service.types.ts
│   │   ├── auto-update-service.types.ts
│   │   └── smtp-service.types.ts
│   ├── types.ts                   # ServiceEventListener, IServiceUploadResult
│   └── index.ts                   # 진입점
├── package.json
└── tsconfig.json
```

## 의존성

| 패키지 | 용도 |
|--------|------|
| `@simplysm/core-common` | `JsonConvert`, `LazyGcMap`, `Uuid` |
| `@simplysm/orm-common` | `TQueryDef`, `IQueryColumnDef` 등 타입만 |

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/service-common/tsconfig.json

# ESLint
npx eslint "packages/service-common/**/*.ts"
```

## 라이선스

MIT © 김석래

## 관련 패키지

- `@simplysm/core-common` - 공통 유틸리티
- `@simplysm/orm-common` - ORM 쿼리 빌더
- `@simplysm/service-client` - 서비스 클라이언트 (마이그레이션 예정)
- `@simplysm/service-server` - 서비스 서버 (마이그레이션 예정)
