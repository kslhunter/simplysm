import { ObjectUtils, Type } from "@simplysm/sd-core-common";
import { IColumnDef, IForeignKeyDef, IForeignKeyTargetDef, IIndexDef, ITableDef } from "./commons";

export class DbDefinitionUtils {
  private static readonly _tableDefMetadataKey = "sd-orm-table-def";

  public static getTableDef(tableType: Type<any>, throws: boolean = true): ITableDef {
    const tableDef = Reflect.getMetadata(DbDefinitionUtils._tableDefMetadataKey, tableType);
    if (throws && tableDef === undefined) {
      throw new Error(`'${tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
    }

    return tableDef ?? {
      name: "",
      columns: [],
      foreignKeys: [],
      foreignKeyTargets: [],
      indexes: []
    } as ITableDef;
  }

  public static setTableDef(tableType: Type<any>, tableDef: ITableDef): void {
    Reflect.defineMetadata(DbDefinitionUtils._tableDefMetadataKey, tableDef, tableType);
  }

  public static mergeTableDef(tableType: Type<any>, target: Partial<ITableDef>): void {
    let tableDef = DbDefinitionUtils.getTableDef(tableType, false);
    tableDef = ObjectUtils.merge(tableDef, target);
    DbDefinitionUtils.setTableDef(tableType, tableDef);
  }

  public static addColumnDef(tableType: Type<any>, def: IColumnDef): void {
    const tableDef = DbDefinitionUtils.getTableDef(tableType, false);
    tableDef.columns = tableDef.columns.merge([def], { keys: ["propertyKey"] });
    DbDefinitionUtils.setTableDef(tableType, tableDef);
  }

  public static addForeignKeyDef(tableType: Type<any>, def: IForeignKeyDef): void {
    const tableDef = DbDefinitionUtils.getTableDef(tableType, false);
    tableDef.foreignKeys = tableDef.foreignKeys.merge([def], { keys: ["propertyKey"] });
    DbDefinitionUtils.setTableDef(tableType, tableDef);
  }

  public static addForeignKeyTargetDef(tableType: Type<any>, def: IForeignKeyTargetDef): void {
    const tableDef = DbDefinitionUtils.getTableDef(tableType, false);
    tableDef.foreignKeyTargets = tableDef.foreignKeyTargets.merge([def], { keys: ["propertyKey"] });
    DbDefinitionUtils.setTableDef(tableType, tableDef);
  }

  public static addIndexDef(tableType: Type<any>, def: IIndexDef): void {
    const tableDef = DbDefinitionUtils.getTableDef(tableType, false);
    const prevIndexDef = tableDef.indexes.single(item => item.name === def.name);
    if (!prevIndexDef) {
      tableDef.indexes.push(def);
    }
    else {
      prevIndexDef.columns = prevIndexDef.columns.merge(def.columns, { keys: ["columnPropertyKey"] });
      tableDef.indexes = tableDef.indexes.merge([prevIndexDef], { keys: ["name"] });
    }
    DbDefinitionUtils.setTableDef(tableType, tableDef);
  }
}
