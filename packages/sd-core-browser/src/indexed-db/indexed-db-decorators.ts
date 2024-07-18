import {TClassDecoratorReturn, TPropertyDecoratorReturn, Type} from "@simplysm/sd-core-common";
import {IdxDbStoreDefUtil} from "./IdxDbStoreDefUtil";


export function IdxDbStore<T>(): TClassDecoratorReturn<T> {
  return (classType: Type<T>): void => {
    IdxDbStoreDefUtil.setName(classType, {
      name: classType.name
    });
  };
}

export function IdxDbKey<T extends object>(def?: {
  order?: number;
  autoIncrement?: boolean;
}): TPropertyDecoratorReturn<T> {
  return (object: T, propertyKey: string): void => {
    const classType = object.constructor as Type<T>;

    IdxDbStoreDefUtil.addKey(classType, {
      colName: propertyKey,
      order: def?.order,
      autoIncrement: def?.autoIncrement,
    });
  };
}

export function IdxDbIdx<T extends object>(def?: {
  name?: string;
  order?: number;
  multiEntry?: boolean;
  unique?: boolean;
}): TPropertyDecoratorReturn<T> {
  return (object: T, propertyKey: string): void => {
    const classType = object.constructor as Type<T>;

    IdxDbStoreDefUtil.addIdx(classType, {
      colName: propertyKey,
      order: def?.order,
      name: def?.name ?? propertyKey,
      multiEntry: def?.multiEntry,
      unique: def?.unique,
    });
  };
}