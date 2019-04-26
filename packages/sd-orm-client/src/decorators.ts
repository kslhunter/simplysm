import { optional, Type } from "@simplysm/sd-common";
import { ITableDef } from "./definitions";
import { tableDefMetadataKey } from "./commons";

export function Table<T>(def?: {
  database?: string;
  scheme?: string;
  table?: string;
  description?: string;
}): (classType: Type<T>) => void {
  return (classType: Type<T>) => {
    const tableDef: ITableDef = core.Reflect.getMetadata(tableDefMetadataKey, classType) || {};
    tableDef.database = def && def.database;
    tableDef.scheme = (def && def.scheme) || "dbo";
    tableDef.name = (def && def.table) || classType.name;
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
      dataType: optional(() => columnDef!.dataType),
      nullable: optional(() => columnDef!.nullable),
      autoIncrement: optional(() => columnDef!.autoIncrement),
      primaryKey: optional(() => columnDef!.primaryKey),
      description: optional(() => columnDef!.description),

      typeFwd: () => core.Reflect.getMetadata("design:type", object, propertyKey)
    });

    core.Reflect.defineMetadata(tableDefMetadataKey, tableDef, classType);
  };
}

export function Index<T>(indexName?: string, order?: number): (object: T, propertyKey: string) => void {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor;

    const tableDef: ITableDef = core.Reflect.getMetadata(tableDefMetadataKey, classType) || {};
    tableDef.indexes = tableDef.indexes || [];

    let indexObj = tableDef.indexes.single(item => item.name === (indexName || propertyKey));
    if (!indexObj) {
      indexObj = {
        name: indexName || propertyKey,
        columnNames: []
      };
      tableDef.indexes.push(indexObj);
    }

    indexObj.columnNames[order || 0] = propertyKey;
  };
}

export function ForeignKey<T>(
  columnNames: (keyof T) | ((keyof T)[]),
  targetTypeFwd: () => Type<any>,
  description?: string
): (object: Partial<T>, propertyKey: string) => void {
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

export function ForeignKeyTarget<T, P>(
  sourceTypeFwd: () => Type<P>,
  foreignKeyName: keyof P,
  description?: string
): (object: T, propertyKey: string) => void {
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
