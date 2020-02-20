import {Type} from "@simplysm/sd-core-common";
import {TQueryValue} from "./common";

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
}

export interface IColumnDef {
  propertyKey: string;
  name: string;
  description: string;
  dataType?: string;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;

  typeFwd: () => Type<TQueryValue>;
}

export interface IForeignKeyDef {
  propertyKey: string;
  name: string;
  description: string;
  columnPropertyKeys: string[];

  targetTypeFwd: () => Type<any>;
}

export interface IForeignKeyTargetDef {
  propertyKey: string;
  name: string;
  description: string;
  foreignKeyPropertyKey: string;

  sourceTypeFwd: () => Type<any>;
}

export interface IIndexDef {
  name: string;
  columns: {
    columnPropertyKey: string;
    order: number;
    orderBy: "ASC" | "DESC";
  }[];
}
