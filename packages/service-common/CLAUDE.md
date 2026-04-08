# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Overview

`@simplysm/service-common` — 서비스 클라이언트·서버가 공유하는 프로토콜, 메시지 타입, 서비스 인터페이스, 앱 구조 정의 패키지. 10개 TypeScript 소스 파일.

의존성: `@simplysm/core-common`, `@simplysm/orm-common`

## Architecture

```
src/
├── protocol/
│   ├── protocol.types.ts              ← 프로토콜 상수(PROTOCOL_CONFIG) 및 모든 메시지 타입 정의
│   └── create-service-protocol.ts     ← ServiceProtocol 인터페이스 및 팩토리 함수
├── service-types/
│   ├── orm-service.types.ts           ← OrmService 인터페이스 (DB 연결·트랜잭션·쿼리)
│   ├── auto-update-service.types.ts   ← AutoUpdateService 인터페이스
│   └── app-structure-service.types.ts ← AppStructureService 인터페이스
├── app-structure/
│   ├── app-structure.types.ts         ← 앱 구조 타입 (메뉴 트리, 권한, 모듈)
│   └── app-structure.utils.ts         ← 앱 구조 유틸 (모듈 필터링, 권한 플래트닝)
├── types.ts                           ← 공통 타입 (ServiceUploadResult)
├── define-event.ts                    ← defineEvent() 팩토리 및 ServiceEventDef 인터페이스
└── index.ts                           ← public API re-export
```

## Key Patterns

### 바이너리 프로토콜 (V2)

`createServiceProtocol()`은 상태를 가진 팩토리 함수 패턴을 사용한다. 내부 청크 누적기(`LazyGcMap`)를 캡슐화하며, 사용 후 반드시 `dispose()`를 호출해야 한다.

```typescript
const protocol = createServiceProtocol();

// 인코딩 (3MB 초과 시 자동 청킹)
const { chunks, totalSize } = protocol.encode(uuid, message);

// 디코딩 (청크 자동 재조립)
const result = protocol.decode(chunk);
if (result.type === "complete") {
  // result.message: 재조립 완료
} else {
  // result.type === "progress": 수신 진행 중
}

// 반드시 해제
protocol.dispose();
```

헤더 구조 (28바이트, Big Endian):
- offset 0–15: UUID (16바이트 바이너리)
- offset 16–23: TotalSize (uint64, 상위 4바이트 = 0, 하위 4바이트에 실제 크기)
- offset 24–27: Index (uint32)

### 메시지 타입 계층

`ServiceMessage`는 클라이언트·서버 양방향 메시지의 유니언 타입이다. 방향별로 나뉜다:
- `ServiceClientMessage` — 클라이언트 → 서버 (요청, 인증, 이벤트 구독·해제·발생)
- `ServiceServerMessage` — 서버 → 클라이언트 (응답, 에러, 이벤트 알림)
- `ServiceServerRawMessage` — `ServiceProgressMessage | ServiceServerMessage` (청크 진행 포함)

메시지 이름 규칙:
- 서비스 메서드 호출: `` `${서비스명}.${메서드명}` `` (예: `"OrmService.connect"`)
- 시스템 메시지: 고정 문자열 (`"response"`, `"error"`, `"auth"`, `"progress"`)
- 이벤트 메시지: `"evt:add"`, `"evt:remove"`, `"evt:gets"`, `"evt:emit"`, `"evt:on"`

### 타입 안전 이벤트 정의

`defineEvent()`로 이벤트를 정의하면 `info`(필터 조건)와 `data`(페이로드)에 대한 제네릭 타입이 보장된다. `$info`, `$data` 필드는 런타임에 사용하지 않는 타입 마커다.

```typescript
const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");

// 서버: 이벤트 발생
ctx.socket?.emitEvent(OrderUpdated, { orderId: 123 }, { status: "shipped" });

// 클라이언트: 이벤트 구독
await client.addEventListener(OrderUpdated, { orderId: 123 }, (data) => {
  // data.status는 string으로 타입 추론됨
});
```

### 서비스 인터페이스

`OrmService`, `AutoUpdateService`, `AppStructureService`는 서버 구현체와 클라이언트 프록시가 공유하는 인터페이스다. 이 패키지에는 구현체가 없으며, 타입 계약만 정의한다.

`OrmService`는 연결 ID(`connId: number`) 기반으로 상태를 관리한다. 사용 순서는 `connect()` → `beginTransaction()` → `executeDefs()`/`executeParametrized()` → `commitTransaction()`/`rollbackTransaction()` → `close()`이다.

### 앱 구조 (App Structure)

`AppStructureItem`은 메뉴·권한 트리를 표현하는 재귀 타입이다. `children`이 있으면 `AppStructureGroupItem`, 없으면 `AppStructureLeafItem`이다. 각 항목에 `modules`(OR 조건)과 `requiredModules`(AND 조건)로 모듈 접근 제어를 설정한다.

`getFlatPermissions()`는 트리를 BFS로 순회하며 모듈 조건을 필터링하여 `FlatPermission[]`으로 플래트닝한다. `isUsableModules()`와 `isUsableModulesChain()`은 모듈 접근 가능 여부를 판단하는 헬퍼 함수다.

## 컴파일러 설정

`lib: ["ESNext", "WebWorker"]` — 브라우저와 웹 워커 양쪽 환경에서 사용 가능한 API만 허용한다 (`lib: ["DOM"]` 미포함).

## Testing

**프레임워크**: Vitest

```
tests/
├── protocol/
│   └── service-protocol.spec.ts       ← ServiceProtocol encode/decode/청킹/UUID 인터리빙 테스트
└── app-structure/
    ├── app-structure.spec.ts          ← getFlatPermissions 통합 테스트 (모듈 필터링, subPerms)
    └── app-structure-utils.spec.ts    ← isUsableModules/isUsableModulesChain 단위 테스트
```

`service-protocol.spec.ts`는 `beforeEach`/`afterEach`로 프로토콜 인스턴스를 생성·해제한다. 청킹 테스트는 4MB 데이터를 직접 생성하여 검증한다.

```typescript
describe("ServiceProtocol", () => {
  let protocol: ServiceProtocol;

  beforeEach(() => { protocol = createServiceProtocol(); });
  afterEach(() => { protocol.dispose(); });

  it("chunk message larger than 3MB", () => {
    const largeData = "x".repeat(4 * 1024 * 1024);
    const result = protocol.encode(uuid, { name: "test.method", body: [largeData] });
    expect(result.chunks.length).toBeGreaterThan(1);
  });
});
```

`app-structure.spec.ts`와 `app-structure-utils.spec.ts`는 트리 구조 데이터를 직접 구성하여 모듈 필터링과 권한 플래트닝 로직을 검증한다.
