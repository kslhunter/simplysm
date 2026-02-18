import type { Type } from "@simplysm/sd-core-common";
import { ObjectUtils } from "@simplysm/sd-core-common";
import type {
  IColumnDef,
  IForeignKeyDef,
  IForeignKeyTargetDef,
  IIndexDef,
  IReferenceKeyDef,
  IReferenceKeyTargetDef,
  ITableDef,
} from "../types";

export class DbDefUtils {
  private static readonly _tableDefMetadataKey = "sd-orm-table-def";

  static getTableDef(tableType: Type<any>, throws: boolean = true): ITableDef {
    const tableDef = Reflect.getMetadata(this._tableDefMetadataKey, tableType);
    if (throws && tableDef === undefined) {
      throw new Error(`'${tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
    }

    return (
      tableDef ??
      ({
        name: "",
        description: "",
        columns: [],
        foreignKeys: [],
        foreignKeyTargets: [],
        indexes: [],
        referenceKeys: [],
        referenceKeyTargets: [],
      } as ITableDef)
    );
  }

  static setTableDef(tableType: Type<any>, tableDef: ITableDef): void {
    Reflect.defineMetadata(this._tableDefMetadataKey, tableDef, tableType);
  }

  static mergeTableDef(tableType: Type<any>, target: Partial<ITableDef>): void {
    let tableDef = DbDefUtils.getTableDef(tableType, false);
    tableDef = ObjectUtils.merge(tableDef, target);
    DbDefUtils.setTableDef(tableType, tableDef);
  }

  static addColumnDef(tableType: Type<any>, def: IColumnDef): void {
    const tableDef = DbDefUtils.getTableDef(tableType, false);
    tableDef.columns = tableDef.columns.merge([def], { keys: ["propertyKey"] });
    DbDefUtils.setTableDef(tableType, tableDef);
  }

  static addForeignKeyDef(tableType: Type<any>, def: IForeignKeyDef): void {
    const tableDef = DbDefUtils.getTableDef(tableType, false);
    tableDef.foreignKeys = tableDef.foreignKeys.merge([def], { keys: ["propertyKey"] });
    DbDefUtils.setTableDef(tableType, tableDef);
  }

  static addForeignKeyTargetDef(tableType: Type<any>, def: IForeignKeyTargetDef): void {
    const tableDef = DbDefUtils.getTableDef(tableType, false);
    tableDef.foreignKeyTargets = tableDef.foreignKeyTargets.merge([def], { keys: ["propertyKey"] });
    DbDefUtils.setTableDef(tableType, tableDef);
  }

  static addIndexDef(tableType: Type<any>, def: IIndexDef): void {
    const tableDef = DbDefUtils.getTableDef(tableType, false);
    const prevIndexDef = tableDef.indexes.single((item) => item.name === def.name);
    if (!prevIndexDef) {
      tableDef.indexes.push(def);
    } else {
      prevIndexDef.columns = prevIndexDef.columns.merge(def.columns, {
        keys: ["columnPropertyKey"],
      });
      tableDef.indexes = tableDef.indexes.merge([prevIndexDef], { keys: ["name"] });
    }
    DbDefUtils.setTableDef(tableType, tableDef);
  }

  static addReferenceKeyDef(tableType: Type<any>, def: IReferenceKeyDef): void {
    const tableDef = DbDefUtils.getTableDef(tableType, false);
    tableDef.referenceKeys = tableDef.referenceKeys.merge([def], { keys: ["propertyKey"] });
    DbDefUtils.setTableDef(tableType, tableDef);
  }

  static addReferenceKeyTargetDef(tableType: Type<any>, def: IReferenceKeyTargetDef): void {
    const tableDef = DbDefUtils.getTableDef(tableType, false);
    tableDef.referenceKeyTargets = tableDef.referenceKeyTargets.merge([def], {
      keys: ["propertyKey"],
    });
    DbDefUtils.setTableDef(tableType, tableDef);
  }
}
