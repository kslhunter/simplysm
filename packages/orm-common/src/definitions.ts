import {Type} from "@simplysm/common";

export interface ITableDef {
  database?: string;
  scheme: string;
  name: string;
  description?: string;
  columns?: IColumnDef[];
  foreignKeys?: IForeignKeyDef[];
  foreignKeyTargets?: IForeignKeyTargetDef[];
}

export interface IColumnDef {
  name: string;
  dataType?: string;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;
  description?: string;

  typeFwd(): Type<any>;
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
