import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QueryDef } from "@simplysm/orm-common";

vi.mock("@simplysm/orm-node", () => ({
  createDbConn: vi.fn(),
}));

import { createDbConn } from "@simplysm/orm-node";
import { OrmService } from "../src/services/orm-service";

describe("OrmService.executeDefs", () => {
  let mockExecute: ReturnType<typeof vi.fn>;
  let methods: any;
  let connId: number;

  const twoDefs: QueryDef[] = [
    {
      type: "createTable",
      table: { database: "db", name: "A" },
      columns: [{ name: "id", dataType: { type: "bigint" } }],
      primaryKey: ["id"],
    },
    {
      type: "createTable",
      table: { database: "db", name: "B" },
      columns: [{ name: "id", dataType: { type: "bigint" } }],
      primaryKey: ["id"],
    },
  ];

  beforeEach(async () => {
    mockExecute = vi.fn(async (queries: string[]) => queries.map(() => []));

    const mockConn = {
      config: { dialect: "postgresql" as const },
      isConnected: true,
      connect: vi.fn(),
      close: vi.fn(),
      execute: mockExecute,
      executeParametrized: vi.fn(),
      bulkInsert: vi.fn(),
      beginTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      on: vi.fn(),
    };

    vi.mocked(createDbConn).mockResolvedValue(mockConn as any);

    const ctx = {
      socket: { on: vi.fn() },
      getConfig: vi.fn(async () => ({
        test: { dialect: "postgresql", host: "localhost", database: "db" },
      })),
      clientName: "test",
    };

    methods = OrmService.factory(ctx as any);
    connId = await methods.connect({ configName: "test" });
    mockExecute.mockClear();
  });

  it("executes queries individually when options is undefined", async () => {
    const result = await methods.executeDefs(connId, twoDefs);

    // Should pass 2 separate queries, not 1 combined string
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute.mock.calls[0][0]).toHaveLength(2);

    // Should return one result per def
    expect(result).toHaveLength(2);
  });

  it("combines queries when options is explicitly all-null", async () => {
    await methods.executeDefs(connId, twoDefs, [undefined, undefined]);

    // Should pass 1 combined query string
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute.mock.calls[0][0]).toHaveLength(1);
  });
});
