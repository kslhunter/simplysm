import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDbConn, createOrm } from "@simplysm/orm-node";
import type { DbConn, Orm } from "@simplysm/orm-node";
import { expr } from "@simplysm/orm-common";
import { dbCases } from "../setup/db-helpers";
import type { DbTestCase } from "../setup/db-helpers";
import type { TestDb } from "../setup/test-db-context";

describe.each(dbCases)("$label Expr 통합 테스트", (dbCase: DbTestCase) => {
  let orm: Orm<TestDb>;

  beforeAll(async () => {
    const conn: DbConn = await createDbConn(dbCase.config);
    await conn.connect();
    await conn.execute(dbCase.setupSql);
    await conn.close();

    orm = createOrm(dbCase.TestDb, dbCase.config, dbCase.ormOptions);

    await orm.connectWithoutTransaction(async (db) => {
      await db.transaction(async () => {
        await db.user().insert([
          { name: "Alice", email: "alice@test.com", age: 30, isActive: true, companyId: undefined },
          { name: "Bob", email: undefined, age: 25, isActive: false, companyId: undefined },
          { name: "Charlie", email: "charlie@test.com", age: 0, isActive: true, companyId: undefined },
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

  //#region ========== 문자열 함수 ==========

  it("concat", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({ full: expr.concat(u.name, " <", u.email, ">") }))
        .execute();
      expect(result[0].full).toBe("Alice <alice@test.com>");
    });
  });

  it("length", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({ len: expr.length(u.name) }))
        .execute();
      expect(result[0].len).toBe(5); // "Alice"
    });
  });

  it("upper / lower", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({
          up: expr.upper(u.name),
          low: expr.lower(u.name),
        }))
        .execute();
      expect(result[0].up).toBe("ALICE");
      expect(result[0].low).toBe("alice");
    });
  });

  it("trim", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({ trimmed: expr.trim(u.name) }))
        .execute();
      expect(result[0].trimmed).toBe("Alice");
    });
  });

  it("substring", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({ sub: expr.substring(u.name, 1, 3) }))
        .execute();
      expect(result[0].sub).toBe("Ali");
    });
  });

  it("left / right", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({
          l: expr.left(u.name, 2),
          r: expr.right(u.name, 3),
        }))
        .execute();
      expect(result[0].l).toBe("Al");
      expect(result[0].r).toBe("ice");
    });
  });

  it("replace", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({ replaced: expr.replace(u.name, "Ali", "X") }))
        .execute();
      expect(result[0].replaced).toBe("Xce");
    });
  });

  it("indexOf", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({ pos: expr.indexOf(u.email, "@") }))
        .execute();
      // indexOf는 0-based, "alice@test.com"에서 '@'는 index 5
      expect(result[0].pos).toBe(5);
    });
  });

  it("padStart", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({ padded: expr.padStart(u.name, 8, "*") }))
        .execute();
      expect(result[0].padded).toBe("***Alice");
    });
  });

  //#endregion

  //#region ========== 수학 함수 ==========

  it("abs", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 2)])
        .select((u) => ({ absAge: expr.abs(u.age) }))
        .execute();
      expect(result[0].absAge).toBe(25);
    });
  });

  it("round", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({ rounded: expr.round(u.age, 0) }))
        .execute();
      expect(result[0].rounded).toBe(30);
    });
  });

  //#endregion

  //#region ========== 조건 함수 ==========

  it("coalesce", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 2)]) // Bob, email is null
        .select((u) => ({ email: expr.coalesce(u.email, "N/A") }))
        .execute();
      expect(result[0].email).toBe("N/A");
    });
  });

  it("nullIf", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 3)]) // Charlie, age is 0
        .select((u) => ({ age: expr.nullIf(u.age, 0) }))
        .execute();
      expect(result[0].age).toBeNull();
    });
  });

  it("if (CASE WHEN)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .select((u) => ({
          id: u.id,
          status: expr.if(expr.eq(u.isActive, true), "Active", "Inactive"),
        }))
        .orderBy((u) => u.id)
        .execute();
      expect(result[0].status).toBe("Active"); // Alice
      expect(result[1].status).toBe("Inactive"); // Bob
    });
  });

  it("switch (CASE WHEN multi)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .select((u) => ({
          id: u.id,
          group: expr.switch()
            .case(expr.lt(u.age, 10), "Child")
            .case(expr.lt(u.age, 30), "Young")
            .default("Adult"),
        }))
        .orderBy((u) => u.id)
        .execute();
      expect(result[0].group).toBe("Adult"); // Alice, 30
      expect(result[1].group).toBe("Young"); // Bob, 25
      expect(result[2].group).toBe("Child"); // Charlie, 0
    });
  });

  it("greatest / least", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.eq(u.id, 1)])
        .select((u) => ({
          maxVal: expr.greatest(u.age, 18),
          minVal: expr.least(u.age, 18),
        }))
        .execute();
      expect(result[0].maxVal).toBe(30); // max(30, 18)
      expect(result[0].minVal).toBe(18); // min(30, 18)
    });
  });

  //#endregion

  //#region ========== 비교 연산 ==========

  it("eq / not eq", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const eq = await db.user().where((u) => [expr.eq(u.name, "Alice")]).execute();
      expect(eq).toHaveLength(1);

      const neq = await db.user().where((u) => [expr.not(expr.eq(u.name, "Alice"))]).execute();
      expect(neq).toHaveLength(2);
    });
  });

  it("gt / gte / lt / lte", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const gt = await db.user().where((u) => [expr.gt(u.age, 25)]).execute();
      expect(gt).toHaveLength(1); // Alice(30)

      const gte = await db.user().where((u) => [expr.gte(u.age, 25)]).execute();
      expect(gte).toHaveLength(2); // Alice(30), Bob(25)

      const lt = await db.user().where((u) => [expr.lt(u.age, 25)]).execute();
      expect(lt).toHaveLength(1); // Charlie(0)

      const lte = await db.user().where((u) => [expr.lte(u.age, 25)]).execute();
      expect(lte).toHaveLength(2); // Bob(25), Charlie(0)
    });
  });

  it("between", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user().where((u) => [expr.between(u.age, 10, 30)]).execute();
      expect(result).toHaveLength(2); // Alice(30), Bob(25)
    });
  });

  it("in / not in", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user().where((u) => [expr.in(u.id, [1, 3])]).execute();
      expect(result).toHaveLength(2);

      const notIn = await db.user().where((u) => [expr.not(expr.in(u.id, [1, 3]))]).execute();
      expect(notIn).toHaveLength(1);
    });
  });

  it("like / not like", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user().where((u) => [expr.like(u.name, "A%")]).execute();
      expect(result).toHaveLength(1);

      const notLike = await db.user().where((u) => [expr.not(expr.like(u.name, "A%"))]).execute();
      expect(notLike).toHaveLength(2);
    });
  });

  it("null / not null", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const isNull = await db.user().where((u) => [expr.null(u.email)]).execute();
      expect(isNull).toHaveLength(1); // Bob

      const notNull = await db.user().where((u) => [expr.not(expr.null(u.email))]).execute();
      expect(notNull).toHaveLength(2);
    });
  });

  it("or / and", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user()
        .where((u) => [expr.or([expr.eq(u.age, 30), expr.eq(u.age, 0)])])
        .execute();
      expect(result).toHaveLength(2); // Alice, Charlie

      const andResult = await db.user()
        .where((u) => [expr.and([expr.eq(u.isActive, true), expr.gt(u.age, 20)])])
        .execute();
      expect(andResult).toHaveLength(1); // Alice
    });
  });

  //#endregion
});
