import {expect} from "chai";
import {QueryBuilder} from "@simplysm/sd-orm-common";

describe("orm.QueryBuilder (QueryDef => Query)", () => {
  describe("SELECT", () => {
    it("기본적으로 FROM, SELECT 를 통해 테이블을 조회한다", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          }
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]`.trim());
    });

    it("SELECT 안에 서브쿼리를 넣을 수 있다.", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]",
            "[sub_id]": {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
              select: {
                "[id1]": "[id]"
              },
              top: 1
            }
          }
        })
      ).to.equal(`
SELECT
  [id] as [id1],
  (
    SELECT TOP 1
      [id] as [id1]
    FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
  ) as [sub_id]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]`.trim());
    });

    it("FROM 안에 서브 쿼리를 넣을 수 있다.", () => {
      expect(
        QueryBuilder.select({
          from: {
            from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
            select: {
              "[id1]": "[id]"
            }
          },
          select: {
            "[id2]": "[id1]"
          }
        })
      ).to.equal(`
SELECT
  [id1] as [id2]
FROM (
  SELECT
    [id] as [id1]
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
)`.trim());
    });

    it("FROM 안에 다수의 서브쿼리를 넣어 UNION ALL 할 수 있다.", () => {
      expect(
        QueryBuilder.select({
          from: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE1]",
              select: {
                "[id1]": "[id]"
              }
            },
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE2]",
              select: {
                "[id2]": "[id]"
              }
            }
          ],
          select: {
            "[id3]": "[id1]",
            "[id4]": "[id2]"
          }
        })
      ).to.equal(`
SELECT
  [id1] as [id3],
  [id2] as [id4]
FROM (
  SELECT
    [id] as [id1]
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE1]

  UNION ALL

  SELECT
    [id] as [id2]
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE2]
)`.trim());
    });

    it("AS", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[TBL].[id]"
          },
          as: "[TBL]"
        })
      ).to.equal(`
SELECT
  [TBL].[id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]`.trim());
    });

    it("WHERE", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          where: [["[id]", " = ", 3], " AND ", ["[name]", " LIKE ", "'%4444%'"]]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
WHERE ([id] = 3) AND ([name] LIKE '%4444%')`.trim());
    });

    it("WHERE 안에 서브쿼리를 넣을 수 있다.", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          where: [
            ["[id]", " = ", {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
              select: {
                "[id1]": "[id]"
              }
            }],
            " AND ",
            ["[name]", " LIKE ", "'%4444%'"]
          ]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
WHERE ([id] = (
  SELECT
    [id] as [id1]
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
)) AND ([name] LIKE '%4444%')`.trim());
    });

    it("DISTINCT", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          distinct: true
        })
      ).to.equal(`
SELECT DISTINCT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]`.trim());
    });

    it("TOP", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          top: 10
        })
      ).to.equal(`
SELECT TOP 10
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]`.trim());
    });

    it("ORDER BY", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          orderBy: [["[id]", "DESC"], ["[name]", "ASC"]]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
ORDER BY [id] DESC, [name] ASC`.trim());
    });

    it("LIMIT 작업은 반드시 ORDER BY 와 함께 쓰여야 한다.", () => {
      expect(() => {
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          limit: [3, 30]
        });
      }).to.throw(/ORDER BY/);
    });

    it("LIMIT", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          orderBy: [["[id]", "DESC"], ["[name]", "ASC"]],
          limit: [3, 30]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
ORDER BY [id] DESC, [name] ASC
OFFSET 3 ROWS FETCH NEXT 30 ROWS ONLY`.trim());
    });

    it("GROUP BY", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          groupBy: [["[id]", " + ", "[name]"], "[name]"]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
GROUP BY ([id] + [name]), [name]`.trim());
    });

    it("HAVING 작업은 반드시 GROUP BY 와 함께 쓰여야 한다.", () => {
      expect(() => {
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          having: ["[id]", " = ", 3]
        });
      }).to.throw(/GROUP BY/);
    });

    it("HAVING", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          groupBy: ["[id]", "[name]"],
          having: ["[id]", " = ", 3]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
GROUP BY [id], [name]
HAVING [id] = 3`.trim());
    });

    it("JOIN", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          join: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
              as: "[TBL_1]"
            }
          ]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
LEFT OUTER JOIN [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1] as [TBL_1]`.trim());
    });

    it("JOIN 시, [\"where\", \"from\", \"as\"] 만 존재하는 경우, LEFT OUTER JOIN 쿼리가 생성된다.", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          join: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
              as: "[TBL_1]",
              where: ["[TBL_1].[id]", " = ", "[id]"]
            }
          ]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
LEFT OUTER JOIN [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1] as [TBL_1] ON [TBL_1].[id] = [id]`.trim());
    });

    it("JOIN 중, LEFT OUTER JOIN 시, from 에 서브쿼리를 사용할 수 있다.", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          join: [
            {
              from: {
                from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
                select: {
                  "[id2]": "[id]"
                }
              },
              as: "[TBL_1]"
            }
          ]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
LEFT OUTER JOIN (
  SELECT
    [id] as [id2]
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]
) as [TBL_1]`.trim());
    });

    it("JOIN 중, LEFT OUTER JOIN 시, from 에 다수의 서브쿼리를 넣어 UNION ALL 을 사용할 수 있다.", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          join: [
            {
              from: [
                {
                  from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
                  select: {
                    "[id2]": "[id]"
                  }
                },
                {
                  from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
                  select: {
                    "[id2]": "[id]"
                  }
                }
              ],
              as: "[TBL_1]"
            }
          ]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
LEFT OUTER JOIN (
  SELECT
    [id] as [id2]
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]

  UNION ALL

  SELECT
    [id] as [id2]
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]
) as [TBL_1]`.trim());
    });

    it("JOIN 시, [\"where\", \"from\", \"as\"] 외의 다른 값이 존재하는 경우, OUTER APPLY 쿼리가 생성된다.", () => {
      expect(
        QueryBuilder.select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          },
          join: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
              as: "[TBL_1]",
              select: {
                "[id2]": "[id]"
              }
            }
          ]
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
OUTER APPLY (
  SELECT
    [id] as [id2]
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1] as [TBL_1]
) as [TBL_1]`.trim());
    });
  });

  describe("INSERT", () => {
    it("기본적으로 FROM, RECORD 를 통해 테이블에 INSERT 한다", () => {
      expect(
        QueryBuilder.insert({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": 1,
            "[name]": "'AAA'"
          }
        })
      ).to.equal(`
INSERT INTO [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ([id], [name])
VALUES (1, 'AAA')`.trim());
    });

    it("OUTPUT", () => {
      expect(
        QueryBuilder.insert({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": 1,
            "[name]": "'AAA'"
          },
          output: ["INSERTED.*"]
        })
      ).to.equal(`
INSERT INTO [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ([id], [name])
OUTPUT INSERTED.*
VALUES (1, 'AAA')`.trim());
    });
  });

  describe("UPDATE", () => {
    it("기본적으로 FROM, RECORD 를 통해 테이블에 UPDATE 한다.", () => {
      expect(
        QueryBuilder.update({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": 1,
            "[name]": "'AAA'"
          }
        })
      ).to.equal(`
UPDATE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] SET
  [id] = 1,
  [name] = 'AAA'`.trim());
    });

    it("OUTPUT", () => {
      expect(
        QueryBuilder.update({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": 1,
            "[name]": "'AAA'"
          },
          output: ["INSERTED.*"]
        })
      ).to.equal(`
UPDATE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] SET
  [id] = 1,
  [name] = 'AAA'
OUTPUT INSERTED.*`.trim());
    });

    it("AS", () => {
      expect(
        QueryBuilder.update({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": 1,
            "[name]": "'AAA'"
          },
          as: "[TBL]"
        })
      ).to.equal(`
UPDATE [TBL] SET
  [id] = 1,
  [name] = 'AAA'
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]`.trim());
    });

    it("WHERE", () => {
      expect(
        QueryBuilder.update({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": 1,
            "[name]": "'AAA'"
          },
          where: ["[id] = 3"]
        })
      ).to.equal(`
UPDATE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] SET
  [id] = 1,
  [name] = 'AAA'
WHERE [id] = 3`.trim());
    });

    it("TOP", () => {
      expect(
        QueryBuilder.update({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": 1,
            "[name]": "'AAA'"
          },
          top: 1
        })
      ).to.equal(`
UPDATE TOP (1) [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] SET
  [id] = 1,
  [name] = 'AAA'`.trim());
    });

    it("JOIN", () => {
      expect(
        QueryBuilder.update({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": 1,
            "[name]": "'AAA'"
          },
          join: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
              as: "[TBL_1]"
            }
          ]
        })
      ).to.equal(`
UPDATE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] SET
  [id] = 1,
  [name] = 'AAA'
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
LEFT OUTER JOIN [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1] as [TBL_1]`.trim());
    });
  });

  describe("UPSERT", () => {
    it("기본적으로 FROM, WHERE, INSERT RECORD, UPDATE RECORD 를 통해 테이블에 UPDATE 한다.", () => {
      expect(
        QueryBuilder.upsert({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          where: ["[id] = 1"],
          updateRecord: {
            "[name]": "'BBB'"
          },
          insertRecord: {
            "[id]": 1,
            "[name]": "'AAA'"
          }
        })
      ).to.equal(`
MERGE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
USING (SELECT 0 as _using) as _using
ON [id] = 1
WHEN MATCHED THEN
  UPDATE SET
    [name] = 'BBB'
WHEN NOT MATCHED THEN
  INSERT ([id], [name])
  VALUES (1, 'AAA');`.trim());
    });

    it("OUTPUT", () => {
      expect(
        QueryBuilder.upsert({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          where: ["[id] = 1"],
          updateRecord: {
            "[name]": "'BBB'"
          },
          insertRecord: {
            "[id]": 1,
            "[name]": "'AAA'"
          },
          output: ["INSERTED.*"]
        })
      ).to.equal(`
MERGE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
USING (SELECT 0 as _using) as _using
ON [id] = 1
WHEN MATCHED THEN
  UPDATE SET
    [name] = 'BBB'
WHEN NOT MATCHED THEN
  INSERT ([id], [name])
  VALUES (1, 'AAA')
OUTPUT INSERTED.*;`.trim());
    });

    it("AS", () => {
      expect(
        QueryBuilder.upsert({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          where: ["[id] = 1"],
          updateRecord: {
            "[name]": "'BBB'"
          },
          insertRecord: {
            "[id]": 1,
            "[name]": "'AAA'"
          }
        })
      ).to.equal(`
MERGE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
USING (SELECT 0 as _using) as _using
ON [id] = 1
WHEN MATCHED THEN
  UPDATE SET
    [name] = 'BBB'
WHEN NOT MATCHED THEN
  INSERT ([id], [name])
  VALUES (1, 'AAA');`.trim());
    });
  });

  describe("DELETE", () => {
    it("기본적으로 FROM 를 통해 테이블에서 항목들을 삭제 한다.", () => {
      expect(
        QueryBuilder.delete({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]"
        })
      ).to.equal(`
DELETE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]`.trim()
      );
    });

    it("TOP", () => {
      expect(
        QueryBuilder.delete({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          top: 1
        })
      ).to.equal(`
DELETE TOP (1) [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]`.trim());
    });

    it("OUTPUT", () => {
      expect(
        QueryBuilder.delete({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          output: ["DELETED.*"]
        })
      ).to.equal(`
DELETE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
OUTPUT DELETED.*`.trim());
    });

    it("AS", () => {
      expect(
        QueryBuilder.delete({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]"
        })
      ).to.equal(`
DELETE [TBL]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]`.trim());
    });

    it("JOIN", () => {
      expect(
        QueryBuilder.delete({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          join: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
              as: "[TBL_1]"
            }
          ]
        })
      ).to.equal(`
DELETE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
LEFT OUTER JOIN [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1] as [TBL_1]`.trim());
    });

    it("WHERE", () => {
      expect(
        QueryBuilder.delete({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          where: ["[id] = 1"]
        })
      ).to.equal(`
DELETE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]
WHERE [id] = 1`.trim());
    });
  });

  describe("DATABASE", () => {
    it("CREATE DATABASE IF NOT EXISTS", () => {
      expect(
        QueryBuilder.createDatabaseIfNotExists({database: "TEST_DB"})
      ).to.equal(`
IF NOT EXISTS(select * from sys.databases WHERE name='TEST_DB') CREATE DATABASE [TEST_DB]`.trim());
    });

    it("CLEAR DATABASE IF EXISTS", () => {
      expect(
        QueryBuilder.clearDatabaseIfExists({database: "TEST_DB"})
      ).to.equal(`
IF EXISTS(select * from sys.databases WHERE name='TEST_DB')
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = N'';
    
  -- 프록시저 초기화
  SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
  FROM [TEST_DB].sys.sql_modules m
  INNER JOIN [TEST_DB].sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%PROCEDURE%'
    
  -- 함수 초기화
  SELECT @sql = @sql + 'DROP FUNCTION [TEST_DB].' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) + N';' + CHAR(13) + CHAR(10)
  FROM [TEST_DB].sys.sql_modules m
  INNER JOIN [TEST_DB].sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%function%'
    
  -- 뷰 초기화
  SELECT @sql = @sql + 'DROP VIEW [TEST_DB].' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(v.name) + N';' + CHAR(13) + CHAR(10)
  FROM [TEST_DB].sys.views v
    
  -- 테이블 FK 끊기 초기화
  SELECT @sql = @sql + N'ALTER TABLE [TEST_DB].' + QUOTENAME(SCHEMA_NAME([tbl].schema_id)) + '.' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM [TEST_DB].sys.tables [tbl]
  INNER JOIN [TEST_DB].sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'

  -- 테이블 삭제
  SELECT @sql = @sql + N'DROP TABLE [TEST_DB].' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME([tbl].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM [TEST_DB].sys.tables [tbl]
  WHERE [type]= 'U'

  EXEC(@sql);
END`.trim());
    });

    it("CREATE TABLE", () => {
      expect(
        QueryBuilder.createTable({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          columns: [
            {
              name: "id",
              dataType: "INT",
              autoIncrement: true
            },
            {
              name: "name",
              dataType: "NVARCHAR(255)",
              nullable: true
            },
            {
              name: "seq",
              dataType: "INT"
            }
          ]
        })
      ).to.equal(`
CREATE TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [name] NVARCHAR(255) NULL,
  [seq] INT NOT NULL
)`.trim());
    });

    it("DROP TABLE", () => {
      expect(
        QueryBuilder.dropTable({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          }
        })
      ).to.equal(`
DROP TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]`.trim());
    });

    it("ADD COLUMN", () => {
      expect(
        QueryBuilder.addColumn({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          column: {
            name: "remark",
            dataType: "NVARCHAR(255)"
          }
        })
      ).to.deep.equal([
        `ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ADD [remark] NVARCHAR(255) NOT NULL`
      ]);
    });

    it("ADD COLUMN" +
      "(NOT NULL 에 기본값이 설정되어 있으면, 일단 NULL 로 컬럼을 생성하고, 모든 값을 기본값으로 덮어쓴다음, " +
      "컬럼을 NOT NULL 로 설정하는 3개의 쿼리가 반환됨)", () => {
      expect(
        QueryBuilder.addColumn({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          column: {
            name: "remark",
            dataType: "NVARCHAR(255)",
            defaultValue: "'abc'"
          }
        })
      ).to.deep.equal([
        `ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ADD [remark] NVARCHAR(255) NULL`,
        `UPDATE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] SET [remark] = 'abc'`,
        `ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ALTER COLUMN [remark] NVARCHAR(255) NOT NULL`
      ]);
    });

    it("REMOVE COLUMN", () => {
      expect(
        QueryBuilder.removeColumn({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          column: "remark"
        })
      ).to.equal(`
ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] DROP COLUMN [remark]`.trim());
    });

    it("MODIFY COLUMN", () => {
      expect(
        QueryBuilder.modifyColumn({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          column: {
            name: "remark",
            dataType: "NVARCHAR(255)"
          }
        })
      ).to.deep.equal([
        `ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ALTER COLUMN [remark] NVARCHAR(255) NOT NULL`
      ]);
    });

    it("MODIFY COLUMN" +
      "(NOT NULL 에 기본값이 설정되어 있으면, 일단 NULL 로 컬럼을 생성하고, 모든 값을 기본값으로 덮어쓴다음, " +
      "컬럼을 NOT NULL 로 설정하는 3개의 쿼리가 반환됨)", () => {
      expect(
        QueryBuilder.modifyColumn({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          column: {
            name: "remark",
            dataType: "NVARCHAR(255)",
            defaultValue: "'abc'"
          }
        })
      ).to.deep.equal([
        `ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ALTER COLUMN [remark] NVARCHAR(255) NULL`,
        `UPDATE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] SET [remark] = 'abc' WHERE [remark] IS NULL`,
        `ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ALTER COLUMN [remark] NVARCHAR(255) NOT NULL`
      ]);
    });

    it("RENAME COLUMN", () => {
      expect(
        QueryBuilder.renameColumn({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          prevName: "name",
          nextName: "newName"
        })
      ).to.equal(`
EXECUTE TEST_DB..sp_rename N'TEST_SCHEMA.TEST_TABLE.[name]', N'newName', 'COLUMN'`.trim());
    });

    it("ADD PRIMARY KEY", () => {
      expect(
        QueryBuilder.addPrimaryKey({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          primaryKeys: [
            {
              column: "parentId",
              orderBy: "ASC"
            },
            {
              column: "id",
              orderBy: "DESC"
            }
          ]
        })
      ).to.equal(`
ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ADD PRIMARY KEY ([parentId] ASC, [id] DESC)`.trim());
    });

    it("ADD FOREIGN KEY", () => {
      expect(
        QueryBuilder.addForeignKey({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          foreignKey: {
            name: "parent",
            fkColumns: ["parentId"],
            targetTable: {
              database: "TEST_DB2",
              schema: "TEST_SCHEMA2",
              name: "TEST_TABLE2"
            },
            targetPkColumns: ["id"]
          }
        })
      ).to.equal(`
ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ADD CONSTRAINT [FK_TEST_DB_TEST_SCHEMA_TEST_TABLE_parent] FOREIGN KEY ([parentId])
  REFERENCES [TEST_DB2].[TEST_SCHEMA2].[TEST_TABLE2] ([id])
  ON DELETE NO ACTION
  ON UPDATE NO ACTION`.trim());
    });

    it("REMOVE FOREIGN KEY", () => {
      expect(
        QueryBuilder.removeForeignKey({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          foreignKey: "parent"
        })
      ).to.equal(`
ALTER TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] DROP CONSTRAINT [FK_TEST_DB_TEST_SCHEMA_TEST_TABLE_parent]`.trim());
    });

    it("CREATE INDEX", () => {
      expect(
        QueryBuilder.createIndex({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          index: {
            name: "test",
            columns: [
              {
                name: "test1",
                orderBy: "ASC"
              },
              {
                name: "test2",
                orderBy: "DESC"
              }
            ]
          }
        })
      ).to.equal(`
CREATE INDEX [IDX_TEST_DB_TEST_SCHEMA_TEST_TABLE_test] ON [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ([test1] ASC, [test2] DESC)`.trim());
    });

    it("SET IDENTITY INSERT", () => {
      expect(
        QueryBuilder.configIdentityInsert({
          table: {
            database: "TEST_DB",
            schema: "TEST_SCHEMA",
            name: "TEST_TABLE"
          },
          state: "on"
        })
      ).to.equal(`
SET IDENTITY_INSERT [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ON`.trim());
    });
  });

  describe("기타", () => {
    it("query", () => {
      expect(
        QueryBuilder.query({
          type: "select",
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          select: {
            "[id1]": "[id]"
          }
        })
      ).to.equal(`
SELECT
  [id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE]`.trim());
    });
  });
});
