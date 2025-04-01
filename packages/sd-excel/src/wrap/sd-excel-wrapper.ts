import {
  DateOnly,
  DateTime,
  NumberUtils,
  ObjectUtils,
  TValidateObjectDefWithName,
} from "@simplysm/sd-core-common";
import { SdExcelWorkbook } from "../sd-excel-workbook";

export class SdExcelWrapper<T extends Record<string, any>> {
  constructor(private _fieldConf: (item?: T) => TValidateObjectDefWithName<T>) {
  }

  async writeAsync(wsName: string, items: T[]): Promise<SdExcelWorkbook> {
    const wb = SdExcelWorkbook.create();
    const ws = await wb.createWorksheetAsync(wsName);

    const fieldConf = this._fieldConf();
    const keys = Object.keys(fieldConf);
    const headers = Object.values(fieldConf).map(val => val.displayName);

    await ws.setDataMatrixAsync([
      headers,
      ...items.map((item) => keys.map(key => ObjectUtils.getChainValue(item, key))),
    ]);

    return wb;
  }

  async readAsync(file: Buffer | Blob, wsNameOrIndex: string | number = 0): Promise<T[]> {
    const wb = await SdExcelWorkbook.loadAsync(file);
    const ws = await wb.getWorksheetAsync(wsNameOrIndex);
    const wsName = await ws.getNameAsync();
    const wsdt = await ws.getDataTableAsync() as any[];

    const excelItems: T[] = [];
    for (const item of wsdt) {
      const fieldConf = this._fieldConf(item);

      const firstNotNullFieldKey = Object.keys(fieldConf)
        .first(key => fieldConf[key]?.notnull ?? false);
      if (firstNotNullFieldKey == null) throw new Error("Not Null 필드가 없습니다.");
      const firstNotNullFieldDisplayName = fieldConf[firstNotNullFieldKey]!.displayName;

      if (item[firstNotNullFieldDisplayName] == null) continue;

      const obj = {} as any;
      for (const key of Object.keys(fieldConf)) {
        if (
          fieldConf[key]!.type &&
          "name" in fieldConf[key]!.type &&
          fieldConf[key]!.type.name === "Boolean" &&
          fieldConf[key]!.notnull
        ) {
          ObjectUtils.setChainValue(
            obj,
            key,
            item[fieldConf[key]!.displayName] ?? false,
          );
        }
        else if (
          fieldConf[key]!.type &&
          "name" in fieldConf[key]!.type &&
          fieldConf[key]!.type.name === "String" &&
          typeof item[fieldConf[key]!.displayName] !== "string"
        ) {
          ObjectUtils.setChainValue(
            obj,
            key,
            item[fieldConf[key]!.displayName]?.toString(),
          );
        }
        else if (
          fieldConf[key]!.type &&
          "name" in fieldConf[key]!.type &&
          fieldConf[key]!.type.name === "Number" &&
          typeof item[fieldConf[key]!.displayName] !== "number"
        ) {
          ObjectUtils.setChainValue(
            obj,
            key,
            NumberUtils.parseInt(item[fieldConf[key]!.displayName]),
          );
        }
        else if (
          fieldConf[key]!.type &&
          "name" in fieldConf[key]!.type &&
          fieldConf[key]!.type.name === "DateOnly" &&
          !(item[fieldConf[key]!.displayName] instanceof DateOnly)
        ) {
          ObjectUtils.setChainValue(
            obj,
            key,
            item[fieldConf[key]!.displayName] == null ? undefined
              : DateOnly.parse(item[fieldConf[key]!.displayName]!.toString()),
          );
        }
        else if (
          fieldConf[key]!.type &&
          "name" in fieldConf[key]!.type &&
          fieldConf[key]!.type.name === "DateTime" &&
          !(item[fieldConf[key]!.displayName] instanceof DateTime)
        ) {
          ObjectUtils.setChainValue(
            obj,
            key,
            item[fieldConf[key]!.displayName] == null ? undefined
              : DateTime.parse(item[fieldConf[key]!.displayName]!.toString()),
          );
        }
        else {
          ObjectUtils.setChainValue(
            obj,
            key,
            item[fieldConf[key]!.displayName],
          );
        }
      }
      excelItems.push(obj);
    }
    if (excelItems.length === 0) throw Error("엑셀파일에서 데이터를 찾을 수 없습니다.");

    ObjectUtils.validateArrayWithThrow(wsName, excelItems, this._fieldConf);

    return excelItems;
  }
}