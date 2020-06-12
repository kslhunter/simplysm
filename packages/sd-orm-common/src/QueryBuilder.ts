import {
  IAddColumnQueryDef,
  IAddForeignKeyQueryDef,
  IClearDatabaseIfExistsQueryDef,
  IConfigIdentityInsertQueryDef,
  ICreateDatabaseIfNotExistsQueryDef,
  ICreateIndexQueryDef,
  ICreateTableQueryDef,
  IDeleteQueryDef,
  IDropTableQueryDef,
  IGetDatabaseInfoDef,
  IGetTableInfoDef,
  IInsertQueryDef, IJoinQueryDef,
  IModifyColumnQueryDef,
  IQueryColumnDef,
  IQueryTableNameDef,
  IRemoveColumnQueryDef,
  IRemoveForeignKeyQueryDef,
  IRenameColumnQueryDef,
  ISelectQueryDef,
  IUpdateQueryDef,
  IUpsertQueryDef,
  TQueryBuilderValue,
  TQueryDef
} from "./commons";
import {Uuid} from "@simplysm/sd-core-common";

export class QueryBuilder {
  public constructor(private readonly _dialect: "mssql" | "mysql" = "mssql") {
  }

  // ----------------------------------------------------
  // DATABASE
  // ----------------------------------------------------
  // region DATABASE

  public createDatabaseIfNotExists(def: ICreateDatabaseIfNotExistsQueryDef): string {
    if (this._dialect === "mysql") {
      return `
CREATE DATABASE IF NOT EXISTS ${this.wrap(def.database)};
ALTER DATABASE ${this.wrap(def.database)} CHARACTER SET utf8 COLLATE utf8_bin;`.trim();
    }
    else {
      return `IF NOT EXISTS(select * from sys.databases WHERE name='${def.database}') CREATE DATABASE ${this.wrap(def.database)}`.trim();
    }
  }

  public clearDatabaseIfExists(def: IClearDatabaseIfExistsQueryDef): string {
    if (this._dialect === "mysql") {
      const procName = this.wrap("sd_" + Uuid.new().toString().replace(/-/g, "_"));

      return `
CREATE PROCEDURE \`mysql\`.${procName}()
BEGIN
IF EXISTS (SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${def.database}') THEN
    SET @procs = NULL;
    SELECT GROUP_CONCAT(ROUTINE_SCHEMA, '.', ROUTINE_NAME) INTO @procs
    FROM information_schema.routines
    WHERE routine_type = 'PROCEDURE' AND routine_schema = '${def.database}';

    SET @procs = IFNULL(CONCAT('DROP PROCEDURE ', @procs), 'SELECT "No Procedures"');
    PREPARE stmt FROM @procs;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @views = NULL;
    SELECT GROUP_CONCAT(table_schema, '.', table_name) INTO @views
    FROM information_schema.views
    WHERE table_schema = '${def.database}';

    SET @views = IFNULL(CONCAT('DROP VIEW ', @views), 'SELECT "No Views"');
    PREPARE stmt FROM @views;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @tables = NULL;
    SELECT GROUP_CONCAT(table_schema, '.', table_name) INTO @tables
    FROM information_schema.tables
    WHERE table_schema = '${def.database}';

    SET @tables = IFNULL(CONCAT('DROP TABLE ', @tables), 'SELECT "No Tables"');
    PREPARE stmt FROM @tables;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;
END;

CALL \`mysql\`.${procName};

DROP PROCEDURE \`mysql\`.${procName};`.trim();
    }
    else {
      return `
IF EXISTS(select * from sys.databases WHERE name='${def.database}')
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = N'';
    
  -- 프록시저 초기화
  SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.sql_modules m
  INNER JOIN ${this.wrap(def.database)}.sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%PROCEDURE%'
    
  -- 함수 초기화
  SELECT @sql = @sql + 'DROP FUNCTION ${this.wrap(def.database)}.' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.sql_modules m
  INNER JOIN ${this.wrap(def.database)}.sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%function%'
    
  -- 뷰 초기화
  SELECT @sql = @sql + 'DROP VIEW ${this.wrap(def.database)}.' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(v.name) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.views v
    
  -- 테이블 FK 끊기 초기화
  SELECT @sql = @sql + N'ALTER TABLE ${this.wrap(def.database)}.' + QUOTENAME(SCHEMA_NAME([tbl].schema_id)) + '.' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.tables [tbl]
  INNER JOIN ${this.wrap(def.database)}.sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'

  -- 테이블 삭제
  SELECT @sql = @sql + N'DROP TABLE ${this.wrap(def.database)}.' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME([tbl].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.tables [tbl]
  WHERE [type]= 'U'

  EXEC(@sql);
END`.trim();
    }
  }

  public getDatabaseInfo(def: IGetDatabaseInfoDef): string {
    if (this._dialect === "mysql") {
      return `SELECT * FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='${def.database}'`.trim();
    }
    else {
      return `SELECT * FROM master.dbo.sysdatabases WHERE name='${def.database}'`.trim();
    }
  }

  public getTableInfo(def: IGetTableInfoDef): string {
    if (this._dialect === "mysql") {
      return `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${def.table.database}' AND TABLE_NAME='${def.table.name}'`.trim();
    }
    else {
      return `SELECT * FROM ${def.table.database}.INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='${def.table.schema}' AND TABLE_NAME='${def.table.name}'`.trim();
    }
  }

  public createTable(def: ICreateTableQueryDef): string {
    const tableName = this.getTableName(def.table);

    let query = "";
    query += `CREATE TABLE ${tableName} (\n`;
    query += def.columns.map(colDef => "  " + this._getQueryOfColDef(colDef)).join(",\n");
    if (def.primaryKeys.length > 0) {
      query += ",\n";
      if (this._dialect === "mysql") {
        query += `  PRIMARY KEY (${def.primaryKeys.map(item => `${this.wrap(item.columnName) + (item.orderBy === "ASC" ? "" : ` ${item.orderBy}`)}`).join(", ")})\n`;
      }
      else {
        const pkName = this.wrap(`PK_${def.table.name}`);
        query += `  CONSTRAINT ${pkName} PRIMARY KEY (${def.primaryKeys.map(item => (this.wrap(item.columnName) + (item.orderBy === "ASC" ? "" : ` ${item.orderBy}`))).join(", ")})\n`;
      }
    }
    else {
      query += "\n";
    }
    query += ");";
    return query.trim();
  }

  public dropTable(def: IDropTableQueryDef): string {
    const tableName = this.getTableName(def.table);
    return `DROP TABLE ${tableName}`;
  }

  public addColumn(def: IAddColumnQueryDef): string[] {
    const tableName = this.getTableName(def.table);

    const queries: string[] = [];
    if (!def.column.nullable && def.column.defaultValue !== undefined) {
      queries.push(`ALTER TABLE ${tableName} ADD ${this._getQueryOfColDef({
        ...def.column,
        nullable: true
      })}`);
      queries.push(`UPDATE ${tableName} SET ${this.wrap(def.column.name)} = ${this.getQueryOfQueryValue(def.column.defaultValue)}`);
      queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this._getQueryOfColDef(def.column)}`);
    }
    else {
      queries.push(`ALTER TABLE ${tableName} ADD ${this._getQueryOfColDef(def.column)}`);
    }

    return queries;
  }

  public removeColumn(def: IRemoveColumnQueryDef): string {
    const tableName = this.getTableName(def.table);
    return `ALTER TABLE ${tableName} DROP COLUMN ${this.wrap(def.column)}`;
  }

  public modifyColumn(def: IModifyColumnQueryDef): string[] {
    const tableName = this.getTableName(def.table);

    const queries: string[] = [];
    if (!def.column.nullable && def.column.defaultValue !== undefined) {
      queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this._getQueryOfColDef({
        ...def.column,
        nullable: true
      })}`);
      queries.push(`UPDATE ${tableName} SET ${this.wrap(def.column.name)} = ${this.getQueryOfQueryValue(def.column.defaultValue)} WHERE ${this.wrap(def.column.name)} IS NULL`);
    }
    queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this._getQueryOfColDef(def.column)}`);
    return queries;
  }

  public renameColumn(def: IRenameColumnQueryDef): string {
    return `EXECUTE ${def.table.database}..sp_rename N'${def.table.schema}.${def.table.name}.${this.wrap(def.prevName)}', N'${def.nextName}', 'COLUMN'`;
  }

  public addForeignKey(def: IAddForeignKeyQueryDef): string {
    const tableName = this.getTableName(def.table);
    const tableNameChain = this.getTableNameChain(def.table);
    const fkName = this.wrap(`FK_${tableNameChain.join("_")}_${def.foreignKey.name}`);
    const targetTableName = this.getTableName(def.foreignKey.targetTable);

    let query = "";
    query += `ALTER TABLE ${tableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (${def.foreignKey.fkColumns.map(columnName => `${this.wrap(columnName)}`).join(", ")})\n`;
    query += `  REFERENCES ${targetTableName} (${def.foreignKey.targetPkColumns.map(columnName => `${this.wrap(columnName)}`).join(", ")})\n`;
    query += "  ON DELETE NO ACTION\n";
    query += "  ON UPDATE NO ACTION";
    return query.trim();
  }

  public removeForeignKey(def: IRemoveForeignKeyQueryDef): string {
    const tableName = this.getTableName(def.table);
    const tableNameChain = this.getTableNameChain(def.table);
    const fkName = this.wrap(`FK_${tableNameChain.join("_")}_${def.foreignKey}`);

    return `ALTER TABLE ${tableName} DROP CONSTRAINT ${fkName}`;
  }

  public createIndex(def: ICreateIndexQueryDef): string {
    const tableName = this.getTableName(def.table);
    const tableNameChain = this.getTableNameChain(def.table);
    const idxName = this.wrap(`IDX_${tableNameChain.join("_")}_${def.index.name}`);

    return `CREATE INDEX ${idxName} ON ${tableName} (${def.index.columns.map(item => `${this.wrap(item.name)} ${item.orderBy}`).join(", ")})`;
  }

  public configIdentityInsert(def: IConfigIdentityInsertQueryDef): string {
    const tableName = this.getTableName(def.table);
    return `SET IDENTITY_INSERT ${tableName} ${def.state.toUpperCase()}`;
  }

  // endregion

  // ----------------------------------------------------
  // TABLE
  // ----------------------------------------------------
  // region TABLE


  public select(def: ISelectQueryDef): string {
    if (def.top !== undefined && def.limit) {
      throw new Error("TOP과 LIMIT은 함께사용할 수 없습니다.");
    }

    let q = "SELECT";

    if (this._dialect !== "mysql") {
      if (def.top !== undefined) {
        q += ` TOP ${def.top}`;
      }
    }

    if (def.distinct) {
      q += " DISTINCT";
    }

    // SELECT FIELDS

    if (def.select) {
      q += "\n";
      const selectFieldQueryStrings: string[] = [];
      for (const selectKey of Object.keys(def.select)) {
        const selectValue = def.select[selectKey];

        if (selectValue?.["from"] !== undefined) {
          const selectQueryDef = selectValue as ISelectQueryDef;
          let subQuery = `  (\n`;
          subQuery += "    " + this.select(selectQueryDef).replace(/\n/g, "\n    ") + "\n";
          subQuery += `  ) as ${selectKey}`;
          selectFieldQueryStrings.push(subQuery);
        }
        else {
          selectFieldQueryStrings.push(`  ${this.getQueryOfQueryValue(def.select[selectKey])} as ${selectKey}`);
        }
      }
      q += selectFieldQueryStrings.join(",\n");
      q += "\n";
    }
    else {
      q += " *\n";
    }

    // FROM
    if (def.from instanceof Array) {
      q += `FROM (\n`;
      for (const from of def.from) {
        q += "  " + this.select(from).replace(/\n/g, "\n  ");
        q += "\n\n  UNION ALL\n\n";
      }
      q = q.slice(0, -14);
      q += `)`;
    }
    else if (def.from?.["from"] !== undefined) {
      const fromQueryDef = def.from as ISelectQueryDef;
      q += `FROM (\n`;
      q += "  " + this.select(fromQueryDef).replace(/\n/g, "\n  ") + "\n";
      q += `)`;
    }
    else if (def.from !== undefined) {
      q += `FROM ${def.from as string}`;
    }

    if (def.from !== undefined && def.as !== undefined) {
      q += ` as ${def.as}`;
    }
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
      q += `WHERE ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    // GROUP BY

    if (def.groupBy && def.groupBy.length > 0) {
      q += `GROUP BY ${def.groupBy.map(item => this.getQueryOfQueryValue(item)).join(", ")}`;
      q += "\n";
    }

    // HAVING

    if (def.having) {
      if (!(def.groupBy && def.groupBy.length > 0)) {
        throw new Error("'HAVING'을 사용하려면, 'GROUP BY'를 반드시 설정해야 합니다.");
      }

      q += `HAVING ${def.having.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    // ORDER BY

    if (def.orderBy && def.orderBy.length > 0) {
      q += `ORDER BY ${def.orderBy.map(item => this.getQueryOfQueryValue(item[0]) + " " + item[1]).join(", ")}`;
      q += "\n";
    }

    // LIMIT

    if (def.limit) {
      if (!(def.orderBy && def.orderBy.length > 0)) {
        throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
      }

      if (this._dialect === "mysql") {
        q += `LIMIT ${def.limit[0]}, ${def.limit[1]}`;
        q += "\n";
      }
      else {
        q += `OFFSET ${def.limit[0]} ROWS FETCH NEXT ${def.limit[1]} ROWS ONLY`;
        q += "\n";
      }
    }

    if (this._dialect === "mysql") {
      if (def.top !== undefined) {
        q += `LIMIT ${def.top}`;
        q += "\n";
      }
    }

    return q.trim();
  }

  public insert(def: IInsertQueryDef): string {
    let q = "";
    q += `INSERT INTO ${def.from} (${Object.keys(def.record).join(", ")})`;
    q += "\n";

    if (this._dialect !== "mysql") {
      if (def.output) {
        q += `OUTPUT ${def.output.map(item => "INSERTED." + item).join(", ")}`;
        q += "\n";
      }
    }

    q += `VALUES (${Object.values(def.record).map(val => this.getQueryOfQueryValue(val)).join(", ")})`;
    q += "\n";

    return q.trim() + ";";
  }

  public update(def: IUpdateQueryDef): string {
    if (def.top !== undefined && def.limit) {
      throw new Error("TOP과 LIMIT은 함께사용할 수 없습니다.");
    }

    let q = "";

    // LINE 1
    q += `UPDATE`;
    if (this._dialect !== "mysql") {
      if (def.top !== undefined) {
        q += ` TOP (${def.top})`;
      }
    }

    if (this._dialect === "mysql") {
      // FROM, AS
      q += ` ${def.from} as ${def.as}`;
      q += `\n`;

      // JOIN
      if (def.join && def.join.length > 0) {
        for (const joinDef of def.join) {
          q += this._getQueryOfJoinDef(joinDef);
          q += "\n";
        }
      }
      q += `SET`;
      q += "\n";
    }
    else {
      q += ` ${def.as} SET`;
      q += "\n";
    }

    // FIELD = VALUE
    q += Object.keys(def.record).map(key => `  ${def.as}.${key} = ${this.getQueryOfQueryValue(def.record[key])}`).join(",\n");
    q += "\n";

    // OUTPUT
    if (this._dialect !== "mysql") {
      if (def.output) {
        q += `OUTPUT ${def.output.map(item => "INSERTED." + item).join(", ")}`;
        q += "\n";
      }
    }

    if (this._dialect !== "mysql") {
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
      q += `WHERE ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    if (this._dialect === "mysql") {
      if (def.top !== undefined) {
        q += `LIMIT ${def.top}`;
        q += "\n";
      }
    }

    return q.trim() + ";";
  }

  public upsert(def: IUpsertQueryDef): string {
    if (this._dialect === "mysql") {
      const procName = this.wrap("sd_" + Uuid.new().toString().replace(/-/g, "_"));

      const q = `
CREATE PROCEDURE \`mysql\`.${procName}()
BEGIN

IF EXISTS (
  ${this.select(def).replace(/\n/g, "\n  ")}
) THEN

${this.update({...def, record: def.updateRecord})}

ELSE

${this.insert({...def, record: def.insertRecord})}

END IF;

END;
CALL \`mysql\`.${procName};
DROP PROCEDURE \`mysql\`.${procName};`;

      return q.trim() + ";";
    }
    else {
      let q = "";

      // LINE 1
      q += `MERGE ${def.from} as ${def.as}`;
      q += "\n";

      // USING
      q += "USING (SELECT 0 as _using) as _using";
      q += "\n";

      // WHERE
      q += `ON ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";

      // UPDATE
      if (def.updateRecord && Object.keys(def.updateRecord).length > 0) {
        q += "WHEN MATCHED THEN\n";
        q += "  UPDATE SET\n";
        q += Object.keys(def.updateRecord).map(key => `    ${key} = ${this.getQueryOfQueryValue(def.updateRecord[key])}`).join(",\n");
        q += "\n";
      }

      // INSERT
      q += "WHEN NOT MATCHED THEN\n";
      q += `  INSERT (${Object.keys(def.insertRecord).join(", ")})\n`;
      q += `  VALUES (${Object.values(def.insertRecord).map(val => this.getQueryOfQueryValue(val)).join(", ")})`;
      q += "\n";

      if (def.output) {
        q += `OUTPUT ${def.output.map(item => "INSERTED." + item).join(", ")}`;
        q += "\n";
      }

      return q.trim() + ";";
    }
  }

  public delete(def: IDeleteQueryDef): string {
    if (this._dialect === "mysql") {
      return `
USE ${def.from.split(".")[0]};
      
SET @cols = NULL;

SELECT GROUP_CONCAT('${"`_" + def.as!.slice(1)}.\`', COLUMN_NAME, '\`', ' = ', '${def.as}.\`', COLUMN_NAME, '\`' separator ' AND ') INTO @cols
FROM INFORMATION_SCHEMA.COLUMNS
WHERE CONCAT('\`', TABLE_SCHEMA, '\`.\`', TABLE_NAME, '\`') = '${def.from}' AND COLUMN_KEY='PRI';

SET @sql = CONCAT('DELETE ${def.as} FROM ${def.from} as ${def.as} JOIN (
  ${this.select(def).replace(/\n/g, "\n  ").replace("*", def.as + ".*")}
) ${"`_" + def.as!.slice(1)} ON 1 = 1 WHERE ', @cols, ';');
SELECT @sql;

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;`.trim();
    }
    else {
      let q = "";

      // LINE 1
      q += `DELETE`;
      if (def.top !== undefined) {
        q += ` TOP (${def.top})`;
      }

      q += ` ${def.as}`;
      q += "\n";

      // OUTPUT

      if (def.output) {
        q += `OUTPUT ${def.output.map(item => "DELETED." + item).join(", ")}`;
        q += "\n";
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
        q += `WHERE ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
        q += "\n";
      }

      return q.trim() + ";";
    }
  }

  // endregion

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------
  // region HELPERS

  public query(def: TQueryDef): string {
    return this[def.type](def as any) as string;
  }

  public wrap(name: string): string {
    return this._dialect === "mysql" ? "`" + name + "`" :
      "[" + name + "]";
  }

  public getTableName(def: IQueryTableNameDef): string {
    return this.getTableNameChain(def).map(item => this.wrap(item)).join(".");
  }

  public getTableNameChain(def: IQueryTableNameDef): string[] {
    if (this._dialect === "mysql") {
      if (def.database !== undefined) {
        return [def.database, def.name];
      }
      else {
        return [def.name];
      }
    }
    else {
      if (def.database !== undefined) {
        if (def.schema === undefined) {
          throw new Error(`SCHEMA가 지정되어있지 않습니다. (DB: ${def.database}, TABLE: ${def.name})`);
        }

        return [def.database, def.schema, def.name];
      }
      else if (def.schema !== undefined) {
        return [def.schema, def.name];
      }
      else {
        return [def.name];
      }
    }
  }

  public getQueryOfQueryValue(queryValue: TQueryBuilderValue): string {
    if (queryValue instanceof Array) {
      return "(" + queryValue.map(item => this.getQueryOfQueryValue(item)).join("") + ")";
    }
    else if (queryValue["from"] !== undefined) {
      let subQuery = `(\n`;
      subQuery += "  " + this.select(queryValue as ISelectQueryDef).replace(/\n/g, "\n  ") + "\n";
      subQuery += `)`;
      return subQuery;
    }
    else {
      return queryValue as string;
    }
  }

  private _getQueryOfColDef(colDef: IQueryColumnDef): string {
    let q = "";

    if (this._dialect === "mysql") {
      q += this.wrap(colDef.name) + " ";
      q += colDef.dataType + " ";
      q += colDef.nullable ? "NULL " : "NOT NULL ";
      q += colDef.autoIncrement ? "AUTO_INCREMENT" : "";
    }
    else {
      q += this.wrap(colDef.name) + " ";
      q += colDef.dataType + " ";
      q += colDef.autoIncrement ? "IDENTITY(1,1) " : "";
      q += colDef.nullable ? "NULL" : "NOT NULL";
    }
    return q;
  }

  private _getQueryOfJoinDef(def: IJoinQueryDef): string {
    let q = "";

    if (Object.keys(def).every(key => def[key] === undefined || (["from", "as", "where", "select"].includes(key))) && !def.isCustomSelect) {
      q += `LEFT OUTER JOIN `;
      if (def.from instanceof Array) {
        q += "(\n";
        for (const from of def.from) {
          q += "  " + this.select(from).replace(/\n/g, "\n  ");
          q += "\n\n  UNION ALL\n\n";
        }
        q = q.slice(0, -14);
        q += `) as ${def.as}`;
      }
      else if (def.from?.["from"] !== undefined) {
        q += "(\n";
        q += "  " + this.select(def.from as ISelectQueryDef).replace(/\n/g, "\n  ") + "\n";
        q += `) as ${def.as}`;
      }
      else {
        q += `${def.from as string} as ${def.as}`;
      }

      if (def.where) {
        q += ` ON ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      }
      else {
        q += ` ON 1 = 1`;
      }
    }
    else {
      if (this._dialect === "mysql") {
        q += ", LATERAL (\n";
        q += "  " + this.select(def).replace(/\n/g, "\n  ") + "\n";
        q += ") as " + def.as;
      }
      else {
        q += "OUTER APPLY (\n";
        q += "  " + this.select(def).replace(/\n/g, "\n  ") + "\n";
        q += ") as " + def.as;
      }
    }

    return q.trim();
  }

  // endregion
}