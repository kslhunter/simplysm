import {Exception, Safe} from "../../../sd-core/src";
import {
    IColumnDefinition,
    IFunctionDefinition,
    IIndexDefinition,
    IPrimaryKeyColumnDefinition,
    IStoredProcedureDefinition
} from "../common/Definitions";
import {DataType, IndexType, OrderByRule} from "../common/Enums";
import {QueryHelper} from "../common/QueryHelper";

export class QueryBuilder {
    public static clearDatabase(): string {
        return `
DECLARE @sql NVARCHAR(MAX);
SET @sql = N'';

-- 프록시저 초기화
SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
FROM sys.sql_modules m
INNER JOIN sys.objects o ON m.object_id=o.object_id
WHERE type_desc like '%PROCEDURE%'

-- 함수 초기화
SELECT @sql = @sql + 'DROP FUNCTION ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
FROM sys.sql_modules m
INNER JOIN sys.objects o ON m.object_id=o.object_id
WHERE type_desc like '%function%'

-- 뷰 초기화
SELECT @sql = @sql + 'DROP VIEW ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(v.name) +';' + CHAR(13) + CHAR(10)
FROM sys.views v

-- 테이블 FK 끊기 초기화
SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';'
FROM sys.tables [tbl]
INNER JOIN sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'

EXEC(@sql);

EXEC sp_msforeachtable 'DROP TABLE ?';
`;
    }

    public static createTable(tableName: string,
                              columns: IColumnDefinition[]): string {
        let query = "\n";
        query += `CREATE TABLE ${this._key(tableName)} (\n`;

        //-- 컬럼쿼리
        for (const col of columns) {
            const colName = this._key(col.name);
            const dataType = col.dataType;
            const length = this._dataLength(col);
            const autoIncrement = col.autoIncrement ? " IDENTITY(1,1)" : "";
            const nullable = col.nullable ? "NULL" : "NOT NULL";

            query += `\t${colName} ${dataType}${length}${autoIncrement} ${nullable},\n`;
        }

        query = query.slice(0, -2);
        query += "\n);\n";
        return query;
    }

    public static createPrimaryKey(tableName: string,
                                   primaryKeyColumns: IPrimaryKeyColumnDefinition[]): string {
        const primaryKeyColumnQueries = primaryKeyColumns.map((primaryKey) => `${this._key(primaryKey.name)} ${primaryKey.orderBy}`);
        return `\nALTER TABLE ${this._key(tableName)} ADD PRIMARY KEY (${primaryKeyColumnQueries.join(", ")});\n`;
    }

    public static createIndex(tableName: string,
                              index: IIndexDefinition,
                              prefix: string = "IDX"): string {
        const indexType = index.type === IndexType.FULLTEXT ? "FULLTEXT "
            : index.type === IndexType.UNIQUE ? "UNIQUE "
                : "";
        const indexName = this._key(`${prefix}_${tableName}_${index.name}`);
        const indexColumns = index.columns
            .orderBy((column) => column.order)
            .map((column) => `${this._key(column.name)} ${column.orderBy}`);

        return `\nCREATE ${indexType}INDEX ${indexName} ON ${this._key(tableName)} (${indexColumns.join(", ")});\n`;
    }

    public static createForeignKey(tableName: string, foreignKey: {
        name: string;
        columnNames: string[];
        targetTableName: string;
        targetColumnNames: string[];
    }): string {
        let query = this.createIndex(
            tableName,
            {
                name: foreignKey.name,
                type: IndexType.DEFAULT,
                columns: foreignKey.columnNames.map((item, i) => ({
                    order: i,
                    orderBy: OrderByRule.DESC,
                    name: item
                }))
            },
            "FKX"
        );

        query += `
ALTER TABLE ${this._key(tableName)}
ADD CONSTRAINT ${this._key(`FK_${tableName}_${foreignKey.name}`)} FOREIGN KEY (${foreignKey.columnNames.map((colName) => `${this._key(colName)}`).join(", ")})
    REFERENCES ${this._key(foreignKey.targetTableName)} (${foreignKey.targetColumnNames.map((colName) => `${this._key(colName)}`).join(", ")})
    ON DELETE NO ACTION
    ON UPDATE NO ACTION;
`;
        return query;
    }

    public static createFunction(def: IFunctionDefinition): string {
        if (!def.returnType) {
            throw new Exception(`함수에 반환타입이 지정되지 않았습니다. (함수명: ${def.name})`);
        }

        const q = `
CREATE FUNCTION ${this._key(def.name)}
(
    ${def.params.map((param) => `@${param.name} ${param.dataType}${this._dataLength(param)}`).join(",\n\t")}
)
RETURNS ${def.returnType.dataType}${this._dataLength(def.returnType)}
AS
BEGIN
    ${def.query.replace(/\n/g, "\n\t")}
END`;
        return `${q}\n`;
    }

    public static createProcedure(def: IStoredProcedureDefinition): string {
        const q = `
CREATE PROCEDURE ${this._key(def.name)}
(
    ${def.params.map((param) => `@${param.name} ${param.dataType}`).join(",\n\t")}${def.outputs ? "," : ""}
    ${Safe.arr(def.outputs).map((output) => `@${output.name} ${output.dataType} OUTPUT `).join(",\n\t")}
)
AS
BEGIN
${def.query.replace(/\n/g, "\n\t")}
END`;
        return `${q}\n`;
    }

    private static _key(key: string): string {
        return QueryHelper.escapeKey(key);
    }

    private static _dataLength(col: { dataType: DataType | string; length?: number }): string {
        if (typeof col.dataType === "string" && col.dataType.includes("(")) {
            return "";
        }
        else {
            let length = col.length || (
                col.dataType === DataType.NVARCHAR ? "4000"
                    : col.dataType === DataType.VARBINARY ? "4000"
                    : undefined
            );
            length = length ? `(${length})` : "";
            return length;
        }
    }
}