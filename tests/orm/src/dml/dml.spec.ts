import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createDbConn, createOrm } from "@simplysm/orm-node";
import type { DbConn, DbConnConfig } from "@simplysm/orm-node";
import type { Orm } from "@simplysm/orm-node";
import { Table, DbContext, expr } from "@simplysm/orm-common";
import { mssqlConfig, mysqlConfig, postgresqlConfig } from "../test-configs";

//#region ========== Table Definitions ==========

const DmlEmployee = {
  mssql: Table("DmlEmployee")
    .database("TestDb")
    .schema("dbo")
    .columns((c) => ({
      id: c.int().autoIncrement(),
      name: c.varchar(100),
      departmentId: c.int().nullable(),
      salary: c.int().nullable(),
    }))
    .primaryKey("id"),

  mysql: Table("DmlEmployee")
    .database("TestDb")
    .columns((c) => ({
      id: c.int().autoIncrement(),
      name: c.varchar(100),
      departmentId: c.int().nullable(),
      salary: c.int().nullable(),
    }))
    .primaryKey("id"),

  postgresql: Table("DmlEmployee")
    .database("TestDb")
    .schema("public")
    .columns((c) => ({
      id: c.int().autoIncrement(),
      name: c.varchar(100),
      departmentId: c.int().nullable(),
      salary: c.int().nullable(),
    }))
    .primaryKey("id"),
};

//#endregion

//#region ========== DB Cases ==========

const dbCases = [
  {
    label: "MSSQL",
    config: mssqlConfig as DbConnConfig,
    table: DmlEmployee.mssql,
    ormOptions: { database: "TestDb", schema: "dbo" } as const,
    setupSql: [
      `IF OBJECT_ID('[TestDb].[dbo].[DmlEmployee]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[DmlEmployee]`,
      `CREATE TABLE [TestDb].[dbo].[DmlEmployee] (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        departmentId INT NULL,
        salary INT NULL
      )`,
    ],
    cleanupSql: [
      `IF OBJECT_ID('[TestDb].[dbo].[DmlEmployee]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[DmlEmployee]`,
    ],
    resetSql: [
      `DELETE FROM [TestDb].[dbo].[DmlEmployee]`,
      `DBCC CHECKIDENT ('[TestDb].[dbo].[DmlEmployee]', RESEED, 0)`,
    ],
  },
  {
    label: "MySQL",
    config: mysqlConfig as DbConnConfig,
    table: DmlEmployee.mysql,
    ormOptions: { database: "TestDb" } as const,
    setupSql: [
      "DROP TABLE IF EXISTS `TestDb`.`DmlEmployee`",
      `CREATE TABLE \`TestDb\`.\`DmlEmployee\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        departmentId INT NULL,
        salary INT NULL
      )`,
    ],
    cleanupSql: ["DROP TABLE IF EXISTS `TestDb`.`DmlEmployee`"],
    resetSql: [
      "DELETE FROM `TestDb`.`DmlEmployee`",
      "ALTER TABLE `TestDb`.`DmlEmployee` AUTO_INCREMENT = 1",
    ],
  },
  {
    label: "PostgreSQL",
    config: postgresqlConfig as DbConnConfig,
    table: DmlEmployee.postgresql,
    ormOptions: { database: "TestDb", schema: "public" } as const,
    setupSql: [
      `DROP TABLE IF EXISTS "DmlEmployee"`,
      `CREATE TABLE "DmlEmployee" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        "departmentId" INT NULL,
        salary INT NULL
      )`,
    ],
    cleanupSql: [`DROP TABLE IF EXISTS "DmlEmployee"`],
    resetSql: [
      `DELETE FROM "DmlEmployee"`,
      `ALTER SEQUENCE "DmlEmployee_id_seq" RESTART WITH 1`,
    ],
  },
];

//#endregion

describe.each(dbCases)("$label DML", (dbCase) => {
  class TestDb extends DbContext {
    employee = this.queryable(dbCase.table);
  }

  let orm: Orm<TestDb>;
  let setupConn: DbConn;

  beforeAll(async () => {
    setupConn = await createDbConn(dbCase.config);
    await setupConn.connect();
    await setupConn.execute(dbCase.setupSql);
    await setupConn.close();

    orm = createOrm(TestDb, dbCase.config, dbCase.ormOptions);
  });

  afterAll(async () => {
    const cleanupConn = await createDbConn(dbCase.config);
    await cleanupConn.connect();
    await cleanupConn.execute(dbCase.cleanupSql);
    await cleanupConn.close();
  });

  //#region ========== Helper ==========

  async function resetTable(): Promise<void> {
    const conn = await createDbConn(dbCase.config);
    await conn.connect();
    await conn.execute(dbCase.resetSql);
    await conn.close();
  }

  //#endregion

  //#region ========== INSERT ==========

  describe("INSERT", () => {
    beforeAll(async () => {
      await resetTable();
    });

    it("single record INSERT + SELECT", async () => {
      await orm.connect(async (db) => {
        await db.employee().insert([{ name: "Alice", departmentId: 1, salary: 50000 }]);

        const result = await db.employee().execute();
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Alice");
        expect(result[0].departmentId).toBe(1);
        expect(result[0].salary).toBe(50000);
      });
    });

    it("multiple records INSERT", async () => {
      await resetTable();

      await orm.connect(async (db) => {
        await db.employee().insert([
          { name: "Bob", departmentId: 1, salary: 60000 },
          { name: "Charlie", departmentId: 2, salary: 70000 },
          { name: "Diana", departmentId: 2, salary: 80000 },
        ]);

        const result = await db
          .employee()
          .orderBy((e) => e.name)
          .execute();
        expect(result).toHaveLength(3);
        expect(result[0].name).toBe("Bob");
        expect(result[1].name).toBe("Charlie");
        expect(result[2].name).toBe("Diana");
      });
    });

    it("nullable column omitted INSERT", async () => {
      await resetTable();

      await orm.connect(async (db) => {
        await db.employee().insert([{ name: "Eve" }]);

        const result = await db.employee().execute();
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe("Eve");
        expect(result[0].departmentId).toBeNull();
        expect(result[0].salary).toBeNull();
      });
    });

    it("INSERT with output (return generated id)", async () => {
      await resetTable();

      await orm.connect(async (db) => {
        const inserted = await db
          .employee()
          .insert([{ name: "Frank", departmentId: 1 }], ["id", "name"]);

        expect(inserted).toHaveLength(1);
        expect(inserted[0].id).toBeGreaterThan(0);
        expect(inserted[0].name).toBe("Frank");
      });
    });

    it("multiple INSERT with output", async () => {
      await resetTable();

      await orm.connect(async (db) => {
        const inserted = await db.employee().insert(
          [
            { name: "Grace", departmentId: 1 },
            { name: "Heidi", departmentId: 2 },
          ],
          ["id", "name"],
        );

        expect(inserted).toHaveLength(2);
        expect(inserted[0].name).toBe("Grace");
        expect(inserted[1].name).toBe("Heidi");
        expect(inserted[1].id).toBeGreaterThan(inserted[0].id);
      });
    });
  });

  //#endregion

  //#region ========== UPDATE ==========

  describe("UPDATE", () => {
    beforeAll(async () => {
      await resetTable();

      await orm.connect(async (db) => {
        await db.employee().insert([
          { name: "Alice", departmentId: 1, salary: 50000 },
          { name: "Bob", departmentId: 1, salary: 60000 },
          { name: "Charlie", departmentId: 2, salary: 70000 },
        ]);
      });
    });

    it("simple UPDATE with WHERE", async () => {
      await orm.connect(async (db) => {
        await db
          .employee()
          .where((e) => [expr.eq(e.name, "Alice")])
          .update(() => ({
            salary: expr.val("number", 55000),
          }));

        const result = await db
          .employee()
          .where((e) => [expr.eq(e.name, "Alice")])
          .single();
        expect(result).toBeDefined();
        expect(result!.salary).toBe(55000);
      });
    });

    it("UPDATE with literal value", async () => {
      await orm.connect(async (db) => {
        await db
          .employee()
          .where((e) => [expr.eq(e.name, "Bob")])
          .update(() => ({
            departmentId: 3,
            salary: 65000,
          }));

        const result = await db
          .employee()
          .where((e) => [expr.eq(e.name, "Bob")])
          .single();
        expect(result).toBeDefined();
        expect(result!.departmentId).toBe(3);
        expect(result!.salary).toBe(65000);
      });
    });

    it("UPDATE all rows (no WHERE)", async () => {
      await orm.connect(async (db) => {
        await db.employee().update(() => ({
          departmentId: 99,
        }));

        const result = await db.employee().execute();
        for (const row of result) {
          expect(row.departmentId).toBe(99);
        }
      });
    });

    it("UPDATE result verification via SELECT", async () => {
      await orm.connect(async (db) => {
        // Reset departmentId first
        await db.employee().update(() => ({
          departmentId: 1,
        }));

        await db
          .employee()
          .where((e) => [expr.eq(e.name, "Charlie")])
          .update(() => ({
            name: expr.val("string", "Charles"),
            departmentId: 5,
          }));

        const all = await db.employee().execute();
        const charles = all.find((r) => r.name === "Charles");
        expect(charles).toBeDefined();
        expect(charles!.departmentId).toBe(5);

        const charlie = all.find((r) => r.name === "Charlie");
        expect(charlie).toBeUndefined();
      });
    });
  });

  //#endregion

  //#region ========== DELETE ==========

  describe("DELETE", () => {
    beforeAll(async () => {
      await resetTable();

      await orm.connect(async (db) => {
        await db.employee().insert([
          { name: "Alice", departmentId: 1, salary: 50000 },
          { name: "Bob", departmentId: 1, salary: 60000 },
          { name: "Charlie", departmentId: 2, salary: 70000 },
        ]);
      });
    });

    it("DELETE with WHERE condition", async () => {
      await orm.connect(async (db) => {
        await db
          .employee()
          .where((e) => [expr.eq(e.name, "Alice")])
          .delete();

        const result = await db.employee().execute();
        expect(result).toHaveLength(2);
        expect(result.some((r) => r.name === "Alice")).toBe(false);
      });
    });

    it("DELETE and verify with SELECT", async () => {
      await orm.connect(async (db) => {
        const beforeCount = await db.employee().count();
        expect(beforeCount).toBe(2);

        await db
          .employee()
          .where((e) => [expr.eq(e.name, "Bob")])
          .delete();

        const afterCount = await db.employee().count();
        expect(afterCount).toBe(1);

        const remaining = await db.employee().execute();
        expect(remaining[0].name).toBe("Charlie");
      });
    });

    it("DELETE all rows", async () => {
      // Re-insert data for this test
      await orm.connect(async (db) => {
        await db.employee().insert([
          { name: "Temp1" },
          { name: "Temp2" },
        ]);
      });

      await orm.connect(async (db) => {
        // Delete all remaining rows one by one via a broad WHERE
        const all = await db.employee().execute();
        for (const row of all) {
          await db
            .employee()
            .where((e) => [expr.eq(e.id, row.id)])
            .delete();
        }

        const result = await db.employee().execute();
        expect(result).toHaveLength(0);
      });
    });
  });

  //#endregion

  //#region ========== UPSERT ==========

  describe("UPSERT", () => {
    beforeAll(async () => {
      await resetTable();
    });

    it("UPSERT inserts when record does not exist", async () => {
      await resetTable();

      await orm.connect(async (db) => {
        await db
          .employee()
          .where((e) => [expr.eq(e.name, "NewPerson")])
          .upsert(
            () => ({
              name: expr.val("string", "NewPerson"),
              departmentId: expr.val("number", 1),
              salary: expr.val("number", 40000),
            }),
            (upd) => ({
              name: upd.name,
              departmentId: upd.departmentId,
              salary: upd.salary,
            }),
          );

        const result = await db
          .employee()
          .where((e) => [expr.eq(e.name, "NewPerson")])
          .single();
        expect(result).toBeDefined();
        expect(result!.name).toBe("NewPerson");
        expect(result!.departmentId).toBe(1);
        expect(result!.salary).toBe(40000);
      });
    });

    it("UPSERT updates when record exists", async () => {
      // NewPerson was inserted in the previous test
      await orm.connect(async (db) => {
        await db
          .employee()
          .where((e) => [expr.eq(e.name, "NewPerson")])
          .upsert(
            () => ({
              salary: expr.val("number", 45000),
            }),
            (upd) => ({
              name: expr.val("string", "NewPerson"),
              salary: upd.salary,
            }),
          );

        const result = await db
          .employee()
          .where((e) => [expr.eq(e.name, "NewPerson")])
          .single();
        expect(result).toBeDefined();
        expect(result!.salary).toBe(45000);
      });
    });

    it("UPSERT with different update and insert data", async () => {
      await resetTable();

      // First call: INSERT (record does not exist)
      await orm.connect(async (db) => {
        await db
          .employee()
          .where((e) => [expr.eq(e.name, "UpsertTest")])
          .upsert(
            () => ({
              salary: expr.val("number", 99999),
            }),
            (upd) => ({
              name: expr.val("string", "UpsertTest"),
              departmentId: expr.val("number", 10),
              salary: upd.salary,
            }),
          );

        const inserted = await db
          .employee()
          .where((e) => [expr.eq(e.name, "UpsertTest")])
          .single();
        expect(inserted).toBeDefined();
        expect(inserted!.departmentId).toBe(10);
        expect(inserted!.salary).toBe(99999);
      });

      // Second call: UPDATE (record exists)
      await orm.connect(async (db) => {
        await db
          .employee()
          .where((e) => [expr.eq(e.name, "UpsertTest")])
          .upsert(
            () => ({
              salary: expr.val("number", 88888),
            }),
            (upd) => ({
              name: expr.val("string", "UpsertTest"),
              departmentId: expr.val("number", 20),
              salary: upd.salary,
            }),
          );

        const updated = await db
          .employee()
          .where((e) => [expr.eq(e.name, "UpsertTest")])
          .single();
        expect(updated).toBeDefined();
        // UPDATE only changes salary, departmentId should remain 10
        expect(updated!.departmentId).toBe(10);
        expect(updated!.salary).toBe(88888);
      });
    });
  });

  //#endregion
});
