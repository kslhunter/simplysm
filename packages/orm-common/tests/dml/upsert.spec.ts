import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./upsert.expected";

describe("UPSERT - 기본", () => {
  describe("단순 UPSERT (WHERE 조건)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpsertQueryDef(
        () => ({ name: expr.val("string", "새이름") }),
        (upd) => ({ name: upd.name, departmentId: expr.val("number", 1) }),
      );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "upsert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        existsSelectQuery: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "id"] },
              target: { type: "value", value: 1 },
            },
          ],
        },
        updateRecord: {
          name: { type: "value", value: "새이름" },
        },
        insertRecord: {
          name: { type: "value", value: "새이름" },
          departmentId: { type: "value", value: 1 },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertSimple[dialect]);
    });
  });

  describe("UPDATE 값 재사용하여 INSERT", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpsertQueryDef(
        () => ({
          name: expr.val("string", "홍길동"),
          departmentId: expr.val("number", 2),
        }),
        (upd) => ({
          ...upd,
          managerId: expr.val("number", 100),
        }),
      );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "upsert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        existsSelectQuery: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "id"] },
              target: { type: "value", value: 1 },
            },
          ],
        },
        updateRecord: {
          name: { type: "value", value: "홍길동" },
          departmentId: { type: "value", value: 2 },
        },
        insertRecord: {
          name: { type: "value", value: "홍길동" },
          departmentId: { type: "value", value: 2 },
          managerId: { type: "value", value: 100 },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertReuse[dialect]);
    });
  });

  describe("output 컬럼 지정", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpsertQueryDef(
        () => ({ name: expr.val("string", "새이름") }),
        (upd) => ({ name: upd.name }),
        ["id", "name"],
      );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "upsert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        existsSelectQuery: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "id"] },
              target: { type: "value", value: 1 },
            },
          ],
        },
        updateRecord: {
          name: { type: "value", value: "새이름" },
        },
        insertRecord: {
          name: { type: "value", value: "새이름" },
        },
        output: {
          columns: ["id", "name"],
          pkColNames: ["id"],
          aiColName: "id",
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertWithOutput[dialect]);
    });
  });

  describe("복합 WHERE 조건", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.name, "홍길동"), expr.eq(e.departmentId, 1)])
      .getUpsertQueryDef(
        () => ({ managerId: expr.val("number", 10) }),
        (upd) => ({
          name: expr.val("string", "홍길동"),
          departmentId: expr.val("number", 1),
          managerId: upd.managerId,
        }),
      );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "upsert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
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
        updateRecord: {
          managerId: { type: "value", value: 10 },
        },
        insertRecord: {
          name: { type: "value", value: "홍길동" },
          departmentId: { type: "value", value: 1 },
          managerId: { type: "value", value: 10 },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertMultiWhere[dialect]);
    });
  });

  describe("일반 값으로 UPSERT (expr.val 없이)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpsertQueryDef(
        () => ({ name: "새이름" }),
        (upd) => ({ name: upd.name, departmentId: 1 }),
      );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "upsert",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        existsSelectQuery: {
          type: "select",
          as: "T1",
          from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
          where: [
            {
              type: "eq",
              source: { type: "column", path: ["T1", "id"] },
              target: { type: "value", value: 1 },
            },
          ],
        },
        updateRecord: {
          name: { type: "value", value: "새이름" },
        },
        insertRecord: {
          name: { type: "value", value: "새이름" },
          departmentId: { type: "value", value: 1 },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertPlainValues[dialect]);
    });
  });
});
