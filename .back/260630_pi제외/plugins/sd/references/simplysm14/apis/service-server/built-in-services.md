# @simplysm/service-server — 내장 서비스

서버 `services` 배열에 그대로 등록할 수 있는 기본 `ServiceDefinition`과 그 클라이언트 공유용 메서드 타입 묶음이다. ORM 호출 흐름과 쿼리 작성 기준: [orm.md](../../manuals/orm.md).

## OrmService / OrmServiceMethods

```ts
const OrmService: ServiceDefinition<{
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
}>;

type OrmServiceMethods = ServiceMethods<typeof OrmService>;
```

- 서비스 이름 `"Orm"` / `"SdOrmService"` — 두 이름으로 같은 서비스가 노출된다. `"Orm"`이 대표 이름이다.
- 서비스 수준 `auth(...)` — 모든 메서드가 로그인 필요 상태로 실행된다. 역할 배열은 빈 배열이다.
- WebSocket 전용 — 내부 연결 저장소가 `ServiceSocket` 기준 `WeakMap`이므로 `ctx.socket`이 없으면 `"WebSocket 연결이 필요합니다. ORM 서비스는 HTTP로 사용할 수 없습니다."`를 throw한다.
- `opt: DbConnOptions & { configName: string }` — DB 연결 옵션. 서비스 코드가 `configName`으로 `ctx.getConfig("orm")` 항목을 찾고 `opt.config`를 설정 위에 병합한다.
- `configName: string` — `orm` 설정 섹션 안의 DB 설정 키. 없으면 `"ORM 설정을 찾을 수 없습니다: ..."`를 throw한다.
- `getInfo(...).dialect: Dialect` — 설정의 dialect를 반환하되 `"mssql-azure"`는 `"mssql"`로 정규화한다.
- `getInfo(...).database?: string` — 설정의 `database` 값을 그대로 반환한다.
- `getInfo(...).schema?: string` — 설정 객체에 `schema` 키가 있을 때만 반환한다.
- `connect(opt): Promise<number>` — 새 `DbConn`을 생성·연결하고 소켓별 map에 저장한 뒤 증가한 `connId`를 반환한다. 소켓 `close` 시 열린 DB 연결을 모두 닫도록 핸들러를 등록한다.
- `connId: number` — 소켓별 DB 연결 식별자. 존재하지 않으면 `"데이터베이스에 연결되지 않았습니다. (유효하지 않은 연결 ID)"`를 throw한다.
- `close(connId)` — 해당 DB 연결을 닫는다. 종료 중 오류는 warn 로그 후 무시된다.
- `beginTransaction(connId, isolationLevel?)` — 해당 연결에서 트랜잭션을 시작한다.
- `isolationLevel?: IsolationLevel` — ORM 연결의 `beginTransaction`에 그대로 전달되는 격리 수준.
- `commitTransaction(connId)` — 해당 연결의 트랜잭션을 커밋한다.
- `rollbackTransaction(connId)` — 해당 연결의 트랜잭션을 롤백한다.
- `executeParametrized(connId, query, params?)` — 해당 연결에서 파라미터 바인딩 SQL을 실행한다.
- `query: string` — `DbConn.executeParametrized`에 전달할 SQL 문자열.
- `params?: unknown[]` — SQL 파라미터 배열. 미지정이면 그대로 `undefined`가 전달된다.
- `executeDefs(connId, defs, options?)` — 각 `QueryDef`를 연결 dialect용 SQL로 빌드해 실행하고 결과 배열을 반환한다.
- `defs: QueryDef[]` — 실행할 ORM query definition 배열. 각 요소가 결과 배열의 같은 index에 대응한다.
- `options?: (ResultMeta | undefined)[]` — 결과 파싱 메타 배열. 모든 요소가 `null`/`undefined`이면 모든 SQL을 한 문자열로 묶어 실행하고 각 def 결과는 빈 배열이 된다. 특정 index에 값이 있으면 그 결과셋을 `parseQueryResult`로 파싱한다.
- `bulkInsert(connId, tableName, columnDefs, records)` — 해당 연결의 bulk insert를 호출한다.
- `tableName: string` — 삽입 대상 테이블명.
- `columnDefs: Record<string, ColumnMeta>` — 컬럼별 메타 정보.
- `records: Record<string, unknown>[]` — 삽입할 레코드 배열.
- `OrmServiceMethods` — 클라이언트 프록시 타입으로 공유할 메서드 시그니처 추출 타입이다.

## AutoUpdateService / AutoUpdateServiceMethods

```ts
const AutoUpdateService: ServiceDefinition<{
  getLastVersion(platform: string): Promise<
    | { version: string; downloadPath: string }
    | undefined
  >;
}>;

type AutoUpdateServiceMethods = ServiceMethods<typeof AutoUpdateService>;
```

- 서비스 이름 `"AutoUpdate"` / `"SdAutoUpdateService"` — 두 이름으로 같은 서비스가 노출된다. `"AutoUpdate"`가 대표 이름이다.
- 인증 메타 없음 — 팩토리가 `auth(...)`로 감싸져 있지 않아 서비스 자체는 권한 요구 메타를 갖지 않는다.
- `platform: string` — `ctx.clientPath/<platform>/updates` 디렉터리와 후보 파일 확장자 판정에 쓰인다.
- `platform === "android"` — 후보 파일 확장자는 `.apk`다.
- `platform !== "android"` — 후보 파일 확장자는 `.exe`다.
- 후보 파일명 — 확장자를 뺀 이름이 `/^[0-9.]*$/`에 맞는 파일만 semver 후보가 된다.
- 반환 `version: string` — `semver.maxSatisfying(versions, "*")`로 고른 최대 버전 문자열.
- 반환 `downloadPath: string` — `/<clientName>/<platform>/updates/<fileName>` 형태의 posix 경로.
- 반환 `undefined` — updates 디렉터리가 없거나 후보 버전이 없거나 선택 버전 파일을 찾지 못할 때 반환된다.
- 오류 — `ctx.clientPath`가 없으면 `"클라이언트 경로를 찾을 수 없습니다."`를 throw한다.
- `AutoUpdateServiceMethods` — 클라이언트 프록시 타입으로 공유할 메서드 시그니처 추출 타입이다.
