import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils";
import * as expected from "./basic.expected";

describe("Executable - 기본", () => {
  describe("getExecProcQueryDef - 파라미터 없이", () => {
    const db = createTestDb();
    const def = db.getUserById().getExecProcQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.execProcNoParams[dialect]);
    });
  });

  describe("getExecProcQueryDef - 파라미터 포함", () => {
    const db = createTestDb();
    const def = db.getUserById().getExecProcQueryDef({ userId: 123 });

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.execProcWithParams[dialect]);
    });
  });
});
