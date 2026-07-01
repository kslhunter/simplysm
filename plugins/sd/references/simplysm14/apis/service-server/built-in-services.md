# @simplysm/service-server — 내장 서비스

서버 `services` 배열에 그대로 등록할 수 있는 기본 `ServiceDefinition`과 그 클라이언트 공유용 메서드 타입 묶음이다. ORM 쿼리 작성·조회 흐름 기준: [orm.md](../../manuals/orm.md).

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

- 서비스 이름 `"Orm"` / `"SdOrmService"` — 두 이름으로 같은 서비스가 노출되며 `"Orm"`이 대표 이름이다.
- 서비스 수준 `auth(...)` — 팩토리가 `auth`로 감싸져 모든 메서드가 로그인 필요 상태로 실행된다(역할 배열은 빈 배열).
- WebSocket 전용 — 연결 저장소가 `ServiceSocket` 기준 `WeakMap`이라 `ctx.socket`이 없으면 `"WebSocket 연결이 필요합니다. ORM 서비스는 HTTP로 사용할 수 없습니다."`를 throw한다.
- `opt: DbConnOptions & { configName: string }` — DB 연결 옵션. 코드가 `configName`으로 `ctx.getConfig("orm")` 항목을 찾고 `opt.config`를 그 위에 병합한다.
  - `configName: string` — `orm` 설정 섹션 안 DB 설정 키. 없으면 `"ORM 설정을 찾을 수 없습니다: ..."`를 throw한다.
- `getInfo(opt)` — 연결 없이 설정만으로 DB 메타를 반환한다.
  - `dialect: Dialect` — 설정 dialect를 반환하되 `"mssql-azure"`는 `"mssql"`로 정규화한다.
  - `database?: string` — 설정 `database` 값을 그대로 반환한다.
  - `schema?: string` — 설정 객체에 `schema` 키가 있을 때만 반환한다.
- `connect(opt): Promise<number>` — 새 `DbConn`을 생성·연결하고 소켓별 map에 저장한 뒤 증가한 `connId`를 반환한다. 소켓 첫 연결 시 `close` 핸들러를 등록해 소켓 종료 때 열린 DB 연결을 모두 닫는다.
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
  - `options?: (ResultMeta | undefined)[]` — 결과 파싱 메타 배열. 모든 요소가 `null`/`undefined`이면 모든 SQL을 한 문자열로 묶어 실행하고 각 def 결과는 빈 배열이 된다. 특정 index에 값이 있으면 그 결과셋을 `parseQueryResult`로 파싱하고, 없으면 원본 결과셋을 그대로 담는다.
- `bulkInsert(connId, tableName, columnDefs, records)` — 해당 연결의 bulk insert를 호출한다.
  - `tableName: string` — 삽입 대상 테이블명.
  - `columnDefs: Record<string, ColumnMeta>` — 컬럼별 메타 정보.
  - `records: Record<string, unknown>[]` — 삽입할 레코드 배열.
- `OrmServiceMethods` — 클라이언트 프록시 타입으로 공유할 메서드 시그니처 추출 타입.

## AutoUpdateService / AutoUpdateServiceMethods

```ts
const AutoUpdateService: ServiceDefinition<{
  getLastVersion(platform: string): Promise<{ version: string; downloadPath: string } | undefined>;
}>;

type AutoUpdateServiceMethods = ServiceMethods<typeof AutoUpdateService>;
```

- 서비스 이름 `"AutoUpdate"` / `"SdAutoUpdateService"` — 두 이름으로 같은 서비스가 노출되며 `"AutoUpdate"`가 대표 이름이다.
- 인증 메타 없음 — 팩토리가 `auth(...)`로 감싸져 있지 않아 서비스 자체는 권한 요구 메타를 갖지 않는다.
- `getLastVersion(platform)` — `ctx.clientPath/<platform>/updates` 안에서 최대 버전 설치 파일을 찾는다.
  - `platform: string` — updates 디렉터리 경로와 후보 파일 확장자 판정에 쓰인다. `"android"`면 후보 확장자는 `.apk`, 그 외면 `.exe`. 후보는 확장자를 뺀 이름이 `/^[0-9.]*$/`에 맞는 파일만 해당한다.
  - 반환 `version: string` — `semver.maxSatisfying(versions, "*")`로 고른 최대 버전 문자열.
  - 반환 `downloadPath: string` — `/<clientName>/<platform>/updates/<fileName>` 형태의 posix 경로.
  - 반환 `undefined` — updates 디렉터리가 없거나 후보 버전이 없거나 선택 버전 파일을 찾지 못할 때.
  - 오류 — `ctx.clientPath`가 없으면 `"클라이언트 경로를 찾을 수 없습니다."`를 throw한다.
- `AutoUpdateServiceMethods` — 클라이언트 프록시 타입으로 공유할 메서드 시그니처 추출 타입.
