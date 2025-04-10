import { TFlatType, Type, UnwrappedType } from "@simplysm/sd-core-common";
import { DbContext } from "./db-context";
import { Queryable } from "./query/queryable";

export type TSdOrmDataType =
  ISdOrmDataTypeOfText |
  ISdOrmDataTypeOfDecimal |
  ISdOrmDataTypeOfString |
  ISdOrmDataTypeOfFixString |
  ISdOrmDataTypeOfBinary;

export interface ISdOrmDataTypeOfText {
  type: "TEXT";
}

export interface ISdOrmDataTypeOfDecimal {
  type: "DECIMAL";
  precision: number;
  digits?: number;
}

export interface ISdOrmDataTypeOfString {
  type: "STRING";
  length?: number | "MAX";
}

export interface ISdOrmDataTypeOfFixString {
  type: "FIXSTRING";
  length: number;
}

export interface ISdOrmDataTypeOfBinary {
  type: "BINARY";
  length?: number | "MAX";
}


export type TQueryValue = TFlatType;

export type TStrippedQueryValue = UnwrappedType<TQueryValue>;

//region decorator

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
  procedure?: string;
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
  isSingle: boolean;

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
  isSingle: boolean;

  sourceTypeFwd: () => Type<any>;
}

//endregion

export interface IDbMigration {
  up(db: DbContext): Promise<void>;
}
