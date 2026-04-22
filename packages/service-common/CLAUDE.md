# CLAUDE.md

> 이 패키지의 사용법 및 지침은 [README.md](./README.md) 및 [docs/](./docs/)를 참조한다.


## Package Overview

`@simplysm/service-common` — 서비스 클라이언트·서버가 공유하는 프로토콜, 메시지 타입, 서비스 인터페이스, 앱 구조 정의 패키지. 10개 TypeScript 소스 파일.

의존성: `@simplysm/core-common`, `@simplysm/orm-common`

## Architecture

```
src/
├── protocol/
│   ├── protocol.types.ts              ← 프로토콜 설정 상수, 메시지 타입 정의
│   └── create-service-protocol.ts     ← ServiceProtocol 인터페이스 및 팩토리
├── service-types/
│   ├── orm-service.types.ts           ← OrmService 인터페이스 (DB 연결·쿼리)
│   ├── auto-update-service.types.ts   ← AutoUpdateService 인터페이스
│   └── app-structure-service.types.ts ← AppStructureService 인터페이스
├── app-structure/
│   ├── app-structure.types.ts         ← 앱 구조 타입 (메뉴 트리, 권한)
│   └── app-structure.utils.ts         ← 앱 구조 유틸 (모듈 필터링)
├── types.ts                           ← 공통 타입 (ServiceUploadResult)
├── define-event.ts                    ← defineEvent() 팩토리 함수
└── index.ts                           ← public API re-export
```

## Key Patterns

### 바이너리 프로토콜 (V2)

`createServiceProtocol()`은 상태를 가진 팩토리 함수로, 내부에 청크 누적기(`LazyGcMap`)를 캡슐화한다. 사용 후 반드시 `dispose()`를 호출해야 한다.

**헤더 구조** (28바이트, Big Endian):
- 0–15: UUID (16바이트)
- 16–23: TotalSize (uint64)
- 24–27: Index (uint32)

**청킹 규칙**:
- 임계값: 3MB (`SPLIT_MESSAGE_SIZE`)
- 청크 크기: 300KB (`CHUNK_SIZE`)
- 최대 메시지: 100MB (`MAX_TOTAL_SIZE`)
- GC 주기: 10초 (`GC_INTERVAL`)
- 만료 시간: 60초 (`EXPIRE_TIME`)

**사용 패턴**:
```typescript
const protocol = createServiceProtocol();
const { chunks, totalSize } = protocol.encode(uuid, message);
const result = protocol.decode(chunk);
// result.type: "complete" | "progress"
protocol.dispose();
```

### 메시지 타입 계층

`ServiceMessage`는 양방향 메시지의 유니언이다:
- `ServiceClientMessage` — 클라이언트 → 서버
- `ServiceServerMessage` — 서버 → 클라이언트
- `ServiceServerRawMessage` — 진행 상태 포함

**메시지 명명 규칙**:
- 서비스 호출: `"{ServiceName}.{methodName}"` (예: `"OrmService.connect"`)
- 시스템 메시지: `"response"`, `"error"`, `"auth"`, `"progress"`
- 이벤트 메시지: `"evt:add"`, `"evt:remove"`, `"evt:gets"`, `"evt:emit"`, `"evt:on"`

### 타입 안전 이벤트

`defineEvent<TInfo, TData>(eventName)`로 정의하면 `$info`와 `$data` 필드가 타입 마커로 제공된다. 런타임에는 사용되지 않음.

**사용 패턴**:
```typescript
// 정의
export const MyEvent = defineEvent<FilterInfo, DataPayload>("MyEvent");

// 발생 (서버)
const evt = server.getEvent<typeof MyEvent>("MyEvent");
await evt.emit((info) => filter(info), payload);

// 구독 (클라이언트)
const evt = client.getEvent<typeof MyEvent>("MyEvent");
const key = await evt.addListener(filterInfo, (data) => handle(data));
```

### 서비스 인터페이스

`OrmService`, `AutoUpdateService`, `AppStructureService`는 타입 계약만 정의한다 (구현체는 다른 패키지).

**OrmService 사용 순서**:
1. `connect()` → connId 획득
2. `beginTransaction()` (선택)
3. `executeDefs()` 또는 `executeParametrized()`
4. `commitTransaction()` 또는 `rollbackTransaction()`
5. `close()`

### 앱 구조 (App Structure)

`AppStructureItem`은 재귀 트리 타입이다:
- `children` 있음 → `AppStructureGroupItem` (폴더)
- `children` 없음 → `AppStructureLeafItem` (말단, 권한 정보 포함)

**모듈 접근 제어**:
- `modules` (OR): 하나라도 있으면 접근 가능
- `requiredModules` (AND): 모두 있어야 접근 가능

**유틸 함수**:
- `isUsableModules()` — 개별 항목의 모듈 조건 판단
- `isUsableModulesChain()` — 트리 경로 전체의 모듈 조건 판단
- `getFlatPermissions()` — 트리를 BFS로 순회하며 FlatPermission[]으로 플래트닝

## 컴파일러 설정

`lib: ["ESNext", "WebWorker"]` — 브라우저 및 웹 워커 환경 지원 (DOM 제외).

## Testing

**프레임워크**: Vitest

**구조**:
```
tests/
├── protocol/
│   └── service-protocol.spec.ts   ← encode/decode, 청킹, UUID 인터리빙
└── app-structure/
    ├── app-structure.spec.ts      ← getFlatPermissions 통합 테스트
    └── app-structure-utils.spec.ts ← isUsableModules 단위 테스트
```

**패턴**:
- 프로토콜: `beforeEach/afterEach`로 인스턴스 생성·해제, 4MB 데이터로 청킹 검증
- 앱 구조: 트리 데이터를 직접 구성하여 필터링 로직 검증
