import {Type} from "@simplysm/sd-core-common";
import {IIndexedDbStoreDef} from "./indexed-db.types";

export class IndexedDbStoreDefUtils {
  static METADATA_KEY = "sd-indexed-db-store-def";

  static get(type: Type<any>): IIndexedDbStoreDef {
    const storeDef = Reflect.getMetadata(this.METADATA_KEY, type);
    if (storeDef?.name == null) {
      throw new Error(`'${type.name}'에 '@IndexedDbStore()'가 지정되지 않았습니다.`);
    }

    return storeDef;
  }

  static setName(type: Type<any>, params: { name: string }) {
    const prevDef = Reflect.getMetadata(this.METADATA_KEY, type);
    if (prevDef != null) {
      Reflect.defineMetadata(this.METADATA_KEY, {
        ...prevDef,
        name: params.name
      }, type);
    }
    else {
      Reflect.defineMetadata(this.METADATA_KEY, {
        name: params.name,
        index: []
      }, type);
    }
  }

  static addKey(type: Type<any>, params: {
    colName: string;
    order?: number;
    autoIncrement?: boolean;
  }) {
    const prevDef = Reflect.getMetadata(this.METADATA_KEY, type);
    if (prevDef != null) {
      if (prevDef.key != null) {
        if (prevDef.key.autoIncrement !== params.autoIncrement) {
          throw new Error();
        }

        prevDef.key.columns.push({name: params.colName, order: params.order});
      }
      else {
        prevDef.key = {
          columns: [{name: params.colName, order: params.order}],
          autoIncrement: params.autoIncrement
        };
      }

      Reflect.defineMetadata(this.METADATA_KEY, prevDef, type);
    }
    else {
      Reflect.defineMetadata(this.METADATA_KEY, {
        indexes: [],
        key: {
          columns: [{name: params.colName, order: params.order}],
          autoIncrement: params.autoIncrement
        }
      }, type);
    }
  }

  static addIndex(type: Type<any>, params: {
    colName: string;
    order?: number;
    name: string;
    multiEntry?: boolean;
    unique?: boolean;
  }) {
    const prevDef = Reflect.getMetadata(this.METADATA_KEY, type);
    if (prevDef != null) {
      const prevIdxDef = prevDef.indexes.single(item => item.name === params.name);
      if (prevIdxDef != null) {
        if (
          prevIdxDef.multiEntry !== params.multiEntry ||
          prevIdxDef.unique !== params.unique
        ) {
          throw new Error();
        }

        prevIdxDef.columns.push({
          name: params.colName,
          order: params.order
        });
      }
      else {
        prevDef.indexes.push({
          name: params.name,
          multiEntry: params.multiEntry,
          unique: params.unique,

          columns: [{
            name: params.colName,
            order: params.order
          }]
        });
      }

      Reflect.defineMetadata(this.METADATA_KEY, prevDef, type);
    }
    else {
      Reflect.defineMetadata(this.METADATA_KEY, {
        indexes: [{
          name: params.name,
          multiEntry: params.multiEntry,
          unique: params.unique,

          columns: [{
            name: params.colName,
            order: params.order
          }]
        }]
      }, type);
    }
  }
}