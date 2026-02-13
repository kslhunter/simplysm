import { describe, expect, it } from "vitest";
import type { DbContextBase, DbContextDef } from "../../src/types/db-context-def";

describe("DbContext types", () => {
  it("DbContextBase interface has required members", () => {
    // Type-level test: verify the interface exists with correct shape
    const base: DbContextBase = {
      status: "ready",
      database: "test",
      schema: undefined,
      getNextAlias: () => "T1",
      resetAliasCounter: () => {},
      executeDefs: () => Promise.resolve([[]]),
      getQueryDefObjectName: () => ({ database: "test", name: "test" }),
    };
    expect(base.status).toBe("ready");
    expect(base.getNextAlias()).toBe("T1");
  });

  it("DbContextDef has meta property", () => {
    const def: DbContextDef<{}, {}> = {
      meta: {
        tables: {},
        views: {},
        procedures: {},
        migrations: [],
      },
    };
    expect(def.meta.tables).toEqual({});
    expect(def.meta.migrations).toEqual([]);
  });
});
