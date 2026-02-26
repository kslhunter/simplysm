import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./upsert.expected";

describe("UPSERT - Basic", () => {
  describe("simple UPSERT (WHERE condition)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpsertQueryDef(
        () => ({ name: expr.val("string", "new name") }),
        (upd) => ({ name: upd.name, departmentId: expr.val("number", 1) }),
      );

    it("should validate QueryDef", () => {
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
          name: { type: "value", value: "new name" },
        },
        insertRecord: {
          name: { type: "value", value: "new name" },
          departmentId: { type: "value", value: 1 },
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertSimple[dialect]);
    });
  });

  describe("INSERT reusing UPDATE values", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpsertQueryDef(
        () => ({
          name: expr.val("string", "Gildong Hong"),
          departmentId: expr.val("number", 2),
        }),
        (upd) => ({
          ...upd,
          managerId: expr.val("number", 100),
        }),
      );

    it("Verify QueryDef", () => {
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
          name: { type: "value", value: "Gildong Hong" },
          departmentId: { type: "value", value: 2 },
        },
        insertRecord: {
          name: { type: "value", value: "Gildong Hong" },
          departmentId: { type: "value", value: 2 },
          managerId: { type: "value", value: 100 },
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertReuse[dialect]);
    });
  });

  describe("Specify output column", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpsertQueryDef(
        () => ({ name: expr.val("string", "New Name") }),
        (upd) => ({ name: upd.name }),
        ["id", "name"],
      );

    it("Verify QueryDef", () => {
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
          name: { type: "value", value: "New Name" },
        },
        insertRecord: {
          name: { type: "value", value: "New Name" },
        },
        output: {
          columns: ["id", "name"],
          pkColNames: ["id"],
          aiColName: "id",
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertWithOutput[dialect]);
    });
  });

  describe("Complex WHERE condition", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.name, "Gildong Hong"), expr.eq(e.departmentId, 1)])
      .getUpsertQueryDef(
        () => ({ managerId: expr.val("number", 10) }),
        (upd) => ({
          name: expr.val("string", "Gildong Hong"),
          departmentId: expr.val("number", 1),
          managerId: upd.managerId,
        }),
      );

    it("Verify QueryDef", () => {
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
              target: { type: "value", value: "Gildong Hong" },
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
          name: { type: "value", value: "Gildong Hong" },
          departmentId: { type: "value", value: 1 },
          managerId: { type: "value", value: 10 },
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertMultiWhere[dialect]);
    });
  });

  describe("UPSERT with literal values (without expr.val)", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpsertQueryDef(
        () => ({ name: "New Name" }),
        (upd) => ({ name: upd.name, departmentId: 1 }),
      );

    it("Verify QueryDef", () => {
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
          name: { type: "value", value: "New Name" },
        },
        insertRecord: {
          name: { type: "value", value: "New Name" },
          departmentId: { type: "value", value: 1 },
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upsertPlainValues[dialect]);
    });
  });
});
