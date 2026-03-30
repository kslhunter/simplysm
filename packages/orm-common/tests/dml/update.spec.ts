import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./update.expected";

describe("UPDATE - 기본", () => {
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

  describe("리터럴 값으로 UPDATE (expr.val 없이)", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef(() => ({
        name: "New Name",
        departmentId: 2,
      }));

    it("QueryDef 검증", () => {
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

  describe("리터럴 값과 표현식을 혼합하는 UPDATE", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 1)])
      .getUpdateQueryDef((e) => ({
        name: "New Name",
        managerId: expr.raw("number")`${e.managerId} + 1`,
      }));

    it("QueryDef 검증", () => {
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

  describe("출력 컬럼 지정", () => {
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

    it("QueryDef 검증", () => {
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

  describe("TOP으로 업데이트 수 제한", () => {
    const db = createTestDb();

    const def = db
      .employee()
      .where((e) => [expr.eq(e.departmentId, 1)])
      .top(10)
      .getUpdateQueryDef(() => ({
        name: expr.val("string", "New Name"),
      }));

    it("QueryDef 검증", () => {
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

describe("FK 전환", () => {
  describe("FK 해제", () => {
    const db = createTestDb();

    const def = db.getSwitchFkQueryDef(
      { database: "TestDb", schema: "TestSchema", name: "Employee" },
      false,
    );

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "switchFk",
        table: { database: "TestDb", schema: "TestSchema", name: "Employee" },
        enabled: false,
      });
    });

    it.each(dialects)("[%s] should validate SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.fkOff[dialect]);
    });
  });

});
