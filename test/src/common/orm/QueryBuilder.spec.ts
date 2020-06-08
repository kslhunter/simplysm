import {expect} from "chai";
import {QueryBuilder} from "@simplysm/sd-orm-common";

describe("(common) orm.QueryBuilder (QueryDef => Query)", () => {
  describe("SELECT", () => {
    it("기본 테이블 조회", () => {
      expect(
        new QueryBuilder("mssql").select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]"
        })
      ).to.equal(`
SELECT *
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]`.trim());
    });

    it("세부 테이블 조회", () => {
      expect(
        new QueryBuilder("mssql").select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          top: 1,
          distinct: true,
          select: {
            "[id1]": "[TBL].[id]"
          },
          where: [["[TBL].[id]", " = ", "3"], " AND ", ["[TBL].[name]", " LIKE ", "'%4444%'"]],
          groupBy: ["[TBL].[id]", "[TBL].[name]"],
          having: [["[TBL].[id]", " = ", "3"], " AND ", ["[TBL].[name]", " LIKE ", "'%4444%'"]]
        })
      ).to.equal(`
SELECT TOP 1 DISTINCT
  [TBL].[id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
WHERE ([TBL].[id] = 3) AND ([TBL].[name] LIKE '%4444%')
GROUP BY [TBL].[id], [TBL].[name]
HAVING ([TBL].[id] = 3) AND ([TBL].[name] LIKE '%4444%')`.trim());
    });

    it("ORDER BY + LIMIT", () => {
      expect(
        new QueryBuilder("mssql").select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          select: {
            "[id1]": "[TBL].[id]"
          },
          orderBy: [["[TBL].[id]", "ASC"], ["[TBL].[name]", "DESC"]],
          limit: [60, 30]
        })
      ).to.equal(`
SELECT
  [TBL].[id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
ORDER BY [TBL].[id] ASC, [TBL].[name] DESC
OFFSET 60 ROWS FETCH NEXT 30 ROWS ONLY`.trim());
    });

    it("SELECT 내 서브쿼리 사용", () => {
      expect(
        new QueryBuilder("mssql").select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          select: {
            "[id1]": "[TBL].[id]",
            "[sub_id]": {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
              as: "[TBL2]"
            }
          }
        })
      ).to.equal(`
SELECT
  [TBL].[id] as [id1],
  (
    SELECT *
    FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL2]
  ) as [sub_id]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]`.trim());
    });

    it("FROM 내 서브 쿼리 사용", () => {
      expect(
        new QueryBuilder("mssql").select({
          from: {
            from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
            as: "[TBL2]"
          },
          as: "[TBL]"
        })
      ).to.equal(`
SELECT *
FROM (
  SELECT *
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL2]
) as [TBL]`.trim());
    });

    it("FROM 내 UNION ALL 서브쿼리 사용", () => {
      expect(
        new QueryBuilder("mssql").select({
          from: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
              as: "[TBL2]"
            },
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
              as: "[TBL2]"
            }
          ],
          as: "[TBL]"
        })
      ).to.equal(`
SELECT *
FROM (
  SELECT *
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL2]

  UNION ALL

  SELECT *
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL2]
) as [TBL]`.trim());
    });

    it("WHERE 조건내 서브쿼리 사용", () => {
      expect(
        new QueryBuilder("mssql").select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",

          where: [
            ["[TBL].[id]", " = ", {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
              as: "[TBL2]"
            }],
            " AND ",
            ["[TBL].[name]", " LIKE ", "'%4444%'"]
          ]
        })
      ).to.equal(`
SELECT *
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
WHERE ([TBL].[id] = (
  SELECT *
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL2]
)) AND ([TBL].[name] LIKE '%4444%')`.trim());
    });

    it("[ERROR] LIMIT은 반드시 ORDER BY 와 함께 쓰여야 한다.", () => {
      expect(() => {
        new QueryBuilder("mssql").select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          limit: [3, 30]
        });
      }).to.throw(/ORDER BY/);
    });

    it("[ERROR] HAVING은 반드시 GROUP BY 와 함께 쓰여야 한다.", () => {
      expect(() => {
        new QueryBuilder("mssql").select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          having: ["[TBL].[id]", " = ", "3"]
        });
      }).to.throw(/GROUP BY/);
    });

    it("JOIN 일반", () => {
      expect(
        new QueryBuilder("mssql").select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          join: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
              as: "[TBL2]",
              where: [["[TBL2].[id]", " = ", "3"]]
            }
          ]
        })
      ).to.equal(`
SELECT *
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
LEFT OUTER JOIN [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1] as [TBL2] ON ([TBL2].[id] = 3)`.trim());
    });

    it("JOIN시, OUTER APPLY (LATERAL) 쿼리가 생성", () => {
      expect(
        new QueryBuilder("mssql").select({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          join: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1]",
              as: "[TBL2]",
              where: [["[TBL2].[id]", " = ", "3"]],
              select: {
                "[id2]": "[TBL2].[id]"
              },
              top: 1
            }
          ]
        })
      ).to.equal(`
SELECT *
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
OUTER APPLY (
  SELECT TOP 1
    [TBL2].[id] as [id2]
  FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE_1] as [TBL2]
  WHERE ([TBL2].[id] = 3)
) as [TBL2]`.trim());
    });
  });

  describe("INSERT", () => {
    it("기본 레코드 입력", () => {
      expect(
        new QueryBuilder("mssql").insert({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": "1",
            "[name]": "'AAA'"
          }
        })
      ).to.equal(`
INSERT INTO [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ([id], [name])
VALUES (1, 'AAA');`.trim());
    });

    it("OUTPUT", () => {
      expect(
        new QueryBuilder("mssql").insert({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          record: {
            "[id]": "1",
            "[name]": "'AAA'"
          },
          output: ["[id]"]
        })
      ).to.equal(`
INSERT INTO [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] ([id], [name])
OUTPUT INSERTED.[id]
VALUES (1, 'AAA');`.trim());
    });
  });

  describe("UPDATE", () => {
    it("기본 레코드 수정", () => {
      expect(
        new QueryBuilder("mssql").update({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          record: {
            "[id]": "1",
            "[name]": "'AAA'"
          }
        })
      ).to.equal(`
UPDATE [TBL] SET
  [TBL].[id] = 1,
  [TBL].[name] = 'AAA'
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL];`.trim());
    });

    it("세부", () => {
      expect(
        new QueryBuilder("mssql").update({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          record: {
            "[id]": "1",
            "[name]": "'AAA'"
          },
          output: ["*"],
          top: 1,
          where: ["[TBL].[id]", " = ", "3"],
          join: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
              as: "[TBL2]",
              where: ["[TBL2].[id]", " = ", "[TBL].[id]"]
            }
          ]
        })
      ).to.equal(`
UPDATE TOP (1) [TBL] SET
  [TBL].[id] = 1,
  [TBL].[name] = 'AAA'
OUTPUT INSERTED.*
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
LEFT OUTER JOIN [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL2] ON [TBL2].[id] = [TBL].[id]
WHERE [TBL].[id] = 3;`.trim());
    });
  });

  describe("UPSERT", () => {
    it("기본 레코드 입력 혹은 수정", () => {
      expect(
        new QueryBuilder("mssql").upsert({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          updateRecord: {
            "[name]": "'AAA'"
          },
          insertRecord: {
            "[id]": "1",
            "[name]": "'AAA'"
          },
          where: ["[id]", " = ", "1"]
        })
      ).to.equal(`
MERGE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
USING (SELECT 0 as _using) as _using
ON [id] = 1
WHEN MATCHED THEN
  UPDATE SET
    [name] = 'AAA'
WHEN NOT MATCHED THEN
  INSERT ([id], [name])
  VALUES (1, 'AAA');`.trim());
    });

    it("OUTPUT", () => {
      expect(
        new QueryBuilder("mssql").upsert({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          updateRecord: {
            "[name]": "'AAA'"
          },
          insertRecord: {
            "[id]": "1",
            "[name]": "'AAA'"
          },
          where: ["[id]", " = ", "1"],
          output: ["*"]
        })
      ).to.equal(`
MERGE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
USING (SELECT 0 as _using) as _using
ON [id] = 1
WHEN MATCHED THEN
  UPDATE SET
    [name] = 'AAA'
WHEN NOT MATCHED THEN
  INSERT ([id], [name])
  VALUES (1, 'AAA')
OUTPUT INSERTED.*;`.trim());
    });
  });

  describe("DELETE", () => {
    it("기본 레코드 삭제", () => {
      expect(
        new QueryBuilder("mssql").delete({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]"
        })
      ).to.equal(`
DELETE [TBL]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL];`.trim());
    });

    it("세부", () => {
      expect(
        new QueryBuilder("mssql").delete({
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          output: ["*"],
          top: 1,
          where: ["[TBL].[id]", " = ", "3"],
          join: [
            {
              from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
              as: "[TBL2]",
              where: ["[TBL2].[id]", " = ", "[TBL].[id]"]
            }
          ]
        })
      ).to.equal(`
DELETE TOP (1) [TBL]
OUTPUT DELETED.*
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]
LEFT OUTER JOIN [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL2] ON [TBL2].[id] = [TBL].[id]
WHERE [TBL].[id] = 3;`.trim());
    });
  });

  describe("DATABASE", () => {
    it("CREATE DATABASE IF NOT EXISTS", () => {
      expect(
        new QueryBuilder("mssql").createDatabaseIfNotExists({database: "TEST_DB"})
      ).to.equal(`
IF NOT EXISTS(select * from sys.databases WHERE name='TEST_DB') CREATE DATABASE [TEST_DB]`.trim());
    });

    it("CLEAR DATABASE IF EXISTS", () => {
      expect(
        new QueryBuilder("mssql").clearDatabaseIfExists({database: "TEST_DB"})
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
        new QueryBuilder("mssql").createTable({
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
          ],
          primaryKeys: [
            {
              columnName: "id",
              orderBy: "DESC"
            }
          ]
        })
      ).to.equal(`
CREATE TABLE [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] (
  [id] INT IDENTITY(1,1) NOT NULL,
  [name] NVARCHAR(255) NULL,
  [seq] INT NOT NULL,
  CONSTRAINT [PK_TEST_TABLE] PRIMARY KEY ([id] DESC)
);`.trim());
    });

    it("DROP TABLE", () => {
      expect(
        new QueryBuilder("mssql").dropTable({
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
        new QueryBuilder("mssql").addColumn({
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
        new QueryBuilder("mssql").addColumn({
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
        new QueryBuilder("mssql").removeColumn({
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
        new QueryBuilder("mssql").modifyColumn({
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
        new QueryBuilder("mssql").modifyColumn({
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
        new QueryBuilder("mssql").renameColumn({
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

    it("ADD FOREIGN KEY", () => {
      expect(
        new QueryBuilder("mssql").addForeignKey({
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
        new QueryBuilder("mssql").removeForeignKey({
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
        new QueryBuilder("mssql").createIndex({
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
        new QueryBuilder("mssql").configIdentityInsert({
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
        new QueryBuilder("mssql").query({
          type: "select",
          from: "[TEST_DB].[TEST_SCHEMA].[TEST_TABLE]",
          as: "[TBL]",
          select: {
            "[id1]": "[TBL].[id]"
          }
        })
      ).to.equal(`
SELECT
  [TBL].[id] as [id1]
FROM [TEST_DB].[TEST_SCHEMA].[TEST_TABLE] as [TBL]`.trim());
    });
  });
});
