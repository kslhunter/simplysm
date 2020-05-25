import {Type} from "@simplysm/sd-core";

export interface ITableDef {
  database?: string;
  scheme: string;
  name: string;
  description?: string;
  columns?: IColumnDef[];
  foreignKeys?: IForeignKeyDef[];
  foreignKeyTargets?: IForeignKeyTargetDef[];
  indexes?: IIndexDef[];
}

export interface IColumnDef {
  propertyKey: string;
  name: string;
  dataType?: string;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;
  description?: string;

  typeFwd(): Type<any>;
}

export interface IIndexDef {
  name: string;
  columnNames: string[];
}

export interface IForeignKeyDef {
  name: string;
  columnNames: string[];
  description?: string;

  targetTypeFwd(): Type<any>;
}

export interface IForeignKeyTargetDef {
  name: string;
  foreignKeyName: string;
  description?: string;

  sourceTypeFwd(): Type<any>;
}
