import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createConnection } from "@playwright/mcp";

interface Session {
  client: Client;
  lastUsed: number;
}

export class SessionManager {
  readonly #sessions = new Map<string, Session>();
  readonly #cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly config: Record<string, unknown>,
    private readonly timeoutMs = 5 * 60 * 1000,
  ) {
    this.#cleanupInterval = setInterval(() => {
      void this.#cleanup();
    }, 30_000);
  }

  async getOrCreate(sessionId: string): Promise<Client> {
    let session = this.#sessions.get(sessionId);
    if (session == null) {
      session = await this.#createSession();
      this.#sessions.set(sessionId, session);
    }
    session.lastUsed = Date.now();
    return session.client;
  }

  async destroy(sessionId: string): Promise<void> {
    const session = this.#sessions.get(sessionId);
    if (session != null) {
      this.#sessions.delete(sessionId);
      await session.client.close();
    }
  }

  async disposeAll(): Promise<void> {
    clearInterval(this.#cleanupInterval);
    const ids = [...this.#sessions.keys()];
    await Promise.all(ids.map((id) => this.destroy(id)));
  }

  list(): string[] {
    return [...this.#sessions.keys()];
  }

  async #createSession(): Promise<Session> {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const innerServer = await createConnection(this.config as never);
    await innerServer.connect(serverTransport);
    const client = new Client({ name: "mcp-playwright-proxy", version: "1.0.0" });
    await client.connect(clientTransport);
    return { client, lastUsed: Date.now() };
  }

  async #cleanup(): Promise<void> {
    const now = Date.now();
    for (const [id, session] of this.#sessions) {
      if (now - session.lastUsed > this.timeoutMs) {
        await this.destroy(id);
      }
    }
  }
}
