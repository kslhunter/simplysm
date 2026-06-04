import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { Table } from "../../src/schema/table-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import * as expected from "./insert.expected";

describe("INSERT - 기본", () => {
  //#region ========== Single/Multiple INSERT ==========

  describe("single record INSERT", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .getInsertQueryDef([{ name: "Hong Gildong", managerId: undefined, departmentId: 1 }]);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [{ name: "Hong Gildong", managerId: undefined, departmentId: 1 }],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertSingle[dialect]);
    });
  });

  describe("multiple records INSERT (bulk)", () => {
    const db = createTestDb();
    const def = db.employee().getInsertQueryDef([
      { name: "Hong Gildong", departmentId: 1 },
      { name: "Kim Chulsu", managerId: 1, departmentId: 1 },
      { name: "Lee Younghee", managerId: 1, departmentId: 2 },
    ]);

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [
          { name: "Hong Gildong", departmentId: 1 },
          { name: "Kim Chulsu", managerId: 1, departmentId: 1 },
          { name: "Lee Younghee", managerId: 1, departmentId: 2 },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertBulk[dialect]);
    });
  });

  describe("output column specified (RETURNING/OUTPUT)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .getInsertQueryDef(
        [{ name: "Hong Gildong", managerId: undefined, departmentId: 1 }],
        ["id", "name"],
      );

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [{ name: "Hong Gildong", managerId: undefined, departmentId: 1 }],
        output: {
          columns: ["id", "name"],
          pkColNames: ["id"],
          aiColName: "id",
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertWithOutput[dialect]);
    });
  });

  describe("omit nullable column", () => {
    const db = createTestDb();
    const def = db.employee().getInsertQueryDef([{ name: "Hong Gildong" }]);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [{ name: "Hong Gildong" }],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertNullable[dialect]);
    });
  });

  describe("AI 컬럼 명시적 지정", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .getInsertQueryDef([{ id: 100, name: "Gildong Hong", managerId: undefined, departmentId: 1 }]);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [{ id: 100, name: "Gildong Hong", managerId: undefined, departmentId: 1 }],
        overrideIdentity: true,
        aiColName: "id",
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertWithAi[dialect]);
    });
  });

  describe("AI 컬럼 명시적 지정 + output", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .getInsertQueryDef(
        [{ id: 100, name: "Gildong Hong", managerId: undefined, departmentId: 1 }],
        ["id", "name"],
      );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [{ id: 100, name: "Gildong Hong", managerId: undefined, departmentId: 1 }],
        overrideIdentity: true,
        aiColName: "id",
        output: {
          columns: ["id", "name"],
          pkColNames: ["id"],
          aiColName: "id",
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertWithAiAndOutput[dialect]);
    });
  });

  //#endregion
});

describe("INSERT IF NOT EXISTS", () => {
  //#region ========== INSERT IF NOT EXISTS ==========

  describe("기본: WHERE NOT EXISTS로 중복 방지", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.name, "Gildong Hong")])
      .getInsertIfNotExistsQueryDef({ name: "Gildong Hong", departmentId: 1 });

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insertIfNotExists",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        record: { name: "Gildong Hong", departmentId: 1 },
        existsSelectQuery: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "name"] },
              target: { type: "value", value: "Gildong Hong" },
            },
          ],
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertIfNotExistsBasic[dialect]);
    });
  });

  //#endregion
});

describe("INSERT INTO ... SELECT", () => {
  const EmployeeBackup = Table("EmployeeBackup")
    .columns((c) => ({
      id: c.bigint(),
      name: c.varchar(100),
    }))
    .primaryKey("id");

  //#region ========== INSERT INTO SELECT ==========

  describe("기본: INSERT SELECT 결과를 다른 테이블로", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .select((e) => ({
        id: e.id,
        name: e.name,
      }))
      .getInsertIntoQueryDef(EmployeeBackup);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insertInto",
        table: { database: "TestDb", schema: "TestSchema", name: "EmployeeBackup" },
        recordsSelectQuery: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
          select: {
            id: { type: "column", path: ["T1", "id"] },
            name: { type: "column", path: ["T1", "name"] },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertIntoSelect[dialect]);
    });
  });

  //#endregion
});
