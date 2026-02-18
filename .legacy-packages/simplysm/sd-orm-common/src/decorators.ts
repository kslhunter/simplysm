import type {
  TClassDecoratorReturn,
  TPropertyDecoratorReturn,
  Type,
} from "@simplysm/sd-core-common";
import { DbDefUtils } from "./utils/DbDefUtils";
import type { DbContext } from "./DbContext";
import type { Queryable } from "./query/queryable/Queryable";
import type { TSdOrmDataType } from "./types";

export function Table<T>(def: {
  description: string;
  database?: string;
  schema?: string;
  name?: string;
  view?: (db: any) => Queryable<DbContext, any>;
  procedure?: string;
}): TClassDecoratorReturn<T> {
  return (classType: Type<T>): void => {
    DbDefUtils.mergeTableDef(classType, {
      name: classType.name,
      ...def,
    });
  };
}

export function Column<T extends object>(columnDef: {
  description: string;
  name?: string;
  dataType?: TSdOrmDataType;
  nullable?: boolean;
  autoIncrement?: boolean;
  primaryKey?: number;
}): TPropertyDecoratorReturn<T> {
  return (object: T, propertyKey: string): void => {
    const classType = object.constructor as Type<T>;

    DbDefUtils.addColumnDef(classType, {
      propertyKey,
      name: columnDef.name ?? propertyKey,
      dataType: columnDef.dataType,
      nullable: columnDef.nullable,
      autoIncrement: columnDef.autoIncrement,
      primaryKey: columnDef.primaryKey,
      description: columnDef.description,

      typeFwd: () => Reflect.getMetadata("design:type", object, propertyKey),
    });
  };
}

export function ForeignKey<T>(
  columnNames: (keyof T)[],
  targetTypeFwd: () => Type<any>,
  description: string,
): TPropertyDecoratorReturn<Partial<T>> {
  return (object: Partial<T>, propertyKey: string): void => {
    const classType = object.constructor as Type<T>;

    DbDefUtils.addForeignKeyDef(classType, {
      propertyKey,
      name: propertyKey,
      columnPropertyKeys: columnNames as string[],
      description,
      targetTypeFwd,
    });
  };
}

export function ForeignKeyTarget<T extends object, P>(
  sourceTypeFwd: () => Type<P>,
  foreignKeyPropertyKey: keyof P,
  description: string,
  multiplicity?: "single",
): TPropertyDecoratorReturn<T> {
  return (object: T, propertyKey: string): void => {
    const classType = object.constructor as Type<T>;

    DbDefUtils.addForeignKeyTargetDef(classType, {
      propertyKey,
      name: propertyKey,
      sourceTypeFwd,
      description,
      sourceKeyPropertyKey: foreignKeyPropertyKey as string,
      isSingle: multiplicity === "single",
    });
  };
}

export function Index<T extends object>(def?: {
  name?: string;
  order?: number;
  orderBy?: "ASC" | "DESC";
  unique?: boolean;
}): TPropertyDecoratorReturn<T> {
  return (object, propertyKey) => {
    const classType = object.constructor as Type<T>;

    DbDefUtils.addIndexDef(classType, {
      name: def?.name ?? propertyKey,
      columns: [
        {
          columnPropertyKey: propertyKey,
          order: def?.order ?? 1,
          orderBy: def?.orderBy ?? "ASC",
          unique: def?.unique ?? false,
        },
      ],
    });
  };
}

export function ReferenceKey<T>(
  columnNames: (keyof T)[],
  targetTypeFwd: () => Type<any>,
  description: string,
): TPropertyDecoratorReturn<Partial<T>> {
  return (object: Partial<T>, propertyKey: string): void => {
    const classType = object.constructor as Type<T>;

    DbDefUtils.addReferenceKeyDef(classType, {
      propertyKey,
      name: propertyKey,
      columnPropertyKeys: columnNames as string[],
      description,
      targetTypeFwd,
    });
  };
}

export function ReferenceKeyTarget<T extends object, P>(
  sourceTypeFwd: () => Type<P>,
  referenceKeyPropertyKey: keyof P,
  description: string,
  multiplicity?: "single",
): TPropertyDecoratorReturn<T> {
  return (object: T, propertyKey: string): void => {
    const classType = object.constructor as Type<T>;

    DbDefUtils.addReferenceKeyTargetDef(classType, {
      propertyKey,
      name: propertyKey,
      sourceTypeFwd,
      description,
      sourceKeyPropertyKey: referenceKeyPropertyKey as string,
      isSingle: multiplicity === "single",
    });
  };
}
