import type { Bytes } from "@simplysm/core-common";
import "@simplysm/core-common";
import { strIsNullOrEmpty } from "@simplysm/core-common";
import mime from "mime";
import type { ExcelCell } from "./excel-cell";
import { ExcelCol } from "./excel-col";
import { ExcelRow } from "./excel-row";
import type { ExcelAddressPoint, ExcelAddressRangePoint, ExcelValueType } from "./types";
import type { ZipCache } from "./utils/zip-cache";
import type { ExcelXmlContentType } from "./xml/excel-xml-content-type";
import { ExcelXmlDrawing } from "./xml/excel-xml-drawing";
import { ExcelXmlRelationship } from "./xml/excel-xml-relationship";
import type { ExcelXmlWorkbook } from "./xml/excel-xml-workbook";
import type { ExcelXmlWorksheet } from "./xml/excel-xml-worksheet";

/**
 * Class representing an Excel worksheet.
 * Provides cell access, row/column copying, data table processing, and image insertion.
 */
export class ExcelWorksheet {
  private readonly _rowMap = new Map<number, ExcelRow>();
  private readonly _colMap = new Map<number, ExcelCol>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _relId: number,
    private readonly _targetFileName: string,
  ) {}

  //#region Name Methods

  /** Return worksheet name */
  async getName(): Promise<string> {
    const wbXmlData = await this._getWbData();
    const name = wbXmlData.getWorksheetNameById(this._relId);
    if (name == null) {
      throw new Error(`워크시트 ID ${this._relId}에 해당하는 이름을 찾을 수 없습니다`);
    }
    return name;
  }

  /** Rename worksheet */
  async setName(newName: string): Promise<void> {
    const wbXmlData = await this._getWbData();
    wbXmlData.setWorksheetNameById(this._relId, newName);
  }

  //#endregion

  //#region Cell Access Methods

  /** Return row object (0-based) */
  row(r: number): ExcelRow {
    return this._rowMap.getOrCreate(r, new ExcelRow(this._zipCache, this._targetFileName, r));
  }

  /** Return cell object (0-based row/column) */
  cell(r: number, c: number): ExcelCell {
    return this.row(r).cell(c);
  }

  /** Return column object (0-based) */
  col(c: number): ExcelCol {
    return this._colMap.getOrCreate(c, new ExcelCol(this._zipCache, this._targetFileName, c));
  }

  //#endregion

  //#region Copy Methods

  /** Copy style from source row to target row */
  async copyRowStyle(srcR: number, targetR: number): Promise<void> {
    const range = await this.getRange();

    for (let c = range.s.c; c <= range.e.c; c++) {
      await this.copyCellStyle({ r: srcR, c: c }, { r: targetR, c: c });
    }
  }

  /** Copy style from source cell to target cell */
  async copyCellStyle(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();

    const styleId = wsData.getCellStyleId(srcAddr);
    if (styleId != null) {
      wsData.setCellStyleId(targetAddr, styleId);
    }
  }

  /** Copy source row to target row (overwrite) */
  async copyRow(srcR: number, targetR: number): Promise<void> {
    const wsData = await this._getWsData();
    wsData.copyRow(srcR, targetR);
  }

  /** Copy source cell to target cell */
  async copyCell(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();
    wsData.copyCell(srcAddr, targetAddr);
  }

  /**
   * Insert-copy the source row at the target position.
   * Existing rows at and below the target are shifted down by one.
   * @param srcR Source row index to copy (0-based)
   * @param targetR Target row index to insert at (0-based)
   */
  async insertCopyRow(srcR: number, targetR: number): Promise<void> {
    const wsData = await this._getWsData();
    const range = wsData.range;

    // Increment row index by 1 for all merge cells at or below targetR
    const mergeCells = wsData.getMergeCells();
    for (const mc of mergeCells) {
      if (mc.s.r >= targetR) mc.s.r++;
      if (mc.e.r >= targetR) mc.e.r++;
    }

    // When srcR >= targetR, adjust for the shifted position of srcR
    const adjustedSrcR = srcR >= targetR ? srcR + 1 : srcR;

    for (let r = range.e.r; r >= targetR; r--) {
      await this.copyRow(r, r + 1);
    }

    await this.copyRow(adjustedSrcR, targetR);
  }

  //#endregion

  //#region Range Methods

  /** Return data range of the worksheet */
  async getRange(): Promise<ExcelAddressRangePoint> {
    const xml = await this._getWsData();
    return xml.range;
  }

  /** Return all cells as a 2D array */
  async getCells(): Promise<ExcelCell[][]> {
    const xml = await this._getWsData();
    const range = xml.range;
    const promises: Promise<ExcelCell[]>[] = [];

    for (let r = range.s.r; r <= range.e.r; r++) {
      promises.push(this.row(r).getCells());
    }

    return Promise.all(promises);
  }

  //#endregion

  //#region Data Methods

  /**
   * Return worksheet data as a table (record array).
   * @param opt.headerRowIndex Header row index (default: first row)
   * @param opt.checkEndColIndex Column index to determine data end. Data ends when this column is empty.
   * @param opt.usableHeaderNameFn Function to filter usable headers
   */
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

  /**
   * Write 2D array data to the worksheet
   * @param matrix 2D array data (row-major, index 0 is the first row)
   */
  async setDataMatrix(matrix: ExcelValueType[][]): Promise<void> {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        await this.cell(r, c).setVal(matrix[r][c]);
      }
    }
  }

  /**
   * Write record array to the worksheet
   * @param records Record array. Headers are auto-generated in the first row, data follows in subsequent rows.
   */
  async setRecords(records: Record<string, ExcelValueType>[]): Promise<void> {
    const headers = records
      .flatMap((item) => Object.keys(item))
      .distinct()
      .filter((item) => !strIsNullOrEmpty(item));

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

  /** Set worksheet zoom scale (percent) */
  async setZoom(percent: number): Promise<void> {
    const wbXml = await this._getWbData();
    wbXml.initializeView();

    const wsXml = await this._getWsData();
    wsXml.setZoom(percent);
  }

  /** Set freeze panes for rows/columns */
  async setFix(point: { r?: number; c?: number }): Promise<void> {
    const wbXml = await this._getWbData();
    wbXml.initializeView();

    const wsXml = await this._getWsData();
    wsXml.setFix(point);
  }

  //#endregion

  //#region Image Methods

  /**
   * Insert an image into the worksheet.
   * @param opts.bytes Image binary data
   * @param opts.ext Image extension (png, jpg, etc.)
   * @param opts.from Image start position (0-based row/column index, rOff/cOff in EMU offset)
   * @param opts.to Image end position (if omitted, inserted at from position with original size)
   */
  async addImage(opts: {
    bytes: Bytes;
    ext: string;
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  }): Promise<void> {
    const mimeType = mime.getType(opts.ext);
    if (mimeType == null) {
      throw new Error(`확장자 '${opts.ext}'의 MIME 타입을 확인할 수 없습니다`);
    }

    // 1. Determine media filename and save
    let mediaIndex = 1;
    while ((await this._zipCache.get(`xl/media/image${mediaIndex}.${opts.ext}`)) !== undefined) {
      mediaIndex++;
    }
    const mediaPath = `xl/media/image${mediaIndex}.${opts.ext}`;
    this._zipCache.set(mediaPath, opts.bytes);

    // 2. Update [Content_Types].xml
    const typeXml = (await this._zipCache.get("[Content_Types].xml")) as ExcelXmlContentType;
    typeXml.add(`/xl/media/image${mediaIndex}.${opts.ext}`, mimeType);

    // 3. Check for existing drawing in worksheet
    const wsXml = await this._getWsData();
    const sheetRelsPath = `xl/worksheets/_rels/${this._targetFileName}.rels`;
    let sheetRels = (await this._zipCache.get(sheetRelsPath)) as ExcelXmlRelationship | undefined;

    // Find existing drawing
    let drawingIndex: number | undefined;
    let drawingPath: string | undefined;
    let drawing: ExcelXmlDrawing | undefined;
    let drawingRels: ExcelXmlRelationship | undefined;

    if (sheetRels != null) {
      const existingDrawingRel = sheetRels.data.Relationships.Relationship?.find(
        (r) =>
          r.$.Type ===
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
      );
      if (existingDrawingRel != null) {
        // Extract index from existing drawing path
        const match = existingDrawingRel.$.Target.match(/drawing(\d+)\.xml$/);
        if (match != null) {
          drawingIndex = parseInt(match[1], 10);
          drawingPath = `xl/drawings/drawing${drawingIndex}.xml`;
          drawing = (await this._zipCache.get(drawingPath)) as ExcelXmlDrawing | undefined;
          drawingRels = (await this._zipCache.get(
            `xl/drawings/_rels/drawing${drawingIndex}.xml.rels`,
          )) as ExcelXmlRelationship | undefined;
        }
      }
    }

    // 4. Create new drawing if none exists
    if (drawingIndex == null || drawingPath == null || drawing == null) {
      drawingIndex = 1;
      while ((await this._zipCache.get(`xl/drawings/drawing${drawingIndex}.xml`)) !== undefined) {
        drawingIndex++;
      }
      drawingPath = `xl/drawings/drawing${drawingIndex}.xml`;
      drawing = new ExcelXmlDrawing();

      // Add drawing type to [Content_Types].xml
      typeXml.add("/" + drawingPath, "application/vnd.openxmlformats-officedocument.drawing+xml");

      // Add drawing to worksheet rels
      sheetRels = sheetRels ?? new ExcelXmlRelationship();
      const sheetRelNum = sheetRels.addAndGetId(
        `../drawings/drawing${drawingIndex}.xml`,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
      );
      const drawingRelIdOnWorksheet = `rId${sheetRelNum}`;
      this._zipCache.set(sheetRelsPath, sheetRels);

      // Add drawing to worksheet XML
      wsXml.data.worksheet.$["xmlns:r"] =
        wsXml.data.worksheet.$["xmlns:r"] ??
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
      wsXml.data.worksheet.drawing = wsXml.data.worksheet.drawing ?? [];
      wsXml.data.worksheet.drawing.push({ $: { "r:id": drawingRelIdOnWorksheet } });
      this._zipCache.set(`xl/worksheets/${this._targetFileName}`, wsXml);
    }

    // 5. Prepare drawing rels (create if not exists)
    drawingRels = drawingRels ?? new ExcelXmlRelationship();
    const mediaFileName = mediaPath.slice(3);
    const drawingTarget = `../${mediaFileName}`;
    const relNum = drawingRels.addAndGetId(
      drawingTarget,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
    );
    this._zipCache.set(`xl/drawings/_rels/drawing${drawingIndex}.xml.rels`, drawingRels);

    // 6. Add image to drawing
    const blipRelId = `rId${relNum}`;
    drawing.addPicture({
      from: opts.from,
      to: opts.to ?? { r: opts.from.r + 1, c: opts.from.c + 1 },
      blipRelId: blipRelId,
    });
    this._zipCache.set(drawingPath, drawing);
  }

  //#endregion

  //#region Private Methods

  private async _getWsData(): Promise<ExcelXmlWorksheet> {
    return (await this._zipCache.get(`xl/worksheets/${this._targetFileName}`)) as ExcelXmlWorksheet;
  }

  private async _getWbData(): Promise<ExcelXmlWorkbook> {
    return (await this._zipCache.get("xl/workbook.xml")) as ExcelXmlWorkbook;
  }

  //#endregion
}
