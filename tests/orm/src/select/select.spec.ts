import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDbConn, createOrm } from "@simplysm/orm-node";
import type { DbConn, Orm } from "@simplysm/orm-node";
import { expr } from "@simplysm/orm-common";
import { dbCases } from "../setup/db-helpers";
import type { DbTestCase } from "../setup/db-helpers";
import type { TestDb } from "../setup/test-db-context";

describe.each(dbCases)("$label SELECT 통합 테스트", (dbCase: DbTestCase) => {
  let orm: Orm<TestDb>;

  beforeAll(async () => {
    // 테이블 생성
    const conn: DbConn = await createDbConn(dbCase.config);
    await conn.connect();
    await conn.execute(dbCase.setupSql);
    await conn.close();

    orm = createOrm(dbCase.TestDb, dbCase.config, dbCase.ormOptions);

    // Seed data
    await orm.connectWithoutTransaction(async (db) => {
      await db.transaction(async () => {
        await db.company().insert([{ name: "CompanyA" }, { name: "CompanyB" }]);
      });
      await db.transaction(async () => {
        await db.user().insert([
          { name: "Alice", email: "alice@test.com", age: 30, isActive: true, companyId: 1 },
          { name: "Bob", email: "bob@test.com", age: 25, isActive: true, companyId: 1 },
          { name: "Charlie", email: undefined, age: 35, isActive: false, companyId: 2 },
          { name: "David", email: "david@test.com", age: 20, isActive: true, companyId: undefined },
        ]);
      });
      await db.transaction(async () => {
        await db.post().insert([
          { userId: 1, title: "Hello World", content: "First post", viewCount: 100 },
          { userId: 1, title: "Second Post", content: undefined, viewCount: 50 },
          { userId: 2, title: "Bob's Post", content: "Bob writes", viewCount: 200 },
        ]);
      });
      await db.transaction(async () => {
        await db.employee().insert([
          { name: "Emp1", salary: 5000, departmentId: 1, managerId: undefined },
          { name: "Emp2", salary: 6000, departmentId: 1, managerId: 1 },
          { name: "Emp3", salary: 4500, departmentId: 2, managerId: undefined },
          { name: "Emp4", salary: 7000, departmentId: 2, managerId: 3 },
          { name: "Emp5", salary: 5500, departmentId: 1, managerId: 1 },
        ]);
      });
      await db.transaction(async () => {
        await db.sales().insert([
          { category: "Electronics", year: 2023, amount: 1000 },
          { category: "Electronics", year: 2024, amount: 1500 },
          { category: "Clothing", year: 2023, amount: 800 },
          { category: "Clothing", year: 2024, amount: 900 },
          { category: "Food", year: 2023, amount: 500 },
        ]);
      });
    });
  });

  afterAll(async () => {
    const conn = await createDbConn(dbCase.config);
    await conn.connect();
    await conn.execute(dbCase.cleanupSql);
    await conn.close();
  });

  // === SELECT 기본 ===

  it("전체 SELECT", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user().execute();
      expect(result).toHaveLength(4);
    });
  });

  it("컬럼 선택 (select)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .select((u) => ({ id: u.id, name: u.name }))
        .execute();
      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
    });
  });

  it("표현식 사용 (concat)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({ display: expr.concat(u.name, " <", u.email, ">") }))
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].display).toBe("Alice <alice@test.com>");
    });
  });

  it("집계 함수 (count, sum, min, max)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .select((u) => ({
          cnt: expr.count(u.id),
          totalAge: expr.sum(u.age),
          minAge: expr.min(u.age),
          maxAge: expr.max(u.age),
        }))
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].cnt).toBe(4);
      expect(result[0].totalAge).toBe(110); // 30+25+35+20
      expect(result[0].minAge).toBe(20);
      expect(result[0].maxAge).toBe(35);
    });
  });

  it("coalesce", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.eq(u.id, 3)]) // Charlie, email is undefined
        .select((u) => ({ email: expr.coalesce(u.email, "N/A") }))
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].email).toBe("N/A");
    });
  });

  it("DISTINCT", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .select((u) => ({ isActive: u.isActive }))
        .distinct()
        .execute();
      expect(result).toHaveLength(2); // true, false
    });
  });

  it("TOP", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user().top(2).execute();
      expect(result).toHaveLength(2);
    });
  });

  it("LIMIT + ORDER BY", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .orderBy((u) => u.id)
        .limit(1, 2)
        .execute();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(2); // skip 1, take 2
      expect(result[1].id).toBe(3);
    });
  });

  // === WHERE ===

  it("WHERE eq", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.eq(u.name, "Alice")])
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });
  });

  it("WHERE gt", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.gt(u.age, 25)])
        .execute();
      expect(result).toHaveLength(2); // Alice(30), Charlie(35)
    });
  });

  it("WHERE IS NULL", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.null(u.email)])
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Charlie");
    });
  });

  it("WHERE IS NOT NULL", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.not(expr.null(u.email))])
        .execute();
      expect(result).toHaveLength(3);
    });
  });

  it("WHERE IN", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.in(u.id, [1, 3])])
        .execute();
      expect(result).toHaveLength(2);
    });
  });

  it("WHERE LIKE", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.like(u.name, "A%")])
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });
  });

  it("WHERE AND (multiple conditions)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.eq(u.isActive, true), expr.gt(u.age, 25)])
        .execute();
      expect(result).toHaveLength(1); // Alice(30, active)
      expect(result[0].name).toBe("Alice");
    });
  });

  it("WHERE OR", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.or([expr.eq(u.age, 20), expr.eq(u.age, 35)])])
        .execute();
      expect(result).toHaveLength(2); // David(20), Charlie(35)
    });
  });

  it("WHERE BETWEEN", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.between(u.age, 25, 30)])
        .execute();
      expect(result).toHaveLength(2); // Alice(30), Bob(25)
    });
  });

  it("WHERE EXISTS (서브쿼리)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.exists(db.post().where((p) => [expr.eq(p.userId, u.id)]))])
        .execute();
      expect(result).toHaveLength(2); // Alice, Bob (have posts)
    });
  });

  it("WHERE IN subquery (inQuery)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [
          expr.inQuery(u.id, db.post().select((p) => ({ userId: p.userId }))),
        ])
        .execute();
      expect(result).toHaveLength(2); // Alice, Bob
    });
  });

  // === ORDER BY ===

  it("ORDER BY ASC", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .orderBy((u) => u.age)
        .execute();
      expect(result[0].age).toBe(20); // David
      expect(result[3].age).toBe(35); // Charlie
    });
  });

  it("ORDER BY DESC", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .orderBy((u) => u.age, "DESC")
        .execute();
      expect(result[0].age).toBe(35); // Charlie
      expect(result[3].age).toBe(20); // David
    });
  });

  it("다중 ORDER BY", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .orderBy((u) => u.isActive, "DESC")
        .orderBy((u) => u.age)
        .execute();
      // active users first (David 20, Bob 25, Alice 30), then inactive (Charlie 35)
      expect(result[0].name).toBe("David");
      expect(result[3].name).toBe("Charlie");
    });
  });

  // === GROUP BY ===

  it("GROUP BY + COUNT", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .select((u) => ({
          isActive: u.isActive,
          cnt: expr.count(u.id),
        }))
        .groupBy((u) => [u.isActive])
        .execute();
      expect(result).toHaveLength(2);
    });
  });

  it("GROUP BY + HAVING", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .sales()
        .select((s) => ({
          category: s.category,
          totalAmount: expr.sum(s.amount),
        }))
        .groupBy((s) => [s.category])
        .having((s) => [expr.gt(s.totalAmount, 1000)])
        .execute();
      // Electronics: 2500, Clothing: 1700, Food: 500
      expect(result).toHaveLength(2); // Electronics, Clothing
    });
  });

  // === JOIN ===

  it("join 기본 (1:N)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .join("posts", (qr, u) =>
          qr.from(dbCase.models.Post).where((p) => [expr.eq(p.userId, u.id)]),
        )
        .where((u) => [expr.eq(u.id, 1)])
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
      expect(result[0].posts).toHaveLength(2);
    });
  });

  it("joinSingle (N:1)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .post()
        .joinSingle("author", (qr, p) =>
          qr.from(dbCase.models.User).where((u) => [expr.eq(u.id, p.userId)]),
        )
        .execute();
      expect(result).toHaveLength(3);
      expect(result[0].author).toBeDefined();
      expect(result[0].author!.name).toBeDefined();
    });
  });

  it("include FK (N:1) — Post.user", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .post()
        .include((p) => p.user)
        .execute();
      expect(result).toHaveLength(3);
      expect(result[0].user).toBeDefined();
      expect(result[0].user!.name).toBeDefined();
    });
  });

  it("joinSingle FK (N:1) — User.company", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .joinSingle("company", (qr, u) =>
          qr.from(dbCase.models.Company).where((c) => [expr.eq(c.id, u.companyId)]),
        )
        .where((u) => [expr.eq(u.id, 1)])
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].company).toBeDefined();
      expect(result[0].company!.name).toBe("CompanyA");
    });
  });

  // === 다중 JOIN ===

  it("다중 join (posts + company)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .join("posts", (qr, u) =>
          qr.from(dbCase.models.Post).where((p) => [expr.eq(p.userId, u.id)]),
        )
        .joinSingle("company", (qr, u) =>
          qr.from(dbCase.models.Company).where((c) => [expr.eq(c.id, u.companyId)]),
        )
        .where((u) => [expr.eq(u.id, 1)])
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].company).toBeDefined();
      expect(result[0].company!.name).toBe("CompanyA");
      expect(result[0].posts).toHaveLength(2);
    });
  });

  it("다단계 joinSingle (Post -> User -> Company)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .post()
        .joinSingle("author", (qr, p) =>
          qr
            .from(dbCase.models.User)
            .joinSingle("company", (qr2, u) =>
              qr2.from(dbCase.models.Company).where((c) => [expr.eq(c.id, u.companyId)]),
            )
            .where((u) => [expr.eq(u.id, p.userId)]),
        )
        .orderBy((p) => p.id)
        .execute();
      expect(result).toHaveLength(3);
      // Alice's posts should have company
      expect(result[0].author!.company!.name).toBe("CompanyA");
    });
  });

  it("joinSingle + LATERAL (orderBy + top) — 최신 포스트 1건", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .joinSingle("latestPost", (qr, u) =>
          qr
            .from(dbCase.models.Post)
            .where((p) => [expr.eq(p.userId, u.id)])
            .orderBy((p) => p.id, "DESC")
            .top(1),
        )
        .where((u) => [expr.eq(u.id, 1)])
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].latestPost).toBeDefined();
      expect(result[0].latestPost!.title).toBe("Second Post"); // id DESC -> 2nd post
    });
  });

  it("joinSingle + LATERAL (select aggregation) — 포스트 수 카운트", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .joinSingle("postStats", (qr, u) =>
          qr
            .from(dbCase.models.Post)
            .where((p) => [expr.eq(p.userId, u.id)])
            .select(() => ({ cnt: expr.count() })),
        )
        .orderBy((u) => u.id)
        .execute();
      expect(result).toHaveLength(4);
      expect(result[0].postStats!.cnt).toBe(2); // Alice
      expect(result[1].postStats!.cnt).toBe(1); // Bob
      expect(result[2].postStats!.cnt).toBe(0); // Charlie
    });
  });

  it("include FK (N:1) + select 조합", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .post()
        .include((p) => p.user)
        .select((p) => ({
          title: p.title,
          userName: p.user!.name,
        }))
        .orderBy((p) => p.title)
        .execute();
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("title");
      expect(result[0]).toHaveProperty("userName");
      // "Bob's Post" -> Bob, "Hello World" -> Alice, "Second Post" -> Alice
    });
  });

  it("include FK (N:1) + where 조합", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .post()
        .include((p) => p.user)
        .where((p) => [expr.eq(p.user!.isActive, true)])
        .execute();
      // All 3 posts belong to active users (Alice, Bob)
      expect(result).toHaveLength(3);
    });
  });

  // === SUBQUERY (wrap, scalar subquery) ===

  it("wrap (서브쿼리)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .where((u) => [expr.eq(u.isActive, true)])
        .wrap()
        .where((u) => [expr.gt(u.age, 22)])
        .execute();
      // Active users with age > 22: Alice(30), Bob(25)
      expect(result).toHaveLength(2);
    });
  });

  it("스칼라 서브쿼리 (expr.subquery)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .user()
        .select((u) => ({
          id: u.id,
          name: u.name,
          postCount: expr.subquery(
            "number",
            db.post()
              .where((p) => [expr.eq(p.userId, u.id)])
              .select(() => ({ cnt: expr.count() })),
          ),
        }))
        .orderBy((u) => u.id)
        .execute();
      expect(result).toHaveLength(4);
      expect(result[0].postCount).toBe(2); // Alice
      expect(result[1].postCount).toBe(1); // Bob
      expect(result[2].postCount).toBe(0); // Charlie
      expect(result[3].postCount).toBe(0); // David
    });
  });

  // === WINDOW FUNCTIONS ===

  it("ROW_NUMBER", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .employee()
        .select((e) => ({
          id: e.id,
          name: e.name,
          departmentId: e.departmentId,
          rowNum: expr.rowNumber({
            partitionBy: [e.departmentId],
            orderBy: [[e.id, "ASC"]],
          }),
        }))
        .orderBy((e) => e.id)
        .execute();
      expect(result).toHaveLength(5);
      // dept 1: Emp1(1), Emp2(2), Emp5(3); dept 2: Emp3(1), Emp4(2)
      const dept1 = result.filter((r) => r.departmentId === 1);
      expect(dept1.map((r) => r.rowNum)).toEqual([1, 2, 3]);
      const dept2 = result.filter((r) => r.departmentId === 2);
      expect(dept2.map((r) => r.rowNum)).toEqual([1, 2]);
    });
  });

  it("SUM OVER (누적 합)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .employee()
        .select((e) => ({
          id: e.id,
          salary: e.salary,
          departmentId: e.departmentId,
          runningTotal: expr.sumOver(e.salary, {
            partitionBy: [e.departmentId],
            orderBy: [[e.id, "ASC"]],
          }),
        }))
        .orderBy((e) => e.id)
        .execute();
      // dept 1: 5000, 11000, 16500; dept 2: 4500, 11500
      const dept1 = result.filter((r) => r.departmentId === 1);
      expect(dept1[0].runningTotal).toBe(5000);
      expect(dept1[1].runningTotal).toBe(11000);
      expect(dept1[2].runningTotal).toBe(16500);
    });
  });

  it("LAG / LEAD", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .employee()
        .where((e) => [expr.eq(e.departmentId, 1)])
        .select((e) => ({
          id: e.id,
          name: e.name,
          prevName: expr.lag(e.name, { orderBy: [[e.id, "ASC"]] }, { offset: 1 }),
          nextName: expr.lead(e.name, { orderBy: [[e.id, "ASC"]] }, { offset: 1 }),
        }))
        .orderBy((e) => e.id)
        .execute();
      expect(result[0].prevName).toBeNull(); // first has no previous
      expect(result[0].nextName).toBe("Emp2");
      expect(result[1].prevName).toBe("Emp1");
    });
  });

  // === SEARCH ===

  it("search (단일 키워드, 단일 컬럼)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .post()
        .search((p) => [p.title], "Hello")
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Hello World");
    });
  });

  it("search (다중 컬럼)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db
        .post()
        .search((p) => [p.title, p.content], "Bob")
        .execute();
      expect(result).toHaveLength(1);
    });
  });
});
