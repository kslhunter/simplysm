// region COMMONS

import { Type } from "@simplysm/sd-core-common";
import { TQueryValue, TSdOrmDataType } from "../types";

export type TQueryBuilderValue = string | ISelectQueryDef | TQueryBuilderValue[];

export type TQueryDef = (
  (ISelectQueryDef & { type: "select" }) |
  (IInsertIntoQueryDef & { type: "insertInto" }) |
  (IInsertQueryDef & { type: "insert" }) |
  (IUpdateQueryDef & { type: "update" }) |
  (IDeleteQueryDef & { type: "delete" }) |
  (IInsertIfNotExistsQueryDef & { type: "insertIfNotExists" }) |
  (IUpsertQueryDef & { type: "upsert" }) |
  (ITruncateTableQueryDef & { type: "truncateTable" }) |
  (ICreateDatabaseIfNotExistsQueryDef & { type: "createDatabaseIfNotExists" }) |
  (IClearDatabaseIfExistsQueryDef & { type: "clearDatabaseIfExists" }) |
  (IGetDatabaseInfoDef & { type: "getDatabaseInfo" }) |
  (IGetTableInfosDef & { type: "getTableInfos" }) |
  (IGetTableInfoDef & { type: "getTableInfo" }) |
  (IGetTableColumnInfosDef & { type: "getTableColumnInfos" }) |
  (IGetTablePrimaryKeysDef & { type: "getTablePrimaryKeys" }) |
  (IGetTableForeignKeysDef & { type: "getTableForeignKeys" }) |
  (IGetTableIndexesDef & { type: "getTableIndexes" }) |
  (ICreateTableQueryDef & { type: "createTable" }) |
  (ICreateViewQueryDef & { type: "createView" }) |
  (ICreateProcedureQueryDef & { type: "createProcedure" }) |
  (IDropTableQueryDef & { type: "dropTable" }) |
  (IAddColumnQueryDef & { type: "addColumn" }) |
  (IRemoveColumnQueryDef & { type: "removeColumn" }) |
  (IModifyColumnQueryDef & { type: "modifyColumn" }) |
  (IRenameColumnQueryDef & { type: "renameColumn" }) |
  (IDropPrimaryKeyQueryDef & { type: "dropPrimaryKey" }) |
  (IAddPrimaryKeyQueryDef & { type: "addPrimaryKey" }) |
  (IAddForeignKeyQueryDef & { type: "addForeignKey" }) |
  (IRemoveForeignKeyQueryDef & { type: "removeForeignKey" }) |
  (ICreateIndexQueryDef & { type: "createIndex" }) |
  (IDropIndexQueryDef & { type: "dropIndex" }) |
  (IConfigIdentityInsertQueryDef & { type: "configIdentityInsert" }) |
  (IConfigForeignKeyCheckQueryDef & { type: "configForeignKeyCheck" })
  );

export type TDbDateSeparator =
  "year"
  | "quarter"
  | "month"
  | "day"
  | "week"
  | "hour"
  | "minute"
  | "second"
  | "millisecond"
  | "microsecond"
  | "nanosecond";

// endregion

// region DATABASE

export interface IQueryTableNameDef {
  database?: string;
  schema?: string;
  name: string;
}

export interface IQueryColumnDef {
  name: string;
  dataType: Type<TQueryValue> | TSdOrmDataType | string;
  autoIncrement?: boolean;
  nullable?: boolean;
}

export interface IQueryPrimaryKeyDef {
  columnName: string;
  orderBy: "ASC" | "DESC";
}

export interface ICreateTableQueryDef {
  table: IQueryTableNameDef;
  columns: IQueryColumnDef[];
  primaryKeys: IQueryPrimaryKeyDef[];
}

export interface ICreateViewQueryDef {
  table: IQueryTableNameDef;
  queryDef: ISelectQueryDef;
}

export interface ICreateProcedureQueryDef {
  table: IQueryTableNameDef;
  columns: IQueryColumnDef[];
  procedure: string;
}

export interface ICreateDatabaseIfNotExistsQueryDef {
  database: string;
}

export interface IClearDatabaseIfExistsQueryDef {
  database: string;
}

export interface IGetDatabaseInfoDef {
  database: string;
}

export interface IGetTableInfosDef {
  database?: string;
  schema?: string;
}

export interface IGetTableInfoDef {
  table: IQueryTableNameDef;
}

export interface IGetTableColumnInfosDef {
  table: IQueryTableNameDef;
}

export interface IGetTablePrimaryKeysDef {
  table: IQueryTableNameDef;
}

export interface IGetTableForeignKeysDef {
  table: IQueryTableNameDef;
}

export interface IGetTableIndexesDef {
  table: IQueryTableNameDef;
}

export interface IDropTableQueryDef {
  table: IQueryTableNameDef;
}

export interface IAddColumnQueryDef {
  table: IQueryTableNameDef;
  column: IQueryColumnDef & {
    defaultValue?: TQueryBuilderValue;
  };
}

export interface IRemoveColumnQueryDef {
  table: IQueryTableNameDef;
  column: string;
}

export interface IModifyColumnQueryDef {
  table: IQueryTableNameDef;
  column: IQueryColumnDef & {
    defaultValue?: TQueryBuilderValue;
  };
}

export interface IRenameColumnQueryDef {
  table: IQueryTableNameDef;
  prevName: string;
  nextName: string;
}

export interface IDropPrimaryKeyQueryDef {
  table: IQueryTableNameDef;
}

export interface IAddPrimaryKeyQueryDef {
  table: IQueryTableNameDef;
  columns: string[];
}

export interface IAddForeignKeyQueryDef {
  table: IQueryTableNameDef;
  foreignKey: {
    name: string;
    fkColumns: string[];
    targetTable: IQueryTableNameDef;
    targetPkColumns: string[];
  };
}

export interface IRemoveForeignKeyQueryDef {
  table: IQueryTableNameDef;
  foreignKey: string;
}

export interface ICreateIndexQueryDef {
  table: IQueryTableNameDef;
  index: {
    name: string;
    columns: {
      name: string;
      orderBy: "ASC" | "DESC";
      unique: boolean;
    }[];
  };
}

export interface IDropIndexQueryDef {
  table: IQueryTableNameDef;
  index: string;
}

export interface IConfigIdentityInsertQueryDef {
  table: IQueryTableNameDef;
  state: "on" | "off";
}

export interface IConfigForeignKeyCheckQueryDef {
  table: IQueryTableNameDef;
  useCheck: boolean;
}

// endregion

// region TABLE

export interface ISelectQueryDef {
  from?: string | ISelectQueryDef | ISelectQueryDef[];
  as?: string;

  join?: IJoinQueryDef[];
  distinct?: true;
  where?: TQueryBuilderValue[];
  top?: number;
  groupBy?: TQueryBuilderValue[];
  having?: TQueryBuilderValue[];
  orderBy?: [TQueryBuilderValue, "ASC" | "DESC"][];
  limit?: [number, number];
  pivot?: {
    valueColumn: TQueryBuilderValue;
    pivotColumn: TQueryBuilderValue;
    pivotKeys: string[];
  };
  unpivot?: {
    valueColumn: TQueryBuilderValue;
    pivotColumn: TQueryBuilderValue;
    pivotKeys: string[];
  };
  lock?: boolean;

  sample?: number;

  select?: Record<string, TQueryBuilderValue>;
}

export interface IJoinQueryDef extends ISelectQueryDef {
  isCustomSelect: boolean;
}

export interface IInsertIntoQueryDef extends ISelectQueryDef {
  select: Record<string, TQueryBuilderValue>;

  target: string;
}

export interface IInsertQueryDef {
  from: string;
  record: Record<string, string>;
  output?: string[];
}

export interface IUpdateQueryDef extends ISelectQueryDef {
  from: string;
  record: Record<string, string>;
  output?: string[];
}

export interface IInsertIfNotExistsQueryDef {
  from: string;
  as: string;
  insertRecord: Record<string, string>;
  where: TQueryBuilderValue[];
  output?: string[];
}

export interface IUpsertQueryDef {
  from: string;
  as: string;
  updateRecord: Record<string, string>;
  insertRecord: Record<string, string>;
  where: TQueryBuilderValue[];
  output?: string[];
  aiKeyName?: string;
  pkColNames: string[];
}

export interface ITruncateTableQueryDef {
  table: IQueryTableNameDef;
}

export interface IDeleteQueryDef extends ISelectQueryDef {
  from: string;
  output?: string[];
}

// endregion