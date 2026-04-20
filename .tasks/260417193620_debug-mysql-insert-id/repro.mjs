// 직접 mysql2로 트랜잭션 내 multi-statement 재현 테스트
import mysql from "../../node_modules/.pnpm/mysql2@3.22.1_@types+node@25.6.0/node_modules/mysql2/promise.js";

const conn = await mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "1234",
  database: "adtek",
  multipleStatements: true,
  charset: "utf8mb4",
});

console.log("--- Case 1: no transaction ---");
{
  const sql = "INSERT INTO `BoaUpload` (`boaCode`, `uploadDate`, `fileName`, `buffer`) VALUES ('T1', NOW(), 'a.txt', X'00');\nSELECT `id` FROM `BoaUpload` WHERE `id` = LAST_INSERT_ID()";
  const [r] = await conn.query({ sql });
  console.log("type:", Array.isArray(r) ? "Array" : typeof r);
  console.log("length:", r.length);
  console.log("r[0]:", r[0]);
  console.log("r[1]:", r[1]);
}

console.log("\n--- Case 2: in transaction (like connectAsync) ---");
await conn.query({ sql: "SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED" });
await conn.beginTransaction();
{
  const sql = "INSERT INTO `BoaUpload` (`boaCode`, `uploadDate`, `fileName`, `buffer`) VALUES ('T2', NOW(), 'b.txt', X'00');\nSELECT `id` FROM `BoaUpload` WHERE `id` = LAST_INSERT_ID()";
  const [r] = await conn.query({ sql });
  console.log("type:", Array.isArray(r) ? "Array" : typeof r);
  console.log("length:", r.length);
  console.log("r[0]:", r[0]);
  console.log("r[1]:", r[1]);
}
await conn.rollback();

await conn.end();
