import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createConnection } from "@playwright/mcp";

interface Session {
  client: Client;
  lastUsed: number;
}

export class SessionManager {
  private readonly _sessions = new Map<string, Session>();
  private readonly _pending = new Map<string, Promise<Session>>();
  private readonly _cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly config: Record<string, unknown>,
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
    const innerServer = await createConnection(this.config as never);
    await innerServer.connect(serverTransport);
    const client = new Client({ name: "mcp-playwright-proxy", version: "1.0.0" });
    await client.connect(clientTransport);
    return { client, lastUsed: Date.now() };
  }

  private async _cleanup(): Promise<void> {
    const now = Date.now();
    for (const [id, session] of this._sessions) {
      if (now - session.lastUsed > this.timeoutMs) {
        await this.destroy(id);
      }
    }
  }
}
