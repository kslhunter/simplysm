# @simplysm/sd-orm-common

dialect 비종속(mysql/mssql/mssql-azure/sqlite) ORM 코어.
데코레이터로 테이블/컬럼/관계를 정의하고, `Queryable` 체이닝 + `QueryHelper` 함수로 타입세이프 쿼리를 조립해 `DbContext` 를 통해 실행함.
실제 DB 접속/실행은 별도 어댑터 패키지가 `IDbContextExecutor`/`IDbConn` 을 구현해 주입함.

## 사용 트리거 인덱스

- **엔티티 정의 데코레이터** — 클래스로 DB 테이블/뷰/프로시저, 컬럼, 관계, 인덱스를 선언할 때. 자세히: [decorators.md](./decorators.md)
  - 대상: `@Table`, `@Column`, `@ForeignKey`, `@ForeignKeyTarget`, `@ReferenceKey`, `@ReferenceKeyTarget`, `@Index`.
- **DbContext** — DB 연결/트랜잭션 관리, 마이그레이션, 초기화, 스키마 조회, prepare 큐 실행의 진입점. 자세히: [DbContext.md](./DbContext.md)
- **Queryable** — `db.<테이블>.where(...).select(...).resultAsync()` 형태로 SELECT/INSERT/UPDATE/DELETE/UPSERT 를 체이닝 조립, 실행할 때. 자세히: [Queryable.md](./Queryable.md)
- **QueryHelper (`db.qh`)** — WHERE 조건, SQL 함수(집계, 문자열, 날짜, CASE, 캐스팅 등)를 `QueryUnit` 으로 표현할 때. 자세히: [QueryHelper.md](./QueryHelper.md)
- **CaseQueryHelper / CaseWhenQueryHelper** — `qh.case(...)` / `qh.caseWhen(...)` 로 SQL CASE 식을 빌드할 때. 자세히: [QueryHelper.md](./QueryHelper.md)
- **StoredProcedure** — 저장 프로시저를 객체 인자로 실행할 때.
- **SystemMigration / IDbMigration** — 마이그레이션 정의(`up(db)`) 작성 시, 적용 이력 테이블 `_migration`.
- **SdOrmUtils** — DB raw 결과를 컬럼 타입 파싱 + JOIN 트리로 재조립할 때(주로 어댑터/테스트). 자세히: [internals.md](./internals.md)
- **DbDefUtils** — 클래스의 `@Table` 메타데이터를 직접 읽고/병합할 때(데코레이터 내부 및 도구성 코드). 자세히: [internals.md](./internals.md)
- **QueryBuilder** — `TQueryDef` 를 dialect별 SQL 문자열로 변환. 어댑터(드라이버) 패키지 구현 시. 자세히: [adapter-layer.md](./adapter-layer.md)
- **IDbConn / IDbContextExecutor / TQueryDef 군** — 새 DB 드라이버/실행기를 구현할 때 따르는 인터페이스 및 쿼리 정의(IR). 자세히: [adapter-layer.md](./adapter-layer.md)
- **데이터 타입 / 옵션 타입** — `@Column({ dataType })` 지정, DbContext/접속 설정, 트랜잭션 격리수준 지정 시. 인라인(아래).
  - 대상: `TSdOrmDataType`, `TDbContextOption`, `TDbConnConf`, `ISOLATION_LEVEL`.

## 데이터 타입 / 옵션 타입 (인라인)

### TSdOrmDataType

`@Column({ dataType })` 에 주는 명시적 DB 타입. union 멤버:

- `{ type: "TEXT" }` — 대용량 텍스트. dialect별 LONGTEXT(mysql)/NTEXT.
- `{ type: "DECIMAL"; precision: number; digits?: number }` — 고정소수. `precision`=전체 자릿수, `digits`=소수 자릿수(없거나 0이면 정수부만 `DECIMAL(p)`).
- `{ type: "STRING"; length?: number | "MAX" }` — 가변 문자열. `length` 미지정 시 255, `"MAX"` 는 mysql에서 LONGTEXT, 그 외 NVARCHAR(MAX).
- `{ type: "FIXSTRING"; length: number }` — 고정 길이 문자(NCHAR(length)). `length` 필수.
- `{ type: "BINARY"; length?: number | "MAX" }` — 이진. 미지정/`"MAX"` 는 LONGBLOB(mysql)/VARBINARY(MAX), 숫자면 VARBINARY(length).
- `dataType` 미지정 시 컬럼의 TS 타입(`design:type`)을 보고 자동 매핑.
  - 매핑: String→NVARCHAR(255), Number→BIGINT/INTEGER, Boolean→BIT/BOOLEAN, DateTime→DATETIME2/DATETIME, DateOnly→DATE, Time→TIME,
    Uuid→UNIQUEIDENTIFIER/CHAR(38), Buffer→VARBINARY(MAX).

### TQueryValue / TStrippedQueryValue

- `TQueryValue` — 쿼리에 들어갈 수 있는 평면 값 타입(`TFlatType`: string/number/boolean/DateOnly/DateTime/Time/Uuid/Buffer 등 + 래퍼). 컬럼 값의 기본 단위.
- `TStrippedQueryValue` — `TQueryValue` 의 래퍼(Number/String/Boolean 등)를 벗긴 원시 타입.

### TDbContextOption (`db.opt`)

`DbContext` 생성 시 주는 동작 옵션. union:

- `{ dialect: "mysql" | "mssql" | "mssql-azure"; database?: string; schema?: string }` — 일반 dialect. `database`/`schema` 는 테이블 정의에 DB/스키마가 없을 때의 기본값.
- `{ dialect: "sqlite" }` — sqlite. database/schema 개념 없음(테이블명만 사용).
- `dialect` 분기는 SQL 생성, 식별자 래핑(\` vs `[]`), MAX/IDENTITY 처리 전반에 영향.

### TDbConnConf (어댑터 접속 설정)

- `{ dialect: "mysql"|"mssql"|"mssql-azure"; host; port?; username; password; database?; schema?; defaultIsolationLevel? }` — 네트워크 DB 접속 정보.
  `defaultIsolationLevel` 미지정 트랜잭션의 기본 격리수준.
- `{ dialect: "sqlite"; filePath: string }` — sqlite 파일 경로.

### ISOLATION_LEVEL

트랜잭션 격리수준 리터럴. `connectAsync`/`transAsync`/`beginTransactionAsync` 인자.
`"READ_UNCOMMITTED"`(더티리드 허용) | `"READ_COMMITTED"` | `"REPEATABLE_READ"` | `"SERIALIZABLE"`(최강).

## QueryUnit&lt;T&gt;

SQL 표현식 한 조각의 래퍼. `QueryHelper`/`CaseQueryHelper` 가 반환하며 `Queryable` entity의 각 컬럼도 이 타입.

- `type: Type<T | WrappedType<T>> | undefined` — 결과 파싱용 런타임 타입.
- `query` — 내부 SQL 토큰(문자열/배열/중첩 QueryUnit/Queryable).
- `notNull(): QueryUnit<NonNullable<T>>` — 타입만 non-null 로 좁힘(런타임 동작 없음).
- `nullable(): QueryUnit<T | undefined>` — 타입만 nullable 로 넓힘.

## StoredProcedure&lt;D, T&gt;

저장 프로시저 실행 래퍼. 보통 `DbContext` 필드로 `new StoredProcedure(this, ProcType)` 형태 보유.

- `constructor(db: D, tableType: Type<T>)` — `tableType` 은 `@Table({ procedure })` 로 정의한 프로시저 인자 스키마 클래스.
- `execAsync(obj: TInsertObject<T>): Promise<void>` — `obj` 의 각 필드를 쿼리값으로 변환해 `executeProcedure` 정의로 실행. database/schema 는 테이블 정의 → `db.opt` 순으로 결정(sqlite는 생략).

## SystemMigration / IDbMigration

- `class SystemMigration` — `@Table({ name: "_migration" })` 적용된 마이그레이션 이력 테이블.
  컬럼 `code: string`(PK, 적용된 migration 클래스명). `DbContext.systemMigration` 으로 노출.
- `interface IDbMigration { up(db: DbContext): Promise<void> }` — 마이그레이션 1건.
  `DbContext.migrations` 가 반환하는 클래스 배열의 각 원소가 이 인터페이스를 구현하며,
  클래스명 오름차순으로 미적용분만 실행됨(`DbContext.initializeAsync` 참고).
