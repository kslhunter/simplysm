import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Use vi.hoisted so these are available inside vi.mock factories (which are hoisted)
const { mockInnerServerClose, mockClientClose } = vi.hoisted(() => ({
  mockInnerServerClose: vi.fn().mockResolvedValue(undefined),
  mockClientClose: vi.fn().mockResolvedValue(undefined),
}));

// Mock node:module's createRequire to intercept CJS require of @playwright/mcp
vi.mock("node:module", () => ({
  createRequire: () => (id: string) => {
    if (id === "@playwright/mcp") {
      return {
        createConnection: vi.fn().mockResolvedValue({
          connect: vi.fn().mockResolvedValue(undefined),
          close: mockInnerServerClose,
        }),
      };
    }
    if (id === "../package.json") {
      return { version: "0.0.0-test" };
    }
    throw new Error(`Unexpected require: ${id}`);
  },
}));

// Mock InMemoryTransport
vi.mock("@modelcontextprotocol/sdk/inMemory.js", () => ({
  InMemoryTransport: {
    createLinkedPair: () => [Symbol("clientTransport"), Symbol("serverTransport")],
  },
}));

// Mock MCP Client
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => ({
  Client: vi.fn().mockImplementation(function () {
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      close: mockClientClose,
      listTools: vi.fn().mockResolvedValue({ tools: [] }),
      callTool: vi.fn().mockResolvedValue({ content: [] }),
    };
  }),
}));

// Mock MCP Server (only used for typing; actual instance comes from createConnection mock)
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn(),
}));

import { SessionManager } from "../src/session-manager.js";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SessionManager({} as never, 1000); // 1s timeout for fast tests
  });

  afterEach(async () => {
    await manager.disposeAll();
  });

  it("creates a new session for an unknown sessionId", async () => {
    const client = await manager.getOrCreate("session-a");
    expect(client).toBeDefined();
    expect(manager.list()).toEqual(["session-a"]);
  });

  it("returns the same client for the same sessionId", async () => {
    const client1 = await manager.getOrCreate("session-a");
    const client2 = await manager.getOrCreate("session-a");
    expect(client1).toBe(client2);
  });

  it("creates independent clients for different sessionIds", async () => {
    const client1 = await manager.getOrCreate("session-a");
    const client2 = await manager.getOrCreate("session-b");
    expect(client1).not.toBe(client2);
    expect(manager.list()).toEqual(["session-a", "session-b"]);
  });

  it("destroy removes the session and calls client.close", async () => {
    await manager.getOrCreate("session-a");
    await manager.destroy("session-a");
    expect(mockClientClose).toHaveBeenCalledTimes(1);
    expect(manager.list()).toEqual([]);
  });

  it("destroy does nothing for unknown sessionId", async () => {
    await manager.destroy("non-existent");
    expect(mockClientClose).not.toHaveBeenCalled();
  });

  it("disposeAll clears all sessions", async () => {
    await manager.getOrCreate("session-a");
    await manager.getOrCreate("session-b");
    await manager.disposeAll();
    expect(manager.list()).toEqual([]);
    expect(mockClientClose).toHaveBeenCalledTimes(2);
  });

  it("cleanup removes sessions past timeout", async () => {
    vi.useFakeTimers();
    const manager2 = new SessionManager({} as never, 100); // 100ms timeout
    try {
      await manager2.getOrCreate("session-a");
      await vi.advanceTimersByTimeAsync(31_000); // triggers 30s cleanup interval, past 100ms timeout
      expect(manager2.list()).toEqual([]);
    } finally {
      await manager2.disposeAll();
      vi.useRealTimers();
    }
  });

  it("destroy closes innerServer", async () => {
    await manager.getOrCreate("session-a");
    mockInnerServerClose.mockClear();
    await manager.destroy("session-a");
    expect(mockInnerServerClose).toHaveBeenCalledTimes(1);
  });

  it("disposeAll closes all innerServers", async () => {
    await manager.getOrCreate("session-a");
    await manager.getOrCreate("session-b");
    mockInnerServerClose.mockClear();
    await manager.disposeAll();
    expect(mockInnerServerClose).toHaveBeenCalledTimes(2);
  });
});
