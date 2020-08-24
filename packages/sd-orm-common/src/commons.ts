import { DateOnly, DateTime, StripTypeWrap, Time, Type, TypeWrap, Uuid } from "@simplysm/sd-core-common";
import { QueryUnit } from "./QueryUnit";
import { DbContext } from "./DbContext";
import { Queryable } from "./Queryable";
import { TSdOrmDataType } from "./SdOrmDataType";


// region QueryBuilder COMMONS

export type TQueryBuilderValue = string | ISelectQueryDef | TQueryBuilderValue[];

export type TQueryDef = (
  (ISelectQueryDef & { type: "select" }) |
  (IInsertQueryDef & { type: "insert" }) |
  (IUpdateQueryDef & { type: "update" }) |
  (IDeleteQueryDef & { type: "delete" }) |
  (IUpsertQueryDef & { type: "upsert" }) |
  (ICreateDatabaseIfNotExistsQueryDef & { type: "createDatabaseIfNotExists" }) |
  (IClearDatabaseIfExistsQueryDef & { type: "clearDatabaseIfExists" }) |
  (IGetDatabaseInfoDef & { type: "getDatabaseInfo" }) |
  (IGetTableInfoDef & { type: "getTableInfo" }) |
  (ICreateTableQueryDef & { type: "createTable" }) |
  (IDropTableQueryDef & { type: "dropTable" }) |
  (IAddColumnQueryDef & { type: "addColumn" }) |
  (IRemoveColumnQueryDef & { type: "removeColumn" }) |
  (IModifyColumnQueryDef & { type: "modifyColumn" }) |
  (IRenameColumnQueryDef & { type: "renameColumn" }) |
  (IAddForeignKeyQueryDef & { type: "addForeignKey" }) |
  (IRemoveForeignKeyQueryDef & { type: "removeForeignKey" }) |
  (ICreateIndexQueryDef & { type: "createIndex" }) |
  (IConfigIdentityInsertQueryDef & { type: "configIdentityInsert" })
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
  dataType: string;
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

export interface ICreateDatabaseIfNotExistsQueryDef {
  database: string;
}

export interface IClearDatabaseIfExistsQueryDef {
  database: string;
}

export interface IGetDatabaseInfoDef {
  database: string;
}

export interface IGetTableInfoDef {
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
    }[];
  };
}

export interface IConfigIdentityInsertQueryDef {
  table: IQueryTableNameDef;
  state: "on" | "off";
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

  select?: { [key: string]: TQueryBuilderValue };
}

export interface IJoinQueryDef extends ISelectQueryDef {
  isCustomSelect: boolean;
}

export interface IInsertQueryDef {
  from: string;
  record: { [key: string]: string };
  output?: string[];
}

export interface IUpdateQueryDef extends ISelectQueryDef {
  from: string;
  record: { [key: string]: string };
  output?: string[];
}

export interface IUpsertQueryDef {
  from: string;
  as: string;
  updateRecord: { [key: string]: string };
  insertRecord: { [key: string]: string };
  where: TQueryBuilderValue[];
  output?: string[];
}

export interface IDeleteQueryDef extends ISelectQueryDef {
  from: string;
  output?: string[];
}

// endregion

// region DbExecutor

export interface IQueryResultParseOption {
  columns?: { [name: string]: { dataType: string | undefined } };
  joins?: { [as: string]: { isSingle: boolean } };
}

// endregion

// region Definitions for Decorator

export type TQueryValue =
  undefined
  | number | string | boolean
  | Number | String | Boolean
  | DateOnly
  | DateTime
  | Time
  | Uuid
  | Buffer;

export type TStrippedQueryValue = StripTypeWrap<TQueryValue>;

export interface ITableNameDef {
  database?: string;
  schema?: string;
  name: string;
}

export interface ITableDef extends ITableNameDef {
  description?: string;
  columns: IColumnDef[];
  foreignKeys: IForeignKeyDef[];
  foreignKeyTargets: IForeignKeyTargetDef[];
  indexes: IIndexDef[];
}

export interface IColumnDef {
  description?: string;
  propertyKey: string;
  name: string;
  dataType?: TSdOrmDataType;
  length?: number | "MAX";
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
  foreignKeyPropertyKey: string;

  sourceTypeFwd: () => Type<any>;
}

export interface IIndexDef {
  description?: string;
  name: string;
  columns: {
    columnPropertyKey: string;
    order: number;
    orderBy: "ASC" | "DESC";
  }[];
}

// endregion

// region Queryable

export type TEntityValue<T extends TQueryValue> = T | QueryUnit<T> | QueryUnit<TypeWrap<T>>;
export type TEntityValueOrQueryable<D extends DbContext, T extends TQueryValue> = TEntityValue<T> | Queryable<D, T>;
export type TEntityValueOrQueryableOrArray<D extends DbContext, T extends TQueryValue> =
  TEntityValueOrQueryable<D, T> | TEntityValueOrQueryableOrArray<D, T>[];

export type TEntity<T> = {
  [K in keyof T]-?: T[K] extends QueryUnit<any> ? QueryUnit<T[K]["T"]> :
    T[K] extends TQueryValue ? QueryUnit<T[K]> :
      TEntity<T[K]>
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
}


export type NonTQueryValuePropertyNames<T> = { [K in keyof T]: T[K] extends TQueryValue ? never : K }[keyof T];
export type TUpdateObject<T> = Partial<Omit<{ [K in keyof T]: T[K] extends TQueryValue ? (T[K] | QueryUnit<T[K]> | QueryUnit<TypeWrap<T[K]>>) : never }, NonTQueryValuePropertyNames<T>>>;

export type NullablePropertyNames<T> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T];
export type TInsertObject<T> =
  Omit<{ [K in keyof T]: T[K] extends TQueryValue ? (T[K] | QueryUnit<T[K]> | QueryUnit<TypeWrap<T[K]>>) : T[K] }, NullablePropertyNames<T> | NonTQueryValuePropertyNames<T>>
  &
  Pick<{ [K in keyof T]?: T[K] extends TQueryValue ? (T[K] | QueryUnit<T[K]> | QueryUnit<TypeWrap<T[K]>>) : T[K] }, NullablePropertyNames<T> | NonTQueryValuePropertyNames<T>>;

export interface IQueryableOrderingDef<T> {
  key: string | ((entity: TEntity<T>) => TEntityValue<TQueryValue>);
  desc: boolean;
}

// endregion