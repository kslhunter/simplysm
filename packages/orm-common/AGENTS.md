# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/orm-common/README.md`를 참조한다.

## Package Overview

`@simplysm/orm-common`은 DBMS 독립적인 ORM 공통 패키지이다. TypeScript Fluent API로 테이블, 뷰, 프로시저 스키마를 정의하고, `QueryDef` AST를 경유해 MySQL, MSSQL, PostgreSQL SQL 생성을 지원한다. `src/`에는 36개의 TypeScript 소스 파일이 있다.

실제 DB 연결은 이 패키지가 직접 처리하지 않고 `DbContextExecutor` 인터페이스로 위임한다. 런타임 공통 타입과 값 변환은 `@simplysm/core-common`에 의존한다.

## Architecture

```text
src/
├── index.ts                    public API re-export
├── db-context.ts               class 기반 DbContext와 연결/트랜잭션/DDL API
├── ddl/                        DDL QueryDef 생성과 Code First 초기화
├── errors/                     트랜잭션 에러 타입
├── exec/                       Queryable/Executable 실행 체인과 검색어 파서
├── expr/                       SQL 표현식 빌더와 타입 래퍼
├── models/                     _Migration 시스템 테이블
├── query-builder/              QueryDef를 dialect별 SQL 문자열로 변환
├── schema/                     Table/View/Procedure 및 factory builder
├── types/                      DB, column, expr, query-def 공개 타입
└── utils/                      결과 파싱과 다중 result set 선택 유틸리티
```

## Key Patterns

### 스키마 빌더는 불변 체인이다

`Table`, `View`, `Procedure`와 하위 factory builder는 메서드 체인마다 새 빌더 인스턴스를 반환한다. 테이블 정의에서 컬럼, PK, 인덱스, 관계 순서로 체인을 구성하는 패턴이 테스트 전반에서 반복된다.

```typescript
export const User = Table("User")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    companyId: c.bigint().nullable(),
  }))
  .primaryKey("id")
  .relations((r) => ({
    company: r.foreignKey(["companyId"], () => Company, { description: "소속회사" }),
  }));
```

관계 builder의 `description`과 `single` 옵션은 factory 함수의 마지막 `opts` 인자로 전달한다. 관계 메서드 체이닝으로 옵션을 붙이는 API는 소스에 없다.

### DbContext는 class 프로퍼티로 등록한다

`DbContext`를 상속하고 `this.queryable()` 또는 `this.executable()` 결과를 class field에 둔다. 등록 함수에는 `SD_BUILDER` symbol 메타데이터가 붙고, 초기화 로직은 이 메타데이터로 테이블, 뷰, 프로시저 builder를 수집한다.

```typescript
class MainDb extends DbContext {
  user = this.queryable(User);
  getUserById = this.executable(GetUserById);

  migrations = [{ name: "001_init", up: async (db) => await db.createTable(User) }];
}
```

`connect()`는 연결 후 트랜잭션을 열고 콜백 성공 시 커밋한다. DDL은 트랜잭션 상태에서 실행할 수 없으므로 DDL 작업은 `connectWithoutTransaction()` 또는 초기화 흐름에서 다룬다.

### Queryable은 QueryDef를 만들고 executor에 위임한다

`Queryable`은 SELECT/INSERT/UPDATE/DELETE/UPSERT 체인을 구성한 뒤 `execute()`에서 `QueryDef`와 `ResultMeta`를 executor로 전달한다. SQL 문자열 생성은 `query-builder/` 구현체의 책임이다.

```typescript
const users = await db
  .user()
  .where((u) => [expr.eq(u.isActive, true)])
  .select((u) => ({ id: u.id, name: u.name }))
  .orderBy((u) => u.name)
  .execute();
```

### 표현식은 문자열 SQL 대신 AST로 표현한다

WHERE, SELECT, 집계, 윈도우, CASE, raw 표현식은 `expr` factory가 만든 AST 타입으로 표현한다. DB별 렌더링 차이는 `ExprRendererBase` 하위 구현체가 처리한다.

```typescript
expr.and([expr.eq(u.status, "active"), expr.gt(u.age, 18)]);
expr.sum(o.amount);
expr.rowNumber({ partitionBy: [u.companyId], orderBy: [[u.createdAt, "DESC"]] });
```

### 결과 파싱은 executor 경계에서 수행한다

`parseQueryResult()`는 `ResultMeta`의 column 타입과 join 정보를 사용해 플랫 DB 결과를 타입 변환하고 중첩 객체로 재구성한다. `pickResultSets()`는 배치 SQL처럼 여러 result set이 돌아오는 실행 결과에서 `QueryBuildResult` 메타데이터 기준으로 필요한 set만 선택한다.

## Package-Specific Compiler Setting

`tsconfig.json`은 루트 설정을 확장하면서 `lib: ["ESNext", "WebWorker"]`를 추가한다. DOM API가 아니라 Node/브라우저 공통 실행에 필요한 WebWorker lib를 사용한다.

## Testing

테스트는 기능별 디렉터리로 나뉜다.

```text
tests/
├── setup/       공유 모델, 뷰, 프로시저, TestDbContext, MockExecutor
├── ddl/         DDL QueryDef와 초기화
├── dml/         INSERT/UPDATE/DELETE/UPSERT
├── select/      SELECT, JOIN, GROUP, CTE, result meta
├── expr/        표현식 렌더링
├── executable/  Stored Procedure 실행
├── queryable/   Queryable 에러 케이스
├── types/       타입 추론과 순환 참조 수락 테스트
└── utils/       결과 파서 단위/성능 테스트
```

SQL 생성 테스트는 dialect별 기대 문자열을 `*.expected.ts`에 분리한다. 테스트 전용 스키마와 executor는 `tests/setup/`에 두고 `src/`로 올리지 않는다.
