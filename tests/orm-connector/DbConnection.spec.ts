import * as assert from "assert";
import {afterEach, beforeEach, describe, it} from "mocha";
import {DbConnection} from "@simplism/orm-connector";

describe("DbConnection", () => {
  let conn: DbConnection;

  beforeEach(async () => {
    conn = new DbConnection({
      server: "localhost",
      username: "sa",
      password: "1234"
    });
    await conn.connectAsync();
    assert.strictEqual(conn.isConnected, true);

    await conn.executeAsync(`
DROP DATABASE IF EXISTS [SD_ORM_CONNECTOR];
CREATE DATABASE [SD_ORM_CONNECTOR];
GO;

CREATE TABLE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] (
  id INT PRIMARY KEY,
  name NVARCHAR(255)
);

INSERT INTO [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] ([id], [name])
VALUES (1, '관리자');
`.trim());
  });

  afterEach(async () => {
    await conn.executeAsync("DROP DATABASE IF EXISTS [SD_ORM_CONNECTOR];");
    await conn.disconnectAsync();
    assert.strictEqual(conn.isConnected, false);
  });

  it("쿼리실행", async () => {
    const results = await conn.executeAsync("SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST]");

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0][0] !== undefined, true);
    assert.deepStrictEqual(results, [[{id: 1, name: "관리자"}]]);
  });

  it("트랜잭션을 걸수 있음", async () => {
    const queryResults = await conn.executeAsync("SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST]");
    const firstId = queryResults[0][0].id;
    const firstName = queryResults[0][0].name;

    await conn.beginTransactionAsync();
    await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET name = '${firstName} - 1' WHERE id = ${firstId}`);
    await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET name = '${firstName} - 2' WHERE id = ${firstId}`);
    await conn.commitTransactionAsync();

    const results = await conn.executeAsync(`SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] WHERE id = ${firstId}`);
    assert.strictEqual(results[0][0].name, firstName + " - 2");
  });

  it("트랜잭션 내 쿼리 오류시, 트랜잭션내의 CUD 쿼리를 모두 취소(롤백)할 수 있음", async () => {
    const queryResults = await conn.executeAsync("SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST]");
    const firstId = queryResults[0][0].id;
    const firstName = queryResults[0][0].name;

    await conn.beginTransactionAsync();
    try {
      await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET name = '${firstName} - 1' WHERE id = ${firstId}`);
      await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET name = '${firstName} - 2' WHERE id = ${firstId}`);

      const resultsOnTransaction = await conn.executeAsync(`SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] WHERE id = ${firstId}`);
      assert.strictEqual(resultsOnTransaction[0][0].name, firstName + "- 2");

      await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET nam = '${firstName} - 3' WHERE id = ${firstId}`);

      assert.fail("이전에 오류가 발생했어야 함");
    }
    catch (err) {
      await conn.rollbackTransactionAsync();
    }

    const results = await conn.executeAsync(`SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] WHERE id = ${firstId}`);
    assert.strictEqual(results[0][0].name, firstName);
  });


  it("2번에 걸쳐 서로 다른 트랜잭션을 수행할 수 있음", async () => {
    const queryResults = await conn.executeAsync("SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST]");
    const firstId = queryResults[0][0].id;
    const firstName = queryResults[0][0].name;

    await conn.beginTransactionAsync();
    await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET name = '${firstName} - 1' WHERE id = ${firstId}`);
    await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET name = '${firstName} - 2' WHERE id = ${firstId}`);
    await conn.commitTransactionAsync();

    const results1 = await conn.executeAsync(`SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] WHERE id = ${firstId}`);
    assert.strictEqual(results1[0][0].name, firstName + " - 2");
    const secondId = results1[0][0].id;
    const secondName = results1[0][0].name;

    await conn.beginTransactionAsync();
    try {
      await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET name = '${secondName} - 1' WHERE id = ${secondId}`);
      await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET name = '${secondName} - 2' WHERE id = ${secondId}`);

      const resultsOnTransaction = await conn.executeAsync(`SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] WHERE id = ${secondId}`);
      assert.strictEqual(resultsOnTransaction[0][0].name, secondName + "- 2");

      await conn.executeAsync(`UPDATE [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] SET nam = '${secondName} - 3' WHERE id = ${secondId}`);

      assert.fail("이전에 오류가 발생했어야 함");
    }
    catch (err) {
      await conn.rollbackTransactionAsync();
    }

    const results2 = await conn.executeAsync(`SELECT * FROM [SD_ORM_CONNECTOR].[dbo].[DB_CONNECTION_TEST] WHERE id = ${secondId}`);
    assert.strictEqual(results2[0][0].name, secondName);
  });
});