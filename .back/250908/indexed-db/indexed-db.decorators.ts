import {TClassDecoratorReturn, TPropertyDecoratorReturn, Type} from "@simplysm/sd-core-common";
import {IndexedDbStoreDefUtils} from "./indexed-db-store-def.utils";


export function IndexedDbStore<T>(): TClassDecoratorReturn<T> {
  return (classType: Type<T>): void => {
    IndexedDbStoreDefUtils.setName(classType, {
      name: classType.name
    });
  };
}

export function IndexedDbKey<T extends object>(def?: {
  order?: number;
  autoIncrement?: boolean;
}): TPropertyDecoratorReturn<T> {
  return (object: T, propertyKey: string): void => {
    const classType = object.constructor as Type<T>;

    IndexedDbStoreDefUtils.addKey(classType, {
      colName: propertyKey,
      order: def?.order,
      autoIncrement: def?.autoIncrement,
    });
  };
}

export function IndexedDbIdx<T extends object>(def?: {
  name?: string;
  order?: number;
  multiEntry?: boolean;
  unique?: boolean;
}): TPropertyDecoratorReturn<T> {
  return (object: T, propertyKey: string): void => {
    const classType = object.constructor as Type<T>;

    IndexedDbStoreDefUtils.addIndex(classType, {
      colName: propertyKey,
      order: def?.order,
      name: def?.name ?? propertyKey,
      multiEntry: def?.multiEntry,
      unique: def?.unique,
    });
  };
}