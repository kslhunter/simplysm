import * as assert from "assert";
import {describe, it} from "mocha";
import {QueryBuilderAdv, sorm} from "@simplism/orm-query";
import {Employee} from "./database/Employee";
import {Company} from "./database/Company";

describe("QueryBuilderAdv", () => {
  it("[SELECT] 기본 쿼리", () => {
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY").query;

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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
      .select(emp => ({
        id: emp.id
      }))
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]`.trim());
  });

  it("[SELECT] 컬럼을 설정할때, 'Object'를 넣을 수 있음", () => {
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
      .select(emp => ({
        id: emp.id,
        child: {
          id: emp.id
        }
      }))
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[id] AS [child.id]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]`.trim());
  });

  it("[SELECT] 컬럼을 설정할때, 'Array'를 넣을 수 있음", () => {
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
      .select(emp => ({
        id: emp.id,
        child: [
          {
            id: emp.id
          }
        ]
      }))
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[id] AS [child.id]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]`.trim());
  });

  it("[SELECT] 복수의 'WHERE'를 설정하면 'AND'로 쿼리가 생성되야함", () => {
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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

  it("[SELECT] 'GROUP BY'이후에 'HAVING'검색 조건을 설정할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
      .groupBy(emp => [
        emp.id
      ])
      .having(item => [
        sorm.equal(sorm.count(), 3)
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
GROUP BY [TBL].[id]
HAVING (COUNT(*) = 3)`.trim());
  });

  it("[SELECT] 서브 쿼리를 형성할 수 있음", () => {
    const subQueryable = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY");

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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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

  it("[SELECT] 'include'를 통해 쉽게 FK 데이터를 'JOIN'할 수 있음", () => {
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
      .include(item => item.company)
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[companyId] AS [companyId],
  [TBL].[name] AS [name],
  [TBL].[encryptedPassword] AS [encryptedPassword],
  [TBL].[isDisabled] AS [isDisabled],
  [company].[id] AS [company.id],
  [company].[name] AS [company.name]
FROM [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
LEFT OUTER JOIN [SD_TEST_ORM_QUERY].[dbo].[Company] AS [company] ON ([company].[id] = [TBL].[companyId])`.trim());
  });

  it("[SELECT] 'include'를 통해 쉽게 FK Target 데이터 목록을 'JOIN'할 수 있음", () => {
    const query = new QueryBuilderAdv(Company, "SD_TEST_ORM_QUERY")
      .include(item => item.employees)
      .query;

    assert.strictEqual(query, `
SELECT
  [TBL].[id] AS [id],
  [TBL].[name] AS [name],
  [employees].[id] AS [employees.id],
  [employees].[companyId] AS [employees.companyId],
  [employees].[name] AS [employees.name],
  [employees].[encryptedPassword] AS [employees.encryptedPassword],
  [employees].[isDisabled] AS [employees.isDisabled]
FROM [SD_TEST_ORM_QUERY].[dbo].[Company] AS [TBL]
LEFT OUTER JOIN [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [employees] ON ([employees].[companyId] = [TBL].[id])`.trim());
  });

  it("[SELECT] 두 쿼리를 'UNION'할 수 있음", () => {
    const subQueryable1 = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
      .select(emp => ({
        id: emp.id,
        name: emp.name
      }));

    const subQueryable2 = new QueryBuilderAdv(Company, "SD_TEST_ORM_QUERY")
      .select(cmp => ({
        id: cmp.id,
        name: cmp.name
      }));

    const query = new QueryBuilderAdv([subQueryable1, subQueryable2], "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
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

  it("[UPSERT] UPDATE일 경우, 기존값을 사용하여 값을 바꾸도록 할 수 있다", () => {
    const query = new QueryBuilderAdv(Employee, "SD_TEST_ORM_QUERY")
      .where(emp => [sorm.equal(emp.name, "관리자")])
      .upsert(item => ({
        companyId: 1,
        name: sorm.formula(item.name, "+", "?"),
        encryptedPassword: "c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84",
        isDisabled: false
      }))
      .query;

    assert.strictEqual(query, `
MERGE [SD_TEST_ORM_QUERY].[dbo].[Employee] AS [TBL]
USING (SELECT 0 as _using) AS _using
ON ([TBL].[name] = '관리자')
WHEN MATCHED THEN
  UPDATE SET
    [companyId] = 1,
    [name] = ([TBL].[name] + '?'),
    [encryptedPassword] = 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84',
    [isDisabled] = 0
WHEN NOT MATCHED THEN
  INSERT ([companyId], [name], [encryptedPassword], [isDisabled])
  VALUES (1, ([TBL].[name] + '?'), 'c3018f1e248c3182a5196f20cb2c64507e51f0241c734a21a3bba79d3ba5cd84', 0)
OUTPUT INSERTED.*;`.trim());
  });
});