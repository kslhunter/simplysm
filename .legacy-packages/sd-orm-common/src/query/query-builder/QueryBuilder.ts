import { NeverEntryError, Uuid } from "@simplysm/sd-core-common";
import { QueryHelper } from "./QueryHelper";
import type { TDbContextOption } from "../../DbContext";
import { SdOrmUtils } from "../../utils/SdOrmUtils";
import type {
  IAddColumnQueryDef,
  IAddForeignKeyQueryDef,
  IAddPrimaryKeyQueryDef,
  IClearDatabaseIfExistsQueryDef,
  IConfigForeignKeyCheckQueryDef,
  IConfigIdentityInsertQueryDef,
  ICreateDatabaseIfNotExistsQueryDef,
  ICreateIndexQueryDef,
  ICreateProcedureQueryDef,
  ICreateTableQueryDef,
  ICreateViewQueryDef,
  IDeleteQueryDef,
  IDropIndexQueryDef,
  IDropPrimaryKeyQueryDef,
  IDropTableQueryDef,
  IExecuteProcedureQueryDef,
  IGetDatabaseInfoDef,
  IGetTableColumnInfosDef,
  IGetTableForeignKeysDef,
  IGetTableIndexesDef,
  IGetTableInfoDef,
  IGetTableInfosDef,
  IGetTablePrimaryKeysDef,
  IInsertIfNotExistsQueryDef,
  IInsertIntoQueryDef,
  IInsertQueryDef,
  IJoinQueryDef,
  IModifyColumnQueryDef,
  IQueryColumnDef,
  IQueryTableNameDef,
  IRemoveColumnQueryDef,
  IRemoveForeignKeyQueryDef,
  IRenameColumnQueryDef,
  ISelectQueryDef,
  ITruncateTableQueryDef,
  IUpdateQueryDef,
  IUpsertQueryDef,
  TQueryBuilderValue,
  TQueryDef,
} from "./types";

export class QueryBuilder {
  qh: QueryHelper;

  constructor(private readonly _dialect: TDbContextOption["dialect"]) {
    this.qh = new QueryHelper(this._dialect);
  }

  // ----------------------------------------------------
  // DATABASE
  // ----------------------------------------------------
  // region DATABASE

  createDatabaseIfNotExists(def: ICreateDatabaseIfNotExistsQueryDef): string {
    if (this._dialect === "mysql") {
      return `
CREATE DATABASE IF NOT EXISTS ${this.wrap(def.database)};
ALTER DATABASE ${this.wrap(def.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;`.trim();
    } else if (this._dialect === "mssql-azure") {
      return `IF NOT EXISTS(SELECT * FROM sys.databases WHERE name='${def.database}') CREATE DATABASE ${this.wrap(
        def.database,
      )} COLLATE Korean_Wansung_CS_AS (EDITION='Basic', SERVICE_OBJECTIVE='Basic', MAXSIZE = 2 GB)`.trim();
    } else {
      return `IF NOT EXISTS(SELECT * FROM sys.databases WHERE name = '${def.database}') CREATE DATABASE ${this.wrap(
        def.database,
      )} COLLATE Korean_Wansung_CS_AS`;
    }
  }

  clearDatabaseIfExists(def: IClearDatabaseIfExistsQueryDef): string {
    if (this._dialect === "mysql") {
      return `
DROP DATABASE IF EXISTS ${this.wrap(def.database)};
CREATE DATABASE IF NOT EXISTS ${this.wrap(def.database)};
ALTER DATABASE ${this.wrap(def.database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;`;
    } else if (this._dialect === "mssql-azure") {
      return `
IF EXISTS(select * from sys.databases WHERE name='${def.database}')
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = N'';

  -- 프록시저 초기화
  SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
  FROM sys.sql_modules m
  INNER JOIN sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%PROCEDURE%'
  AND SCHEMA_NAME(schema_id) <> 'sys'

  -- 함수 초기화
  SELECT @sql = @sql + 'DROP FUNCTION ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) + N';' + CHAR(13) + CHAR(10)
  FROM sys.sql_modules m
  INNER JOIN sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%function%'
  AND SCHEMA_NAME(schema_id) <> 'sys'

  -- 뷰 초기화
  SELECT @sql = @sql + 'DROP VIEW ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(v.name) + N';' + CHAR(13) + CHAR(10)
  FROM sys.views v
  WHERE SCHEMA_NAME(schema_id) <> 'sys'

  -- 테이블 FK 끊기 초기화
  SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME([tbl].schema_id)) + '.' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM sys.tables [tbl]
  INNER JOIN sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'

  -- 테이블 삭제
  SELECT @sql = @sql + N'DROP TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME([tbl].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM sys.tables [tbl]
  WHERE [type]= 'U'

  EXEC(@sql);
END`.trim();
    } else {
      return `
IF EXISTS(select * from sys.databases WHERE name='${def.database}')
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = N'';

  -- 프록시저 초기화
  SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(sch.name) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.sql_modules m
  INNER JOIN ${this.wrap(def.database)}.sys.objects o ON m.object_id=o.object_id
  INNER JOIN ${this.wrap(def.database)}.sys.schemas sch ON sch.schema_id = [o].schema_id
  WHERE type_desc like '%PROCEDURE%'

  -- 함수 초기화
  SELECT @sql = @sql + 'DROP FUNCTION ${this.wrap(def.database)}.' + QUOTENAME(sch.name) + '.' + QUOTENAME(o.name) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.sql_modules m
  INNER JOIN ${this.wrap(def.database)}.sys.objects o ON m.object_id=o.object_id
  INNER JOIN ${this.wrap(def.database)}.sys.schemas sch ON sch.schema_id = [o].schema_id
  WHERE type_desc like '%function%' AND sch.name <> 'sys'

  -- 뷰 초기화
  SELECT @sql = @sql + 'DROP VIEW ' + QUOTENAME(sch.name) + '.' + QUOTENAME(v.name) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.views v
  INNER JOIN ${this.wrap(def.database)}.sys.schemas sch ON sch.schema_id = [v].schema_id
  WHERE sch.name <> 'sys'

  -- 테이블 FK 끊기 초기화
  SELECT @sql = @sql + N'ALTER TABLE ${this.wrap(def.database)}.' + QUOTENAME(sch.name) + '.' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.tables [tbl]
  INNER JOIN ${this.wrap(def.database)}.sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'
  INNER JOIN ${this.wrap(def.database)}.sys.schemas sch ON sch.schema_id = [tbl].schema_id

  -- 테이블 삭제
  SELECT @sql = @sql + N'DROP TABLE ${this.wrap(def.database)}.' + QUOTENAME(sch.name) + '.' + QUOTENAME([tbl].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.tables [tbl]
  INNER JOIN ${this.wrap(def.database)}.sys.schemas sch ON sch.schema_id = [tbl].schema_id
  WHERE [type]= 'U'

  EXEC(@sql);
END`.trim();
    }
  }

  getDatabaseInfo(def: IGetDatabaseInfoDef): string {
    if (this._dialect === "mysql") {
      return `SELECT * FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${def.database}'`.trim();
    } else {
      return `SELECT * FROM dbo.sysdatabases WHERE name='${def.database}'`.trim();
    }
  }

  getTableInfos(def?: IGetTableInfosDef): string {
    if (this._dialect === "mysql") {
      if (def?.database === undefined) throw new NeverEntryError();
      return `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${def.database}'`.trim();
    } else if (this._dialect === "mssql-azure") {
      return `SELECT * FROM [INFORMATION_SCHEMA].[TABLES]${
        def?.schema !== undefined ? ` WHERE TABLE_SCHEMA='${def.schema}'` : ""
      }`.trim();
    } else {
      if (def?.database === undefined) throw new NeverEntryError();
      return `SELECT * FROM ${this.wrap(def.database)}.[INFORMATION_SCHEMA].[TABLES]${
        def.schema !== undefined ? ` WHERE TABLE_SCHEMA='${def.schema}'` : ""
      }`.trim();
    }
  }

  getTableInfo(def: IGetTableInfoDef): string {
    if (this._dialect === "sqlite") {
      return `SELECT * FROM sqlite_master WHERE type='table' AND name='${def.table.name}'`.trim();
    } else if (this._dialect === "mysql") {
      if (def.table.database === undefined) throw new NeverEntryError();

      return `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${def.table.database}' AND TABLE_NAME='${def.table.name}'`.trim();
    } else if (this._dialect === "mssql-azure") {
      if (def.table.schema === undefined) throw new NeverEntryError();

      return `SELECT * FROM [INFORMATION_SCHEMA].[TABLES] WHERE TABLE_SCHEMA='${def.table.schema}' AND TABLE_NAME='${def.table.name}'`.trim();
    } else {
      if (def.table.database === undefined || def.table.schema === undefined)
        throw new NeverEntryError();

      return `SELECT * FROM ${this.wrap(def.table.database)}.[INFORMATION_SCHEMA].[TABLES] WHERE TABLE_SCHEMA='${def.table.schema}' AND TABLE_NAME='${def.table.name}'`.trim();
    }
  }

  getTableColumnInfos(def: IGetTableColumnInfosDef): string {
    if (this._dialect === "mysql") {
      throw new Error("MYSQL 미구현");
    } else {
      const databaseDot = def.table.database !== undefined ? def.table.database + "." : "";
      const schemaDot = def.table.schema !== undefined ? def.table.schema + "." : "";

      return `
SELECT
  c2.COLUMN_NAME as name,
  c2.DATA_TYPE as dataType,
  c2.CHARACTER_MAXIMUM_LENGTH as length,
  c2.NUMERIC_PRECISION as precision,
  c2.NUMERIC_SCALE as digits,
  c.is_nullable as nullable,
  c.is_identity as autoIncrement
FROM ${databaseDot}sys.columns c
INNER JOIN  ${databaseDot}[INFORMATION_SCHEMA].[COLUMNS] c2 ON OBJECT_ID(c2.TABLE_CATALOG + '.' + c2.TABLE_SCHEMA + '.' + c2.TABLE_NAME) = c.object_id AND c2.ORDINAL_POSITION = c.column_id
WHERE c.object_id = OBJECT_ID('${databaseDot}${schemaDot}${def.table.name}')
`.trim();
    }
  }

  getTablePrimaryKeys(def: IGetTablePrimaryKeysDef): string {
    if (this._dialect === "mysql") {
      throw new Error("MYSQL 미구현");
    } else {
      const databaseDot = def.table.database !== undefined ? def.table.database + "." : "";
      const schemaDot = def.table.schema !== undefined ? def.table.schema + "." : "";

      return `
SELECT c.name as name
FROM ${databaseDot}sys.indexes i
INNER JOIN ${databaseDot}sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN ${databaseDot}sys.columns c ON ic.object_id = c.object_id AND c.column_id = ic.column_id
WHERE i.type = 1 AND i.object_id = OBJECT_ID('${databaseDot}${schemaDot}${def.table.name}')
ORDER BY ic.key_ordinal;
`.trim();
    }
  }

  getTableForeignKeys(def: IGetTableForeignKeysDef): string {
    if (this._dialect === "mysql") {
      throw new Error("MYSQL 미구현");
    } else {
      const databaseDot = def.table.database !== undefined ? def.table.database + "." : "";
      const schemaDot = def.table.schema !== undefined ? def.table.schema + "." : "";

      return `
SELECT
  f.name as name,
  sc.name as sourceColumnName,
  ts.name as targetSchemaName,
  tt.name as targetTableName
FROM SIMPLYSM_TS.sys.foreign_keys f
INNER JOIN SIMPLYSM_TS.sys.foreign_key_columns fc ON f.object_id = fc.constraint_object_id
INNER JOIN SIMPLYSM_TS.sys.columns sc ON sc.object_id = fc.parent_object_id AND sc.column_id = fc.parent_column_id
INNER JOIN SIMPLYSM_TS.sys.tables tt ON tt.object_id = f.referenced_object_id
INNER JOIN SIMPLYSM_TS.sys.schemas ts ON ts.schema_id = tt.schema_id
WHERE f.parent_object_id = OBJECT_ID('${databaseDot}${schemaDot}${def.table.name}')
ORDER BY f.object_id, fc.constraint_column_id
`.trim();
    }
  }

  getTableIndexes(def: IGetTableIndexesDef): string {
    if (this._dialect === "mysql") {
      throw new Error("MYSQL 미구현");
    } else {
      const databaseDot = def.table.database !== undefined ? def.table.database + "." : "";
      const schemaDot = def.table.schema !== undefined ? def.table.schema + "." : "";

      return `
SELECT
  i.name as name,
  c.name as columnName,
  ic.is_descending_key as isDesc
FROM ${databaseDot}sys.indexes i
INNER JOIN ${databaseDot}sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN ${databaseDot}sys.columns c ON ic.object_id = c.object_id AND c.column_id = ic.column_id
WHERE i.type = 2 AND i.object_id = OBJECT_ID('${databaseDot}${schemaDot}${def.table.name}')
ORDER BY i.index_id, ic.key_ordinal;
`.trim();
    }
  }

  createTable(def: ICreateTableQueryDef): string {
    const tableName = this.getTableName(def.table);

    let query = "";
    query += `CREATE TABLE ${tableName}
              (  `;
    const colDefs = def.columns.map((colDef) => ({
      ...colDef,
      pkOrderBy: def.primaryKeys.single((pk) => pk.columnName === colDef.name)?.orderBy,
    }));

    query += colDefs.map((colDef) => "  " + this._getQueryOfColDef(colDef)).join(",\n");
    if (this._dialect === "sqlite") {
    } else if (def.primaryKeys.length > 0) {
      query += ",\n";
      if (this._dialect === "mysql") {
        query += `  PRIMARY KEY (${def.primaryKeys
          .map(
            (item) =>
              `${this.wrap(item.columnName) + (item.orderBy === "ASC" ? "" : ` ${item.orderBy}`)}`,
          )
          .join(", ")})\n`;
      } else {
        const pkName = this.wrap(`PK_${def.table.name}`);
        query += `  CONSTRAINT ${pkName} PRIMARY KEY (${def.primaryKeys
          .map(
            (item) =>
              this.wrap(item.columnName) + (item.orderBy === "ASC" ? "" : ` ${item.orderBy}`),
          )
          .join(", ")})\n`;
      }
    } else {
      query += "\n";
    }
    query += ");";
    return query.trim();
  }

  createView(def: ICreateViewQueryDef): string {
    const tableName = this.getTableNameWithoutDatabase(def.table);
    const query = `
USE ${def.table.database};

DECLARE @sql NVARCHAR(MAX) = N'

CREATE VIEW ${tableName} AS\n${this.query({ type: "select", ...def.queryDef }).replace(/'/g, "''")}

';

EXEC(@sql);`;
    return query.trim();
  }

  createProcedure(def: ICreateProcedureQueryDef): string {
    const tableName = this.getTableNameWithoutDatabase(def.table);

    let query = `
USE ${def.table.database};

DECLARE @sql NVARCHAR(MAX) = N'

CREATE PROCEDURE ${tableName}
  ${def.columns.map((colDef) => "  " + this._getQueryOfProcedureColDef(colDef)).join(",\r\n")}
AS
BEGIN
SET NOCOUNT ON
BEGIN TRY
  ${def.procedure.replace(/'/g, "''")}
END TRY
BEGIN CATCH
  DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
  THROW 50000, @ErrMsg, 1;
END CATCH
END

';

EXEC(@sql);
`;
    return query.trim();
  }

  executeProcedure(def: IExecuteProcedureQueryDef): string {
    const procedureName = this.getTableName(def.procedure);

    let query = `

EXEC ${procedureName}
  ${Object.keys(def.record)
    .map((key) => `@${key} = ${def.record[key]}`)
    .join(", ")};

`;
    return query.trim();
  }

  dropTable(def: IDropTableQueryDef): string {
    const tableName = this.getTableName(def.table);
    return `DROP TABLE ${tableName}`;
  }

  addColumn(def: IAddColumnQueryDef): string[] {
    const tableName = this.getTableName(def.table);

    const queries: string[] = [];
    if (!def.column.nullable && def.column.defaultValue !== undefined) {
      queries.push(`ALTER TABLE ${tableName}
          ADD ${this._getQueryOfColDef({
            ...def.column,
            nullable: true,
          })}`);
      queries.push(`UPDATE ${tableName}
                    SET ${this.wrap(def.column.name)} = ${this.getQueryOfQueryValue(def.column.defaultValue)}`);
      queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this._getQueryOfColDef(def.column)}`);
    } else {
      queries.push(`ALTER TABLE ${tableName}
          ADD ${this._getQueryOfColDef(def.column)}`);
    }

    return queries;
  }

  removeColumn(def: IRemoveColumnQueryDef): string {
    const tableName = this.getTableName(def.table);
    return `ALTER TABLE ${tableName} DROP COLUMN ${this.wrap(def.column)}`;
  }

  modifyColumn(def: IModifyColumnQueryDef): string[] {
    if (this._dialect === "mysql") {
      const tableName = this.getTableName(def.table);

      const queries: string[] = [];
      if (!def.column.nullable && def.column.defaultValue !== undefined) {
        queries.push(
          `ALTER TABLE ${tableName} MODIFY COLUMN ${this._getQueryOfColDef({
            ...def.column,
            nullable: true,
          })}`,
        );
        queries.push(
          `UPDATE ${tableName}
           SET ${this.wrap(def.column.name)} = ${this.getQueryOfQueryValue(def.column.defaultValue)}
           WHERE ${this.wrap(def.column.name)} IS NULL`,
        );
      }
      queries.push(`ALTER TABLE ${tableName} MODIFY COLUMN ${this._getQueryOfColDef(def.column)}`);
      return queries;
    } else {
      const tableName = this.getTableName(def.table);

      const queries: string[] = [];
      if (!def.column.nullable && def.column.defaultValue !== undefined) {
        queries.push(
          `ALTER TABLE ${tableName} ALTER COLUMN ${this._getQueryOfColDef({
            ...def.column,
            nullable: true,
          })}`,
        );
        queries.push(`UPDATE ${tableName}
                      SET ${this.wrap(def.column.name)} = ${this.getQueryOfQueryValue(def.column.defaultValue)}
                      WHERE ${this.wrap(def.column.name)} IS NULL`);
      }
      queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this._getQueryOfColDef(def.column)}`);
      return queries;
    }
  }

  renameColumn(def: IRenameColumnQueryDef): string {
    if (this._dialect === "mysql") {
      const tableName = this.getTableName(def.table);
      return `ALTER TABLE ${tableName} RENAME COLUMN ${this.wrap(def.prevName)} TO ${this.wrap(def.nextName)}`;
    } else if (this._dialect === "mssql-azure") {
      if (def.table.schema === undefined) throw new NeverEntryError();
      return `EXECUTE sp_rename N'${def.table.schema}.${def.table.name}.${this.wrap(def.prevName)}', N'${def.nextName}', 'COLUMN'`;
    } else {
      if (def.table.database === undefined || def.table.schema === undefined)
        throw new NeverEntryError();
      return `EXECUTE ${def.table.database}..sp_rename N'${def.table.schema}.${def.table.name}.${this.wrap(
        def.prevName,
      )}', N'${def.nextName}', 'COLUMN'`;
    }
  }

  dropPrimaryKey(def: IDropPrimaryKeyQueryDef): string {
    if (this._dialect === "mysql") {
      throw new Error("MYSQL 미구현");
    } else {
      const databaseDot = def.table.database !== undefined ? def.table.database + "." : "";
      const schemaDot = def.table.schema !== undefined ? def.table.schema + "." : "";

      return `ALTER TABLE ${databaseDot}${schemaDot}${def.table.name} DROP CONSTRAINT PK_${def.table.name}`;
    }
  }

  addPrimaryKey(def: IAddPrimaryKeyQueryDef): string {
    if (this._dialect === "mysql") {
      throw new Error("MYSQL 미구현");
    } else {
      const databaseDot = def.table.database !== undefined ? def.table.database + "." : "";
      const schemaDot = def.table.schema !== undefined ? def.table.schema + "." : "";

      return `ALTER TABLE ${databaseDot}${schemaDot}${def.table.name} ADD CONSTRAINT PK_${def.table.name} PRIMARY KEY (${def.columns
        .map((item) => this.wrap(item))
        .join(", ")})`;
    }
  }

  addForeignKey(def: IAddForeignKeyQueryDef): string {
    if (this._dialect === "sqlite") {
      const tableName = this.getTableNameChain(def.table).join(".");
      const tableNameChain = this.getTableNameChain(def.table);
      const tableKey =
        tableNameChain.join("_").length > 30
          ? tableNameChain.join("_").replace(/[a-z]/g, "")
          : tableNameChain.join("_");

      const fkName = this.wrap(`FK_${tableKey}_${def.foreignKey.name}`);
      const targetTableName = this.getTableName(def.foreignKey.targetTable);

      return `
pragma writable_schema=1;
UPDATE sqlite_master
SET sql = SUBSTR(sql, 1, LENGTH(sql) - 1) || ',
  CONSTRAINT ${fkName} FOREIGN KEY (${def.foreignKey.fkColumns
    .map((columnName) => `${this.wrap(columnName)}`)
    .join(", ")})
    REFERENCES ${targetTableName}(${def.foreignKey.targetPkColumns
      .map((columnName) => `${this.wrap(columnName)}`)
      .join(", ")})
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
)'
WHERE name = '${tableName}' AND type = 'table'
RETURNING *;
pragma writable_schema=0;`.trim();
    } else {
      const tableName = this.getTableName(def.table);
      const tableNameChain = this.getTableNameChain(def.table);
      const tableKey =
        this._dialect === "mysql" && tableNameChain.join("_").length > 30
          ? tableNameChain.join("_").replace(/[a-z]/g, "")
          : tableNameChain.join("_");

      const fkName = this.wrap(`FK_${tableKey}_${def.foreignKey.name}`);
      const targetTableName = this.getTableName(def.foreignKey.targetTable);

      const action = this._dialect === "mssql" ? "NO ACTION" : "RESTRICT";

      let query = "";
      query += `ALTER TABLE ${tableName}
          ADD CONSTRAINT ${fkName} FOREIGN KEY (${def.foreignKey.fkColumns
            .map((columnName) => `${this.wrap(columnName)}`)
            .join(", ")})  `;
      query += `  REFERENCES ${targetTableName} (${def.foreignKey.targetPkColumns
        .map((columnName) => `${this.wrap(columnName)}`)
        .join(", ")})\n`;
      query += `  ON DELETE ${action}\n`;
      query += `  ON UPDATE ${action};`;
      return query.trim();
    }
  }

  removeForeignKey(def: IRemoveForeignKeyQueryDef): string {
    const tableName = this.getTableName(def.table);
    const tableNameChain = this.getTableNameChain(def.table);
    const tableKey =
      this._dialect === "mysql" && tableNameChain.join("_").length > 30
        ? tableNameChain.join("_").replace(/[a-z]/g, "")
        : tableNameChain.join("_");

    const fkName = this.wrap(`FK_${tableKey}_${def.foreignKey}`);

    return `ALTER TABLE ${tableName} DROP CONSTRAINT ${fkName};`;
  }

  createIndex(def: ICreateIndexQueryDef): string {
    const tableName = this.getTableName(def.table);
    const tableNameChain =
      this._dialect === "mysql"
        ? this.getTableNameChain(def.table)
        : this.getTableNameChain(def.table).slice(-2);
    const tableKey =
      this._dialect === "mysql" && tableNameChain.join("_").length > 30
        ? tableNameChain.join("_").replace(/[a-z]/g, "")
        : tableNameChain.join("_");
    const isUnique = def.index.columns.some((item) => item.unique);

    const idxName = this.wrap(`${isUnique ? "UDX" : "IDX"}_${tableKey}_${def.index.name}`);

    return `CREATE
    ${isUnique ? "UNIQUE " : ""}INDEX
    ${idxName}
    ON
    ${tableName}
    (
    ${def.index.columns.map((item) => `${this.wrap(item.name)} ${item.orderBy}`).join(", ")}
    );`;
  }

  dropIndex(def: IDropIndexQueryDef): string {
    const tableName = this.getTableName(def.table);
    const tableNameChain =
      this._dialect === "mysql"
        ? this.getTableNameChain(def.table)
        : this.getTableNameChain(def.table).slice(-2);
    const tableKey =
      this._dialect === "mysql" && tableNameChain.join("_").length > 30
        ? tableNameChain.join("_").replace(/[a-z]/g, "")
        : tableNameChain.join("_");

    const idxName = this.wrap(`IDX_${tableKey}_${def.index}`);

    return `DROP INDEX ${idxName} ON ${tableName};`;
  }

  configIdentityInsert(def: IConfigIdentityInsertQueryDef): string {
    const tableName = this.getTableName(def.table);
    return `SET IDENTITY_INSERT ${tableName} ${def.state.toUpperCase()}`;
  }

  configForeignKeyCheck(def: IConfigForeignKeyCheckQueryDef): string {
    if (this._dialect === "mysql") {
      return `SET foreign_key_checks=${def.useCheck ? 1 : 0};`;
    } else {
      const tableName = this.getTableName(def.table);
      return `ALTER TABLE ${tableName} ${def.useCheck ? "" : "NO"} CHECK CONSTRAINT ALL;`;
    }
  }

  // endregion

  // ----------------------------------------------------
  // TABLE
  // ----------------------------------------------------
  // region TABLE

  select(def: ISelectQueryDef): string {
    if (def.top !== undefined && def.limit) {
      throw new Error("TOP과 LIMIT은 함께사용할 수 없습니다.");
    }

    let q = "SELECT";

    if (def.distinct) {
      q += " DISTINCT";
    }

    if (this._dialect === "mssql" || this._dialect === "mssql-azure") {
      if (def.top !== undefined) {
        q += ` TOP ${def.top}`;
      }
    }

    // SELECT FIELDS

    if (def.select) {
      q += "\n";
      const selectFieldQueryStrings: string[] = [];
      for (const selectKey of Object.keys(def.select)) {
        const selectValue = def.select[selectKey] as TQueryBuilderValue | undefined;

        if ((selectValue as Record<string, any> | undefined)?.["from"] !== undefined) {
          const selectQueryDef = selectValue as ISelectQueryDef;
          let subQuery = "  (\n";
          subQuery += "    " + this.select(selectQueryDef).replace(/\n/g, "\n    ") + "\n";
          subQuery += `  ) as ${selectKey}`;
          selectFieldQueryStrings.push(subQuery);
        } else {
          selectFieldQueryStrings.push(
            `  ${this.getQueryOfQueryValue(def.select[selectKey])} as ${selectKey}`,
          );
        }
      }
      q += selectFieldQueryStrings.join(",\n");
      q += "\n";
    } else {
      q += " *\n";
    }

    // FROM
    if (def.from instanceof Array) {
      q += "FROM (\n";
      for (const from of def.from) {
        q += "  " + this.select(from).replace(/\n/g, "\n  ");
        q += "\n\n  UNION ALL\n\n";
      }
      q = q.slice(0, -14);
      q += ")";
    } else if ((def.from as Record<string, any> | undefined)?.["from"] !== undefined) {
      const fromQueryDef = def.from as ISelectQueryDef;
      q += "FROM (\n";
      q += "  " + this.select(fromQueryDef).replace(/\n/g, "\n  ") + "\n";
      q += ")";
    } else if (def.from !== undefined) {
      q += `FROM ${def.from as string}`;
    }

    if (def.from !== undefined && def.as !== undefined) {
      q += ` as ${def.as}`;
    }

    if (this._dialect !== "mysql" && typeof def.from === "string" && def.lock) {
      q += " with (UPDLOCK)";
    }
    q += "\n";

    // PIVOT

    if (this._dialect !== "mysql") {
      if (def.pivot) {
        let valueCol = this.getQueryOfQueryValue(def.pivot.valueColumn);
        valueCol =
          valueCol.startsWith("(") && valueCol.endsWith(")") ? valueCol.slice(1, -1) : valueCol;
        q += `PIVOT (${valueCol} FOR ${this.getQueryOfQueryValue(def.pivot.pivotColumn)}`;
        q += ` IN (${def.pivot.pivotKeys.map((key) => this.wrap(key)).join(", ")}))${
          def.as !== undefined ? ` as ${def.as}` : ""
        }`;
        q += "\n";
      }
    }

    // UNPIVOT

    if (def.unpivot) {
      let valueCol = this.getQueryOfQueryValue(def.unpivot.valueColumn);
      valueCol =
        valueCol.startsWith("(") && valueCol.endsWith(")") ? valueCol.slice(1, -1) : valueCol;
      q += `UNPIVOT (${valueCol} FOR ${this.getQueryOfQueryValue(def.unpivot.pivotColumn)}`;
      q += ` IN (${def.unpivot.pivotKeys.map((key) => this.wrap(key)).join(", ")}))${
        def.as !== undefined ? ` as ${def.as}` : ""
      }`;
      q += "\n";
    }

    // JOIN

    if (def.join && def.join.length > 0) {
      for (const joinDef of def.join) {
        q += this._getQueryOfJoinDef(joinDef);
        q += "\n";
      }
    }

    // WHERE

    if (def.where) {
      q += `WHERE ${def.where.map((item) => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    // GROUP BY

    if (def.groupBy && def.groupBy.length > 0) {
      q += `GROUP BY ${def.groupBy.map((item) => this.getQueryOfQueryValue(item)).join(", ")}`;
      q += "\n";
    }

    // HAVING

    if (def.having) {
      if (!(def.groupBy && def.groupBy.length > 0)) {
        throw new Error("'HAVING'을 사용하려면, 'GROUP BY'를 반드시 설정해야 합니다.");
      }

      q += `HAVING ${def.having.map((item) => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    // ORDER BY

    if (def.orderBy && def.orderBy.length > 0) {
      q += `ORDER BY ${def.orderBy.map((item) => this.getQueryOfQueryValue(item[0]) + " " + item[1]).join(", ")}`;
      q += "\n";
    }

    // LIMIT

    if (def.limit) {
      if (!(def.orderBy && def.orderBy.length > 0)) {
        throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
      }

      if (this._dialect === "mssql" || this._dialect === "mssql-azure") {
        q += `OFFSET ${def.limit[0]} ROWS FETCH NEXT ${def.limit[1]} ROWS ONLY`;
        q += "\n";
      } else {
        q += `LIMIT ${def.limit[0]}, ${def.limit[1]}`;
        q += "\n";
      }
    }

    if (this._dialect !== "mssql" && this._dialect !== "mssql-azure") {
      if (def.top !== undefined) {
        q += `LIMIT ${def.top}`;
        q += "\n";
      }
    }

    if (this._dialect === "mysql" && typeof def.from === "string" && def.lock) {
      q += " FOR UPDATE";
    }

    // SAMPLE

    if (def.sample !== undefined) {
      if (this._dialect === "mssql") {
        q += `TABLESAMPLE (${def.sample} ROWS)`;
        q += "\n";
      } else {
        throw new Error("'select > sample'의 경우 mssql만 구현되어 있습니다.");
      }
    }

    return q.trim();
  }

  insertInto(def: IInsertIntoQueryDef): string {
    let q = "";
    q += `INSERT INTO ${def.target} (${Object.keys(def.select).join(", ")})`;
    q += "\n";

    q += this.select(def);

    return q.trim() + ";";
  }

  insert(def: IInsertQueryDef): string {
    let q = "";
    q += `INSERT INTO ${def.from} (${Object.keys(def.record).join(", ")})`;
    q += "\n";

    if (this._dialect === "mssql" || this._dialect === "mssql-azure") {
      if (def.output) {
        q += `OUTPUT ${def.output.map((item) => "INSERTED." + item).join(", ")}`;
        q += "\n";
      }
    }

    q += `VALUES (${Object.values(def.record)
      .map((val) => this.getQueryOfQueryValue(val))
      .join(", ")})`;
    q += "\n";

    if (this._dialect === "sqlite") {
      if (def.output) {
        q += `RETURNING ${def.output.join(", ")}`;
        q += "\n";
      }
    }

    return q.trim() + ";";
  }

  update(def: IUpdateQueryDef): string {
    if (this._dialect === "sqlite") {
      if (def.join && def.join.length > 0) {
        throw new Error("sqlite - update - join 미구현");
      } else if (def.limit || def.top !== undefined) {
        throw new Error("sqlite - update - limit, top 미구현");
      }
    }

    if (def.as === undefined) throw new NeverEntryError();

    if (def.top !== undefined && def.limit) {
      throw new Error("TOP과 LIMIT은 함께사용할 수 없습니다.");
    }

    let q = "";

    // LINE 1
    q += "UPDATE";
    if (this._dialect === "mssql" || this._dialect === "mssql-azure") {
      if (def.top !== undefined) {
        q += ` TOP (${def.top})`;
      }
    }

    if (this._dialect !== "mssql" && this._dialect !== "mssql-azure") {
      // FROM, AS
      q += ` ${def.from} as ${def.as}`;
      q += "\n";

      // JOIN
      if (def.join && def.join.length > 0) {
        for (const joinDef of def.join) {
          q += this._getQueryOfJoinDef(joinDef);
          q += "\n";
        }
      }
      q += "SET";
      q += "\n";
    } else {
      q += ` ${def.as} SET`;
      q += "\n";
    }

    // FIELD = VALUE
    q += Object.keys(def.record)
      .map(
        (key) =>
          `  ${this._dialect === "sqlite" ? "" : def.as! + "."}${key} = ${this.getQueryOfQueryValue(def.record[key])}`,
      )
      .join(",\n");
    q += "\n";

    // OUTPUT
    if (this._dialect === "mssql" || this._dialect === "mssql-azure") {
      if (def.output) {
        q += `OUTPUT ${def.output.map((item) => "INSERTED." + item).join(", ")}`;
        q += "\n";
      }
    }

    if (this._dialect === "mssql" || this._dialect === "mssql-azure") {
      // FROM, AS
      q += `FROM ${def.from} as ${def.as}`;
      q += "\n";

      // JOIN
      if (def.join && def.join.length > 0) {
        for (const joinDef of def.join) {
          q += this._getQueryOfJoinDef(joinDef);
          q += "\n";
        }
      }
    }

    // WHERE
    if (def.where) {
      q += `WHERE ${def.where.map((item) => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    if (this._dialect !== "mssql" && this._dialect !== "mssql-azure") {
      if (def.top !== undefined) {
        q += `LIMIT ${def.top}`;
        q += "\n";
      }
    }

    if (this._dialect === "sqlite") {
      if (def.output) {
        q += `RETURNING ${def.output.join(", ")}`;
        q += "\n";
      }
    }
    return q.trim() + ";";
  }

  insertIfNotExists(def: IInsertIfNotExistsQueryDef): string {
    if (this._dialect === "mysql") {
      throw new Error("MYSQL 미구현");
    } else {
      let q = "";

      // LINE 1
      q += `MERGE ${def.from} as ${def.as}`;
      q += "\n";

      // USING
      q += "USING (SELECT 0 as _using) as _using";
      q += "\n";

      // WHERE
      q += `ON ${def.where.map((item) => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";

      // INSERT
      q += "WHEN NOT MATCHED THEN\n";
      q += `  INSERT (${Object.keys(def.insertRecord).join(", ")})\n`;
      q += `  VALUES (${Object.values(def.insertRecord)
        .map((val) => this.getQueryOfQueryValue(val))
        .join(", ")})`;
      q += "\n";

      if (def.output) {
        if (this._dialect === "sqlite") {
          q += `RETURNING ${def.output.join(", ")}`;
          q += "\n";
        } else {
          q += `OUTPUT ${def.output.map((item) => "INSERTED." + item).join(", ")}`;
          q += "\n";
        }
      }

      return q.trim() + ";";
    }
  }

  upsert(def: IUpsertQueryDef): string {
    if (this._dialect === "sqlite") {
      throw new Error("sqlite - upsert 미구현");
    } else if (this._dialect === "mysql") {
      const procName = this.wrap("SD" + Uuid.new().toString().replace(/-/g, ""));

      const q = `
USE ${def.from.split(".")[0]};

CREATE PROCEDURE ${procName}()
proc_label:BEGIN

IF EXISTS (
  ${this.select(def).replace(/\n/g, "\n  ")}
) THEN

${Object.keys(def.updateRecord).length > 0 ? this.update({ ...def, record: def.updateRecord }) : "LEAVE proc_label;"}

${def.output ? this.select(def) + ";" : ""}

ELSE

${Object.keys(def.insertRecord).length > 0 ? this.insert({ ...def, record: def.insertRecord }) : "LEAVE proc_label;"}

${
  def.output
    ? this.select({
        ...def,
        where: def.pkColNames.map((pkColName) =>
          pkColName === def.aiKeyName
            ? [this.wrap(def.aiKeyName), " = ", "LAST_INSERT_ID()"]
            : [
                this.wrap(pkColName),
                " = ",
                this.getQueryOfQueryValue(def.insertRecord[this.wrap(pkColName)]),
              ],
        ),
      }) + ";"
    : ""
}

END IF;

END;
CALL ${procName};
DROP PROCEDURE ${procName};`;

      return q.trim() + ";";
    } else {
      let q = "";

      // LINE 1
      q += `MERGE ${def.from} as ${def.as}`;
      q += "\n";

      // USING
      q += "USING (SELECT 0 as _using) as _using";
      q += "\n";

      // WHERE
      q += `ON ${def.where.map((item) => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";

      // UPDATE
      if (typeof def.updateRecord !== "undefined" && Object.keys(def.updateRecord).length > 0) {
        q += "WHEN MATCHED THEN\n";
        q += "  UPDATE SET\n";
        q += Object.keys(def.updateRecord)
          .map((key) => `    ${key} = ${this.getQueryOfQueryValue(def.updateRecord[key])}`)
          .join(",\n");
        q += "\n";
      }

      // INSERT
      q += "WHEN NOT MATCHED THEN\n";
      q += `  INSERT (${Object.keys(def.insertRecord).join(", ")})\n`;
      q += `  VALUES (${Object.values(def.insertRecord)
        .map((val) => this.getQueryOfQueryValue(val))
        .join(", ")})`;
      q += "\n";

      if (def.output) {
        q += `OUTPUT ${def.output.map((item) => "INSERTED." + item).join(", ")}`;
        q += "\n";
      }

      return q.trim() + ";";
    }
  }

  delete(def: IDeleteQueryDef): string {
    if (def.as === undefined) throw new NeverEntryError();

    if (this._dialect === "mysql") {
      if (!def.output && !def.join && !def.limit && def.top === undefined) {
        // Simple delete query for basic cases
        let q = `DELETE FROM ${def.from} as ${def.as}`;
        if (def.where) {
          q += `\nWHERE ${def.where.map((item) => this.getQueryOfQueryValue(item)).join("")}`;
        }
        return q.trim() + ";";
      } else {
        const selectQ = this.select(def)
          .replace(/\n/g, "\n  ")
          .replace("*", def.as + ".*");
        const deleteQ = SdOrmUtils.replaceString(/* language=mysql*/ `
          DELETE ${def.as}
          FROM ${def.from} as ${def.as}
                 JOIN (${selectQ}) ${"`_" + def.as.slice(1)} ON 1 = 1
          WHERE `);

        return `
USE ${def.from.split(".")[0]};

/*SET foreign_key_checks=0;*/

SET @cols = NULL;

SELECT GROUP_CONCAT('${"`_" + def.as.slice(1)}.\`', COLUMN_NAME, '\`', ' = ', '${def.as}.\`', COLUMN_NAME, '\`' separator ' AND ') INTO @cols
FROM INFORMATION_SCHEMA.COLUMNS
WHERE CONCAT('\`', TABLE_SCHEMA, '\`.\`', TABLE_NAME, '\`') = '${def.from}' AND COLUMN_KEY='PRI';

SET @sql = CONCAT('${deleteQ}', @cols, ';');
SELECT @sql;

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

/*SET foreign_key_checks=1;*/`.trim();
      }
    } else {
      if (this._dialect === "sqlite") {
        if (def.join && def.join.length > 0) {
          throw new Error("sqlite - update - join 미구현");
        } else if (def.limit || def.top !== undefined) {
          throw new Error("sqlite - update - limit, top 미구현");
        }
      }

      let q = "";

      // LINE 1
      q += "DELETE";
      if (def.top !== undefined) {
        q += ` TOP (${def.top})`;
      }
      q += "\n";

      if (this._dialect !== "sqlite") {
        q += ` ${def.as}`;
        q += "\n";
      }

      // OUTPUT
      if (def.output) {
        if (this._dialect === "sqlite") {
          q += `RETURNING ${def.output.map((item) => "DELETED." + item).join(", ")}`;
          q += "\n";
        } else {
          q += `OUTPUT ${def.output.map((item) => "DELETED." + item).join(", ")}`;
          q += "\n";
        }
      }

      // FROM, AS
      q += `FROM ${def.from} as ${def.as}`;
      q += "\n";

      // JOIN
      if (def.join && def.join.length > 0) {
        for (const joinDef of def.join) {
          q += this._getQueryOfJoinDef(joinDef);
          q += "\n";
        }
      }

      // WHERE
      if (def.where) {
        q += `WHERE ${def.where.map((item) => this.getQueryOfQueryValue(item)).join("")}`;
        q += "\n";
      }

      return q.trim() + ";";
    }
  }

  truncateTable(def: ITruncateTableQueryDef): string {
    const tableName = this.getTableName(def.table);
    return `TRUNCATE TABLE ${tableName}`;
  }

  // endregion

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------
  // region HELPERS

  query<T extends TQueryDef>(def: T): ReturnType<this[T["type"]]> {
    return this[def.type](def as any) as ReturnType<this[T["type"]]>;
  }

  wrap(name: string): string {
    return this._dialect === "mysql" ? "`" + name + "`" : "[" + name + "]";
  }

  getTableName(def: IQueryTableNameDef): string {
    return this.getTableNameChain(def)
      .map((item) => this.wrap(item))
      .join(".");
  }

  getTableNameWithoutDatabase(def: IQueryTableNameDef): string {
    return this.getTableNameChain(def)
      .slice(1)
      .map((item) => this.wrap(item))
      .join(".");
  }

  getTableNameChain(def: IQueryTableNameDef): string[] {
    if (this._dialect === "mysql") {
      if (def.database !== undefined) {
        return [def.database, def.name];
      } else {
        return [def.name];
      }
    } else if (this._dialect === "mssql-azure") {
      if (def.schema !== undefined) {
        return [def.schema, def.name];
      } else {
        return [def.name];
      }
    } else {
      if (def.database !== undefined) {
        if (def.schema === undefined) {
          throw new Error(
            `SCHEMA가 지정되어있지 않습니다. (DB: ${def.database}, TABLE: ${def.name})`,
          );
        }

        return [def.database, def.schema, def.name];
      } else if (def.schema !== undefined) {
        return [def.schema, def.name];
      } else {
        return [def.name];
      }
    }
  }

  getQueryOfQueryValue(queryValue: TQueryBuilderValue): string {
    if (queryValue instanceof Array) {
      return "(" + queryValue.map((item) => this.getQueryOfQueryValue(item)).join("") + ")";
    } else if ((queryValue as Record<string, any>)["from"] !== undefined) {
      let subQuery = "(\n";
      subQuery += "  " + this.select(queryValue as ISelectQueryDef).replace(/\n/g, "\n  ") + "\n";
      subQuery += ")";
      return subQuery;
    } else {
      return queryValue as string;
    }
  }

  private _getQueryOfColDef(colDef: IQueryColumnDef & { pkOrderBy?: "ASC" | "DESC" }): string {
    let q = "";

    if (this._dialect === "sqlite") {
      q += this.wrap(colDef.name) + " ";
      q += this.qh.type(colDef.dataType) + " ";
      q += colDef.pkOrderBy ? `PRIMARY KEY ${colDef.pkOrderBy} ` : "";
      q += colDef.autoIncrement
        ? this.qh.type(colDef.dataType) === "UNIQUEIDENTIFIER"
          ? "default NEWID() "
          : "AUTOINCREMENT "
        : "";
      q += colDef.autoIncrement ? "" : colDef.nullable ? "NULL " : "NOT NULL ";
    } else if (this._dialect === "mysql") {
      q += this.wrap(colDef.name) + " ";
      q += this.qh.type(colDef.dataType) + " ";
      q += colDef.nullable ? "NULL " : "NOT NULL ";
      q += colDef.autoIncrement
        ? this.qh.type(colDef.dataType) === "CHAR(38)"
          ? "default (REPLACE(UUID(), '-', '')) "
          : "AUTO_INCREMENT"
        : "";
    } else {
      q += this.wrap(colDef.name) + " ";
      q += this.qh.type(colDef.dataType) + " ";
      q += colDef.autoIncrement
        ? this.qh.type(colDef.dataType) === "UNIQUEIDENTIFIER"
          ? "default NEWID() "
          : "IDENTITY(1,1) "
        : "";
      q += colDef.nullable ? "NULL" : "NOT NULL";
    }
    return q.trim();
  }

  private _getQueryOfProcedureColDef(colDef: IQueryColumnDef): string {
    let q = "";

    q += "@" + colDef.name + " ";
    q += this.qh.type(colDef.dataType) + " ";
    if (colDef.nullable) {
      q += "= NULL";
    }
    return q.trim();
  }

  private _getQueryOfJoinDef(def: IJoinQueryDef): string {
    let q = "";

    const defRec = def as Record<string, any>;
    if (
      Object.keys(def).every(
        (key) =>
          defRec[key] === undefined ||
          ["from", "as", "where", "select", "isCustomSelect"].includes(key),
      ) &&
      !def.isCustomSelect
    ) {
      q += "LEFT OUTER JOIN ";
      if (def.from instanceof Array) {
        if (def.as === undefined) throw new NeverEntryError();

        q += "(\n";
        for (const from of def.from) {
          q += "  " + this.select(from).replace(/\n/g, "\n  ");
          q += "\n\n  UNION ALL\n\n";
        }
        q = q.slice(0, -14);
        q += `) as ${def.as}`;
      } else if ((def.from as Record<string, any> | undefined)?.["from"] !== undefined) {
        if (def.as === undefined) throw new NeverEntryError();

        q += "(\n";
        q += "  " + this.select(def.from as ISelectQueryDef).replace(/\n/g, "\n  ") + "\n";
        q += `) as ${def.as}`;
      } else {
        if (def.as === undefined) throw new NeverEntryError();
        q += `${def.from as string} as ${def.as}`;
      }

      if (def.where) {
        q += ` ON ${def.where.map((item) => this.getQueryOfQueryValue(item)).join("")}`;
      } else {
        q += " ON 1 = 1";
      }
    } else {
      if (this._dialect === "sqlite") {
        q += "LEFT OUTER JOIN (\n";
        q += "  " + this.select(def).replace(/\n/g, "\n  ") + "\n";
        q += ") as " + def.as;
      } else if (this._dialect === "mssql" || this._dialect === "mssql-azure") {
        q += "OUTER APPLY (\n";
        q += "  " + this.select(def).replace(/\n/g, "\n  ") + "\n";
        q += ") as " + def.as;
      } else {
        q += "LEFT OUTER JOIN LATERAL (\n";
        q += "  " + this.select(def).replace(/\n/g, "\n  ") + "\n";
        q += ") as " + def.as + " ON 1 = 1";
      }
    }

    return q.trim();
  }

  // endregion
}
