import {type Type} from "@simplysm/sd-core-common";
import {type IIdxDbStoreDef} from "./indexed-db-commons";

export class IdxDbStoreDefUtil {
  static METADATA_KEY = "sd-indexed-db-store-def";

  static get(type: Type<any>): IIdxDbStoreDef {
    const storeDef = Reflect.getMetadata(this.METADATA_KEY, type);
    if (storeDef?.name == null) {
      throw new Error(`'${type.name}'에 '@IdxDbStore()'가 지정되지 않았습니다.`);
    }

    return storeDef;
  }

  /*static #set(type: Type<any>, def: IIdxDbStoreDef) {
    Reflect.defineMetadata(this.METADATA_KEY, def, type);
  }*/

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
        idx: []
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
        idxs: [],
        key: {
          columns: [{name: params.colName, order: params.order}],
          autoIncrement: params.autoIncrement
        }
      }, type);
    }
  }

  static addIdx(type: Type<any>, params: {
    colName: string;
    order?: number;
    name: string;
    multiEntry?: boolean;
    unique?: boolean;
  }) {
    const prevDef = Reflect.getMetadata(this.METADATA_KEY, type);
    if (prevDef != null) {
      const prevIdxDef = prevDef.idxs.single(item => item.name === params.name);
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
        prevDef.idxs.push({
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
        idxs: [{
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