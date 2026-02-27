import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock @playwright/mcp
vi.mock("@playwright/mcp", () => ({
  createConnection: vi.fn().mockResolvedValue({
    connect: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock InMemoryTransport
vi.mock("@modelcontextprotocol/sdk/inMemory.js", () => ({
  InMemoryTransport: {
    createLinkedPair: () => [Symbol("clientTransport"), Symbol("serverTransport")],
  },
}));

// Mock MCP Client
const mockClientClose = vi.fn().mockResolvedValue(undefined);
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

import { SessionManager } from "../src/session-manager.js";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SessionManager({}, 1000); // 1s timeout for fast tests
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
    const manager2 = new SessionManager({}, 100); // 100ms timeout
    await manager2.getOrCreate("session-a");

    await vi.advanceTimersByTimeAsync(31_000); // triggers 30s cleanup interval, past 100ms timeout

    expect(manager2.list()).toEqual([]);
    vi.useRealTimers();
  });
});
