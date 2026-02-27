import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./update.expected";

describe("UPDATE - Basic", () => {
  describe("simple UPDATE", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef((_e) => ({
        name: expr.val("string", "new name"),
      }));

    it("should validate QueryDef", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "new name" },
        },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateSimple[dialect]);
    });
  });

  describe("UPDATE multiple columns", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef(() => ({
        name: expr.val("string", "New Name"),
        departmentId: expr.val("number", 2),
      }));

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "New Name" },
          departmentId: { type: "value", value: 2 },
        },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateMultiCol[dialect]);
    });
  });

  describe("UPDATE with literal values (without expr.val)", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef(() => ({
        name: "New Name",
        departmentId: 2,
      }));

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "New Name" },
          departmentId: { type: "value", value: 2 },
        },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updatePlainValues[dialect]);
    });
  });

  describe("UPDATE mixing literal values and expressions", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef((e) => ({
        name: "New Name",
        managerId: expr.raw("number")`${e.managerId} + 1`,
      }));

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "New Name" },
          managerId: {
            type: "raw",
            sql: "$1 + 1",
            params: [{ type: "column", path: ["T1", "managerId"] }],
          },
        },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateMixed[dialect]);
    });
  });

  describe("UPDATE referencing current values (e.g., count = count + 1)", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef((e) => ({
        // managerId = managerId + 1 (example)
        managerId: expr.raw("number")`${e.managerId} + 1`,
      }));

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          managerId: {
            type: "raw",
            sql: "$1 + 1",
            params: [{ type: "column", path: ["T1", "managerId"] }],
          },
        },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateWithRef[dialect]);
    });
  });

  describe("Specify output column", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef(
        () => ({
          name: expr.val("string", "New Name"),
        }),
        ["id", "name"],
      );

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "New Name" },
        },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
        output: {
          columns: ["id", "name"],
          pkColNames: ["id"],
          aiColName: "id",
        },
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateWithOutput[dialect]);
    });
  });

  describe("Limit update count with TOP", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.departmentId, 1)])
      .top(10)
      .getUpdateQueryDef(() => ({
        name: expr.val("string", "New Name"),
      }));

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "New Name" },
        },
        top: 10,
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "departmentId"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateWithTop[dialect]);
    });
  });
});

describe("FK switch", () => {
  describe("FK off", () => {
    const db = createTestDb();

    const def = db.getSwitchFkQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Employee" },
      "off",
    );

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "switchFk",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        switch: "off",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.fkOff[dialect]);
    });
  });

  describe("FK on", () => {
    const db = createTestDb();

    const def = db.getSwitchFkQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Employee" },
      "on",
    );

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "switchFk",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        switch: "on",
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.fkOn[dialect]);
    });
  });
});
