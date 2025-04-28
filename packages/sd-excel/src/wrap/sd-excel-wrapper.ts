import { DateOnly, DateTime, NumberUtils, ObjectUtils, Type } from "@simplysm/sd-core-common";
import { SdExcelWorkbook } from "../sd-excel-workbook";

type TValidFieldSpec<T extends Type<any>> = {
  displayName: string;
  type: T;
  notnull?: boolean;
  includes?: InstanceType<T>[];
};

type TValidObject = Record<string, TValidFieldSpec<any>>;

type TInferField<T extends Type<any>> =
  T extends StringConstructor ? string :
    T extends NumberConstructor ? number :
      T extends BooleanConstructor ? boolean :
        T extends DateConstructor ? Date :
          InstanceType<T>;

type TFieldValue<T extends TValidFieldSpec<any>> = T["includes"] extends Array<infer U>
  ? U
  : TInferField<T["type"]>;

type TValidateObjectRecord<VT extends TValidObject> = {
  [P in keyof VT as VT[P]["notnull"] extends true ? P : never]: TFieldValue<VT[P]>
} & {
  [P in keyof VT as VT[P]["notnull"] extends true ? never : P]?: TFieldValue<VT[P]>
};

export class SdExcelWrapper<VT extends TValidObject> {
  constructor(
    private _fieldConf: VT,
    private _additionalFieldConf?: (item: TValidateObjectRecord<VT>) => {
      [P in keyof VT]?: {
        notnull?: boolean;
        includes?: InstanceType<VT[P]["type"]>[];
      }
    },
  ) {
  }

  async writeAsync(
    wsName: string,
    items: TValidateObjectRecord<VT>[],
  ): Promise<SdExcelWorkbook> {
    const wb = SdExcelWorkbook.create();
    const ws = await wb.createWorksheetAsync(wsName);

    const keys = Object.keys(this._fieldConf);
    const headers = Object.values(this._fieldConf).map(val => val.displayName);

    await ws.setDataMatrixAsync([
      headers,
      ...items.map((item) => keys.map(key => ObjectUtils.getChainValue(item, key))),
    ]);

    for (let r = 0; r < items.length + 1; r++) {
      for (let c = 0; c < keys.length; c++) {
        await ws.cell(r, c).style.setBorderAsync(["left", "right", "top", "bottom"]);
      }
    }

    for (let c = 0; c < keys.length; c++) {
      if (this._fieldConf[keys[c]].notnull) {
        await ws.cell(0, c).style.setBackgroundAsync("00FFFF00");
      }
    }

    await ws.setZoomAsync(85);
    await ws.setFixAsync({ r: 0 });

    return wb;
  }

  async readAsync(
    file: Buffer | Blob,
    wsNameOrIndex: string | number = 0,
  ): Promise<TValidateObjectRecord<VT>[]> {
    const wb = await SdExcelWorkbook.loadAsync(file);
    const ws = await wb.getWorksheetAsync(wsNameOrIndex);
    const wsName = await ws.getNameAsync();

    // const defaultFieldConf = this._fieldConf();
    const headers = Object.keys(this._fieldConf).map(key => this._fieldConf[key].displayName);
    const wsdt = await ws.getDataTableAsync({
      usableHeaderNameFn: headerName => headers.includes(headerName),
    }) as any[];

    const excelItems: TValidateObjectRecord<VT>[] = [];
    for (const item of wsdt) {
      const fieldConf = this._additionalFieldConf
        ? ObjectUtils.merge(this._fieldConf, this._additionalFieldConf(item))
        : this._fieldConf;

      const firstNotNullFieldKey = Object.keys(fieldConf)
        .first(key => fieldConf[key].notnull ?? false);
      if (firstNotNullFieldKey == null) throw new Error("Not Null 필드가 없습니다.");
      const firstNotNullFieldDisplayName = fieldConf[firstNotNullFieldKey].displayName;

      if (item[firstNotNullFieldDisplayName] == null) continue;

      const obj = {} as any;
      for (const key of Object.keys(fieldConf)) {
        if (
          "name" in fieldConf[key].type &&
          fieldConf[key].type.name === "Boolean" &&
          fieldConf[key].notnull
        ) {
          ObjectUtils.setChainValue(
            obj, key,
            item[fieldConf[key].displayName] ?? false,
          );
        }
        else if (
          "name" in fieldConf[key].type &&
          fieldConf[key].type.name === "String" &&
          typeof item[fieldConf[key].displayName] !== "string"
        ) {
          ObjectUtils.setChainValue(
            obj, key,
            item[fieldConf[key].displayName]?.toString(),
          );
        }
        else if (
          "name" in fieldConf[key].type &&
          fieldConf[key].type.name === "Number" &&
          typeof item[fieldConf[key].displayName] !== "number"
        ) {
          ObjectUtils.setChainValue(
            obj, key,
            NumberUtils.parseInt(item[fieldConf[key].displayName]),
          );
        }
        else if (
          "name" in fieldConf[key].type &&
          fieldConf[key].type.name === "DateOnly" &&
          !(item[fieldConf[key].displayName] instanceof DateOnly)
        ) {
          ObjectUtils.setChainValue(
            obj, key,
            item[fieldConf[key].displayName] == null ? undefined
              : DateOnly.parse(item[fieldConf[key].displayName]!.toString()),
          );
        }
        else if (
          "name" in fieldConf[key].type &&
          fieldConf[key].type.name === "DateTime" &&
          !(item[fieldConf[key].displayName] instanceof DateTime)
        ) {
          ObjectUtils.setChainValue(
            obj, key,
            item[fieldConf[key].displayName] == null ? undefined
              : DateTime.parse(item[fieldConf[key].displayName]!.toString()),
          );
        }
        else {
          ObjectUtils.setChainValue(
            obj, key,
            item[fieldConf[key].displayName],
          );
        }
      }
      excelItems.push(obj);
    }
    if (excelItems.length === 0) throw Error("엑셀파일에서 데이터를 찾을 수 없습니다.");

    ObjectUtils.validateArrayWithThrow(wsName, excelItems, item => {
      return this._additionalFieldConf
        ? ObjectUtils.merge(this._fieldConf, this._additionalFieldConf(item))
        : this._fieldConf;
    });

    return excelItems;
  }
}