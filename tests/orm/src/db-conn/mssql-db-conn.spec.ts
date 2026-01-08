import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MssqlDbConn } from "@simplysm/orm-node";
import { mssqlConfig } from "../test-configs";
import type { ColumnMeta } from "@simplysm/orm-common";

describe("MssqlDbConn", () => {
  let tedious: typeof import("tedious");
  let conn: MssqlDbConn;

  beforeAll(async () => {
    tedious = await import("tedious");
    conn = new MssqlDbConn(tedious, mssqlConfig);
  });

  afterAll(async () => {
    if (conn.isConnected) {
      await conn.closeAsync();
    }
  });

  describe("연결", () => {
    it("연결 성공", async () => {
      await conn.connectAsync();
      expect(conn.isConnected).toBe(true);
    });

    it("중복 연결 시 에러", async () => {
      await expect(conn.connectAsync()).rejects.toThrow("이미 'Connection'이 연결되어있습니다.");
    });

    it("연결 종료", async () => {
      await conn.closeAsync();
      expect(conn.isConnected).toBe(false);
    });
  });

  describe("쿼리 실행", () => {
    beforeAll(async () => {
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connectAsync();

      // 테스트 테이블 생성
      await conn.executeAsync([
        `IF OBJECT_ID('TestTable', 'U') IS NOT NULL DROP TABLE [TestTable]`,
        `CREATE TABLE [TestTable] (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100),
          value INT
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`IF OBJECT_ID('TestTable', 'U') IS NOT NULL DROP TABLE [TestTable]`]);
      await conn.closeAsync();
    });

    it("INSERT 및 SELECT", async () => {
      await conn.executeAsync([`INSERT INTO [TestTable] (name, value) VALUES ('test', 123)`]);

      const results = await conn.executeAsync([`SELECT * FROM [TestTable] WHERE name = 'test'`]);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("파라미터화된 쿼리", async () => {
      const results = await conn.executeParametrizedAsync(
        `SELECT * FROM [TestTable] WHERE name = @p0`,
        ["test"],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });
  });

  describe("트랜잭션", () => {
    beforeAll(async () => {
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connectAsync();

      await conn.executeAsync([
        `IF OBJECT_ID('TxTable', 'U') IS NOT NULL DROP TABLE [TxTable]`,
        `CREATE TABLE [TxTable] (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100)
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`IF OBJECT_ID('TxTable', 'U') IS NOT NULL DROP TABLE [TxTable]`]);
      await conn.closeAsync();
    });

    it("커밋", async () => {
      await conn.beginTransactionAsync();
      expect(conn.isOnTransaction).toBe(true);

      await conn.executeAsync([`INSERT INTO [TxTable] (name) VALUES ('commit-test')`]);
      await conn.commitTransactionAsync();
      expect(conn.isOnTransaction).toBe(false);

      const results = await conn.executeAsync([`SELECT * FROM [TxTable] WHERE name = 'commit-test'`]);
      expect(results[0]).toHaveLength(1);
    });

    it("롤백", async () => {
      await conn.beginTransactionAsync();

      await conn.executeAsync([`INSERT INTO [TxTable] (name) VALUES ('rollback-test')`]);
      await conn.rollbackTransactionAsync();
      expect(conn.isOnTransaction).toBe(false);

      const results = await conn.executeAsync([`SELECT * FROM [TxTable] WHERE name = 'rollback-test'`]);
      expect(results[0]).toHaveLength(0);
    });
  });

  describe("bulkInsertAsync", () => {
    beforeAll(async () => {
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connectAsync();

      await conn.executeAsync([
        `IF OBJECT_ID('BulkTable', 'U') IS NOT NULL DROP TABLE [BulkTable]`,
        `CREATE TABLE [BulkTable] (
          id INT NOT NULL,
          name NVARCHAR(100) NOT NULL,
          value FLOAT NOT NULL
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`IF OBJECT_ID('BulkTable', 'U') IS NOT NULL DROP TABLE [BulkTable]`]);
      await conn.closeAsync();
    });

    it("대량 INSERT (BulkLoad)", async () => {
      const columnMetas: Record<string, ColumnMeta> = {
        id: { type: "number", dataType: { type: "int" } },
        name: { type: "string", dataType: { type: "varchar", length: 100 } },
        value: { type: "number", dataType: { type: "double" } },
      };

      const records = [
        { id: 1, name: "bulk1", value: 1.1 },
        { id: 2, name: "bulk2", value: 2.2 },
        { id: 3, name: "bulk3", value: 3.3 },
      ];

      await conn.bulkInsertAsync("[BulkTable]", columnMetas, records);

      const results = await conn.executeAsync([`SELECT * FROM [BulkTable] ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect(results[0][0]).toMatchObject({ id: 1, name: "bulk1" });
      expect(results[0][1]).toMatchObject({ id: 2, name: "bulk2" });
      expect(results[0][2]).toMatchObject({ id: 3, name: "bulk3" });
    });
  });
});
