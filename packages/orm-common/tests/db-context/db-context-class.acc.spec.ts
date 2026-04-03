import { describe, expect, it } from "vitest";
import { DbContext } from "../../src/db-context";
import { User } from "../setup/models/User";
import { Post } from "../setup/models/Post";
import { ActiveUsers } from "../setup/views/ActiveUsers";
import { GetUserById } from "../setup/procedure/GetUserById";
import { MockExecutor } from "../setup/MockExecutor";
import "../setup/test-utils";

class TestDb extends DbContext {
  user = this.queryable(User);
  post = this.queryable(Post);
  activeUsers = this.queryable(ActiveUsers);
  getUserById = this.executable(GetUserById);
}

describe("DbContext class", () => {
  function createDb() {
    return new TestDb(new MockExecutor(), {
      database: "TestDb",
      schema: "TestSchema",
    });
  }

  // Rule: class 기반으로 스키마를 정의한다

  it("테이블을 queryable로 등록한다", () => {
    const db = createDb();
    expect(typeof db.user).toBe("function");
    const def = db.user().getSelectQueryDef();
    expect(def).toEqual({
      type: "select",
      as: "T1",
      from: { database: "TestDb", schema: "TestSchema", name: "User" },
    });
  });

  it("뷰를 queryable로 등록한다", () => {
    const db = createDb();
    expect(typeof db.activeUsers).toBe("function");
  });

  it("프로시저를 executable로 등록한다", () => {
    const db = createDb();
    expect(typeof db.getUserById).toBe("function");
  });

  it("_migration 시스템 테이블이 자동 등록된다", () => {
    const db = createDb();
    expect(typeof db._migration).toBe("function");
    const def = db._migration().getSelectQueryDef();
    expect(def.from).toEqual({
      database: "TestDb",
      schema: "TestSchema",
      name: "_migration",
    });
  });

  // Rule: 연결과 트랜잭션을 관리한다

  it("connect로 트랜잭션 자동 관리", async () => {
    const db = createDb();
    expect(db.status).toBe("ready");
    await db.connect(async () => {
      await Promise.resolve();
      expect(db.status).toBe("transact");
    });
    expect(db.status).toBe("ready");
  });

  it("connectWithoutTransaction으로 트랜잭션 없이 연결", async () => {
    const db = createDb();
    expect(db.status).toBe("ready");
    await db.connectWithoutTransaction(async () => {
      await Promise.resolve();
      expect(db.status).toBe("connect");
    });
    expect(db.status).toBe("ready");
  });

  it("transaction으로 부분 트랜잭션", async () => {
    const db = createDb();
    await db.connectWithoutTransaction(async () => {
      await Promise.resolve();
      expect(db.status).toBe("connect");
      await db.transaction(async () => {
        await Promise.resolve();
        expect(db.status).toBe("transact");
      });
      expect(db.status).toBe("connect");
    });
    expect(db.status).toBe("ready");
  });
});
