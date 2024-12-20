import { type TFlatType, type Type, type UnwrappedType, type WrappedType } from "@simplysm/sd-core-common";
import { QueryUnit } from "./QueryUnit";
import { DbContext } from "./DbContext";
import { Queryable } from "./Queryable";
import { type TSdOrmDataType } from "./SdOrmDataType";


// region QueryBuilder COMMONS

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

// region QueryBuilder DATABASE

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

// region QueryBuilder TABLE

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

// region DbExecutor

export interface IQueryResultParseOption {
  columns?: Record<string, { dataType: string | undefined }>;
  joins?: Record<string, { isSingle: boolean }>;
}

// endregion

// region Definitions for Decorator

export type TQueryValue = TFlatType;

export type TStrippedQueryValue = UnwrappedType<TQueryValue>;

export interface ITableNameDef {
  database?: string;
  schema?: string;
  name: string;
}

export interface ITableDef extends ITableNameDef {
  description: string;
  columns: IColumnDef[];
  foreignKeys: IForeignKeyDef[];
  foreignKeyTargets: IForeignKeyTargetDef[];
  indexes: IIndexDef[];
  referenceKeys: IReferenceKeyDef[];
  referenceKeyTargets: IReferenceKeyTargetDef[];
  view?: (db: any) => Queryable<DbContext, any>;
}

export interface IColumnDef {
  description?: string;
  propertyKey: string;
  name: string;
  dataType?: Type<TQueryValue> | TSdOrmDataType | string;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;

  typeFwd: () => Type<TStrippedQueryValue>;
}

export interface IForeignKeyDef {
  description?: string;
  propertyKey: string;
  name: string;
  columnPropertyKeys: string[];

  targetTypeFwd: () => Type<any>;
}

export interface IForeignKeyTargetDef {
  description?: string;
  propertyKey: string;
  name: string;
  sourceKeyPropertyKey: string;

  sourceTypeFwd: () => Type<any>;
}

export interface IIndexDef {
  description?: string;
  name: string;
  columns: {
    columnPropertyKey: string;
    order: number;
    orderBy: "ASC" | "DESC";
    unique: boolean;
  }[];
}

export interface IReferenceKeyDef {
  description?: string;
  propertyKey: string;
  name: string;
  columnPropertyKeys: string[];

  targetTypeFwd: () => Type<any>;
}

export interface IReferenceKeyTargetDef {
  description?: string;
  propertyKey: string;
  name: string;
  sourceKeyPropertyKey: string;

  sourceTypeFwd: () => Type<any>;
}

// endregion

// region Queryable

export type TEntityValue<T extends TQueryValue> = T | QueryUnit<T>;
export type TEntityValueOrQueryable<D extends DbContext, T extends TQueryValue> =
  TEntityValue<T>
  | Queryable<D, T>;
export type TEntityValueOrQueryableOrArray<D extends DbContext, T extends TQueryValue> =
  TEntityValueOrQueryable<D, T> | TEntityValueOrQueryableOrArray<D, T>[];

export type TEntity<T> = {
  [K in keyof T]-?: T[K] extends TQueryValue ? QueryUnit<T[K]>
    : T[K] extends (infer A)[] ? TEntity<A>[]
      : TEntity<T[K]>;
};

export type TSelectEntity<T> = {
  [K in keyof T]: T[K] extends TQueryValue ? QueryUnit<T[K]>
    : T[K] extends (infer A)[] ? TEntity<A>[]
      : TEntity<T[K]>;
};

export type TEntityUnwrap<T> = {
  [K in keyof T]: T[K] extends QueryUnit<infer A> ? A
    : T[K] extends (infer A)[] ? TEntityUnwrap<A>[]
      : T[K] extends TQueryValue ? T[K]
        : (TEntityUnwrap<T[K]> | undefined);
};

export type TIncludeEntity<T> = {
  [K in keyof T]-?: T[K] extends TQueryValue ? QueryUnit<T[K]>
    : T[K] extends (infer A)[] ? TIncludeEntity<A>[]
      : TIncludeEntity<T[K]>;
};

export interface IQueryableDef {
  from: string | ISelectQueryDef | ISelectQueryDef[];
  join?: (IJoinQueryDef & { isSingle: boolean })[];
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
}

export type TQueryValuePropertyNames<T> = {
  [K in keyof T]: undefined extends T[K]
    ? never
    : T[K] extends TQueryValue ? K : never
}[keyof T];
export type TUndefinedPropertyNames<T> = {
  [K in keyof T]: undefined extends T[K]
    ? K
    : never
}[keyof T];

export type TOnlyQueryValueProperty<T> =
  Pick<T, TQueryValuePropertyNames<T>>
  & Partial<Pick<T, TUndefinedPropertyNames<T>>>;

export type TInsertObject<T> = TOnlyQueryValueProperty<T>;
export type TUpdateObject<T> = TOnlyQueryValueProperty<{
  [K in keyof T]?: T[K] | QueryUnit<T[K]> | QueryUnit<WrappedType<T[K]>>;
}>;

// endregion

export type TDbConnectionConfig = IDefaultDbConnectionConfig | ISqliteDbConnectionConfig;

export interface IDefaultDbConnectionConfig {
  dialect: "mysql" | "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: ISOLATION_LEVEL;
}

export interface ISqliteDbConnectionConfig {
  dialect: "sqlite";
  filePath: string;
}

export type ISOLATION_LEVEL =
  "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";
