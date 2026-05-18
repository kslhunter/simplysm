# @simplysm/service-common — service-types

서버 구현·클라이언트 호출이 공유하는 빌트인 서비스 인터페이스. 서버는 인터페이스를 구현, 클라이언트는 동일 시그니처로 RPC 호출한다.

## OrmService

```ts
interface OrmService {
  getInfo(opt: DbConnOptions & { configName: string }): Promise<{ dialect: Dialect; database?: string; schema?: string }>;
  connect(opt: DbConnOptions & { configName: string }): Promise<number>; // connId
  close(connId: number): Promise<void>;
  beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(connId: number): Promise<void>;
  rollbackTransaction(connId: number): Promise<void>;
  executeParametrized(connId: number, query: string, params?: unknown[]): Promise<unknown[][]>;
  executeDefs(connId: number, defs: QueryDef[], options?: (ResultMeta | undefined)[]): Promise<unknown[][]>;
  bulkInsert(connId: number, tableName: string, columnDefs: Record<string, ColumnMeta>, records: Record<string, unknown>[]): Promise<void>;
}

type DbConnOptions = { configName?: string; config?: Record<string, unknown> };
```

MySQL / MSSQL / PostgreSQL 공통 추상. `connId` 단위로 트랜잭션·세션 식별. `Dialect`·`IsolationLevel`·`QueryDef`·`ColumnMeta`·`ResultMeta` 는 `@simplysm/orm-common` 정의.

## AutoUpdateService

```ts
interface AutoUpdateService {
  getLastVersion(platform: string): Promise<{ version: string; downloadPath: string } | undefined>;
}
```

`platform` 예: `"win32" | "darwin" | "linux"`. 등록된 버전 없으면 `undefined`.

## AppStructureService

```ts
interface AppStructureService {
  getItems(): Record<string, AppStructureItem[]>;
}
```

키는 클라이언트명, 값은 해당 클라이언트의 앱 구조 트리. `AppStructureItem` 은 [app-structure.md](./app-structure.md) 참조.
