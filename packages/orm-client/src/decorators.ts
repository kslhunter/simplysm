// tslint:disable:variable-name

import {Type} from "@simplism/core";

export interface ITableDef {
  database: string;
  scheme: string;
  name: string;
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

  typeFwd(): Type<any>;
}

export interface IForeignKeyDef {
  name: string;
  columnNames: string[];

  targetTypeFwd(): Type<any>;
}

export interface IForeignKeyTargetDef {
  name: string;
  foreignKeyName: string;

  sourceTypeFwd(): Type<any>;
}

export const modelDefMetadataKey = "model-def";

export function Table<T>(database: string, scheme?: string, name?: string): (classType: Type<T>) => void {
  return (classType: Type<T>) => {
    const def: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, classType) || {};
    def.database = database;
    def.scheme = name || "dbo";
    def.name = name || classType.name;

    core.Reflect.defineMetadata(modelDefMetadataKey, def, classType);
  };
}

export function Column<T>(defs?: {
  dataType?: string;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;
}): (object: T, propertyKey: string) => void {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor;
    /*const propertyType = core.Reflect.getMetadata("design:type", object, propertyKey);*/

    const def: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, classType) || {};

    def.columns = def.columns || [];
    if (def.columns.some((item: any) => item.name === propertyKey)) {
      return;
    }

    def.columns.push({
      name: propertyKey,
      dataType: (defs && defs.dataType)/* || helpers.getDataTypeFromType(propertyType)*/,
      nullable: defs && defs.nullable,
      autoIncrement: defs && defs.autoIncrement,
      primaryKey: defs && defs.primaryKey,
      typeFwd: () => core.Reflect.getMetadata("design:type", object, propertyKey)
    });

    core.Reflect.defineMetadata(modelDefMetadataKey, def, classType);
  };
}

export function ForeignKey<T>(columnNames: (keyof T) | ((keyof T)[]), targetTypeFwd: () => Type<any>): (object: Partial<T>, propertyKey: string) => void {
  return (object: Partial<T>, propertyKey: string) => {
    const classType = object.constructor;

    const def: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, classType) || {};
    def.foreignKeys = def.foreignKeys || [];

    if (def.foreignKeys.some((item: any) => item.name === propertyKey)) {
      return;
    }

    def.foreignKeys.push({
      name: propertyKey,
      columnNames: (columnNames instanceof Array ? columnNames : [columnNames]) as string[],
      targetTypeFwd
    });
  };
}

export function ForeignKeyTarget<T, P>(sourceTypeFwd: () => Type<P>, foreignKeyName: keyof P): (object: T, propertyKey: string) => void {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor;

    const def: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, classType) || {};
    def.foreignKeyTargets = def.foreignKeyTargets || [];
    def.foreignKeyTargets.push({
      name: propertyKey,
      sourceTypeFwd,
      foreignKeyName: foreignKeyName as string
    });
  };
}