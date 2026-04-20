import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDbConn, createOrm } from "@simplysm/orm-node";
import type { DbConn, Orm } from "@simplysm/orm-node";
import { expr, Queryable } from "@simplysm/orm-common";
import { dbCases } from "../setup/db-helpers";
import type { DbTestCase } from "../setup/db-helpers";
import type { TestDb } from "../setup/test-db-context";

describe.each(dbCases)("$label Subquery 통합 테스트", (dbCase: DbTestCase) => {
  let orm: Orm<TestDb>;

  beforeAll(async () => {
    const conn: DbConn = await createDbConn(dbCase.config);
    await conn.connect();
    await conn.execute(dbCase.setupSql);
    await conn.close();

    orm = createOrm(dbCase.TestDb, dbCase.config, dbCase.ormOptions);

    await orm.connectWithoutTransaction(async (db) => {
      await db.transaction(async () => {
        await db.company().insert([{ name: "CompanyA" }]);
      });
      await db.transaction(async () => {
        await db.user().insert([
          { name: "Alice", email: "alice@test.com", age: 30, isActive: true, companyId: 1 },
          { name: "Bob", email: "bob@test.com", age: 25, isActive: true, companyId: 1 },
          { name: "Charlie", email: undefined, age: 35, isActive: false, companyId: undefined },
        ]);
      });
      await db.transaction(async () => {
        await db.post().insert([
          { userId: 1, title: "Post A", content: "Content A", viewCount: 100 },
          { userId: 1, title: "Post B", content: undefined, viewCount: 50 },
          { userId: 2, title: "Post C", content: "Content C", viewCount: 200 },
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

  it("wrap 기본 (WHERE -> WRAP -> WHERE)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.isActive, true)])
        .wrap()
        .where((u) => [expr.gt(u.age, 28)])
        .execute();
      expect(result).toHaveLength(1); // Alice(30, active)
      expect(result[0].name).toBe("Alice");
    });
  });

  it("wrap + select", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .wrap()
        .select((u) => ({ id: u.id, name: u.name }))
        .execute();
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("name");
    });
  });

  it("select -> wrap", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .select((u) => ({ id: u.id, name: u.name }))
        .wrap()
        .execute();
      expect(result).toHaveLength(3);
    });
  });

  it("GROUP BY -> WRAP -> ORDER BY", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .select((u) => ({
          isActive: u.isActive,
          cnt: expr.count(u.id),
        }))
        .groupBy((u) => [u.isActive])
        .wrap()
        .orderBy((u) => u.cnt, "DESC")
        .execute();
      expect(result).toHaveLength(2);
      expect(result[0].cnt).toBeGreaterThanOrEqual(result[1].cnt);
    });
  });

  it("UNION 기본", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const qr1 = db.user().where((u) => [expr.eq(u.isActive, true)]);
      const qr2 = db.user().where((u) => [expr.gt(u.age, 30)]);
      const result = await Queryable.union(qr1, qr2).execute();
      // Active: Alice, Bob; Age>30: Charlie — UNION removes duplicates
      expect(result).toHaveLength(3);
    });
  });

  it("UNION -> WRAP -> ORDER BY + LIMIT", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const qr1 = db.user().where((u) => [expr.eq(u.isActive, true)]);
      const qr2 = db.user().where((u) => [expr.gt(u.age, 30)]);
      const result = await Queryable.union(qr1, qr2)
        .wrap()
        .orderBy((u) => u.id)
        .limit(0, 2)
        .execute();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });
  });

  it("스칼라 서브쿼리 (expr.subquery)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
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
      expect(result[0].postCount).toBe(2); // Alice
      expect(result[1].postCount).toBe(1); // Bob
      expect(result[2].postCount).toBe(0); // Charlie
    });
  });

  it("WHERE EXISTS", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.exists(db.post().where((p) => [expr.eq(p.userId, u.id)]))])
        .execute();
      expect(result).toHaveLength(2); // Alice, Bob
    });
  });

  it("WHERE IN subquery", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [
          expr.inQuery(u.id, db.post().select((p) => ({ userId: p.userId }))),
        ])
        .execute();
      expect(result).toHaveLength(2);
    });
  });
});
