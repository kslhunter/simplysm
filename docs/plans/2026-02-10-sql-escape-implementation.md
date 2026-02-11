# SQL 이스케이프 보안 강화 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** MySQL ExprRenderer의 문자열 이스케이프를 강화하여 SQL 인젝션 방지

**Architecture:**

- MySQL의 `escapeString()` 메서드에 백슬래시, NULL 바이트, 제어 문자 이스케이프 추가
- `escapeValue()`가 `escapeString()`을 재사용하도록 통일
- TDD 방식으로 먼저 테스트 작성 후 구현

**Tech Stack:** TypeScript, Vitest, MySQL 2

---

## Task 1: 이스케이프 단위 테스트 작성

**Files:**

- Create: `packages/orm-common/tests/escape.spec.ts`

**Step 1: 테스트 파일 뼈대 작성**

```typescript
import { describe, it, expect } from "vitest";
import { MysqlExprRenderer } from "../src/query-builder/mysql/mysql-expr-renderer";

describe("MysqlExprRenderer.escapeString", () => {
  const renderer = new MysqlExprRenderer();

  // 테스트 케이스들은 다음 단계에서 추가
});
```

**Step 2: 기본 이스케이프 테스트 작성**

```typescript
it("따옴표를 이스케이프해야 함", () => {
  const result = renderer.escapeString("O'Reilly");
  expect(result).toBe("O''Reilly");
});

it("백슬래시를 이스케이프해야 함", () => {
  const result = renderer.escapeString("C:\\path");
  expect(result).toBe("C:\\\\path");
});

it("NULL 바이트를 이스케이프해야 함", () => {
  const result = renderer.escapeString("admin\0--");
  expect(result).toBe("admin\\0--");
});
```

**Step 3: 제어 문자 이스케이프 테스트 작성**

```typescript
it("줄바꿈을 이스케이프해야 함", () => {
  const result = renderer.escapeString("line1\nline2");
  expect(result).toBe("line1\\nline2");
});

it("캐리지 리턴을 이스케이프해야 함", () => {
  const result = renderer.escapeString("line1\rline2");
  expect(result).toBe("line1\\rline2");
});

it("탭을 이스케이프해야 함", () => {
  const result = renderer.escapeString("col1\tcol2");
  expect(result).toBe("col1\\tcol2");
});
```

**Step 4: 조합 공격 테스트 작성**

```typescript
it("SQL 인젝션 시도를 방어해야 함", () => {
  const malicious = "'; DROP TABLE users; --";
  const result = renderer.escapeString(malicious);
  expect(result).toBe("''; DROP TABLE users; --");
});

it("백슬래시와 따옴표 조합을 방어해야 함", () => {
  const malicious = "\\'";
  const result = renderer.escapeString(malicious);
  expect(result).toBe("\\\\'");
});

it("NULL 바이트와 SQL 주석 조합을 방어해야 함", () => {
  const malicious = "admin\0-- ";
  const result = renderer.escapeString(malicious);
  expect(result).toBe("admin\\0-- ");
});
```

**Step 5: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/orm-common/tests/escape.spec.ts --project=node`

Expected: 모든 테스트 FAIL (escapeString이 강화되지 않았으므로)

**Step 6: 커밋**

```bash
git add packages/orm-common/tests/escape.spec.ts
git commit -m "test: MySQL escapeString 강화를 위한 테스트 작성

- 따옴표, 백슬래시, NULL 바이트 이스케이프 테스트
- 제어 문자(줄바꿈, 캐리지 리턴, 탭) 테스트
- SQL 인젝션 시도 방어 테스트

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: MySQL escapeString() 강화 구현

**Files:**

- Modify: `packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts:82-84`

**Step 1: escapeString() 메서드 강화**

현재 (82-84행):

```typescript
escapeString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}
```

수정 후:

```typescript
escapeString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")   // 백슬래시 (최우선)
    .replace(/'/g, "''")      // 따옴표
    .replace(/\0/g, "\\0")    // NULL 바이트
    .replace(/\n/g, "\\n")    // 줄바꿈
    .replace(/\r/g, "\\r")    // 캐리지 리턴
    .replace(/\t/g, "\\t");   // 탭
}
```

**Step 2: 테스트 실행하여 성공 확인**

Run: `pnpm vitest packages/orm-common/tests/escape.spec.ts --project=node`

Expected: 모든 테스트 PASS

**Step 3: 타입체크 및 린트**

Run: `pnpm typecheck packages/orm-common && pnpm lint packages/orm-common`

Expected: 에러 없음

**Step 4: 커밋**

```bash
git add packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts
git commit -m "feat(orm): MySQL escapeString 이스케이프 강화

- 백슬래시, NULL 바이트, 제어 문자 이스케이프 추가
- SQL 인젝션 방어 강화

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: escapeValue() 테스트 작성

**Files:**

- Modify: `packages/orm-common/tests/escape.spec.ts`

**Step 1: escapeValue() 테스트 추가**

```typescript
describe("MysqlExprRenderer.escapeValue", () => {
  const renderer = new MysqlExprRenderer();

  it("문자열을 escapeString()으로 이스케이프하고 따옴표로 감싸야 함", () => {
    const result = renderer.escapeValue("O'Reilly");
    expect(result).toBe("'O''Reilly'");
  });

  it("백슬래시가 포함된 문자열을 올바르게 이스케이프해야 함", () => {
    const result = renderer.escapeValue("C:\\path");
    expect(result).toBe("'C:\\\\path'");
  });

  it("SQL 인젝션 시도를 방어해야 함", () => {
    const result = renderer.escapeValue("'; DROP TABLE users; --");
    expect(result).toBe("'''; DROP TABLE users; --'");
  });

  it("NULL을 'NULL' 문자열로 반환해야 함", () => {
    const result = renderer.escapeValue(null);
    expect(result).toBe("NULL");
  });

  it("숫자를 문자열로 변환해야 함", () => {
    const result = renderer.escapeValue(123);
    expect(result).toBe("123");
  });

  it("불리언을 TRUE/FALSE로 변환해야 함", () => {
    expect(renderer.escapeValue(true)).toBe("TRUE");
    expect(renderer.escapeValue(false)).toBe("FALSE");
  });
});
```

**Step 2: 테스트 실행하여 실패 확인**

Run: `pnpm vitest packages/orm-common/tests/escape.spec.ts --project=node`

Expected: escapeValue 문자열 테스트들 FAIL (아직 escapeString 재사용 안 함)

**Step 3: 커밋**

```bash
git add packages/orm-common/tests/escape.spec.ts
git commit -m "test: MySQL escapeValue 통일을 위한 테스트 추가

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: escapeValue()가 escapeString() 재사용하도록 수정

**Files:**

- Modify: `packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts:87-116`

**Step 1: escapeValue() 수정**

현재 (92행):

```typescript
if (typeof value === "string") {
  return `'${value.replace(/'/g, "''")}'`;
}
```

수정 후:

```typescript
if (typeof value === "string") {
  return `'${this.escapeString(value)}'`;
}
```

**Step 2: 테스트 실행하여 성공 확인**

Run: `pnpm vitest packages/orm-common/tests/escape.spec.ts --project=node`

Expected: 모든 테스트 PASS

**Step 3: 타입체크 및 린트**

Run: `pnpm typecheck packages/orm-common && pnpm lint packages/orm-common`

Expected: 에러 없음

**Step 4: 커밋**

```bash
git add packages/orm-common/src/query-builder/mysql/mysql-expr-renderer.ts
git commit -m "refactor(orm): escapeValue가 escapeString 재사용하도록 통일

- 코드 중복 제거
- 일관된 이스케이프 동작 보장

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: ORM 통합 테스트 작성

**Files:**

- Create: `tests/orm/escape-integration.spec.ts`

**Step 1: 통합 테스트 파일 생성**

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DbContext } from "@simplysm/orm-common";
import { Table } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "@simplysm/orm-node";

const TestTable = Table("EscapeTest")
  .database("test")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    value: c.varchar(200),
  }))
  .primaryKey("id");

class TestDbContext extends DbContext {
  escapeTest = this.queryable(TestTable);
}

describe("SQL Escape Integration Test", () => {
  let db: TestDbContext;

  beforeAll(async () => {
    const executor = new NodeDbContextExecutor({
      dialect: "mysql",
      host: "localhost",
      port: 3306,
      username: "root",
      password: "1234",
      database: "test",
    });
    db = new TestDbContext(executor);

    await db.connectWithoutTransaction(async () => {
      await db.dropTable(TestTable);
      await db.createTable(TestTable);
    });
  });

  afterAll(async () => {
    await db.connectWithoutTransaction(async () => {
      await db.dropTable(TestTable);
    });
  });

  // 테스트 케이스는 다음 단계에서 추가
});
```

**Step 2: 이스케이프 통합 테스트 작성**

```typescript
it("따옴표가 포함된 값을 저장하고 조회할 수 있어야 함", async () => {
  const testValue = "O'Reilly";

  await db.connect(async () => {
    await db.escapeTest().insert([{ value: testValue }]);
    const result = await db.escapeTest().result();

    expect(result.length).toBe(1);
    expect(result[0].value).toBe(testValue);
  });
});

it("백슬래시가 포함된 값을 저장하고 조회할 수 있어야 함", async () => {
  const testValue = "C:\\path\\to\\file";

  await db.connect(async () => {
    await db.escapeTest().delete();
    await db.escapeTest().insert([{ value: testValue }]);
    const result = await db.escapeTest().result();

    expect(result.length).toBe(1);
    expect(result[0].value).toBe(testValue);
  });
});

it("제어 문자가 포함된 값을 저장하고 조회할 수 있어야 함", async () => {
  const testValue = "line1\nline2\ttab\rreturn";

  await db.connect(async () => {
    await db.escapeTest().delete();
    await db.escapeTest().insert([{ value: testValue }]);
    const result = await db.escapeTest().result();

    expect(result.length).toBe(1);
    expect(result[0].value).toBe(testValue);
  });
});

it("SQL 인젝션 시도를 안전하게 저장하고 조회할 수 있어야 함", async () => {
  const maliciousValue = "'; DROP TABLE users; --";

  await db.connect(async () => {
    await db.escapeTest().delete();
    await db.escapeTest().insert([{ value: maliciousValue }]);
    const result = await db.escapeTest().result();

    expect(result.length).toBe(1);
    expect(result[0].value).toBe(maliciousValue);
  });
});
```

**Step 3: 테스트 실행**

Run: `pnpm vitest tests/orm/escape-integration.spec.ts --project=orm`

Expected: 모든 테스트 PASS (MySQL Docker 컨테이너 필요)

**Step 4: 커밋**

```bash
git add tests/orm/escape-integration.spec.ts
git commit -m "test(orm): SQL 이스케이프 통합 테스트 추가

- 실제 MySQL DB에 이스케이프된 값 저장/조회 검증
- SQL 인젝션 시도 방어 확인

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: CLAUDE.md에 보안 가이드 추가

**Files:**

- Modify: `CLAUDE.md` (ORM 보안 가이드 섹션 추가)

**Step 1: CLAUDE.md 읽기**

Run: Read tool로 `CLAUDE.md` 파일 확인

**Step 2: 보안 가이드 섹션 추가**

적절한 위치(ORM 관련 섹션 근처)에 다음 내용 추가:

```markdown
## ORM 보안 가이드

### SQL 인젝션 방지

orm-common은 문자열 이스케이프 방식으로 SQL을 생성합니다.
다음 규칙을 준수하세요:

#### ✓ 안전한 사용

- 애플리케이션 코드에서 값 검증 후 ORM 사용
- 타입이 보장된 값 (number, boolean, DateTime 등)
- 신뢰할 수 있는 내부 데이터

#### ✗ 위험한 사용

- 사용자 입력을 검증 없이 WHERE 조건에 직접 사용
- 외부 API 응답을 검증 없이 사용
- 파일 업로드 내용을 검증 없이 사용

#### 권장 패턴

\`\`\`typescript
// 나쁜 예: 사용자 입력 직접 사용
const userInput = req.query.name; // "'; DROP TABLE users; --"
await db.user().where((u) => [expr.eq(u.name, userInput)]).result();

// 좋은 예: 검증 후 사용
const userName = validateUserName(req.query.name); // 검증 실패 시 예외
await db.user().where((u) => [expr.eq(u.name, userName)]).result();

// 더 좋은 예: 타입 강제
const userId = Number(req.query.id); // NaN 체크 필수
if (Number.isNaN(userId)) throw new Error("Invalid ID");
await db.user().where((u) => [expr.eq(u.id, userId)]).result();
\`\`\`

#### 기술적 제약

orm-common은 동적 쿼리 특성상 파라미터 바인딩을 사용하지 않습니다.
대신 강화된 문자열 이스케이프를 사용합니다:

- MySQL: 백슬래시, 따옴표, NULL 바이트, 제어 문자 이스케이프
- utf8mb4 charset 강제로 멀티바이트 공격 방어
- **애플리케이션 레벨 입력 검증 필수**
```

**Step 3: 커밋**

```bash
git add CLAUDE.md
git commit -m "docs: ORM 보안 가이드 추가

- SQL 인젝션 방지 규칙
- 안전한 사용 패턴 예시
- 기술적 제약 사항 명시

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: 전체 검증

**Step 1: 전체 테스트 실행**

Run: `pnpm vitest`

Expected: 모든 테스트 PASS

**Step 2: 전체 타입체크**

Run: `pnpm typecheck`

Expected: 에러 없음

**Step 3: 전체 린트**

Run: `pnpm lint`

Expected: 에러 없음

**Step 4: 빌드 확인**

Run: `pnpm build orm-common`

Expected: 빌드 성공

---

## 완료 조건

- ✓ MySQL escapeString() 강화 (백슬래시, NULL 바이트, 제어 문자)
- ✓ escapeValue()가 escapeString() 재사용
- ✓ 단위 테스트 작성 및 통과
- ✓ 통합 테스트 작성 및 통과 (MySQL)
- ✓ 보안 가이드 문서화 (CLAUDE.md)
- ✓ 전체 검증 (테스트, 타입체크, 린트, 빌드)

## 남은 작업 (별도 이슈)

다음 작업은 이 구현 계획 범위 밖:

- INSERT 청크 트랜잭션 보호 검증
- 마이그레이션 롤백 메커니즘
- WHERE 배열 AND 규칙 문서화
- 클래스/팩토리 사용 가이드
