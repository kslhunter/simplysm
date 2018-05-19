// tslint:disable:variable-name

import {Type} from "@angular/core";
import {Sorm} from "./Sorm";

export interface ITableDef {
  database: string;
  scheme: string;
  name: string;
  columns?: IColumnDef[];
  foreignKeys?: IForeignKeyDef[];
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

export const modelDefMetadataKey = "model-def";

export function Table<T extends object>(database: string, scheme?: string, name?: string): any {
  return (classType: Type<T>) => {
    const def: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, classType) || {};
    def.database = database;
    def.scheme = name || "dbo";
    def.name = name || classType.name;

    core.Reflect.defineMetadata(modelDefMetadataKey, def, classType);
  };
}

export function Column<T extends object>(defs?: {
  dataType?: string;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;
}): any {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor;
    const propertyType = core.Reflect.getMetadata("design:type", object, propertyKey);

    const def: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, classType) || {};

    def.columns = def.columns || [];
    if (def.columns.some((item: any) => item.name === propertyKey)) {
      return;
    }

    def.columns.push({
      name: propertyKey,
      dataType: (defs && defs.dataType) || Sorm.getDataTypeFromType(propertyType),
      nullable: defs && defs.nullable,
      autoIncrement: defs && defs.autoIncrement,
      primaryKey: defs && defs.primaryKey,
      typeFwd: () => core.Reflect.getMetadata("design:type", object, propertyKey)
    });

    core.Reflect.defineMetadata(modelDefMetadataKey, def, classType);
  };
}

export function ForeignKey<T extends object>(columnNames: (keyof T) | ((keyof T)[])): any {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor;

    const def: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, classType) || {};
    def.foreignKeys = def.foreignKeys || [];

    if (def.foreignKeys.some((item: any) => item.name === propertyKey)) {
      return;
    }

    def.foreignKeys.push({
      name: propertyKey,
      columnNames: columnNames instanceof Array ? columnNames : [columnNames],
      targetTypeFwd: () => core.Reflect.getMetadata("design:type", object, propertyKey)
    });
  };
}