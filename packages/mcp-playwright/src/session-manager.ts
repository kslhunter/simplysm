import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { createRequire } from "node:module";
import type { createConnection as CreateConnectionFn } from "@playwright/mcp";

// @playwright/mcp ships CJS only — use createRequire for ESM compatibility
const _require = createRequire(import.meta.url);
const { createConnection } = _require("@playwright/mcp") as { createConnection: typeof CreateConnectionFn };

interface Session {
  client: Client;
  innerServer: McpServer;
  lastUsed: number;
}

export class SessionManager {
  private readonly _sessions = new Map<string, Session>();
  private readonly _pending = new Map<string, Promise<Session>>();
  private readonly _cleanupInterval: ReturnType<typeof setInterval>;
  private _cleanupRunning = false;

  constructor(
    private readonly config: NonNullable<Parameters<typeof CreateConnectionFn>[0]>,
    private readonly timeoutMs = 5 * 60 * 1000,
  ) {
    this._cleanupInterval = setInterval(() => {
      void this._cleanup();
    }, 30_000);
  }

  async getOrCreate(sessionId: string): Promise<Client> {
    let session = this._sessions.get(sessionId);
    if (session == null) {
      let pending = this._pending.get(sessionId);
      if (pending == null) {
        pending = this._createSession().then((s) => {
          this._sessions.set(sessionId, s);
          return s;
        }).finally(() => {
          this._pending.delete(sessionId);
        });
        this._pending.set(sessionId, pending);
      }
      session = await pending;
    }
    session.lastUsed = Date.now();
    return session.client;
  }

  async destroy(sessionId: string): Promise<void> {
    const session = this._sessions.get(sessionId);
    if (session != null) {
      this._sessions.delete(sessionId);
      await session.client.close();
      await session.innerServer.close();
    }
  }

  async disposeAll(): Promise<void> {
    clearInterval(this._cleanupInterval);
    const ids = [...this._sessions.keys()];
    await Promise.all(ids.map((id) => this.destroy(id)));
  }

  list(): string[] {
    return [...this._sessions.keys()];
  }

  private async _createSession(): Promise<Session> {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const innerServer = await createConnection(this.config);
    await innerServer.connect(serverTransport);
    const client = new Client({ name: "mcp-playwright-proxy", version: "1.0.0" });
    try {
      await client.connect(clientTransport);
    } catch (err) {
      await innerServer.close();
      throw err;
    }
    return { client, innerServer, lastUsed: Date.now() };
  }

  private async _cleanup(): Promise<void> {
    if (this._cleanupRunning) return;
    this._cleanupRunning = true;
    try {
      const now = Date.now();
      const expired = [...this._sessions.entries()]
        .filter(([, s]) => now - s.lastUsed > this.timeoutMs)
        .map(([id]) => id);
      for (const id of expired) {
        await this.destroy(id);
      }
    } finally {
      this._cleanupRunning = false;
    }
  }
}
