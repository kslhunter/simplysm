import {ormHelpers} from "../common/ormHelpers";

export class MigrationQueryBuilder {
  public createDatabaseIfNotExists(dbName: string): string {
    return `IF NOT EXISTS(select * from sys.databases WHERE name='${dbName}') CREATE DATABASE [${dbName}]`.trim();
  }

  public createTable(
    tableDef: {
      database: string;
      scheme: string;
      name: string;
    },
    colDefs: {
      name: string;
      dataType: string;
      nullable?: boolean;
      autoIncrement?: boolean;
    }[]
  ): string {
    let query = "";
    query += `CREATE TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] (\n`;
    query += colDefs
      .map(colDef => `  [${colDef.name}] ${colDef.dataType} ${colDef.autoIncrement ? "IDENTITY(1,1) " : ""}${colDef.nullable ? "NULL" : "NOT NULL"}`)
      .join(",\n") + "\n";
    query += ")";

    return query.trim();
  }

  public dropTable(
    tableDef: {
      database: string;
      scheme: string;
      name: string;
    }
  ): string {
    return `DROP TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}]`;
  }

  public addPrimaryKey(
    tableDef: {
      database: string;
      scheme: string;
      name: string;
    },
    pkColDefs: {
      name: string;
      desc?: boolean;
    }[]
  ): string {
    let query = "";

    if (pkColDefs.length > 0) {
      query += `ALTER TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] ADD PRIMARY KEY (${pkColDefs.map(item => `[${item.name}] ${item.desc ? "DESC" : "ASC"}`).join(", ")})\n`;
    }

    return query.trim();
  }

  public addForeignKey(
    tableDef: {
      database: string;
      scheme: string;
      name: string;
    },
    fkDef: {
      name: string;
      columnNames: string[];
      targetTableDef: {
        database: string;
        scheme: string;
        name: string;
      };
      targetColumnNames: string[];
    }
  ): string {
    let query = "";

    query += `ALTER TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] ADD CONSTRAINT [FK_${tableDef.database}_${tableDef.scheme}_${tableDef.name}_${fkDef.name}] FOREIGN KEY (${fkDef.columnNames.map(colName => `[${colName}]`).join(", ")})\n`;
    query += `  REFERENCES [${fkDef.targetTableDef.database}].[${fkDef.targetTableDef.scheme}].[${fkDef.targetTableDef.name}] (${fkDef.targetColumnNames.map(item => `[${item}]`).join(", ")})\n`;
    query += "  ON DELETE NO ACTION\n";
    query += "  ON UPDATE NO ACTION;\n";

    return query.trim();
  }

  public removeForeignKey(
    tableDef: {
      database: string;
      scheme: string;
      name: string;
    },
    fkName: string
  ): string {
    return `ALTER TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] DROP CONSTRAINT [FK_${tableDef.database}_${tableDef.scheme}_${tableDef.name}_${fkName}]`;
  }

  public addColumn(
    tableDef: { database: string; scheme: string; name: string },
    colDef: {
      name: string;
      dataType: string;
      nullable?: boolean;
      autoIncrement?: boolean;
    },
    defaultValue: any
  ): string {
    let query = "";
    query += `ALTER TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] ADD [${colDef.name}] ${colDef.dataType} ${colDef.autoIncrement ? "IDENTITY(1,1) " : ""}NULL\n`;
    query += "GO\n";
    query += `UPDATE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] SET [${colDef.name}] = ${ormHelpers.getFieldQuery(defaultValue)}\n`;
    query += "GO\n";
    query += `ALTER TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] ALTER COLUMN [${colDef.name}] ${colDef.dataType} ${colDef.autoIncrement ? "IDENTITY(1,1) " : ""}${colDef.nullable ? "NULL" : "NOT NULL"}\n`;
    return query;
  }

  public removeColumn(
    tableDef: { database: string; scheme: string; name: string },
    colName: string
  ): string {
    return `ALTER TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] DROP COLUMN ${colName}`;
  }

  public modifyColumn(
    tableDef: { database: string; scheme: string; name: string },
    colDef: {
      name: string;
      dataType: string;
      nullable?: boolean;
      autoIncrement?: boolean;
    }
  ): string {
    return `ALTER TABLE [${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}] ALTER COLUMN [${colDef.name}] ${colDef.dataType} ${colDef.autoIncrement ? "IDENTITY(1,1) " : ""}${colDef.nullable ? "NULL" : "NOT NULL"}`;
  }

  /*public dropDatabase(dbName: string): string {
    return `IF EXISTS(select * from sys.databases WHERE name='${dbName}') DROP DATABASE [${dbName}]`;
  }*/

  public clearDatabaseIfExists(dbName: string): string {
    return `
IF EXISTS(select * from sys.databases WHERE name='${dbName}')
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = N'';
    
  -- 프록시저 초기화
  SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
  FROM [${dbName}].sys.sql_modules m
  INNER JOIN [${dbName}].sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%PROCEDURE%'
    
  -- 함수 초기화
  SELECT @sql = @sql + 'DROP FUNCTION [${dbName}].[dbo].' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) + N';' + CHAR(13) + CHAR(10)
  FROM [${dbName}].sys.sql_modules m
  INNER JOIN [${dbName}].sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%function%'
    
  -- 뷰 초기화
  SELECT @sql = @sql + 'DROP VIEW [${dbName}].[dbo].' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(v.name) + N';' + CHAR(13) + CHAR(10)
  FROM [${dbName}].sys.views v
    
  -- 테이블 FK 끊기 초기화
  SELECT @sql = @sql + N'ALTER TABLE [${dbName}].[dbo].' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM [${dbName}].sys.tables [tbl]
  INNER JOIN [${dbName}].sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'

  -- 테이블 삭제
  SELECT @sql = @sql + N'DROP TABLE [${dbName}].[dbo].' + QUOTENAME([tbl].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM [${dbName}].sys.tables [tbl]
  WHERE [type]= 'U'

  EXEC(@sql);
END`.trim();
  }
}