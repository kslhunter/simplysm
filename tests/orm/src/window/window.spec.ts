import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDbConn, createOrm } from "@simplysm/orm-node";
import type { DbConn, Orm } from "@simplysm/orm-node";
import { expr } from "@simplysm/orm-common";
import { dbCases } from "../setup/db-helpers";
import type { DbTestCase } from "../setup/db-helpers";
import type { TestDb } from "../setup/test-db-context";

describe.each(dbCases)("$label Window 함수 통합 테스트", (dbCase: DbTestCase) => {
  let orm: Orm<TestDb>;

  beforeAll(async () => {
    const conn: DbConn = await createDbConn(dbCase.config);
    await conn.connect();
    await conn.execute(dbCase.setupSql);
    await conn.close();

    orm = createOrm(dbCase.TestDb, dbCase.config, dbCase.ormOptions);

    await orm.connectWithoutTransaction(async (db) => {
      await db.transaction(async () => {
        await db.employee().insert([
          { name: "Emp1", salary: 5000, departmentId: 1, managerId: undefined },
          { name: "Emp2", salary: 6000, departmentId: 1, managerId: 1 },
          { name: "Emp3", salary: 4500, departmentId: 2, managerId: undefined },
          { name: "Emp4", salary: 7000, departmentId: 2, managerId: 3 },
          { name: "Emp5", salary: 5500, departmentId: 1, managerId: 1 },
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

  it("ROW_NUMBER (파티션별 순번)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .select((e) => ({
          id: e.id,
          departmentId: e.departmentId,
          rowNum: expr.rowNumber({ partitionBy: [e.departmentId], orderBy: [[e.id, "ASC"]] }),
        }))
        .orderBy((e) => e.id)
        .execute();
      const dept1 = result.filter((r) => r.departmentId === 1);
      expect(dept1.map((r) => r.rowNum)).toEqual([1, 2, 3]);
      const dept2 = result.filter((r) => r.departmentId === 2);
      expect(dept2.map((r) => r.rowNum)).toEqual([1, 2]);
    });
  });

  it("RANK (동점 시 건너뛰기)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .select((e) => ({
          id: e.id,
          salary: e.salary,
          rank: expr.rank({ orderBy: [[e.salary, "DESC"]] }),
        }))
        .orderBy((e) => e.salary, "DESC")
        .execute();
      expect(result[0].rank).toBe(1); // Emp4 (7000)
      expect(result[1].rank).toBe(2); // Emp2 (6000)
    });
  });

  it("DENSE_RANK (동점 시 연속)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .select((e) => ({
          id: e.id,
          salary: e.salary,
          denseRank: expr.denseRank({ orderBy: [[e.salary, "DESC"]] }),
        }))
        .orderBy((e) => e.salary, "DESC")
        .execute();
      expect(result[0].denseRank).toBe(1);
      expect(result[1].denseRank).toBe(2);
    });
  });

  it("NTILE (4분위)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .select((e) => ({
          id: e.id,
          salary: e.salary,
          quartile: expr.ntile(2, { orderBy: [[e.salary, "ASC"]] }),
        }))
        .orderBy((e) => e.salary)
        .execute();
      // 5명을 2그룹: 앞 3명은 1, 뒤 2명은 2
      expect(result[0].quartile).toBe(1);
      expect(result[4].quartile).toBe(2);
    });
  });

  it("LAG (이전 행)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .where((e) => [expr.eq(e.departmentId, 1)])
        .select((e) => ({
          id: e.id,
          name: e.name,
          prevName: expr.lag(e.name, { orderBy: [[e.id, "ASC"]] }, { offset: 1 }),
        }))
        .orderBy((e) => e.id)
        .execute();
      expect(result[0].prevName).toBeNull();
      expect(result[1].prevName).toBe("Emp1");
      expect(result[2].prevName).toBe("Emp2");
    });
  });

  it("LEAD (다음 행)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .where((e) => [expr.eq(e.departmentId, 1)])
        .select((e) => ({
          id: e.id,
          name: e.name,
          nextName: expr.lead(e.name, { orderBy: [[e.id, "ASC"]] }, { offset: 1 }),
        }))
        .orderBy((e) => e.id)
        .execute();
      expect(result[0].nextName).toBe("Emp2");
      expect(result[2].nextName).toBeNull();
    });
  });

  it("LAG with default", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .where((e) => [expr.eq(e.departmentId, 1)])
        .select((e) => ({
          id: e.id,
          prevSalary: expr.lag(e.salary, { orderBy: [[e.id, "ASC"]] }, { offset: 1, default: 0 }),
        }))
        .orderBy((e) => e.id)
        .execute();
      expect(result[0].prevSalary).toBe(0); // default
      expect(result[1].prevSalary).toBe(5000); // Emp1's salary
    });
  });

  it("SUM OVER (누적 합)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .select((e) => ({
          id: e.id,
          departmentId: e.departmentId,
          runningTotal: expr.sumOver(e.salary, {
            partitionBy: [e.departmentId],
            orderBy: [[e.id, "ASC"]],
          }),
        }))
        .orderBy((e) => e.id)
        .execute();
      const dept1 = result.filter((r) => r.departmentId === 1);
      expect(dept1[0].runningTotal).toBe(5000);
      expect(dept1[1].runningTotal).toBe(11000);
      expect(dept1[2].runningTotal).toBe(16500);
    });
  });

  it("AVG OVER (파티션 평균)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .select((e) => ({
          id: e.id,
          departmentId: e.departmentId,
          avgSalary: expr.avgOver(e.salary, { partitionBy: [e.departmentId] }),
        }))
        .orderBy((e) => e.id)
        .execute();
      // dept 1 avg = (5000+6000+5500)/3 ≈ 5500
      const dept1 = result.filter((r) => r.departmentId === 1);
      for (const r of dept1) {
        expect(Math.round(r.avgSalary as number)).toBe(5500);
      }
    });
  });

  it("COUNT OVER (파티션 카운트)", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .select((e) => ({
          id: e.id,
          departmentId: e.departmentId,
          deptCount: expr.countOver({ partitionBy: [e.departmentId] }),
        }))
        .orderBy((e) => e.id)
        .execute();
      const dept1 = result.filter((r) => r.departmentId === 1);
      for (const r of dept1) {
        expect(r.deptCount).toBe(3);
      }
      const dept2 = result.filter((r) => r.departmentId === 2);
      for (const r of dept2) {
        expect(r.deptCount).toBe(2);
      }
    });
  });

  it("MIN OVER / MAX OVER", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .select((e) => ({
          id: e.id,
          departmentId: e.departmentId,
          minSalary: expr.minOver(e.salary, { partitionBy: [e.departmentId] }),
          maxSalary: expr.maxOver(e.salary, { partitionBy: [e.departmentId] }),
        }))
        .orderBy((e) => e.id)
        .execute();
      const dept1 = result.filter((r) => r.departmentId === 1);
      for (const r of dept1) {
        expect(r.minSalary).toBe(5000);
        expect(r.maxSalary).toBe(6000);
      }
    });
  });

  it("FIRST_VALUE / LAST_VALUE", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.employee()
        .select((e) => ({
          id: e.id,
          departmentId: e.departmentId,
          firstInDept: expr.firstValue(e.name, {
            partitionBy: [e.departmentId],
            orderBy: [[e.id, "ASC"]],
          }),
        }))
        .orderBy((e) => e.id)
        .execute();
      const dept1 = result.filter((r) => r.departmentId === 1);
      for (const r of dept1) {
        expect(r.firstInDept).toBe("Emp1");
      }
      const dept2 = result.filter((r) => r.departmentId === 2);
      for (const r of dept2) {
        expect(r.firstInDept).toBe("Emp3");
      }
    });
  });
});
