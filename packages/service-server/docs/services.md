# Services

## `OrmService`

ORM 브리지 서비스 정의. WebSocket 전용이며 `auth()`로 래핑되어 로그인이 필수다. `defineService("Orm", auth((ctx) => ...))`로 정의되어 있다.

```typescript
const OrmService: ServiceDefinition;
```

소켓별 DB 연결 관리:
- `WeakMap<ServiceSocket, Map<number, DbConn>>`으로 소켓별 연결 상태를 관리한다
- 소켓이 닫히면 해당 소켓의 열린 DB 연결을 모두 자동 종료한다
- `getConfig("orm")`에서 `configName`으로 DB 연결 설정을 읽는다

제공 메서드:

| Method | Signature | Description |
|--------|-----------|-------------|
| `getInfo` | `(opt: DbConnOptions & { configName: string }) => Promise<{ dialect: Dialect; database?: string; schema?: string }>` | DB 연결 정보를 반환한다. `mssql-azure` dialect은 `mssql`로 변환된다 |
| `connect` | `(opt: DbConnOptions & { configName: string }) => Promise<number>` | DB에 연결하고 연결 ID를 반환한다 |
| `close` | `(connId: number) => Promise<void>` | DB 연결을 종료한다 |
| `beginTransaction` | `(connId: number, isolationLevel?: IsolationLevel) => Promise<void>` | 트랜잭션을 시작한다 |
| `commitTransaction` | `(connId: number) => Promise<void>` | 트랜잭션을 커밋한다 |
| `rollbackTransaction` | `(connId: number) => Promise<void>` | 트랜잭션을 롤백한다 |
| `executeParametrized` | `(connId: number, query: string, params?: unknown[]) => Promise<unknown[][]>` | 파라미터화된 쿼리를 실행한다 |
| `executeDefs` | `(connId: number, defs: QueryDef[], options?: (ResultMeta \| undefined)[]) => Promise<unknown[][]>` | QueryDef 배열을 SQL로 변환하여 실행한다. `options`가 모두 `null`이면 쿼리를 합쳐 한 번에 실행한다 |
| `bulkInsert` | `(connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | 대량 삽입을 수행한다 |

HTTP 요청 시 "WebSocket 연결이 필요합니다" 에러를 던진다.

## `OrmServiceType`

`OrmService`의 메서드 시그니처 타입. 클라이언트 측 타입 공유에 사용한다.

```typescript
type OrmServiceType = ServiceMethods<typeof OrmService>;
```

## `AutoUpdateService`

자동 업데이트 서비스 정의. `defineService("AutoUpdate", (ctx) => ...)`로 정의되어 있다. 인증 불필요.

```typescript
const AutoUpdateService: ServiceDefinition;
```

제공 메서드:

| Method | Signature | Description |
|--------|-----------|-------------|
| `getLastVersion` | `(platform: string) => Promise<{ version: string; downloadPath: string } \| undefined>` | `{clientPath}/{platform}/updates/` 디렉토리에서 최신 버전 파일을 찾아 반환한다 |

`getLastVersion` 동작:
- `platform`이 `"android"`이면 `.apk` 파일을, 그 외에는 `.exe` 파일을 탐색한다
- 파일명이 `{version}.{ext}` 형식이어야 하며 (예: `1.2.3.apk`), `semver.maxSatisfying`으로 최대 버전을 결정한다
- `clientPath`가 없으면 에러를 던진다
- 업데이트 디렉토리나 매칭 파일이 없으면 `undefined`를 반환한다

## `AutoUpdateServiceType`

`AutoUpdateService`의 메서드 시그니처 타입.

```typescript
type AutoUpdateServiceType = ServiceMethods<typeof AutoUpdateService>;
```

## `AppStructureService`

앱 구조 정보 서비스를 생성하는 팩토리 함수. `defineService`를 래핑하여 `Record<string, AppStructureItem[]>` 맵을 받아 서비스 정의를 반환한다. 인증 불필요.

```typescript
function AppStructureService(
  itemsMap: Record<string, AppStructureItem[]>,
): ServiceDefinition;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `itemsMap` | `Record<string, AppStructureItem[]>` | 앱 구조 아이템 맵. `AppStructureItem`은 `@simplysm/service-common`에서 import한다 |

제공 메서드:

| Method | Signature | Description |
|--------|-----------|-------------|
| `getItems` | `() => Record<string, AppStructureItem[]>` | 생성 시 전달된 `itemsMap`을 그대로 반환한다 |

## `AppStructureServiceType`

`AppStructureService`가 반환하는 서비스의 메서드 시그니처 타입.

```typescript
type AppStructureServiceType = ServiceMethods<ReturnType<typeof AppStructureService>>;
```
