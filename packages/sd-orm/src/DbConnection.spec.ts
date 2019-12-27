import {DbConnection} from "./DbConnection";

describe("DbConnection", () => {
  it("쿼리에 'GO'가 들어가면 오류나는 현상 수정", async () => {
    const conn = new DbConnection({
      database: "SIMPLYSM_TEST",
      host: "localhost",
      username: "sa",
      password: "1234"
    });

    await conn.connectAsync();

    await conn.executeAsync(["SELECT * FROM [GO];\n\nGO\n\nSELECT * FROM [AAAGO]"]);

    await conn.closeAsync();
  });
});