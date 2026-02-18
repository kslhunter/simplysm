import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { Table } from "../../src/schema/table-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import * as expected from "./insert.expected";

describe("INSERT - 기본", () => {
  //#region ========== 단일/다중 INSERT ==========

  describe("단일 레코드 INSERT", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .getInsertQueryDef([{ name: "홍길동", managerId: undefined, departmentId: 1 }]);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [{ name: "홍길동", managerId: undefined, departmentId: 1 }],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertSingle[dialect]);
    });
  });

  describe("다중 레코드 INSERT (bulk)", () => {
    const db = createTestDb();
    const def = db.employee().getInsertQueryDef([
      { name: "홍길동", departmentId: 1 },
      { name: "김철수", managerId: 1, departmentId: 1 },
      { name: "이영희", managerId: 1, departmentId: 2 },
    ]);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [
          { name: "홍길동", departmentId: 1 },
          { name: "김철수", managerId: 1, departmentId: 1 },
          { name: "이영희", managerId: 1, departmentId: 2 },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertBulk[dialect]);
    });
  });

  describe("output 컬럼 지정 (RETURNING/OUTPUT)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .getInsertQueryDef(
        [{ name: "홍길동", managerId: undefined, departmentId: 1 }],
        ["id", "name"],
      );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [{ name: "홍길동", managerId: undefined, departmentId: 1 }],
        output: {
          columns: ["id", "name"],
          pkColNames: ["id"],
          aiColName: "id",
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertWithOutput[dialect]);
    });
  });

  describe("nullable 컬럼 생략", () => {
    const db = createTestDb();
    const def = db.employee().getInsertQueryDef([{ name: "홍길동" }]);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [{ name: "홍길동" }],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertNullable[dialect]);
    });
  });

  describe("AI 컬럼 명시적 지정", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .getInsertQueryDef([{ id: 100, name: "홍길동", managerId: undefined, departmentId: 1 }]);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        records: [{ id: 100, name: "홍길동", managerId: undefined, departmentId: 1 }],
        overrideIdentity: true,
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertWithAi[dialect]);
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
      .where((e) => [expr.eq(e.name, "홍길동")])
      .getInsertIfNotExistsQueryDef({ name: "홍길동", departmentId: 1 });

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insertIfNotExists",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        record: { name: "홍길동", departmentId: 1 },
        existsSelectQuery: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "name"] },
              target: { type: "value", value: "홍길동" },
            },
          ],
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertIfNotExistsBasic[dialect]);
    });
  });

  describe("복합 조건으로 중복 체크", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.name, "홍길동"), expr.eq(e.departmentId, 1)])
      .getInsertIfNotExistsQueryDef({ name: "홍길동", departmentId: 1 });

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "insertIfNotExists",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        record: { name: "홍길동", departmentId: 1 },
        existsSelectQuery: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "name"] },
              target: { type: "value", value: "홍길동" },
            },
            {
              type: "eq",
              source: { type: "column", path: ["T1", "departmentId"] },
              target: { type: "value", value: 1 },
            },
          ],
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertIfNotExistsMultiple[dialect]);
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

  describe("기본: SELECT 결과를 다른 테이블에 INSERT", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertIntoSelect[dialect]);
    });
  });

  describe("WHERE 조건과 함께 INSERT INTO SELECT", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.departmentId, 1)])
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
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "departmentId"] },
              target: { type: "value", value: 1 },
            },
          ],
          select: {
            id: { type: "column", path: ["T1", "id"] },
            name: { type: "column", path: ["T1", "name"] },
          },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.insertIntoSelectWhere[dialect]);
    });
  });

  //#endregion
});
