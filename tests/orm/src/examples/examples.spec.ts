import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDbConn, createOrm } from "@simplysm/orm-node";
import type { DbConn, Orm } from "@simplysm/orm-node";
import { expr } from "@simplysm/orm-common";
import { dbCases } from "../setup/db-helpers";
import type { DbTestCase } from "../setup/db-helpers";
import type { TestDb } from "../setup/test-db-context";

describe.each(dbCases)("$label Examples 통합 테스트", (dbCase: DbTestCase) => {
  let orm: Orm<TestDb>;

  beforeAll(async () => {
    const conn: DbConn = await createDbConn(dbCase.config);
    await conn.connect();
    await conn.execute(dbCase.setupSql);
    await conn.close();

    orm = createOrm(dbCase.TestDb, dbCase.config, dbCase.ormOptions);

    await orm.connectWithoutTransaction(async (db) => {
      await db.transaction(async () => {
        await db.sales().insert([
          { category: "Electronics", year: 2023, amount: 1000 },
          { category: "Electronics", year: 2024, amount: 1500 },
          { category: "Clothing", year: 2023, amount: 800 },
          { category: "Clothing", year: 2024, amount: 900 },
          { category: "Food", year: 2023, amount: 500 },
        ]);
      });
      await db.transaction(async () => {
        await db.monthlySales().insert([
          { category: "A", jan: 100, feb: 200, mar: 300 },
          { category: "B", jan: 400, feb: 500, mar: 600 },
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

  //#region ========== PIVOT ==========

  it("PIVOT (연도별 합계)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.sales()
        .groupBy((s) => [s.category])
        .select((s) => ({
          category: s.category,
          y2023: expr.sum(expr.if(expr.eq(s.year, 2023), s.amount, undefined)),
          y2024: expr.sum(expr.if(expr.eq(s.year, 2024), s.amount, undefined)),
        }))
        .orderBy((s) => s.category)
        .execute();

      expect(result).toHaveLength(3);
      const clothing = result.find((r) => r.category === "Clothing");
      expect(clothing!.y2023).toBe(800);
      expect(clothing!.y2024).toBe(900);

      const electronics = result.find((r) => r.category === "Electronics");
      expect(electronics!.y2023).toBe(1000);
      expect(electronics!.y2024).toBe(1500);

      const food = result.find((r) => r.category === "Food");
      expect(food!.y2023).toBe(500);
      expect(food!.y2024).toBeNull(); // no 2024 data
    });
  });

  it("PIVOT (카테고리별 합계)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.sales()
        .groupBy((s) => [s.year])
        .select((s) => ({
          year: s.year,
          food: expr.sum(expr.if(expr.eq(s.category, "Food"), s.amount, undefined)),
          electronics: expr.sum(expr.if(expr.eq(s.category, "Electronics"), s.amount, undefined)),
        }))
        .orderBy((s) => s.year)
        .execute();

      expect(result).toHaveLength(2);
      expect(result[0].year).toBe(2023);
      expect(result[0].food).toBe(500);
      expect(result[0].electronics).toBe(1000);
      expect(result[1].year).toBe(2024);
      expect(result[1].food).toBeNull();
      expect(result[1].electronics).toBe(1500);
    });
  });

  //#endregion

  //#region ========== UNPIVOT ==========

  it("UNPIVOT (월별 데이터 풀기)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.monthlySales()
        .join("unpvt", (qr, c) =>
          qr.union(
            qr.select({ month: expr.val("string", "jan"), amount: c.jan }),
            qr.select({ month: expr.val("string", "feb"), amount: c.feb }),
            qr.select({ month: expr.val("string", "mar"), amount: c.mar }),
          ),
        )
        .select((item) => ({
          category: item.category,
          month: item.unpvt![0].month,
          amount: item.unpvt![0].amount,
        }))
        .orderBy((item) => item.category)
        .orderBy((item) => item.month)
        .execute();

      // 2 categories × 3 months = 6 rows
      expect(result).toHaveLength(6);

      const aRows = result.filter((r) => r.category === "A");
      expect(aRows).toHaveLength(3);
      const aFeb = aRows.find((r) => r.month === "feb");
      expect(aFeb!.amount).toBe(200);

      const bRows = result.filter((r) => r.category === "B");
      const bMar = bRows.find((r) => r.month === "mar");
      expect(bMar!.amount).toBe(600);
    });
  });

  //#endregion

  //#region ========== RECURSIVE CTE ==========

  it("재귀 CTE (부하직원 탐색)", async () => {
    // Employee 데이터 시드
    await orm.connectWithoutTransaction(async (db) => {
      await db.transaction(async () => {
        await db.employee().insert([
          { name: "CEO", salary: 10000, departmentId: 1, managerId: undefined },
          { name: "VP", salary: 8000, departmentId: 1, managerId: 1 },
          { name: "Manager", salary: 6000, departmentId: 1, managerId: 2 },
          { name: "Staff", salary: 4000, departmentId: 1, managerId: 3 },
        ]);
      });
    });

    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .where((e) => [expr.eq(e.managerId, 1)]) // VP (managerId=1)
        .select((e) => ({
          id: e.id,
          name: e.name,
          managerId: e.managerId,
          depth: expr.val("number", 1),
        }))
        .recursive((qr) =>
          qr
            .from(dbCase.models.Employee)
            .where((e) => [expr.eq(e.managerId, e.self![0].id)])
            .select((e) => ({
              id: e.id,
              name: e.name,
              managerId: e.managerId,
              depth: expr.raw("number")`${e.self![0].depth} + 1`.n,
            })),
        )
        .select((s) => ({
          id: s.id,
          name: s.name,
          depth: s.depth,
        }))
        .orderBy((s) => s.depth)
        .execute();

      // VP(depth 1) -> Manager(depth 2) -> Staff(depth 3)
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe("VP");
      expect(result[0].depth).toBe(1);
      expect(result[1].name).toBe("Manager");
      expect(result[1].depth).toBe(2);
      expect(result[2].name).toBe("Staff");
      expect(result[2].depth).toBe(3);
    });
  });

  //#endregion
});
