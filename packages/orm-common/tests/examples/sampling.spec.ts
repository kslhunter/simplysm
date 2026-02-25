/**
 * 랜덤 샘플링 예제
 *
 * sample() 메서드 대신 expr.random()과 orderBy/top을 조합하여 랜덤 샘플링 구현
 *
 * 사용법: db.user().orderBy(() => expr.random()).top(5)
 */
import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./sampling.expected";

describe("EXAMPLE - Random sampling", () => {
  describe("Basic sampling (ORDER BY RANDOM + TOP)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy(() => expr.random())
      .top(5)
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        orderBy: [[{ type: "random" }]],
        top: 5,
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.samplingBasic[dialect]);
    });
  });

  describe("Conditional sampling (WHERE + ORDER BY RANDOM + TOP)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.gte(item.age, 20)])
      .orderBy(() => expr.random())
      .top(3)
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "gte",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 20 },
          },
        ],
        orderBy: [[{ type: "random" }]],
        top: 3,
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.samplingWithWhere[dialect]);
    });
  });

  describe("Column selection with sampling", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        name: item.name,
      }))
      .orderBy(() => expr.random())
      .top(10)
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
        },
        orderBy: [[{ type: "random" }]],
        top: 10,
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.samplingWithSelect[dialect]);
    });
  });
});
