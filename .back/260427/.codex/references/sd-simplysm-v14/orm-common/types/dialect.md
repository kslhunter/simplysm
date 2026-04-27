# `Dialect`

> **읽어야 하는 상황**: DB 방언 타입(`"mysql"` | `"mssql"` | `"postgresql"`)이나 격리 수준, executor 인터페이스를 참조할 때.

지원하는 DB 방언 타입 및 관련 런타임 타입 모음.

## `Dialect`

```typescript
export type Dialect = "mysql" | "mssql" | "postgresql";
```

| 값 | 지원 버전 |
|----|-----------|
| `"mysql"` | MySQL 8.0.14+ |
| `"mssql"` | Microsoft SQL Server 2012+ |
| `"postgresql"` | PostgreSQL 9.0+ |

## `dialects`

모든 dialect 목록 배열. 테스트에서 dialect별 검증에 사용한다.

```typescript
export const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];
```

## `IsolationLevel`

트랜잭션 격리 수준.

```typescript
export type IsolationLevel =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";
```

| 값 | 설명 |
|----|------|
| `READ_UNCOMMITTED` | 커밋되지 않은 데이터 읽기 가능 (Dirty Read) |
| `READ_COMMITTED` | 커밋된 데이터만 읽기 (기본값) |
| `REPEATABLE_READ` | 트랜잭션 내 동일 쿼리가 동일 결과 보장 |
| `SERIALIZABLE` | 완전 직렬화 (가장 엄격) |

## `DataRecord`

쿼리 결과 데이터 레코드 타입. 재귀적 구조로 중첩 관계(`include`) 결과를 표현한다.

```typescript
export type DataRecord = {
  [key: string]: ColumnPrimitive | DataRecord | DataRecord[];
};
```

## `DbContextExecutor`

실제 DB 연결과 쿼리 실행을 담당하는 인터페이스. `orm-node`의 `NodeDbContextExecutor` 또는 서비스 클라이언트 구현체가 이 인터페이스를 구현한다.

```typescript
export interface DbContextExecutor {
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}
```

| 메서드 | 설명 |
|--------|------|
| `connect()` | DB 연결 수립 |
| `close()` | DB 연결 종료 |
| `beginTransaction(isolationLevel?)` | 트랜잭션 시작 |
| `commitTransaction()` | 트랜잭션 커밋 |
| `rollbackTransaction()` | 트랜잭션 롤백 |
| `executeDefs(defs, resultMetas?)` | QueryDef 배열 실행, 결과 배열 반환 |

## `QueryBuildResult`

`QueryBuilderBase.build()` 반환 타입.

```typescript
export interface QueryBuildResult {
  sql: string;
  resultSetIndex?: number;
  resultSetStride?: number;
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `sql` | `string` | 빌드된 SQL 문자열 |
| `resultSetIndex` | `number \| undefined` | 결과를 가져올 결과 셋 인덱스. 기본값 0 |
| `resultSetStride` | `number \| undefined` | stride 간격으로 다중 결과 셋 수집. MySQL 배치 INSERT에 사용 |

## `ResultMeta`

SELECT 결과를 TypeScript 객체로 변환할 때 사용하는 메타데이터.

```typescript
export interface ResultMeta {
  columns: Record<string, ColumnPrimitiveStr>;
  joins: Record<string, { isSingle: boolean }>;
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `columns` | `Record<string, ColumnPrimitiveStr>` | 컬럼 이름 → 타입 이름 매핑 |
| `joins` | `Record<string, { isSingle: boolean }>` | JOIN 별칭 → 단일/배열 구분 |

## `Migration`

DB 마이그레이션 정의.

```typescript
export interface Migration {
  name: string;
  up: (db: DbContextBase & DbContextDdlMethods) => Promise<void>;
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | `string` | 고유 마이그레이션 이름. 타임스탬프 형식 권장 |
| `up` | `(db) => Promise<void>` | 마이그레이션 실행 함수 |

```typescript
const migrations: Migration[] = [
  {
    name: "20260105_001_create_user_table",
    up: async (db) => {
      await db.createTable(User);
    },
  },
];
```

## `pickResultSets`

다중 결과 셋에서 `QueryBuildResult` 메타데이터에 따라 필요한 결과만 추출한다. MySQL 배치 INSERT 후 OUTPUT 추출에 사용된다.

```typescript
export function pickResultSets<T>(
  rawResults: T[][],
  buildResult: Pick<QueryBuildResult, "resultSetIndex" | "resultSetStride">,
): T[];
```
