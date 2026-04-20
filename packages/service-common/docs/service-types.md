# Service Types

## `OrmService`

데이터베이스 연결, 트랜잭션 관리, 쿼리 실행을 제공하는 서비스 인터페이스. MySQL, MSSQL, PostgreSQL을 지원한다. 이 패키지에는 구현체가 없으며, 서버(`service-server`)와 클라이언트(`service-client`)가 공유하는 타입 계약이다.

```typescript
export interface OrmService {
  getInfo(opt: DbConnOptions & { configName: string }): Promise<{
    dialect: Dialect;
    database?: string;
    schema?: string;
  }>;
  connect(opt: DbConnOptions & { configName: string }): Promise<number>;
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(
    connId: number,
    defs: QueryDef[],
    options?: (ResultMeta | undefined)[],
  ): Promise<unknown[][]>;
  bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getInfo` | `opt: DbConnOptions & { configName: string }` | `Promise<{ dialect, database?, schema? }>` | DB 연결 정보 (dialect, database, schema) 조회 |
| `connect` | `opt: DbConnOptions & { configName: string }` | `Promise<number>` | DB 연결을 생성하고 연결 ID 반환 |
| `close` | `connId: number` | `Promise<void>` | 연결 종료 |
| `beginTransaction` | `connId: number, isolationLevel?: IsolationLevel` | `Promise<void>` | 트랜잭션 시작 |
| `commitTransaction` | `connId: number` | `Promise<void>` | 트랜잭션 커밋 |
| `rollbackTransaction` | `connId: number` | `Promise<void>` | 트랜잭션 롤백 |
| `executeParametrized` | `connId: number, query: string, params?: unknown[]` | `Promise<unknown[][]>` | 파라미터 바인딩 쿼리 실행 |
| `executeDefs` | `connId: number, defs: QueryDef[], options?: (ResultMeta \| undefined)[]` | `Promise<unknown[][]>` | QueryDef 배열로 쿼리 실행 |
| `bulkInsert` | `connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]` | `Promise<void>` | 대량 삽입 |

사용 순서: `connect()` -> `beginTransaction()` -> `executeDefs()`/`executeParametrized()` -> `commitTransaction()`/`rollbackTransaction()` -> `close()`

## `DbConnOptions`

데이터베이스 연결 옵션.

```typescript
export type DbConnOptions = { configName?: string; config?: Record<string, unknown> };
```

| Field | Type | Description |
|-------|------|-------------|
| `configName` | `string?` | 서버에 등록된 DB 설정 이름 |
| `config` | `Record<string, unknown>?` | 직접 지정하는 DB 연결 설정 |

## `AutoUpdateService`

클라이언트 애플리케이션의 최신 버전 정보를 조회하는 서비스 인터페이스.

```typescript
export interface AutoUpdateService {
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getLastVersion` | `platform: string` | `Promise<{ version, downloadPath } \| undefined>` | 지정된 플랫폼(예: "win32", "darwin", "linux")의 최신 버전 정보 조회. 버전이 없으면 undefined |

## `AppStructureService`

서버에 등록된 앱 구조 항목을 클라이언트명 기준 맵으로 조회하는 서비스 인터페이스.

```typescript
export interface AppStructureService {
  getItems(): Record<string, AppStructureItem[]>;
}
```

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `getItems` | 없음 | `Record<string, AppStructureItem[]>` | 클라이언트명을 키로, 해당 클라이언트의 앱 구조 항목 배열을 값으로 하는 맵 반환 |
