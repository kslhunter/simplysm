import "core-js/es7/reflect";
import {optional, Type} from "@simplism/core";

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

export const tableDefMetadataKey = "table-def";

export function Table<T>(def?: {
  database?: string;
  scheme?: string;
  table?: string;
  description?: string;
}): (classType: Type<T>) => void {
  return (classType: Type<T>) => {
    const tableDef: ITableDef = core.Reflect.getMetadata(tableDefMetadataKey, classType) || {};
    tableDef.database = def && def.database;
    tableDef.scheme = def && def.scheme || "dbo";
    tableDef.name = def && def.table || classType.name;
    tableDef.description = def && def.description;

    core.Reflect.defineMetadata(tableDefMetadataKey, tableDef, classType);
  };
}

export function Column<T>(columnDef?: {
  dataType?: string;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;
  description?: string;
}): (object: T, propertyKey: string) => void {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor;

    const tableDef: ITableDef = core.Reflect.getMetadata(tableDefMetadataKey, classType) || {};

    tableDef.columns = tableDef.columns || [];
    if (tableDef.columns.some((item: any) => item.name === propertyKey)) {
      return;
    }

    tableDef.columns.push({
      name: propertyKey,
      dataType: optional(columnDef, o => o.dataType),
      nullable: optional(columnDef, o => o.nullable),
      autoIncrement: optional(columnDef, o => o.autoIncrement),
      primaryKey: optional(columnDef, o => o.primaryKey),
      description: optional(columnDef, o => o.description),

      typeFwd: () => core.Reflect.getMetadata("design:type", object, propertyKey)
    });

    core.Reflect.defineMetadata(tableDefMetadataKey, tableDef, classType);
  };
}

export function ForeignKey<T>(columnNames: (keyof T) | ((keyof T)[]), targetTypeFwd: () => Type<any>, description?: string): (object: Partial<T>, propertyKey: string) => void {
  return (object: Partial<T>, propertyKey: string) => {
    const classType = object.constructor;

    const def: ITableDef = core.Reflect.getMetadata(tableDefMetadataKey, classType) || {};
    def.foreignKeys = def.foreignKeys || [];

    if (def.foreignKeys.some((item: any) => item.name === propertyKey)) {
      return;
    }

    def.foreignKeys.push({
      name: propertyKey,
      columnNames: (columnNames instanceof Array ? columnNames : [columnNames]) as string[],
      description,
      targetTypeFwd
    });
  };
}

export function ForeignKeyTarget<T, P>(sourceTypeFwd: () => Type<P>, foreignKeyName: keyof P, description?: string): (object: T, propertyKey: string) => void {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor;

    const def: ITableDef = core.Reflect.getMetadata(tableDefMetadataKey, classType) || {};
    def.foreignKeyTargets = def.foreignKeyTargets || [];
    def.foreignKeyTargets.push({
      name: propertyKey,
      sourceTypeFwd,
      description,
      foreignKeyName: foreignKeyName as string
    });
  };
}