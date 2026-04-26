# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/orm-node/README.md`를 참조한다.

## Package Overview

`@simplysm/orm-node`는 Node.js 런타임에서 `@simplysm/orm-common`의 `DbContext` 실행을 실제 DB 연결로 위임하는 ORM 패키지이다. 공개 소스 파일은 8개이며, MSSQL/Azure SQL, MySQL, PostgreSQL 연결 구현과 `DbContextExecutor` 어댑터를 제공한다.

## Architecture

```text
src/
  index.ts                         공개 export 진입점
  create-db-conn.ts                dialect별 저수준 DbConn 팩토리
  create-orm.ts                    DbContext 클래스용 고수준 ORM 팩토리
  node-db-context-executor.ts      orm-common DbContextExecutor 구현
  connections/
    mssql-db-conn.ts               tedious 기반 MSSQL/Azure SQL 연결
    mysql-db-conn.ts               mysql2/promise 기반 MySQL 연결
    postgresql-db-conn.ts          pg + pg-copy-streams 기반 PostgreSQL 연결
  types/
    db-conn.ts                     연결 설정, 공통 인터페이스, 상수
```

`index.ts`는 하위 모듈을 전부 re-export한다. 하위 폴더 barrel은 없으며, 공개 API 추가 시 `src/index.ts`에서 직접 export한다.

## Key Patterns

### Dialect별 지연 로딩

`createDbConn`은 `DbConnConfig.dialect`를 기준으로 필요한 peer dependency만 동적 import하고 모듈 객체를 캐시한다. 새 DBMS를 추가할 때는 `DbConnConfig` union, 구현 클래스, `createDbConn` 분기, `getDialectFromConfig`를 함께 갱신한다.

```typescript
const modules: {
  tedious?: typeof import("tedious");
  mysql?: typeof import("mysql2/promise");
  pg?: typeof import("pg");
  pgCopyStreams?: typeof import("pg-copy-streams");
} = {};
```

### 저수준 연결 인터페이스 통일

`MssqlDbConn`, `MysqlDbConn`, `PostgresqlDbConn`은 모두 `EventEmitter<{ close: void }>`를 상속하고 `DbConn`을 구현한다. 공통 상태 필드는 `isConnected`, `isInTransaction`이며, 연결 종료 시 `close` 이벤트를 emit하고 내부 연결 객체를 `undefined`로 초기화한다.

### 연결 유휴 타임아웃

각 연결 구현은 `DB_CONN_DEFAULT_TIMEOUT`을 `_timeout`으로 사용하고, 쿼리 실행·트랜잭션·연결 직후 `_startTimeout()`을 호출한다. 타이머가 만료되면 `close()`를 호출한다. `close()`에서는 먼저 `_stopTimeout()`을 호출한다.

### Bulk Insert 구현 분리

`bulkInsert`는 DBMS별 네이티브 대량 삽입 기능을 사용한다.

- MSSQL: `tedious` `BulkLoad`
- MySQL: 임시 TSV 파일과 `LOAD DATA LOCAL INFILE`
- PostgreSQL: `pg-copy-streams` `COPY FROM STDIN`

값 직렬화는 DBMS별 private helper에서 처리한다. `DateTime`, `DateOnly`, `Time`, `Uuid`, `Uint8Array` 변환 규칙은 DBMS 구현마다 다르므로 공통 함수로 섣불리 합치지 않는다.

### DbContextExecutor 어댑터

`NodeDbContextExecutor`는 `createQueryBuilder`, `pickResultSets`, `parseQueryResult`를 `@simplysm/orm-common`에서 받아 `QueryDef[]`를 SQL 실행 결과로 변환한다. 결과 메타가 전부 `undefined`이면 SQL을 한 번에 합쳐 실행하고 빈 배열을 반환한다.

## Testing

`packages/orm-node/tests` 디렉터리는 없다. 패키지 경계를 넘는 ORM 동작은 루트 통합 테스트(`tests/orm`)에서 검증한다.
