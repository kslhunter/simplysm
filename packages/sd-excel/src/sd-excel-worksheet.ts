import { SdExcelXmlWorksheet } from "./xmls/sd-excel-xml-worksheet";
import { ZipCache } from "./utils/zip-cache";
import { ISdExcelAddressRangePoint, TSdExcelValueType } from "./types";
import { SdExcelRow } from "./sd-excel-row";
import { SdExcelCell } from "./sd-excel-cell";
import { SdExcelXmlWorkbook } from "./xmls/sd-excel-xml-workbook";
import { SdExcelCol } from "./sd-excel-col";
import { SdExcelUtils } from "./utils/sd-excel.utils";

export class SdExcelWorksheet {
  private readonly _rowMap = new Map<number, SdExcelRow>();

  public constructor(
    private readonly _zipCache: ZipCache,
    private readonly _relId: number,
    private readonly _targetFileName: string,
  ) {
  }

  async getNameAsync(): Promise<string> {
    const wbXmlData = await this.#getWbDataAsync();
    return wbXmlData.getWorksheetNameById(this._relId)!;
  }

  row(r: number): SdExcelRow {
    return this._rowMap.getOrCreate(r, new SdExcelRow(this._zipCache, this._targetFileName, r));
  }

  cell(r: number, c: number): SdExcelCell {
    return this.row(r).cell(c);
  }

  col(c: number): SdExcelCol {
    return new SdExcelCol(this._zipCache, this._targetFileName, c);
  }

  async copyRowStyleAsync(srcR: number, targetR: number) {
    const range = await this.getRangeAsync();

    for (let c = range.s.c; c <= range.e.c; c++) {
      await this.copyCellStyleAsync({ r: srcR, c: c }, { r: targetR, c: c });
    }
  }

  async copyCellStyleAsync(
    srcPoint: { r: number; c: number },
    targetPoint: { r: number; c: number },
  ) {
    const wsData = await this.#getWsDataAsync();

    const srcAddr = SdExcelUtils.stringifyAddr(srcPoint);
    const targetAddr = SdExcelUtils.stringifyAddr(targetPoint);
    const styleId = wsData.getCellStyleId(srcAddr);
    if (styleId != null) {
      wsData.setCellStyleId(targetAddr, styleId);
    }
  }

  async copyRowAsync(srcR: number, targetR: number) {
    const wsData = await this.#getWsDataAsync();
    wsData.copyRow(srcR, targetR);
  }

  async copyCellAsync(
    srcPoint: { r: number; c: number },
    targetPoint: { r: number; c: number },
  ) {
    const wsData = await this.#getWsDataAsync();
    const srcAddr = SdExcelUtils.stringifyAddr(srcPoint);
    const targetAddr = SdExcelUtils.stringifyAddr(targetPoint);
    wsData.copyCell(srcAddr, targetAddr);
  }

  async insertCopyRowAsync(srcR: number, targetR: number) {
    const range = await this.getRangeAsync();

    for (let r = range.e.r; r >= targetR; r--) {
      await this.copyRowAsync(r, r + 1);
    }

    await this.copyRowAsync(srcR, targetR);
  }

  async getRangeAsync(): Promise<ISdExcelAddressRangePoint> {
    const xml = await this.#getWsDataAsync();
    return xml.range;
  }

  async getCellsAsync(): Promise<SdExcelCell[][]> {
    const result: SdExcelCell[][] = [];

    const xml = await this.#getWsDataAsync();

    const range = xml.range;
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells = await this.row(r).getCellsAsync();
      result.push(cells);
    }

    return result;
  }

  async getDataTableAsync(opt?: {
    headerRowIndex?: number;
    checkEndColIndex?: number;
    usableHeaderNameFn?: (headerName: string) => boolean
  }): Promise<Record<string, any>[]> {
    const result: Record<string, TSdExcelValueType>[] = [];

    const headerMap = new Map<string, number>();

    const xml = await this.#getWsDataAsync();
    const range = xml.range;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerName = this.cell(opt?.headerRowIndex ?? range.s.r, c).getValAsync();
      if (typeof headerName === "string") {
        if (!opt?.usableHeaderNameFn || opt.usableHeaderNameFn(headerName)) {
          headerMap.set(headerName, c);
        }
      }
    }

    for (let r = (opt?.headerRowIndex ?? range.s.r) + 1; r <= range.e.r; r++) {
      if (
        opt?.checkEndColIndex !== undefined
        && await this.cell(r, opt.checkEndColIndex).getValAsync() === undefined
      ) {
        break;
      }

      const record: Record<string, TSdExcelValueType> = {} as any;
      for (const header of headerMap.keys()) {
        const c = headerMap.get(header)!;
        record[header] = await this.cell(r, c).getValAsync();
      }

      result.push(record);
    }

    return result;
  }

  async setDataMatrixAsync(matrix: TSdExcelValueType[][]) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const val = matrix[r][c];
        await this.cell(r, c).setValAsync(val);
      }
    }
  }

  /*public async setRecords(record: Record<string, any>[]): Promise<void> {
    const headers = record.mapMany((item) => Object.keys(item))
      .distinct()
      .filter((item) => !StringUtils.isNullOrEmpty(item));

    for (let c = 0; c < headers.length; c++) {
      await this.cell(0, c).setValAsync(headers[c]);
    }

    for (let r = 1; r < record.length + 1; r++) {
      for (let c = 0; c < headers.length; c++) {
        await this.cell(r, c).setValAsync(record[r - 1][headers[c]]);
      }
    }
  }*/

  async setZoomAsync(percent: number) {
    const wbXml = await this.#getWbDataAsync();
    wbXml.initializeView();

    const wsXml = await this.#getWsDataAsync();
    wsXml.setZoom(percent);
  }

  async setFixAsync(point: { r?: number, c?: number }) {
    const wbXml = await this.#getWbDataAsync();
    wbXml.initializeView();

    const wsXml = await this.#getWsDataAsync();
    wsXml.setFix(point);
  }

  /*async getRecordsAsync<T extends Record<string, any>>(def: ((item: T) => TValidateObjectDefWithName<T>) | TValidateObjectDefWithName<T>): Promise<{ [P in keyof T]: UnwrappedType<T[P]> }[]> {
    const wsName = await this.getNameAsync();

    const wsdt: any[] = typeof def === "function"
      ? await this.getDataTableAsync()
      : await this.getDataTableAsync({
        usableHeaderNameFn: headerName => Object.keys(def)
          .map(key => def[key]!.displayName)
          .includes(headerName),
      });

    const excelItems: T[] = [];
    for (const item of wsdt) {
      const fieldConf: TValidateObjectDefWithName<T> = typeof def === "function" ? def(item) : def;

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
            obj, key,
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
            obj, key,
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
            obj, key,
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
            obj, key,
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
            obj, key,
            item[fieldConf[key]!.displayName] == null ? undefined
              : DateTime.parse(item[fieldConf[key]!.displayName]!.toString()),
          );
        }
        else {
          ObjectUtils.setChainValue(
            obj, key,
            item[fieldConf[key]!.displayName],
          );
        }
      }
      excelItems.push(obj);
    }
    if (excelItems.length === 0) throw Error("엑셀파일에서 데이터를 찾을 수 없습니다.");

    ObjectUtils.validateArrayWithThrow(wsName, excelItems, def);

    return excelItems;
  }*/

  async #getWsDataAsync() {
    return await this._zipCache.getAsync(`xl/worksheets/${this._targetFileName}`) as SdExcelXmlWorksheet;
  }

  async #getWbDataAsync() {
    return await this._zipCache.getAsync("xl/workbook.xml") as SdExcelXmlWorkbook;
  }
}
