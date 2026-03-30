import { describe, expect, it } from "vitest";
import { defineDbContext } from "../../src/define-db-context";
import { User } from "../setup/models/User";
import { Post } from "../setup/models/Post";

describe("defineDbContext", () => {
  it("creates a DbContextDef with tables", () => {
    const MyDb = defineDbContext({
      tables: { user: User, post: Post },
    });

    expect(MyDb.meta.tables.user).toBe(User);
    expect(MyDb.meta.tables.post).toBe(Post);
    expect(MyDb.meta.migrations).toEqual([]);
  });

});
