# Fix LATERAL JOIN Rendering in QueryBuilder - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sd-plan-dev to implement this plan task-by-task.

**Goal:** Fix renderJoin in all 3 dialect QueryBuilders to generate correct LATERAL subqueries instead of bare table names.

**Architecture:** When `needsLateral=true`, change `renderFrom(join.from)` → `renderFrom(join)` so the existing `"type" in from` path in `renderFrom` generates the full subquery. Fix ON clause to `ON TRUE`. Add JSDoc, unit tests, and integration tests.

**Tech Stack:** TypeScript, Vitest, Docker (for integration tests)

---

### Task 1: Fix renderJoin — PostgreSQL

**Files:**
- Modify: `packages/orm-common/src/query-builder/postgresql/postgresql-query-builder.ts:71-86`

**Step 1: Modify renderJoin**

Replace the entire `renderJoin` method (lines 71-86):

```typescript
  protected renderJoin(join: SelectQueryDefJoin): string {
    const alias = this.expr.wrap(join.as);

    // LATERAL JOIN 필요 여부 감지
    if (this.needsLateral(join)) {
      const from = this.renderFrom(join);
      return ` LEFT OUTER JOIN LATERAL ${from} AS ${alias} ON TRUE`;
    }

    // 일반 JOIN
    const from = this.renderFrom(join.from);
    const where =
      join.where != null && join.where.length > 0
        ? ` ON ${this.expr.renderWhere(join.where)}`
        : " ON TRUE";
    return ` LEFT OUTER JOIN ${from} AS ${alias}${where}`;
  }
```

Key changes:
- LATERAL path: `renderFrom(join)` instead of `renderFrom(join.from)` — generates full subquery
- LATERAL path: hardcode `ON TRUE` — WHERE is inside the subquery
- Normal path: unchanged

---

### Task 2: Fix renderJoin — MySQL

**Files:**
- Modify: `packages/orm-common/src/query-builder/mysql/mysql-query-builder.ts:75-90`

**Step 1: Modify renderJoin**

Replace the entire `renderJoin` method (lines 75-90):

```typescript
  protected renderJoin(join: SelectQueryDefJoin): string {
    const alias = this.expr.wrap(join.as);

    // LATERAL JOIN 필요 여부 감지
    if (this.needsLateral(join)) {
      const from = this.renderFrom(join);
      return ` LEFT OUTER JOIN LATERAL ${from} AS ${alias} ON TRUE`;
    }

    // 일반 JOIN
    const from = this.renderFrom(join.from);
    const where =
      join.where != null && join.where.length > 0
        ? ` ON ${this.expr.renderWhere(join.where)}`
        : " ON TRUE";
    return ` LEFT OUTER JOIN ${from} AS ${alias}${where}`;
  }
```

---

### Task 3: Fix renderJoin — MSSQL

**Files:**
- Modify: `packages/orm-common/src/query-builder/mssql/mssql-query-builder.ts:68-83`

**Step 1: Modify renderJoin**

Replace the entire `renderJoin` method (lines 68-83):

```typescript
  protected renderJoin(join: SelectQueryDefJoin): string {
    const alias = this.expr.wrap(join.as);

    // LATERAL JOIN 필요 여부 감지 → MSSQL은 OUTER APPLY 사용
    if (this.needsLateral(join)) {
      const from = this.renderFrom(join);
      return ` OUTER APPLY ${from} AS ${alias}`;
    }

    // 일반 JOIN
    const from = this.renderFrom(join.from);
    const where =
      join.where != null && join.where.length > 0
        ? ` ON ${this.expr.renderWhere(join.where)}`
        : " ON 1=1";
    return ` LEFT OUTER JOIN ${from} AS ${alias}${where}`;
  }
```

---

### Task 4: Enhance needsLateral JSDoc

**Files:**
- Modify: `packages/orm-common/src/query-builder/base/query-builder-base.ts:108-118`

**Step 1: Replace JSDoc**

Replace the JSDoc comment and method (lines 108-118):

```typescript
  /**
   * JOIN이 LATERAL/CROSS APPLY가 필요한지 감지
   *
   * 기본 JOIN 속성(type, from, as, where, isSingle)만 있으면 일반 JOIN으로 처리.
   * 그 외 속성이 있으면 서브쿼리가 필요하므로 LATERAL JOIN 사용:
   *
   * - select: 컬럼 가공/집계가 필요 (일반 JOIN은 테이블 전체를 참조)
   * - joins: 중첩 JOIN을 서브쿼리 내부에서 처리
   * - orderBy, top, limit: 정렬/제한을 서브쿼리 내부에서 적용
   * - groupBy, having: 집계를 서브쿼리 내부에서 수행
   * - distinct: 중복 제거를 서브쿼리 내부에서 적용
   * - from (배열): UNION ALL 패턴
   *
   * 주의: select와 joins는 중첩 join 시 자동 생성되므로 basicJoinProps에 포함하지 않음.
   * 사용자가 직접 .select()를 호출하지 않아도 내부 .joinSingle() 호출로 인해
   * select/joins가 추가될 수 있으며, 이 경우에도 서브쿼리가 필요함.
   */
  protected needsLateral(join: SelectQueryDefJoin): boolean {
    // from이 배열이면 무조건 LATERAL (UNION ALL 패턴)
    if (Array.isArray(join.from)) {
      return true;
    }

    // join 자체에 기본 JOIN 속성 외의 추가 속성이 있으면 LATERAL 필요
    const basicJoinProps = ["type", "from", "as", "where", "isSingle"];
    return Object.keys(join).some((key) => !basicJoinProps.includes(key));
  }
```

---

### Task 5: Unit tests — joinSingle + orderBy + top

**Files:**
- Modify: `packages/orm-common/tests/select/join.spec.ts`
- Modify: `packages/orm-common/tests/select/join.expected.ts`

**Step 1: Add test in join.spec.ts**

Add inside the `describe("SELECT - JOIN")` block, after the existing "joinSingle" describe:

```typescript
  describe("joinSingle + LATERAL (orderBy + top)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .joinSingle("latestPost", (qr, c) =>
        qr
          .from(Post)
          .where((item) => [expr.eq(item.userId, c.id)])
          .orderBy((item) => item.publishedAt, "DESC")
          .top(1),
      )
      .getSelectQueryDef();

    it("QueryDef 검증 - orderBy, top 포함", () => {
      const join = def.joins![0];
      expect(join.orderBy).toEqual([
        [{ type: "column", path: ["T1.latestPost", "publishedAt"] }, "DESC"],
      ]);
      expect(join.top).toBe(1);
      expect(join.isSingle).toBe(true);
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.joinSingleLateral[dialect]);
    });
  });
```

**Step 2: Add expected SQL in join.expected.ts**

Add `joinSingleLateral` export. The LATERAL subquery contains the full SELECT with WHERE, ORDER BY, and LIMIT/TOP:

```typescript
export const joinSingleLateral: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      \`T1\`.\`email\` AS \`email\`,
      \`T1\`.\`age\` AS \`age\`,
      \`T1\`.\`isActive\` AS \`isActive\`,
      \`T1\`.\`companyId\` AS \`companyId\`,
      \`T1\`.\`createdAt\` AS \`createdAt\`,
      \`T1.latestPost\`.\`id\` AS \`latestPost.id\`,
      \`T1.latestPost\`.\`userId\` AS \`latestPost.userId\`,
      \`T1.latestPost\`.\`title\` AS \`latestPost.title\`,
      \`T1.latestPost\`.\`content\` AS \`latestPost.content\`,
      \`T1.latestPost\`.\`viewCount\` AS \`latestPost.viewCount\`,
      \`T1.latestPost\`.\`publishedAt\` AS \`latestPost.publishedAt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    LEFT OUTER JOIN LATERAL (
      SELECT * FROM \`TestDb\`.\`Post\` AS \`T1.latestPost\`
      WHERE \`T1.latestPost\`.\`userId\` <=> \`T1\`.\`id\`
      ORDER BY \`T1.latestPost\`.\`publishedAt\` DESC
      LIMIT 1
    ) AS \`T1.latestPost\` ON TRUE
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      [T1].[email] AS [email],
      [T1].[age] AS [age],
      [T1].[isActive] AS [isActive],
      [T1].[companyId] AS [companyId],
      [T1].[createdAt] AS [createdAt],
      [T1.latestPost].[id] AS [latestPost.id],
      [T1.latestPost].[userId] AS [latestPost.userId],
      [T1.latestPost].[title] AS [latestPost.title],
      [T1.latestPost].[content] AS [latestPost.content],
      [T1.latestPost].[viewCount] AS [latestPost.viewCount],
      [T1.latestPost].[publishedAt] AS [latestPost.publishedAt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    OUTER APPLY (
      SELECT TOP 1 * FROM [TestDb].[TestSchema].[Post] AS [T1.latestPost]
      WHERE (([T1.latestPost].[userId] IS NULL AND [T1].[id] IS NULL) OR [T1.latestPost].[userId] = [T1].[id])
      ORDER BY [T1.latestPost].[publishedAt] DESC
    ) AS [T1.latestPost]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      "T1"."email" AS "email",
      "T1"."age" AS "age",
      "T1"."isActive" AS "isActive",
      "T1"."companyId" AS "companyId",
      "T1"."createdAt" AS "createdAt",
      "T1.latestPost"."id" AS "latestPost.id",
      "T1.latestPost"."userId" AS "latestPost.userId",
      "T1.latestPost"."title" AS "latestPost.title",
      "T1.latestPost"."content" AS "latestPost.content",
      "T1.latestPost"."viewCount" AS "latestPost.viewCount",
      "T1.latestPost"."publishedAt" AS "latestPost.publishedAt"
    FROM "TestSchema"."User" AS "T1"
    LEFT OUTER JOIN LATERAL (
      SELECT * FROM "TestSchema"."Post" AS "T1.latestPost"
      WHERE "T1.latestPost"."userId" IS NOT DISTINCT FROM "T1"."id"
      ORDER BY "T1.latestPost"."publishedAt" DESC
      LIMIT 1
    ) AS "T1.latestPost" ON TRUE
  `,
};
```

**Step 3: Run unit tests**

Run: `pnpm vitest packages/orm-common/tests/select/join.spec.ts --run --project=node`
Expected: All tests PASS including new LATERAL tests.

---

### Task 6: Unit tests — joinSingle + select (aggregation)

**Files:**
- Modify: `packages/orm-common/tests/select/join.spec.ts`
- Modify: `packages/orm-common/tests/select/join.expected.ts`

**Step 1: Add test in join.spec.ts**

```typescript
  describe("joinSingle + LATERAL (select 집계)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .joinSingle("postStats", (qr, c) =>
        qr
          .from(Post)
          .where((item) => [expr.eq(item.userId, c.id)])
          .select({ cnt: expr.count() }),
      )
      .getSelectQueryDef();

    it("QueryDef 검증 - select 포함", () => {
      const join = def.joins![0];
      expect(join.select).toBeDefined();
      expect(join.select!.cnt).toEqual({ type: "count" });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.joinSingleLateralAgg[dialect]);
    });
  });
```

**Step 2: Add expected SQL in join.expected.ts**

```typescript
export const joinSingleLateralAgg: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      \`T1\`.\`email\` AS \`email\`,
      \`T1\`.\`age\` AS \`age\`,
      \`T1\`.\`isActive\` AS \`isActive\`,
      \`T1\`.\`companyId\` AS \`companyId\`,
      \`T1\`.\`createdAt\` AS \`createdAt\`,
      \`T1.postStats\`.\`cnt\` AS \`postStats.cnt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    LEFT OUTER JOIN LATERAL (
      SELECT COUNT(*) AS \`cnt\`
      FROM \`TestDb\`.\`Post\` AS \`T1.postStats\`
      WHERE \`T1.postStats\`.\`userId\` <=> \`T1\`.\`id\`
    ) AS \`T1.postStats\` ON TRUE
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      [T1].[email] AS [email],
      [T1].[age] AS [age],
      [T1].[isActive] AS [isActive],
      [T1].[companyId] AS [companyId],
      [T1].[createdAt] AS [createdAt],
      [T1.postStats].[cnt] AS [postStats.cnt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    OUTER APPLY (
      SELECT COUNT(*) AS [cnt]
      FROM [TestDb].[TestSchema].[Post] AS [T1.postStats]
      WHERE (([T1.postStats].[userId] IS NULL AND [T1].[id] IS NULL) OR [T1.postStats].[userId] = [T1].[id])
    ) AS [T1.postStats]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      "T1"."email" AS "email",
      "T1"."age" AS "age",
      "T1"."isActive" AS "isActive",
      "T1"."companyId" AS "companyId",
      "T1"."createdAt" AS "createdAt",
      "T1.postStats"."cnt" AS "postStats.cnt"
    FROM "TestSchema"."User" AS "T1"
    LEFT OUTER JOIN LATERAL (
      SELECT COUNT(*) AS "cnt"
      FROM "TestSchema"."Post" AS "T1.postStats"
      WHERE "T1.postStats"."userId" IS NOT DISTINCT FROM "T1"."id"
    ) AS "T1.postStats" ON TRUE
  `,
};
```

**Step 3: Run unit tests**

Run: `pnpm vitest packages/orm-common/tests/select/join.spec.ts --run --project=node`
Expected: All tests PASS.

---

### Task 7: Unit tests — 다단계 joinSingle SQL 검증

**Files:**
- Modify: `packages/orm-common/tests/select/join.spec.ts`
- Modify: `packages/orm-common/tests/select/join.expected.ts`

**Step 1: Add SQL validation to existing test**

In the existing "다단계 join(Single)" describe block (around line 216), add `it.each(dialects)` after the QueryDef test:

```typescript
    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.joinSingleMultiLevel[dialect]);
    });
```

**Step 2: Add expected SQL in join.expected.ts**

The multi-level join has `select` and `joins` properties, so `needsLateral=true`. The outer join becomes a LATERAL subquery that itself contains a nested JOIN:

```typescript
export const joinSingleMultiLevel: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`userId\` AS \`userId\`,
      \`T1\`.\`title\` AS \`title\`,
      \`T1\`.\`content\` AS \`content\`,
      \`T1\`.\`viewCount\` AS \`viewCount\`,
      \`T1\`.\`publishedAt\` AS \`publishedAt\`,
      \`T1.user\`.\`id\` AS \`user.id\`,
      \`T1.user\`.\`name\` AS \`user.name\`,
      \`T1.user\`.\`email\` AS \`user.email\`,
      \`T1.user\`.\`age\` AS \`user.age\`,
      \`T1.user\`.\`isActive\` AS \`user.isActive\`,
      \`T1.user\`.\`companyId\` AS \`user.companyId\`,
      \`T1.user\`.\`createdAt\` AS \`user.createdAt\`,
      \`T1.user\`.\`company.id\` AS \`user.company.id\`,
      \`T1.user\`.\`company.name\` AS \`user.company.name\`,
      \`T1.user\`.\`company.foundedAt\` AS \`user.company.foundedAt\`
    FROM \`TestDb\`.\`Post\` AS \`T1\`
    LEFT OUTER JOIN LATERAL (
      SELECT
        \`T1.user\`.\`id\` AS \`id\`,
        \`T1.user\`.\`name\` AS \`name\`,
        \`T1.user\`.\`email\` AS \`email\`,
        \`T1.user\`.\`age\` AS \`age\`,
        \`T1.user\`.\`isActive\` AS \`isActive\`,
        \`T1.user\`.\`companyId\` AS \`companyId\`,
        \`T1.user\`.\`createdAt\` AS \`createdAt\`,
        \`T1.user.company\`.\`id\` AS \`company.id\`,
        \`T1.user.company\`.\`name\` AS \`company.name\`,
        \`T1.user.company\`.\`foundedAt\` AS \`company.foundedAt\`
      FROM \`TestDb\`.\`User\` AS \`T1.user\`
      LEFT OUTER JOIN \`TestDb\`.\`Company\` AS \`T1.user.company\`
        ON \`T1.user.company\`.\`id\` <=> \`T1.user\`.\`companyId\`
      WHERE \`T1.user\`.\`id\` <=> \`T1\`.\`userId\`
    ) AS \`T1.user\` ON TRUE
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[userId] AS [userId],
      [T1].[title] AS [title],
      [T1].[content] AS [content],
      [T1].[viewCount] AS [viewCount],
      [T1].[publishedAt] AS [publishedAt],
      [T1.user].[id] AS [user.id],
      [T1.user].[name] AS [user.name],
      [T1.user].[email] AS [user.email],
      [T1.user].[age] AS [user.age],
      [T1.user].[isActive] AS [user.isActive],
      [T1.user].[companyId] AS [user.companyId],
      [T1.user].[createdAt] AS [user.createdAt],
      [T1.user].[company.id] AS [user.company.id],
      [T1.user].[company.name] AS [user.company.name],
      [T1.user].[company.foundedAt] AS [user.company.foundedAt]
    FROM [TestDb].[TestSchema].[Post] AS [T1]
    OUTER APPLY (
      SELECT
        [T1.user].[id] AS [id],
        [T1.user].[name] AS [name],
        [T1.user].[email] AS [email],
        [T1.user].[age] AS [age],
        [T1.user].[isActive] AS [isActive],
        [T1.user].[companyId] AS [companyId],
        [T1.user].[createdAt] AS [createdAt],
        [T1.user.company].[id] AS [company.id],
        [T1.user.company].[name] AS [company.name],
        [T1.user.company].[foundedAt] AS [company.foundedAt]
      FROM [TestDb].[TestSchema].[User] AS [T1.user]
      LEFT OUTER JOIN [TestDb].[TestSchema].[Company] AS [T1.user.company]
        ON (([T1.user.company].[id] IS NULL AND [T1.user].[companyId] IS NULL) OR [T1.user.company].[id] = [T1.user].[companyId])
      WHERE (([T1.user].[id] IS NULL AND [T1].[userId] IS NULL) OR [T1.user].[id] = [T1].[userId])
    ) AS [T1.user]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."userId" AS "userId",
      "T1"."title" AS "title",
      "T1"."content" AS "content",
      "T1"."viewCount" AS "viewCount",
      "T1"."publishedAt" AS "publishedAt",
      "T1.user"."id" AS "user.id",
      "T1.user"."name" AS "user.name",
      "T1.user"."email" AS "user.email",
      "T1.user"."age" AS "user.age",
      "T1.user"."isActive" AS "user.isActive",
      "T1.user"."companyId" AS "user.companyId",
      "T1.user"."createdAt" AS "user.createdAt",
      "T1.user"."company.id" AS "user.company.id",
      "T1.user"."company.name" AS "user.company.name",
      "T1.user"."company.foundedAt" AS "user.company.foundedAt"
    FROM "TestSchema"."Post" AS "T1"
    LEFT OUTER JOIN LATERAL (
      SELECT
        "T1.user"."id" AS "id",
        "T1.user"."name" AS "name",
        "T1.user"."email" AS "email",
        "T1.user"."age" AS "age",
        "T1.user"."isActive" AS "isActive",
        "T1.user"."companyId" AS "companyId",
        "T1.user"."createdAt" AS "createdAt",
        "T1.user.company"."id" AS "company.id",
        "T1.user.company"."name" AS "company.name",
        "T1.user.company"."foundedAt" AS "company.foundedAt"
      FROM "TestSchema"."User" AS "T1.user"
      LEFT OUTER JOIN "TestSchema"."Company" AS "T1.user.company"
        ON "T1.user.company"."id" IS NOT DISTINCT FROM "T1.user"."companyId"
      WHERE "T1.user"."id" IS NOT DISTINCT FROM "T1"."userId"
    ) AS "T1.user" ON TRUE
  `,
};
```

**Step 3: Run all unit tests**

Run: `pnpm vitest packages/orm-common/tests/select/join.spec.ts --run --project=node`
Expected: All tests PASS.

---

### Task 8: Integration tests — 3 DBs

**Files:**
- Modify: `tests/orm/src/db-context/postgresql-db-context.spec.ts`
- Modify: `tests/orm/src/db-context/mysql-db-context.spec.ts`
- Modify: `tests/orm/src/db-context/mssql-db-context.spec.ts`

Each integration test file follows the same pattern. Add a LATERAL JOIN test alongside the existing transaction test. The test creates User + Post tables, inserts data, then runs `joinSingle` with `orderBy` + `top(1)` to verify the correct (latest) row is returned.

**Step 1: PostgreSQL integration test**

Add a new describe block in `postgresql-db-context.spec.ts`. Include additional table models (Post with FK to User), insert test data, and verify joinSingle + orderBy + top returns the correct row.

The test creates tables with raw SQL, uses `createDbContext` with a `defineDbContext` that includes both User and Post, then:
1. Inserts 2 users and 3 posts (2 posts for user1, 1 for user2)
2. Runs `db.user().joinSingle("latestPost", ...)` with `orderBy(publishedAt, "DESC").top(1)`
3. Asserts each user gets their latest post

**Step 2: MySQL integration test**

Same pattern adapted for MySQL syntax (backtick quoting, `TestDb.Post`).

**Step 3: MSSQL integration test**

Same pattern adapted for MSSQL syntax (`[TestDb].[dbo].[Post]`, `NVARCHAR`, `DATETIME2`).

**Step 4: Run integration tests**

Run: `pnpm vitest tests/orm --run --project=orm`
Expected: All tests PASS (requires Docker DBs running).

Note: Integration tests require Docker. If Docker DBs are not running, these tests will fail with connection errors — that's expected and OK for the plan. The unit tests (Tasks 5-7) fully validate SQL generation.
