import * as assert from "assert";
import {describe, it} from "mocha";
import {QueryBuilder} from "../src/QueryBuilder";

describe("QueryBuilder", () => {
  it("[SELECT] 기본 쿼리", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee")
      .query;

    assert.strictEqual(query, `
SELECT
  *
FROM GLINT.dbo.Employee`.trim());

  });

  it("[SELECT] 'FROM'에 'AS'를 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .query;

    assert.strictEqual(query, `
SELECT
  *
FROM GLINT.dbo.Employee AS emp`.trim());
  });

  it("[SELECT] 'FROM'이후에 'AS'만 따로 설정할 수도 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee")
      .as("emp")
      .query;

    assert.strictEqual(query, `
SELECT
  *
FROM GLINT.dbo.Employee AS emp`.trim());
  });

  it("[SELECT] 컬럼을 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .select({
        id: "emp.id"
      })
      .query;

    assert.strictEqual(query, `
SELECT
  emp.id AS id
FROM GLINT.dbo.Employee AS emp`.trim());
  });

  it("[SELECT] 복수의 'WHERE'를 설정하면 'AND'로 쿼리가 생성되야함", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.id = 1")
      .where("emp.name = '관리자'")
      .query;

    assert.strictEqual(query, `
SELECT
  *
FROM GLINT.dbo.Employee AS emp
WHERE (emp.id = 1)
AND   (emp.name = '관리자')`.trim());
  });

  it("[SELECT] 'WHERE'문 안에 OR를 넣을 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.id = 1 OR emp.id = 2")
      .query;

    assert.strictEqual(query, `
SELECT
  *
FROM GLINT.dbo.Employee AS emp
WHERE (emp.id = 1 OR emp.id = 2)`.trim());
  });

  it("[SELECT] 'DISTINCT'를 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee")
      .distinct()
      .query;

    assert.strictEqual(query, `
SELECT DISTINCT
  *
FROM GLINT.dbo.Employee`.trim());
  });

  it("[SELECT] 'TOP'를 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee")
      .top(10)
      .query;

    assert.strictEqual(query, `
SELECT TOP 10
  *
FROM GLINT.dbo.Employee`.trim());
  });

  it("[SELECT] 'LIMIT'를 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .orderBy("emp.id", "ASC")
      .limit(10, 20)
      .query;

    assert.strictEqual(query, `
SELECT
  *
FROM GLINT.dbo.Employee AS emp
ORDER BY emp.id ASC
OFFSET 10 ROWS FETCH NEXT 20 ROWS ONLY`.trim());
  });

  it("[SELECT] 'GROUP BY'를 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .select({
        id: "emp.id",
        cnt: "COUNT(*)"
      })
      .groupBy(["emp.id"])
      .query;

    assert.strictEqual(query, `
SELECT
  emp.id AS id,
  COUNT(*) AS cnt
FROM GLINT.dbo.Employee AS emp
GROUP BY emp.id`.trim());
  });

  it("[SELECT] 서브 쿼리를 형성할 수 있음", () => {
    const subQueryBuilder = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp");

    const query = new QueryBuilder()
      .from(subQueryBuilder, 'emp2')
      .query;

    assert.strictEqual(query, `
SELECT
  *
FROM (
  SELECT
    *
  FROM GLINT.dbo.Employee AS emp
) AS emp2`.trim());
  });

  it("[SELECT] 'LEFT OUTER JOIN'할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .join(
        new QueryBuilder()
          .from("GLINT.dbo.Company", "cmp")
          .where("cmp.id = emp.companyId")
      )
      .query;

    assert.strictEqual(query, `
SELECT
  *
FROM GLINT.dbo.Employee AS emp
LEFT OUTER JOIN GLINT.dbo.Company AS cmp ON (cmp.id = emp.companyId)`.trim());
  });

  it("[SELECT] 'OUTER APPLY'할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .join(
        new QueryBuilder()
          .from("GLINT.dbo.Company", "cmp")
          .select({id: "cmp.id"})
          .where("cmp.id = emp.companyId")
      )
      .query;

    assert.strictEqual(query, `
SELECT
  *
FROM GLINT.dbo.Employee AS emp
OUTER APPLY (
  SELECT
    cmp.id AS id
  FROM GLINT.dbo.Company AS cmp
  WHERE (cmp.id = emp.companyId)
) AS cmp`.trim());
  });

  it("[SELECT] 두 쿼리를 'UNION'할 수 있음", () => {
    const subQueryBuilder1 = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .select({
        id: "emp.id",
        name: "emp.name"
      });

    const subQueryBuilder2 = new QueryBuilder()
      .from("GLINT.dbo.Company", "cmp")
      .select({
        id: "cmp.id",
        name: "cmp.name"
      });

    const query = new QueryBuilder()
      .from([
        subQueryBuilder1,
        subQueryBuilder2
      ], "tbl")
      .where("tbl.id = 1")
      .query;


    assert.strictEqual(query, `
SELECT
  *
FROM (

  SELECT
    emp.id AS id,
    emp.name AS name
  FROM GLINT.dbo.Employee AS emp

  UNION ALL

  SELECT
    cmp.id AS id,
    cmp.name AS name
  FROM GLINT.dbo.Company AS cmp

) AS tbl
WHERE (tbl.id = 1)`.trim());
  });

  it("[UPDATE] 기본쿼리", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee")
      .where("id = 1")
      .update({
        name: "'관리자'"
      })
      .query;

    assert.strictEqual(query, `
UPDATE GLINT.dbo.Employee SET
  name = '관리자'
FROM GLINT.dbo.Employee
WHERE (id = 1)`.trim());
  });

  it("[UPDATE] 'FROM'에 'AS'를 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.id = 1")
      .update({
        name: "'관리자'"
      })
      .query;

    assert.strictEqual(query, `
UPDATE GLINT.dbo.Employee SET
  name = '관리자'
FROM GLINT.dbo.Employee AS emp
WHERE (emp.id = 1)`.trim());
  });

  it("[UPDATE] 'TOP'을 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.id = 1")
      .top(10)
      .update({
        name: "'관리자'"
      })
      .query;

    assert.strictEqual(query, `
UPDATE TOP (10) GLINT.dbo.Employee SET
  name = '관리자'
FROM GLINT.dbo.Employee AS emp
WHERE (emp.id = 1)`.trim());
  });

  it("[UPDATE] 'LEFT OUTER JOIN'할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .join(new QueryBuilder().from("GLINT.dbo.Company", "cmp").where("cmp.id = emp.companyId"))
      .where("emp.id = 1")
      .update({
        name: "'관리자'"
      })
      .query;

    assert.strictEqual(query, `
UPDATE GLINT.dbo.Employee SET
  name = '관리자'
FROM GLINT.dbo.Employee AS emp
LEFT OUTER JOIN GLINT.dbo.Company AS cmp ON (cmp.id = emp.companyId)
WHERE (emp.id = 1)`.trim());
  });

  it("[UPDATE] 'OUTER APPLY'할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .join(new QueryBuilder().from("GLINT.dbo.Company", "cmp").select({id: "cmp.id"}).where("cmp.id = emp.companyId"))
      .where("emp.id = 1")
      .update({
        name: "'관리자'"
      })
      .query;

    assert.strictEqual(query, `
UPDATE GLINT.dbo.Employee SET
  name = '관리자'
FROM GLINT.dbo.Employee AS emp
OUTER APPLY (
  SELECT
    cmp.id AS id
  FROM GLINT.dbo.Company AS cmp
  WHERE (cmp.id = emp.companyId)
) AS cmp
WHERE (emp.id = 1)`.trim());
  });

  it("[UPDATE] 'OUTPUT'을 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.id = 1")
      .update({
        name: "'관리자'"
      })
      .output(["INSERTED.id"])
      .query;

    assert.strictEqual(query, `
UPDATE GLINT.dbo.Employee SET
  name = '관리자'
OUTPUT INSERTED.id
FROM GLINT.dbo.Employee AS emp
WHERE (emp.id = 1)`.trim());
  });

  it("[DELETE] 기본쿼리", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee")
      .where("id = 1")
      .delete()
      .query;

    assert.strictEqual(query, `
DELETE FROM GLINT.dbo.Employee
FROM GLINT.dbo.Employee
WHERE (id = 1)`.trim());
  });

  it("[DELETE] 'FROM'에 'AS'를 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.id = 1")
      .delete()
      .query;

    assert.strictEqual(query, `
DELETE FROM GLINT.dbo.Employee
FROM GLINT.dbo.Employee AS emp
WHERE (emp.id = 1)`.trim());
  });

  it("[DELETE] 'TOP'을 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.id = 1")
      .top(10)
      .delete()
      .query;

    assert.strictEqual(query, `
DELETE TOP (10) FROM GLINT.dbo.Employee
FROM GLINT.dbo.Employee AS emp
WHERE (emp.id = 1)`.trim());
  });

  it("[DELETE] 'LEFT OUTER JOIN'할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .join(new QueryBuilder().from("GLINT.dbo.Company", "cmp").where("cmp.id = emp.companyId"))
      .where("emp.id = 1")
      .delete()
      .query;

    assert.strictEqual(query, `
DELETE FROM GLINT.dbo.Employee
FROM GLINT.dbo.Employee AS emp
LEFT OUTER JOIN GLINT.dbo.Company AS cmp ON (cmp.id = emp.companyId)
WHERE (emp.id = 1)`.trim());
  });

  it("[DELETE] 'OUTER APPLY'할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .join(new QueryBuilder().from("GLINT.dbo.Company", "cmp").select({id: "cmp.id"}).where("cmp.id = emp.companyId"))
      .where("emp.id = 1")
      .delete()
      .query;

    assert.strictEqual(query, `
DELETE FROM GLINT.dbo.Employee
FROM GLINT.dbo.Employee AS emp
OUTER APPLY (
  SELECT
    cmp.id AS id
  FROM GLINT.dbo.Company AS cmp
  WHERE (cmp.id = emp.companyId)
) AS cmp
WHERE (emp.id = 1)`.trim());
  });

  it("[DELETE] 'OUTPUT'을 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.id = 1")
      .delete()
      .output(["DELETED.id"])
      .query;

    assert.strictEqual(query, `
DELETE FROM GLINT.dbo.Employee
OUTPUT DELETED.id
FROM GLINT.dbo.Employee AS emp
WHERE (emp.id = 1)`.trim());
  });

  it("[INSERT] 기본쿼리", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee")
      .insert({
        companyId: "1",
        name: "'관리자'",
        encryptedPassword: "'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84'",
        isDisabled: "0"
      })
      .query;

    assert.strictEqual(query, `
INSERT INTO GLINT.dbo.Employee (companyId, name, encryptedPassword, isDisabled)
VALUES (1, '관리자', 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84', 0)`.trim());
  });

  it("[INSERT] 'OUTPUT'을 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee")
      .insert({
        companyId: "1",
        name: "'관리자'",
        encryptedPassword: "'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84'",
        isDisabled: "0"
      })
      .output(["INSERTED.id"])
      .query;

    assert.strictEqual(query, `
INSERT INTO GLINT.dbo.Employee (companyId, name, encryptedPassword, isDisabled)
OUTPUT INSERTED.id
VALUES (1, '관리자', 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84', 0)`.trim());
  });

  it("[UPSERT] 기본쿼리", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee")
      .where("name = '관리자?'")
      .upsert({
        companyId: "1",
        name: "'관리자?'",
        encryptedPassword: "'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84'",
        isDisabled: "0"
      })
      .query;

    assert.strictEqual(query, `
MERGE GLINT.dbo.Employee
USING (SELECT 0 as _using) AS _using
ON (name = '관리자?')
WHEN MATCHED THEN
  UPDATE SET
    companyId = 1,
    name = '관리자?',
    encryptedPassword = 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84',
    isDisabled = 0
WHEN NOT MATCHED THEN
  INSERT (companyId, name, encryptedPassword, isDisabled)
  VALUES (1, '관리자?', 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84', 0);`.trim());
  });

  it("[UPSERT] 'FROM'에 'AS'를 사용할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.name = '관리자?'")
      .upsert({
        companyId: "1",
        name: "'관리자?'",
        encryptedPassword: "'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84'",
        isDisabled: "0"
      })
      .query;

    assert.strictEqual(query, `
MERGE GLINT.dbo.Employee AS emp
USING (SELECT 0 as _using) AS _using
ON (emp.name = '관리자?')
WHEN MATCHED THEN
  UPDATE SET
    companyId = 1,
    name = '관리자?',
    encryptedPassword = 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84',
    isDisabled = 0
WHEN NOT MATCHED THEN
  INSERT (companyId, name, encryptedPassword, isDisabled)
  VALUES (1, '관리자?', 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84', 0);`.trim());
  });

  it("[INSERT] 'OUTPUT'을 설정할 수 있음", () => {
    const query = new QueryBuilder()
      .from("GLINT.dbo.Employee", "emp")
      .where("emp.name = '관리자?'")
      .upsert({
        companyId: "1",
        name: "'관리자?'",
        encryptedPassword: "'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84'",
        isDisabled: "0"
      })
      .output(["INSERTED.id"])
      .query;

    assert.strictEqual(query, `
MERGE GLINT.dbo.Employee AS emp
USING (SELECT 0 as _using) AS _using
ON (emp.name = '관리자?')
WHEN MATCHED THEN
  UPDATE SET
    companyId = 1,
    name = '관리자?',
    encryptedPassword = 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84',
    isDisabled = 0
WHEN NOT MATCHED THEN
  INSERT (companyId, name, encryptedPassword, isDisabled)
  VALUES (1, '관리자?', 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84', 0)
OUTPUT INSERTED.id;`.trim());
  });
});