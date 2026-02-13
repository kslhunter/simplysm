import { describe, expect, it } from "vitest";
import { defineDbContext } from "../../src/define-db-context";
import { createDbContext } from "../../src/create-db-context";
import { User } from "../setup/models/User";
import { Post } from "../setup/models/Post";
import { MockExecutor } from "../setup/MockExecutor";
import "../setup/test-utils";

const TestDb = defineDbContext({
  tables: { user: User, post: Post },
});

describe("createDbContext", () => {
  it("creates instance with queryable accessors", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });

    expect(db.database).toBe("TestDb");
    expect(db.schema).toBe("TestSchema");
    expect(db.status).toBe("ready");
    expect(typeof db.user).toBe("function");
    expect(typeof db.post).toBe("function");
  });

  it("queryable generates correct QueryDef", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });

    const def = db.user().getSelectQueryDef();
    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "User" },
    });
  });

  it("alias counter increments across queryable calls", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });

    const userDef = db.user().getSelectQueryDef();
    const postDef = db.post().getSelectQueryDef();
    expect(userDef.as).toBe("T1");
    expect(postDef.as).toBe("T2");
  });

  it("DDL methods exist on instance", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    // QueryDef generators
    expect(typeof db.getCreateTableQueryDef).toBe("function");
    expect(typeof db.getAddColumnQueryDef).toBe("function");
    expect(typeof db.getClearSchemaQueryDef).toBe("function");

    // Execution methods
    expect(typeof db.createTable).toBe("function");
    expect(typeof db.addColumn).toBe("function");
  });

  it("DDL QueryDef generators produce correct output", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });

    const clearDef = db.getClearSchemaQueryDef({ database: "TestDb", schema: "TestSchema" });
    expect(clearDef).toEqual({
      type: "clearSchema",
      database: "TestDb",
      schema: "TestSchema",
    });
  });

  it("connect/trans methods exist", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    expect(typeof db.connect).toBe("function");
    expect(typeof db.connectWithoutTransaction).toBe("function");
    expect(typeof db.trans).toBe("function");
  });

  it("connect manages status lifecycle", async () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    expect(db.status).toBe("ready");
    await db.connect(async () => {
      await Promise.resolve();
      expect(db.status).toBe("transact");
    });
    expect(db.status).toBe("ready");
  });

  it("connectWithoutTransaction manages status lifecycle", async () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    expect(db.status).toBe("ready");
    await db.connectWithoutTransaction(async () => {
      await Promise.resolve();
      expect(db.status).toBe("connect");
    });
    expect(db.status).toBe("ready");
  });

  it("trans manages status lifecycle within connectWithoutTransaction", async () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    await db.connectWithoutTransaction(async () => {
      await Promise.resolve();
      expect(db.status).toBe("connect");
      await db.trans(async () => {
        await Promise.resolve();
        expect(db.status).toBe("transact");
      });
      expect(db.status).toBe("connect");
    });
    expect(db.status).toBe("ready");
  });

  it("connect resets alias counter", async () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    // Use some aliases
    db.getNextAlias(); // T1
    db.getNextAlias(); // T2

    await db.connect(async () => {
      await Promise.resolve();
      // After connect, alias counter should be reset
      const userDef = db.user().getSelectQueryDef();
      expect(userDef.as).toBe("T1");
    });
  });

  it("connect rolls back and rethrows on callback error", async () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    const testError = new Error("test error");
    await expect(
      db.connect(async () => {
        await Promise.resolve();
        throw testError;
      }),
    ).rejects.toThrow("test error");

    expect(db.status).toBe("ready");
  });

  it("connectWithoutTransaction rethrows on callback error", async () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    const testError = new Error("test error");
    await expect(
      db.connectWithoutTransaction(async () => {
        await Promise.resolve();
        throw testError;
      }),
    ).rejects.toThrow("test error");

    expect(db.status).toBe("ready");
  });

  it("trans throws when already in transaction state", async () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    await db.connect(async () => {
      // Already in transact state via connect
      await expect(db.trans(async () => {})).rejects.toThrow("이미 TRANSACTION 상태입니다.");
    });
  });

  it("systemMigration accessor exists", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    expect(typeof db.systemMigration).toBe("function");
  });

  it("initialize method exists", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
    });

    expect(typeof db.initialize).toBe("function");
  });

  it("getQueryDefObjectName resolves table with defaults", () => {
    const db = createDbContext(TestDb, new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });

    const objName = db.getQueryDefObjectName(User);
    expect(objName).toEqual({
      database: "TestDb",
      schema: "TestSchema",
      name: "User",
    });
  });
});
