import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./basic.expected";

describe("Executable - Basic", () => {
  describe("getExecProcQueryDef - without parameters", () => {
    const db = createTestDb();
    const def = db.getUserById().getExecProcQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "execProc",
        procedure: {
          database: "TestDb",
          schema: "TestSchema",
          name: "GetUserById",
        },
        params: undefined,
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.execProcNoParams[dialect]);
    });
  });

  describe("getExecProcQueryDef - with parameters", () => {
    const db = createTestDb();
    const def = db.getUserById().getExecProcQueryDef({ userId: 123 });

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "execProc",
        procedure: {
          database: "TestDb",
          schema: "TestSchema",
          name: "GetUserById",
        },
        params: {
          userId: { type: "value", value: 123 },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.execProcWithParams[dialect]);
    });
  });
});
