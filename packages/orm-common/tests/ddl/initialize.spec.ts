import { describe, expect, it } from "vitest";
import { initialize } from "../../src/ddl/initialize";
import type { Queryable } from "../../src/exec/queryable";
import type { Migration } from "../../src/types/db";
import "../setup/test-utils";

/**
 * initialize() 함수의 직접 호출용 fixture DbContext.
 * DbContext 인터페이스의 일부만 구현한 경량 객체로, executeDefs 응답을
 * appliedMigrations 옵션에 따라 시뮬레이션한다.
 */
function createFixtureDb(opts: {
  appliedMigrations: { code: string }[] | "TABLE_NOT_EXISTS";
  migrations: Migration[];
}) {
  async function executeDefs(defs: any[]): Promise<any[][]> {
    const results: any[][] = [];
    for (const def of defs) {
      if (def.type === "schemaExists") {
        results.push([{}]);
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
    return results;
  }

  const migrationQueryable = {
    execute: async () => {
      const results = await executeDefs([
        { type: "select", from: { name: "_migration" } },
      ]);
      return results[0];
    },
    insert: async () => {},
    getInsertQueryDef: () => undefined,
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
    const db = createFixtureDb({
      appliedMigrations: [],
      migrations: [],
    });

    const result = await initialize(db);

    expect(result).toBe(false);
  });
});
