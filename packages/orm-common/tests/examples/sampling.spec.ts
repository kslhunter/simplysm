/**
 * Random sampling example
 *
 * Implements random sampling using expr.random() combined with orderBy/top
 * instead of a dedicated sample() method.
 *
 * Usage: db.user().orderBy(() => expr.random()).top(5)
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

});
