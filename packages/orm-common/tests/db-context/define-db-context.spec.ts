import { describe, expect, it } from "vitest";
import type { DbContextBase, DbContextDef } from "../../src/types/db-context-def";
import { defineDbContext } from "../../src/define-db-context";
import { User } from "../setup/models/User";
import { Post } from "../setup/models/Post";
import { ActiveUsers } from "../setup/views/ActiveUsers";

describe("DbContext Types", () => {
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
      switchFk: () => Promise.resolve(),
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

describe("defineDbContext", () => {
  it("creates a DbContextDef with tables", () => {
    const MyDb = defineDbContext({
      tables: { user: User, post: Post },
    });

    expect(MyDb.meta.tables.user).toBe(User);
    expect(MyDb.meta.tables.post).toBe(Post);
    expect(MyDb.meta.migrations).toEqual([]);
  });

  it("creates a DbContextDef with views", () => {
    const MyDb = defineDbContext({
      tables: { user: User },
      views: { activeUsers: ActiveUsers },
    });

    expect(MyDb.meta.views.activeUsers).toBe(ActiveUsers);
  });

  it("creates a DbContextDef with migrations", () => {
    const migrations = [{ name: "test", up: async () => {} }];
    const MyDb = defineDbContext({
      tables: { user: User },
      migrations,
    });

    expect(MyDb.meta.migrations).toBe(migrations);
  });
});
