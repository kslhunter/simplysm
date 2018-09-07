import * as assert from "assert";
import {afterEach, beforeEach, describe, it} from "mocha";
import {OrmService} from "@simplism/orm-service";

describe("Service", () => {
  let orm: OrmService;
  let connId: number;

  beforeEach(async () => {
    orm = new OrmService();
    orm.server = {
      isConnected: true,
      addCloseListener(): void {
      },
      removeCloseListener(): void {
      }
    } as any;

    connId = await orm.connectAsync({
      port: process.env.SD_TEST_DB_PORT ? Number(process.env.SD_TEST_DB_PORT) : 1433,
      username: process.env.SD_TEST_DB_USERNAME || "sa",
      password: process.env.SD_TEST_DB_PASSWORD || "1234"
    });

    await orm.executeAsync(connId, `
IF EXISTS(select * from sys.databases WHERE name='SD_TEST_ORM_SERVICE') DROP DATABASE [SD_TEST_ORM_SERVICE]
CREATE DATABASE [SD_TEST_ORM_SERVICE]
GO

CREATE TABLE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] (
  id INT PRIMARY KEY,
  name NVARCHAR(255)
)
GO

INSERT INTO [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] ([id], [name])
VALUES (1, '관리자')
`.trim());
  });

  afterEach(async () => {
    try {
      await orm.executeAsync(connId, "IF EXISTS(select * from sys.databases WHERE name='SD_TEST_ORM_SERVICE') DROP DATABASE [SD_TEST_ORM_SERVICE];");
    }
    catch {
    }
    await orm.closeAsync(connId);
  });

  it("일반 쿼리 실행", async () => {
    const results = await orm.executeAsync(connId, "SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE]");

    assert.deepStrictEqual(results, [[{id: 1, name: "관리자"}]]);
  });

  it("트랜잭션을 걸수 있음", async () => {
    const queryResults = await orm.executeAsync(connId, "SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE]");
    const firstId = queryResults[0][0].id;
    const firstName = queryResults[0][0].name;

    await orm.beginTransactionAsync(connId);
    await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET name = '${firstName} - 1' WHERE id = ${firstId}`);
    await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET name = '${firstName} - 2' WHERE id = ${firstId}`);
    await orm.commitTransactionAsync(connId);

    const results = await orm.executeAsync(connId, `SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] WHERE id = ${firstId}`);
    assert.strictEqual(results[0][0].name, firstName + " - 2");
  });

  it("트랜잭션 내 쿼리 오류시, 트랜잭션내의 CUD 쿼리를 모두 취소(롤백)할 수 있음", async () => {
    const queryResults = await orm.executeAsync(connId, "SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE]");
    const firstId = queryResults[0][0].id;
    const firstName = queryResults[0][0].name;

    await orm.beginTransactionAsync(connId);
    try {
      await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET name = '${firstName} - 1' WHERE id = ${firstId}`);
      await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET name = '${firstName} - 2' WHERE id = ${firstId}`);

      const resultsOnTransaction = await orm.executeAsync(connId, `SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] WHERE id = ${firstId}`);
      assert.strictEqual(resultsOnTransaction[0][0].name, firstName + "- 2");

      await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET nam = '${firstName} - 3' WHERE id = ${firstId}`);

      assert.fail("이전에 오류가 발생했어야 함");
    }
    catch (err) {
      await orm.rollbackTransactionAsync(connId);
    }

    const results = await orm.executeAsync(connId, `SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] WHERE id = ${firstId}`);
    assert.strictEqual(results[0][0].name, firstName);
  });


  it("2번에 걸쳐 서로 다른 트랜잭션을 수행할 수 있음", async () => {
    const queryResults = await orm.executeAsync(connId, "SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE]");
    const firstId = queryResults[0][0].id;
    const firstName = queryResults[0][0].name;

    await orm.beginTransactionAsync(connId);
    await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET name = '${firstName} - 1' WHERE id = ${firstId}`);
    await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET name = '${firstName} - 2' WHERE id = ${firstId}`);
    await orm.commitTransactionAsync(connId);

    const results1 = await orm.executeAsync(connId, `SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] WHERE id = ${firstId}`);
    assert.strictEqual(results1[0][0].name, firstName + " - 2");
    const secondId = results1[0][0].id;
    const secondName = results1[0][0].name;

    await orm.beginTransactionAsync(connId);
    try {
      await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET name = '${secondName} - 1' WHERE id = ${secondId}`);
      await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET name = '${secondName} - 2' WHERE id = ${secondId}`);

      const resultsOnTransaction = await orm.executeAsync(connId, `SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] WHERE id = ${secondId}`);
      assert.strictEqual(resultsOnTransaction[0][0].name, secondName + "- 2");

      await orm.executeAsync(connId, `UPDATE [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] SET nam = '${secondName} - 3' WHERE id = ${secondId}`);

      assert.fail("이전에 오류가 발생했어야 함");
    }
    catch (err) {
      await orm.rollbackTransactionAsync(connId);
    }

    const results2 = await orm.executeAsync(connId, `SELECT * FROM [SD_TEST_ORM_SERVICE].[dbo].[TEST_TABLE] WHERE id = ${secondId}`);
    assert.strictEqual(results2[0][0].name, secondName);
  });
});