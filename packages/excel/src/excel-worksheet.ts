import { StringUtils } from "@simplysm/core-common";
import type { ExcelCell } from "./excel-cell";
import { ExcelCol } from "./excel-col";
import { ExcelRow } from "./excel-row";
import type { ExcelAddressPoint, ExcelAddressRangePoint, ExcelValueType } from "./types";
import type { ZipCache } from "./utils/zip-cache";
import type { ExcelXmlWorkbook } from "./xml/excel-xml-workbook";
import type { ExcelXmlWorksheet } from "./xml/excel-xml-worksheet";
import mime from "mime";
import type { ExcelXmlContentType } from "./xml/excel-xml-content-type";
import { ExcelXmlRelationship } from "./xml/excel-xml-relationship";
import { ExcelXmlDrawing } from "./xml/excel-xml-drawing";

export class ExcelWorksheet {
  private readonly _rowMap = new Map<number, ExcelRow>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _relId: number,
    private readonly _targetFileName: string,
  ) {}

  //#region Name Methods

  async getName(): Promise<string> {
    const wbXmlData = await this._getWbData();
    return wbXmlData.getWorksheetNameById(this._relId)!;
  }

  async setName(newName: string): Promise<void> {
    const wbXmlData = await this._getWbData();
    wbXmlData.setWorksheetNameById(this._relId, newName);
  }

  //#endregion

  //#region Cell Access Methods

  row(r: number): ExcelRow {
    return this._rowMap.getOrCreate(r, new ExcelRow(this._zipCache, this._targetFileName, r));
  }

  cell(r: number, c: number): ExcelCell {
    return this.row(r).cell(c);
  }

  col(c: number): ExcelCol {
    return new ExcelCol(this._zipCache, this._targetFileName, c);
  }

  //#endregion

  //#region Copy Methods

  async copyRowStyle(srcR: number, targetR: number): Promise<void> {
    const range = await this.getRange();

    for (let c = range.s.c; c <= range.e.c; c++) {
      await this.copyCellStyle({ r: srcR, c: c }, { r: targetR, c: c });
    }
  }

  async copyCellStyle(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();

    const styleId = wsData.getCellStyleId(srcAddr);
    if (styleId != null) {
      wsData.setCellStyleId(targetAddr, styleId);
    }
  }

  async copyRow(srcR: number, targetR: number): Promise<void> {
    const wsData = await this._getWsData();
    wsData.copyRow(srcR, targetR);
  }

  async copyCell(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();
    wsData.copyCell(srcAddr, targetAddr);
  }

  async insertCopyRow(srcR: number, targetR: number): Promise<void> {
    const range = await this.getRange();

    // srcR >= targetR인 경우, 밀림 후 srcR 위치가 변경되므로 보정
    const adjustedSrcR = srcR >= targetR ? srcR + 1 : srcR;

    for (let r = range.e.r; r >= targetR; r--) {
      await this.copyRow(r, r + 1);
    }

    await this.copyRow(adjustedSrcR, targetR);
  }

  //#endregion

  //#region Range Methods

  async getRange(): Promise<ExcelAddressRangePoint> {
    const xml = await this._getWsData();
    return xml.range;
  }

  async getCells(): Promise<ExcelCell[][]> {
    const result: ExcelCell[][] = [];
    const xml = await this._getWsData();
    const range = xml.range;

    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells = await this.row(r).getCells();
      result.push(cells);
    }

    return result;
  }

  //#endregion

  //#region Data Methods

  async getDataTable(opt?: {
    headerRowIndex?: number;
    checkEndColIndex?: number;
    usableHeaderNameFn?: (headerName: string) => boolean;
  }): Promise<Record<string, ExcelValueType>[]> {
    const result: Record<string, ExcelValueType>[] = [];
    const headerMap = new Map<string, number>();

    const xml = await this._getWsData();
    const range = xml.range;
    const startRow = opt?.headerRowIndex ?? range.s.r;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerName = await this.cell(startRow, c).getVal();
      if (typeof headerName === "string") {
        if (opt?.usableHeaderNameFn == null || opt.usableHeaderNameFn(headerName)) {
          headerMap.set(headerName, c);
        }
      }
    }

    for (let r = startRow + 1; r <= range.e.r; r++) {
      if (
        opt?.checkEndColIndex !== undefined &&
        (await this.cell(r, opt.checkEndColIndex).getVal()) === undefined
      ) {
        break;
      }

      const record: Record<string, ExcelValueType> = {};
      for (const header of headerMap.keys()) {
        const c = headerMap.get(header)!;
        record[header] = await this.cell(r, c).getVal();
      }

      result.push(record);
    }

    return result;
  }

  async setDataMatrix(matrix: ExcelValueType[][]): Promise<void> {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        const val = matrix[r][c];
        await this.cell(r, c).setVal(val);
      }
    }
  }

  async setRecords(records: Record<string, ExcelValueType>[]): Promise<void> {
    const headers = records
      .mapMany((item) => Object.keys(item))
      .distinct()
      .filter((item) => !StringUtils.isNullOrEmpty(item));

    for (let c = 0; c < headers.length; c++) {
      await this.cell(0, c).setVal(headers[c]);
    }

    for (let r = 1; r < records.length + 1; r++) {
      for (let c = 0; c < headers.length; c++) {
        await this.cell(r, c).setVal(records[r - 1][headers[c]]);
      }
    }
  }

  //#endregion

  //#region View Methods

  async setZoom(percent: number): Promise<void> {
    const wbXml = await this._getWbData();
    wbXml.initializeView();

    const wsXml = await this._getWsData();
    wsXml.setZoom(percent);
  }

  async setFix(point: { r?: number; c?: number }): Promise<void> {
    const wbXml = await this._getWbData();
    wbXml.initializeView();

    const wsXml = await this._getWsData();
    wsXml.setFix(point);
  }

  //#endregion

  //#region Image Methods

  async addImage(opts: {
    bytes: Uint8Array;
    ext: string;
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  }): Promise<void> {
    const mimeType = mime.getType(opts.ext);
    if (mimeType == null) {
      throw new Error(`${opts.ext}의 mime 타입 확인 불가`);
    }

    // 1. media 파일명 결정 및 저장
    let mediaIndex = 1;
    while ((await this._zipCache.get(`xl/media/image${mediaIndex}.${opts.ext}`)) !== undefined) {
      mediaIndex++;
    }
    const mediaPath = `xl/media/image${mediaIndex}.${opts.ext}`;
    this._zipCache.set(mediaPath, opts.bytes);

    // 2. [Content_Types].xml 갱신
    const typeXml = (await this._zipCache.get("[Content_Types].xml")) as ExcelXmlContentType;
    typeXml.add(`/xl/media/image${mediaIndex}.${opts.ext}`, mimeType);

    // 3. drawing index 결정
    let drawingIndex = 1;
    while ((await this._zipCache.get(`xl/drawings/drawing${drawingIndex}.xml`)) !== undefined) {
      drawingIndex++;
    }
    const drawingPath = `xl/drawings/drawing${drawingIndex}.xml`;

    // 4. drawing rels 준비
    const drawingRels = new ExcelXmlRelationship();
    const mediaFileName = mediaPath.slice(3);
    const drawingTarget = `../${mediaFileName}`;
    const relNum = drawingRels.addAndGetId(
      drawingTarget,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
    );
    this._zipCache.set(`xl/drawings/_rels/drawing${drawingIndex}.xml.rels`, drawingRels);

    // 5. drawing 생성
    const blipRelId = `rId${relNum}`;
    const drawing = new ExcelXmlDrawing();
    drawing.addPicture({
      from: opts.from,
      to: opts.to ?? { r: opts.from.r + 1, c: opts.from.c + 1 },
      blipRelId: blipRelId,
    });
    this._zipCache.set(drawingPath, drawing);

    // 6. [Content_Types].xml에 drawing 타입 추가
    typeXml.add("/" + drawingPath, "application/vnd.openxmlformats-officedocument.drawing+xml");

    // 7. worksheet의 rels에 drawing 추가
    const sheetRelsPath = `xl/worksheets/_rels/${this._targetFileName}.rels`;
    let sheetRels = (await this._zipCache.get(sheetRelsPath)) as ExcelXmlRelationship | undefined;
    sheetRels = sheetRels ?? new ExcelXmlRelationship();
    const sheetRelNum = sheetRels.addAndGetId(
      `../drawings/drawing${drawingIndex}.xml`,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
    );
    const drawingRelIdOnWorksheet = `rId${sheetRelNum}`;
    this._zipCache.set(sheetRelsPath, sheetRels);

    // 8. worksheet XML에 drawing 추가
    const wsXml = await this._getWsData();
    wsXml.data.worksheet.$["xmlns:r"] =
      wsXml.data.worksheet.$["xmlns:r"] ??
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    wsXml.data.worksheet.drawing = wsXml.data.worksheet.drawing ?? [];
    wsXml.data.worksheet.drawing.push({ $: { "r:id": drawingRelIdOnWorksheet } });
    this._zipCache.set(`xl/worksheets/${this._targetFileName}`, wsXml);
  }

  //#endregion

  //#region Private Methods

  private async _getWsData(): Promise<ExcelXmlWorksheet> {
    return (await this._zipCache.get(
      `xl/worksheets/${this._targetFileName}`,
    )) as ExcelXmlWorksheet;
  }

  private async _getWbData(): Promise<ExcelXmlWorkbook> {
    return (await this._zipCache.get("xl/workbook.xml")) as ExcelXmlWorkbook;
  }

  //#endregion
}
