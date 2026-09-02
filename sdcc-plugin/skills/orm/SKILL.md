---
name: orm
description: "@simplysm/orm-common·orm-node(dialect 독립 ORM — 스키마 빌더·DbContext·Queryable 체이닝·expr, Node 연결)의 인덱스. Use when 테이블·뷰·프로시저 스키마를 정의하거나, ORM 쿼리(조회·CUD·join·union·재귀)를 작성·리뷰하거나, Node 서버에서 DB 에 연결하거나, 변경 이력(dataLog)을 세팅·적재하는 모든 작업 — 착수 전에 먼저 읽는다. API 를 안다고 생각해도 읽는다(설치된 버전의 체이닝 제약·타입 추론이 학습 지식과 다르다). 대상: Table·View·Procedure·createColumnFactory, DbContext·migrations·initialize, db.X() 체이닝(where·select·joinSingle·include·orderBy·limit·count·insert·update·upsert·delete), expr, Queryable.union, createOrm·DbConnConfig, insertDataLog·joinLastDataLog."
---

@simplysm/orm-common 과 @simplysm/orm-node 사용 안내입니다. SQL 문자열 대신 JSON AST 를 만들고 dialect(MySQL·MSSQL·PostgreSQL) 별 QueryBuilder 가 렌더링합니다. 두 패키지 모두 `src/` 원본을 함께 배포하므로 상세 API 는 설치된 소스에서 직접 확인합니다 — 이 문서는 어디를 볼지와, 소스 한 파일만 읽어서는 놓치는 규약만 담습니다. 컬럼 nullable·삭제·유니크·변경 이력·단일 쿼리 규칙은 세션에 주입된 rules 가 정본입니다.

## 소스 위치

- `node_modules/@simplysm/orm-common/src/` — 공개 API 는 `src/index.ts`. 스키마 빌더 `schema/`, `DbContext` `db-context.ts`, `Queryable`/`Executable`/검색 파서 `exec/`, `expr` `expr/`, AST·executor 인터페이스 `types/`, dialect 렌더러 `query-builder/`.
- `node_modules/@simplysm/orm-node/src/` — `createOrm`, `createDbConn`, `NodeDbContextExecutor`, dialect 별 `DbConn` 구현.
- 클라이언트(브라우저)에서의 실행은 `@simplysm/service-client` 의 `createOrmClientConnector` 가 서버 `Orm` 서비스로 위임합니다 — 배선은 `angular`·`service` 스킬.

## 배선

- 스키마: `Table("Name").columns((c) => ({ id: c.bigint().autoIncrement(), … })).primaryKey("id").indexes((i) => [i.index("a","b")]).relations((r) => ({ employee: r.foreignKey(["employeeId"], () => Employee) }))`. 관계의 `description`/`single` 은 체이닝이 아니라 factory 의 `opts` 인자(순환 참조 회피). `foreignKey`/`foreignKeyTarget` 은 DB FK 를 만들고, `relationKey`/`relationKeyTarget` 은 논리 관계만(View 는 후자만).
- `DbContext` 서브클래스에 `role = this.queryable(Role)`, `getX = this.executable(Proc)` 로 등록. `migrations: Migration[]` 를 오버라이드하고 `initialize({ dbs?, force? })` 가 Code-First 생성 + 미적용 마이그레이션 실행(`_migration` 테이블에 적재).
- 서버: `createOrm(MainDbContext, dbConnConfig).connect(async (db) => …)`(트랜잭션 자동) 또는 `connectWithoutTransaction` + 안에서 `db.transaction(fn)`. `DbConnConfig.dialect` 는 `"mysql" | "mssql" | "mssql-azure"(encrypt) | "postgresql"`.
- 페이징 목록 조회의 체인 형태: `db.X()` → `joinSingle` 로 본 행에 붙일 컬럼만 부착 → `.select((p) => ({ …도출 컬럼 }))`(coalesce·CASE·산식을 한 번에, 콜백 안 로컬 `const` 로 가독성) → `where` 는 projected 컬럼 이름으로 직접(`r.status`) → `count()` → `orderBy(...).limit(page*size, size).execute()`. 이 순서인 이유는 select 뒤 `where`/`orderBy` 가 projected 컬럼을 inline 하고 `limit` 이 `orderBy` 를 요구하기 때문입니다. 도출 산식을 WHERE·SELECT 양쪽에 쓰려고 helper 를 만들지 않습니다(projected 컬럼이 그 역할). 필터 dropdown 옵션처럼 첫 진입 1회 데이터는 본 쿼리에 섞지 말고 별도 1회성 effect 로.
- 변경 이력 인프라(프로젝트 1회): `SystemDataLog` 테이블(`tableName`·`tableDescription`·`action`·`itemId?`·`valueJson?`·`dateTime`·`employeeId?`, 인덱스 `(tableName,itemId)` + `dateTime DESC`, employee FK) + `*.ext.ts` 에서 `declare module "@simplysm/orm-common" { interface Queryable<…> { insertDataLog; joinLastDataLog; joinFirstDataLog } }` 로 타입 보강하고 `Queryable.prototype` 에 구현(`tableName` 은 `this.meta.from.meta.name` 에서 자동, join 은 `joinSingle` + `top(1)` + `include(employee)`) + db-context 에 `dataLog = this.queryable(SystemDataLog)` 등록. `*.ext.ts` 는 진입점 import 그래프(배럴 `export *`)에 들어가야 prototype 에 붙습니다. `tableDescription` 은 테이블에 `.description()` 을 선언해야 채워지고, join 은 본 행 PK 가 `id` 라는 전제.

## 소스 한 파일만 읽어서는 틀리기 쉬운 것

- `limit()` 은 `orderBy()` 선행 필수(없으면 throw). `count()` 는 `distinct()`/`groupBy()` 직후엔 throw — 먼저 `wrap()`. 그 외 자리에 `wrap()` 을 끼우는 건 군더더기입니다(projected 컬럼 위 `where`/`orderBy` 는 wrap 없이 inline 됨).
- `select()`/`distinct()`/`groupBy()` 뒤에는 `TFrom` 이 `never` 가 되어 CUD(insert·update·delete·upsert) 를 못 합니다. CUD 는 `db.X().where(...)` 에서 바로.
- `where`/`update`/`insert` 값 자리는 `ExprInput`(리터럴 허용) — `expr.val` 로 감싸지 않습니다. `expr.val` 은 `select` 에서 상수 컬럼을 만들 때처럼 `ExprUnit` 이 요구되는 자리만.
- SELECT 절 안에 `expr.subquery`/`expr.exists` 를 넣으면 행마다 N 회 실행됩니다 — `joinSingle` 안에서 `from + where + select(집계)` 로 붙여 컬럼으로 참조.
- `expr.eq` 는 NULL 안전(MySQL `<=>`, 그 외 `IS NULL OR =`). `expr.between` 의 `from`/`to` 가 `undefined` 면 그쪽 무제한. `expr.indexOf` 는 0-based, 미발견 -1. `expr.if` 의 두 값이 모두 NULL 리터럴이면 throw.
- `insert` 는 1000건씩 청크 실행, 빈 배열은 무동작, AI 컬럼에 값을 주면 `overrideIdentity` 자동. `outputColumns` 를 주면 그 컬럼만 반환.
- `Queryable.union(...)` 은 **UNION ALL** 로 렌더됩니다(중복 제거 없음). 각 소스의 select 컬럼 이름·타입·순서가 정확히 같아야 하고, 한쪽에만 있는 컬럼은 `` expr.raw("number")`NULL` `` 로 타입을 명시해 자리채움(`null` 만 쓰면 타입 추론 실패). 출처 식별 리터럴(`rowType: "IN"`)은 JS 값을 그대로. `where` 는 union 전 각 소스에(predicate pushdown), 관계 경로 컬럼은 union 전 `include`/`joinSingle`, 총 건수는 소스별 `count` 합산(고유 행 수가 필요하면 `.distinct().wrap().count()`). union 결과 위의 연산자는 전부 바깥 derived table 에 적용됩니다.
- `include(item => item.posts.user)` 는 `TableBuilder` 에 정의된 관계만 자동 조인(N:1 은 `joinSingle`, 1:N 은 `single` 여부로 분기). 미정의 경로는 throw. `$inferSelect` 의 관계 필드는 전부 optional 이라 결과에서 `!` 로 단언합니다.
- `search(fn, text)` 는 공백=OR, `+term`=필수, `-term`=제외, `"구문"`, `*` 와일드카드 구문을 LIKE 로 풉니다. 빈 문자열이면 무동작.
- `connect()` 는 트랜잭션을 **자동 시작**하고 콜백 성공 시 commit, 실패 시 rollback. 트랜잭션 안에서 DDL(`DDL_TYPES`)이 섞이면 throw(`switchFk`·`execProc` 는 허용).
- 컬럼 값 타입: `datetime`→`DateTime`, `date`→`DateOnly`, `time`→`Time`, `uuid`→`Uuid`, `binary`→`Bytes`. `$inferInsert` 에서 `autoIncrement`/`nullable`/`default` 컬럼만 optional.
- 클라이언트 `connectAsync`(service-client `OrmClientConnector.connect`) 는 콜백의 FK 위반 에러를 `SdError("경고! 연관된 작업으로 인해 작업이 거부되었습니다…")` 로 바꿔 throw 합니다. `connectWithoutTransaction` 에는 이 변환이 없습니다.
- orm-node 의 트랜잭션 기본 격리수준은 세 dialect 모두 `READ_UNCOMMITTED`(`isolationLevel` 인자도 `config.defaultIsolationLevel` 도 없을 때). MySQL bulkInsert 는 임시 TSV + `LOAD DATA LOCAL INFILE`, PostgreSQL 은 COPY.
