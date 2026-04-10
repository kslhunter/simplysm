import { describe, expect, it, vi } from "vitest";
import { initialize } from "../../src/ddl/initialize";
import type { Queryable } from "../../src/exec/queryable";
import type { Migration } from "../../src/types/db";
import "../setup/test-utils";

/**
 * initializeImpl 직접 호출용 가짜 DbContext
 */
function createFakeDb(opts: {
  appliedMigrations: { code: string }[] | "TABLE_NOT_EXISTS";
  migrations: Migration[];
}) {
  const executeDefs = vi.fn((defs: any[]) => {
    const results: any[][] = [];
    for (const def of defs) {
      if (def.type === "schemaExists") {
        results.push([{}]); // schema exists
      } else if (def.type === "select" && def.from?.name === "_migration") {
        if (opts.appliedMigrations === "TABLE_NOT_EXISTS") {
          const err = new Error("Invalid object name '_migration'") as any;
          err.number = 208;
          return Promise.reject(err);
        }
        results.push(opts.appliedMigrations);
      } else {
        results.push([]);
      }
    }
    return Promise.resolve(results);
  });

  // _migration() Queryable 모킹 — execute()가 executeDefs를 호출
  const migrationQueryable = {
    execute: async () => {
      const results = await executeDefs([
        { type: "select", from: { name: "_migration" } },
      ]);
      return results[0];
    },
    insert: vi.fn(async () => {}),
    getInsertQueryDef: vi.fn(),
  };

  return {
    database: "TestDb",
    schema: undefined,
    status: "connect" as const,
    executeDefs,
    getNextAlias: () => "T1",
    resetAliasCounter: () => {},
    getQueryDefObjectName: () => ({ database: "TestDb", name: "test" }),
    switchFk: async () => {},
    _migration: () => migrationQueryable as unknown as Queryable<{ code: string }, any>,
    migrations: opts.migrations,
  } as unknown as Parameters<typeof initialize>[0];
}

describe("initializeImpl", () => {
  it("migration 배열이 비어있으면 false 반환", async () => {
    const db = createFakeDb({
      appliedMigrations: [],
      migrations: [],
    });

    const result = await initialize(db);

    expect(result).toBe(false);
  });
});
