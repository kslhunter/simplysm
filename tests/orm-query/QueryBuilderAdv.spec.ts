import * as assert from "assert";
import {describe, it} from "mocha";
import {QueryBuilderAdv, sorm} from "@simplism/orm-query";
import {Employee} from "./model/Employee";
import {Company} from "./model/Company";

describe("QueryBuilderAdv", () => {
  it("[SELECT] 기본 쿼리", () => {
    const query = new QueryBuilderAdv(Employee).query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]`.trim());
  });

  it("[SELECT] 컬럼을 설정할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .select(emp => ({
        id: emp.id
      }))
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]`.trim());
  });

  it("[SELECT] 복수의 'WHERE'를 설정하면 'AND'로 쿼리가 생성되야함", () => {
    const query = new QueryBuilderAdv(Employee)
      .where(emp => [sorm.equal(emp.id, 1)])
      .where(emp => [sorm.equal(emp.name, "관리자")])
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
WHERE ([TBL].[id] = 1)
AND   ([TBL].[name] = '관리자')`.trim());
  });

  it("[SELECT] 'WHERE'문 안에 OR를 넣을 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .where(emp => [
        sorm.or([
          sorm.equal(emp.id, 1),
          sorm.equal(emp.name, "관리자")
        ])
      ])
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
WHERE (([TBL].[id] = 1) OR ([TBL].[name] = '관리자'))`.trim());
  });

  it("[SELECT] 'DISTINCT'를 설정할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .distinct()
      .query;

    assert.strictEqual(query, `
SELECT DISTINCT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]`.trim());
  });

  it("[SELECT] 'TOP'를 설정할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .top(10)
      .query;

    assert.strictEqual(query, `
SELECT TOP 10
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]`.trim());
  });

  it("[SELECT] 'ORDER BY'를 설정할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .orderBy(emp => emp.id)
      .orderBy(emp => emp.name, true)
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
ORDER BY [TBL].[id] ASC, [TBL].[name] DESC`.trim());
  });

  it("[SELECT] 'LIMIT'를 설정할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .orderBy(emp => emp.id)
      .limit(10, 20)
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
ORDER BY [TBL].[id] ASC
OFFSET 10 ROWS FETCH NEXT 20 ROWS ONLY`.trim());
  });

  it("[SELECT] 'GROUP BY'를 설정할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .groupBy(emp => [
        emp.id
      ])
      .select(emp => ({
        id: emp.id,
        cnt: sorm.count()
      }))
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  COUNT(*) AS [cnt]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
GROUP BY [TBL].[id]`.trim());
  });

  it("[SELECT] 서브 쿼리를 형성할 수 있음", () => {
    const subQueryable = new QueryBuilderAdv(Employee);

    const query = new QueryBuilderAdv(subQueryable)
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled]
FROM (
  SELECT
    [TBL].[id] AS [id],
    [TBL].[companyId] AS [companyId],
    [TBL].[name] AS [name],
    [TBL].[encryptedPassword] AS [encryptedPassword],
    [TBL].[isDisabled] AS [isDisabled]
  FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
) AS [TBL]`.trim());
  });

  it("[SELECT] 'LEFT OUTER JOIN'할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .join(Company, "cmp", (qr, emp) =>
        qr.where(cmp => [sorm.equal(cmp.id, emp.companyId)])
      )
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled],
  [cmp].[id] AS [cmp.id],
  [cmp].[name] AS [cmp.name]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
LEFT OUTER JOIN [SD_TEST_ORM_QUERY].[dbo].[Company] AS [cmp] ON ([cmp].[id] = [TBL].[companyId])`.trim());
  });

  it("[SELECT] 'LEFT OUTER JOIN' 한것을 'WHERE'문에 쓸 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .join(Company, "cmp", (qr, emp) => qr.where(cmp => [sorm.equal(cmp.id, emp.companyId)]), true)
      .where(emp => [sorm.equal(emp.companyId, emp.cmp.id)])
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled],
  [cmp].[id] AS [cmp.id],
  [cmp].[name] AS [cmp.name]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
LEFT OUTER JOIN [SD_TEST_ORM_QUERY].[dbo].[Company] AS [cmp] ON ([cmp].[id] = [TBL].[companyId])
WHERE ([TBL].[companyId] = [cmp].[id])`.trim());
  });

  it("[SELECT] 'OUTER APPLY'할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .join(Company, "cmp", (qr, emp) => qr
        .select(cmp => ({id: cmp.id}))
        .where(cmp => [sorm.equal(cmp.id, emp.companyId)])
      )
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled],
  [cmp].[id] AS [cmp.id]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
OUTER APPLY (
  SELECT
    [cmp].[id] AS [id]
  FROM [SD_TEST_ORM_QUERY].[dbo].[Company] AS [cmp]
  WHERE ([cmp].[id] = [TBL].[companyId])
) AS [cmp]`.trim());
  });

  it("[SELECT] 두 쿼리를 'UNION'할 수 있음", () => {
    const subQueryable1 = new QueryBuilderAdv(Employee)
      .select(emp => ({
        id: emp.id,
        name: emp.name
      }));

    const subQueryable2 = new QueryBuilderAdv(Company)
      .select(cmp => ({
        id: cmp.id,
        name: cmp.name
      }));

    const query = new QueryBuilderAdv([subQueryable1, subQueryable2])
      .where(item => [sorm.equal(item.id, 1)])
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[name] AS [name]
FROM (

  SELECT
    [TBL].[id] AS [id],
    [TBL].[name] AS [name]
  FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]

  UNION ALL

  SELECT
    [TBL].[id] AS [id],
    [TBL].[name] AS [name]
  FROM [SD_TEST_ORM_QUERY].[dbo].[Company] AS [TBL]

) AS [TBL]
WHERE ([TBL].[id] = 1)`.trim());
  });

  it("[UPDATE] 기본쿼리", () => {
    const query = new QueryBuilderAdv(Employee)
      .where(emp => [sorm.equal(emp.id, 1)])
      .update(emp => ({
        name: "관리자"
      }))
      .query;

    assert.strictEqual(query, `
UPDATE [SD_TEST_ORM_QUERY].[dbo].[Employee] SET
  [name] = '관리자'
OUTPUT INSERTED.*
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
WHERE ([TBL].[id] = 1)`.trim());
  });

  it("[UPDATE] 'TOP'을 설정할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .where(emp => [sorm.equal(emp.id, 1)])
      .top(10)
      .update(emp => ({
        name: "관리자"
      }))
      .query;

    assert.strictEqual(query, `
UPDATE TOP (10) [SD_TEST_ORM_QUERY].[dbo].[Employee] SET
  [name] = '관리자'
OUTPUT INSERTED.*
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
WHERE ([TBL].[id] = 1)`.trim());
  });

  it("[UPDATE] 'LEFT OUTER JOIN'할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .join(Company, "cmp", (qr, emp) =>
        qr.where(cmp => [sorm.equal(cmp.id, emp.companyId)])
      )
      .where(emp => [sorm.equal(emp.id, 1)])
      .update(emp => ({
        name: "관리자"
      }))
      .query;

    assert.strictEqual(query, `
UPDATE [SD_TEST_ORM_QUERY].[dbo].[Employee] SET
  [name] = '관리자'
OUTPUT INSERTED.*
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
LEFT OUTER JOIN [SD_TEST_ORM_QUERY].[dbo].[Company] AS [cmp] ON ([cmp].[id] = [TBL].[companyId])
WHERE ([TBL].[id] = 1)`.trim());
  });

  it("[UPDATE] 'OUTER APPLY'할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .join(Company, "cmp", (qr, emp) =>
        qr
          .select(cmp => ({id: cmp.id}))
          .where(cmp => [sorm.equal(cmp.id, emp.companyId)])
      )
      .where(emp => [sorm.equal(emp.id, 1)])
      .update(emp => ({
        name: "관리자"
      }))
      .query;

    assert.strictEqual(query, `
UPDATE [SD_TEST_ORM_QUERY].[dbo].[Employee] SET
  [name] = '관리자'
OUTPUT INSERTED.*
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
OUTER APPLY (
  SELECT
    [cmp].[id] AS [id]
  FROM [SD_TEST_ORM_QUERY].[dbo].[Company] AS [cmp]
  WHERE ([cmp].[id] = [TBL].[companyId])
) AS [cmp]
WHERE ([TBL].[id] = 1)`.trim());
  });

  it("[DELETE] 기본쿼리", () => {
    const query = new QueryBuilderAdv(Employee)
      .where(emp => [sorm.equal(emp.id, 1)])
      .delete()
      .query;

    assert.strictEqual(query, `
DELETE FROM [SD_TEST_ORM_QUERY].[dbo].[Employee]
OUTPUT DELETED.*
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
WHERE ([TBL].[id] = 1)`.trim());
  });

  it("[DELETE] 'TOP'을 설정할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .where(emp => [sorm.equal(emp.id, 1)])
      .top(10)
      .delete()
      .query;

    assert.strictEqual(query, `
DELETE TOP (10) FROM [SD_TEST_ORM_QUERY].[dbo].[Employee]
OUTPUT DELETED.*
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
WHERE ([TBL].[id] = 1)`.trim());
  });

  it("[DELETE] 'LEFT OUTER JOIN'할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .join(Company, "cmp", (qr, emp) =>
        qr.where(cmp => [sorm.equal(cmp.id, emp.companyId)])
      )
      .where(emp => [sorm.equal(emp.id, 1)])
      .delete()
      .query;

    assert.strictEqual(query, `
DELETE FROM [SD_TEST_ORM_QUERY].[dbo].[Employee]
OUTPUT DELETED.*
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
LEFT OUTER JOIN [SD_TEST_ORM_QUERY].[dbo].[Company] AS [cmp] ON ([cmp].[id] = [TBL].[companyId])
WHERE ([TBL].[id] = 1)`.trim());
  });

  it("[DELETE] 'OUTER APPLY'할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee)
      .join(Company, "cmp", (qr, emp) =>
        qr
          .select(cmp => ({id: cmp.id}))
          .where(cmp => [sorm.equal(cmp.id, emp.companyId)])
      )
      .where(emp => [sorm.equal(emp.id, 1)])
      .delete()
      .query;

    assert.strictEqual(query, `
DELETE FROM [SD_TEST_ORM_QUERY].[dbo].[Employee]
OUTPUT DELETED.*
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
OUTER APPLY (
  SELECT
    [cmp].[id] AS [id]
  FROM [SD_TEST_ORM_QUERY].[dbo].[Company] AS [cmp]
  WHERE ([cmp].[id] = [TBL].[companyId])
) AS [cmp]
WHERE ([TBL].[id] = 1)`.trim());
  });

  it("[INSERT] 기본쿼리", () => {
    const query = new QueryBuilderAdv(Employee)
      .insert({
        companyId: 1,
        name: "관리자",
        encryptedPassword: "c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84",
        isDisabled: false
      })
      .query;

    assert.strictEqual(query, `
INSERT INTO [SD_TEST_ORM_QUERY].[dbo].[Employee] ([companyId], [name], [encryptedPassword], [isDisabled])
OUTPUT INSERTED.*
VALUES (1, '관리자', 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84', 0)`.trim());
  });

  it("[UPSERT] 기본쿼리", () => {
    const query = new QueryBuilderAdv(Employee)
      .where(emp => [sorm.equal(emp.name, "관리자?")])
      .upsert({
        companyId: 1,
        name: "관리자?",
        encryptedPassword: "c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84",
        isDisabled: false
      })
      .query;

    assert.strictEqual(query, `
MERGE [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
USING (SELECT 0 as _using) AS _using
ON ([TBL].[name] = '관리자?')
WHEN MATCHED THEN
  UPDATE SET
    [companyId] = 1,
    [name] = '관리자?',
    [encryptedPassword] = 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84',
    [isDisabled] = 0
WHEN NOT MATCHED THEN
  INSERT ([companyId], [name], [encryptedPassword], [isDisabled])
  VALUES (1, '관리자?', 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84', 0)
OUTPUT INSERTED.*;`.trim());
  });
});