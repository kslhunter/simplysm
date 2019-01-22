import {Type} from "@simplysm/common";
import {ITableDef} from "./definitions";
import {tableDefMetadataKey} from "./commons";

export class Queryable<T extends object> {
  public readonly tableType?: Type<T>;

  public get tableDef(): ITableDef {
    return core.Reflect.getMetadata(tableDefMetadataKey, this.tableType!) as ITableDef;
  }
}
