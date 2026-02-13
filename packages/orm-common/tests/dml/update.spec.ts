import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./update.expected";

describe("UPDATE - 기본", () => {
  describe("단순 UPDATE", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef((_e) => ({
        name: expr.val("string", "새이름"),
      }));

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "새이름" },
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateSimple[dialect]);
    });
  });

  describe("여러 컬럼 UPDATE", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef(() => ({
        name: expr.val("string", "새이름"),
        departmentId: expr.val("number", 2),
      }));

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "새이름" },
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateMultiCol[dialect]);
    });
  });

  describe("현재 값 참조하여 UPDATE (e.g., count = count + 1)", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef((e) => ({
        // managerId = managerId + 1 (예시)
        managerId: expr.raw("number")`${e.managerId} + 1`,
      }));

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateWithRef[dialect]);
    });
  });

  describe("output 컬럼 지정", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef(
        () => ({
          name: expr.val("string", "새이름"),
        }),
        ["id", "name"],
      );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "새이름" },
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateWithOutput[dialect]);
    });
  });

  describe("TOP으로 업데이트 개수 제한", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.departmentId, 1)])
      .top(10)
      .getUpdateQueryDef(() => ({
        name: expr.val("string", "새이름"),
      }));

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "update",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        as: "T1",
        record: {
          name: { type: "value", value: "새이름" },
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.updateWithTop[dialect]);
    });
  });
});

describe("FK 스위치", () => {
  describe("FK off", () => {
    const db = createTestDb();

    const def = db.getSwitchFkQueryDef({ database: "TestDb", schema: "TestSchema", name: "Employee" }, "off");

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "switchFk",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        switch: "off",
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.fkOff[dialect]);
    });
  });

  describe("FK on", () => {
    const db = createTestDb();

    const def = db.getSwitchFkQueryDef({ database: "TestDb", schema: "TestSchema", name: "Employee" }, "on");

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "switchFk",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        switch: "on",
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.fkOn[dialect]);
    });
  });
});
