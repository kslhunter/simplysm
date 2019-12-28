import {Type} from "@simplysm/sd-core-common";
import {DbDefinitionUtil} from "./util/DbDefinitionUtil";

export function Table<T>(def: {
  database?: string;
  schema?: string;
  name?: string;
  description: string;
}): (classType: Type<T>) => void {
  return (classType: Type<T>) => {
    DbDefinitionUtil.mergeTableDef(classType, {
      name: classType.name,
      ...def
    });
  };
}

export function Column<T extends object>(columnDef: {
  name?: string;
  dataType?: string;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;
  description: string;
}): (object: T, propertyKey: string) => void {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor as Type<T>;

    DbDefinitionUtil.addColumnDef(classType, {
      propertyKey,
      name: columnDef.name ?? propertyKey,
      dataType: columnDef.dataType,
      nullable: columnDef.nullable,
      autoIncrement: columnDef.autoIncrement,
      primaryKey: columnDef.primaryKey,
      description: columnDef.description,

      typeFwd: () => Reflect.getMetadata("design:type", object, propertyKey)
    });
  };
}


export function ForeignKey<T>(
  columnNames: (keyof T)[],
  targetTypeFwd: () => Type<any>,
  description: string
): (object: Partial<T>, propertyKey: string) => void {
  return (object: Partial<T>, propertyKey: string) => {
    const classType = object.constructor as Type<T>;

    DbDefinitionUtil.addForeignKeyDef(classType, {
      propertyKey,
      name: propertyKey,
      columnPropertyKeys: columnNames as string[],
      description,
      targetTypeFwd
    });
  };
}

export function ForeignKeyTarget<T extends object, P>(
  sourceTypeFwd: () => Type<P>,
  foreignKeyPropertyKey: keyof P,
  description: string
): (object: T, propertyKey: string) => void {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor as Type<T>;

    DbDefinitionUtil.addForeignKeyTargetDef(classType, {
      propertyKey,
      name: propertyKey,
      sourceTypeFwd,
      description,
      foreignKeyPropertyKey: foreignKeyPropertyKey as string
    });
  };
}

export function Index<T extends object>(def: {
  name?: string;
  order?: number;
  orderBy?: "ASC" | "DESC";
  description: string;
}): (object: T, propertyKey: string) => void {
  return (object: T, propertyKey: string) => {
    const classType = object.constructor as Type<T>;

    DbDefinitionUtil.addIndexDef(classType, {
      name: def.name ?? propertyKey,
      description: def.description,
      columns: [
        {
          columnPropertyKey: propertyKey,
          order: def.order ?? 1,
          orderBy: def.orderBy ?? "ASC"
        }
      ]
    });
  };
}
