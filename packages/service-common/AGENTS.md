# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/service-common/README.md`를 참조한다.

## Package Overview

`@simplysm/service-common`은 서비스 클라이언트와 서버가 공유하는 바이너리 프로토콜, 메시지 타입, 서비스 인터페이스, 앱 구조 정의 패키지이다. `src/` 기준 TypeScript 소스 파일은 10개이다.

의존성: `@simplysm/core-common`, `@simplysm/orm-common`

## Architecture

```text
src/
├── protocol/
│   ├── protocol.types.ts              # 프로토콜 설정 상수와 메시지 타입
│   └── create-service-protocol.ts     # ServiceProtocol 인터페이스와 팩토리
├── service-types/
│   ├── orm-service.types.ts           # ORM 연결·트랜잭션·쿼리 타입 계약
│   ├── auto-update-service.types.ts   # 자동 업데이트 버전 조회 타입 계약
│   └── app-structure-service.types.ts # 앱 구조 조회 타입 계약
├── app-structure/
│   ├── app-structure.types.ts         # 메뉴 트리와 권한 타입
│   └── app-structure.utils.ts         # 모듈 조건 필터링 유틸
├── types.ts                           # 공통 서비스 타입
├── define-event.ts                    # 타입 안전 이벤트 정의 팩토리
└── index.ts                           # public API re-export
```

## Key Patterns

### 바이너리 프로토콜 V2

`createServiceProtocol()`은 상태를 가진 팩토리 함수이며 내부에 `LazyGcMap` 기반 청크 누적기를 둔다. 생성한 프로토콜 인스턴스는 사용이 끝나면 `dispose()`로 GC 타이머와 누적기를 해제해야 한다.

```typescript
const protocol = createServiceProtocol();
const { chunks, totalSize } = protocol.encode(uuid, message);
const result = protocol.decode(chunk);

if (result.type === "complete") {
  result.message;
}

protocol.dispose();
```

헤더는 28바이트 Big Endian 구조이다.

| Offset | Size | Field |
|--------|------|-------|
| 0 | 16 | UUID |
| 16 | 8 | TotalSize |
| 24 | 4 | Index |

프로토콜 상수는 `PROTOCOL_CONFIG`에 모여 있다.

| Constant | Value | 의미 |
|----------|-------|------|
| `MAX_TOTAL_SIZE` | `100 * 1024 * 1024` | 단일 메시지 최대 크기 |
| `SPLIT_MESSAGE_SIZE` | `3 * 1024 * 1024` | 청킹 시작 임계값 |
| `CHUNK_SIZE` | `300 * 1024` | 청크 본문 크기 |
| `GC_INTERVAL` | `10 * 1000` | 미완성 청크 GC 주기 |
| `EXPIRE_TIME` | `60 * 1000` | 미완성 청크 만료 시간 |

### 메시지 타입 계층

`ServiceMessage`는 클라이언트와 서버 양방향 메시지를 포함하는 최상위 유니언이다.

```typescript
type ServiceMessage =
  | ServiceRequestMessage
  | ServiceAuthMessage
  | ServiceProgressMessage
  | ServiceResponseMessage
  | ServiceErrorMessage
  | ServiceAddEventListenerMessage
  | ServiceRemoveEventListenerMessage
  | ServiceGetEventListenerInfosMessage
  | ServiceEmitEventMessage
  | ServiceEventMessage;
```

방향별 유니언은 다음 용도로 나뉜다.

- `ServiceClientMessage`: 클라이언트에서 서버로 보내는 요청, 인증, 이벤트 리스너, 이벤트 발생 메시지
- `ServiceServerMessage`: 서버에서 클라이언트로 보내는 응답, 에러, 이벤트 알림 메시지
- `ServiceServerRawMessage`: 서버 메시지에 청크 진행 상태(`progress`)를 더한 타입

### 타입 안전 이벤트

`defineEvent<TInfo, TData>(eventName)`는 이벤트 이름과 타입 전용 마커를 가진 `ServiceEventDef`를 반환한다. `$info`와 `$data`는 런타임 값으로 사용하지 않고 서버·클라이언트 API의 제네릭 타입 추출에 사용한다.

```typescript
export const OrderUpdated = defineEvent<{ orderId: number }, { status: string }>("OrderUpdated");
```

### 앱 구조와 모듈 조건

`AppStructureItem`은 `children` 필드 유무로 그룹과 리프를 구분하는 재귀 트리 타입이다.

- `modules`: OR 조건이다. 값이 없거나 빈 배열이면 통과하고, 값이 있으면 사용 가능 모듈 중 하나와 일치해야 한다.
- `requiredModules`: AND 조건이다. 값이 있으면 모든 항목이 사용 가능 모듈에 포함되어야 한다.

`getFlatPermissions()`는 BFS로 트리를 순회하면서 경로의 모듈 조건을 누적 검사하고, 리프의 `perms`와 `subPerms`를 `FlatPermission[]`으로 변환한다.

### 서비스 인터페이스

`OrmService`, `AutoUpdateService`, `AppStructureService`는 구현체가 없는 타입 계약이다. 서버 구현은 `@simplysm/service-server`, 클라이언트 호출은 `@simplysm/service-client`가 담당한다.

`OrmService`의 일반 호출 순서는 다음과 같다.

```text
connect()
beginTransaction()
executeDefs() 또는 executeParametrized()
commitTransaction() 또는 rollbackTransaction()
close()
```

## Package-Specific Compiler Settings

`tsconfig.json`은 루트 설정을 확장하고 패키지 고유 설정으로 `lib: ["ESNext", "WebWorker"]`, `outDir: "./dist"`, `typeRoots: ["./node_modules/@types"]`를 둔다.

## Testing

```text
tests/
├── protocol/
│   └── service-protocol.spec.ts
└── app-structure/
    ├── app-structure-types-export.verify.md
    ├── app-structure-utils.spec.ts
    └── app-structure.spec.ts
```

- 프로토콜 테스트는 인코딩/디코딩, 청킹, UUID별 청크 인터리빙, 예외 경로를 검증한다.
- 앱 구조 테스트는 모듈 OR 조건, `requiredModules` AND 조건, 트리 플래트닝 결과를 검증한다.
