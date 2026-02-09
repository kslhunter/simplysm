import { StringUtils } from "@simplysm/sd-core-common";
import { SdExcelCell } from "./SdExcelCell";
import { SdExcelCol } from "./SdExcelCol";
import { SdExcelRow } from "./SdExcelRow";
import { ISdExcelAddressRangePoint, TSdExcelValueType } from "./types";
import { ZipCache } from "./utils/ZipCache";
import { SdExcelXmlWorkbook } from "./xmls/SdExcelXmlWorkbook";
import { SdExcelXmlWorksheet } from "./xmls/SdExcelXmlWorksheet";
import mime from "mime";
import { SdExcelXmlContentType } from "./xmls/SdExcelXmlContentType";
import { SdExcelXmlRelationShip } from "./xmls/SdExcelXmlRelationShip";
import { SdExcelXmlDrawing } from "./xmls/SdExcelXmlDrawing";

export class SdExcelWorksheet {
  private readonly _rowMap = new Map<number, SdExcelRow>();

  constructor(
    private readonly _zipCache: ZipCache,
    private readonly _relId: number,
    private readonly _targetFileName: string,
  ) {}

  async getNameAsync(): Promise<string> {
    const wbXmlData = await this._getWbDataAsync();
    return wbXmlData.getWorksheetNameById(this._relId)!;
  }

  async setNameAsync(newName: string): Promise<void> {
    const wbXmlData = await this._getWbDataAsync();
    wbXmlData.setWorksheetNameById(this._relId, newName);
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
    srcAddr: { r: number; c: number },
    targetAddr: { r: number; c: number },
  ) {
    const wsData = await this._getWsDataAsync();

    const styleId = wsData.getCellStyleId(srcAddr);
    if (styleId != null) {
      wsData.setCellStyleId(targetAddr, styleId);
    }
  }

  async copyRowAsync(srcR: number, targetR: number) {
    const wsData = await this._getWsDataAsync();
    wsData.copyRow(srcR, targetR);
  }

  async copyCellAsync(srcAddr: { r: number; c: number }, targetAddr: { r: number; c: number }) {
    const wsData = await this._getWsDataAsync();
    wsData.copyCell(srcAddr, targetAddr);
  }

  async insertEmptyRowAsync(row: number): Promise<void> {
    const wsData = await this._getWsDataAsync();
    wsData.insertEmptyRow(row);
  }

  async insertCopyRowAsync(srcR: number, targetR: number) {
    // 1. 빈 행 삽입 (행 번호만 shift - 가벼운 작업)
    await this.insertEmptyRowAsync(targetR);

    // 2. srcR이 targetR 이상이면 +1 보정 (insertEmptyRow로 밀렸으므로)
    const adjustedSrcR = srcR >= targetR ? srcR + 1 : srcR;

    // 3. 소스 행 1개만 clone하여 targetR에 복사
    await this.copyRowAsync(adjustedSrcR, targetR);
  }

  async getRangeAsync(): Promise<ISdExcelAddressRangePoint> {
    const xml = await this._getWsDataAsync();
    return xml.range;
  }

  async getCellsAsync(): Promise<SdExcelCell[][]> {
    const result: SdExcelCell[][] = [];

    const xml = await this._getWsDataAsync();

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
    usableHeaderNameFn?: (headerName: string) => boolean;
  }): Promise<Record<string, any>[]> {
    const result: Record<string, TSdExcelValueType>[] = [];

    const headerMap = new Map<string, number>();

    const xml = await this._getWsDataAsync();
    const range = xml.range;

    const startRow = opt?.headerRowIndex ?? range.s.r;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerName = await this.cell(startRow, c).getValAsync();
      if (typeof headerName === "string") {
        if (!opt?.usableHeaderNameFn || opt.usableHeaderNameFn(headerName)) {
          headerMap.set(headerName, c);
        }
      }
    }

    for (let r = startRow + 1; r <= range.e.r; r++) {
      if (
        opt?.checkEndColIndex !== undefined &&
        (await this.cell(r, opt.checkEndColIndex).getValAsync()) === undefined
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

  async setRecords(record: Record<string, any>[]): Promise<void> {
    const headers = record
      .mapMany((item) => Object.keys(item))
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
  }

  async setZoomAsync(percent: number) {
    const wbXml = await this._getWbDataAsync();
    wbXml.initializeView();

    const wsXml = await this._getWsDataAsync();
    wsXml.setZoom(percent);
  }

  async setFixAsync(point: { r?: number; c?: number }) {
    const wbXml = await this._getWbDataAsync();
    wbXml.initializeView();

    const wsXml = await this._getWsDataAsync();
    wsXml.setFix(point);
  }

  async addImageAsync(opts: {
    buffer: Buffer;
    ext: string;
    from: { r: number; c: number; rOff?: number | string; cOff?: number | string };
    to?: { r: number; c: number; rOff?: number | string; cOff?: number | string };
  }): Promise<void> {
    const mimeType = mime.getType(opts.ext);
    if (mimeType == null) throw new Error(`${opts.ext}의 mime 타입 확인 불가`);

    // 1. Media 저장
    let mediaIndex = 1;
    while (await this._zipCache.existsAsync(`xl/media/image${mediaIndex}.${opts.ext}`)) {
      mediaIndex++;
    }
    const mediaPath = `xl/media/image${mediaIndex}.${opts.ext}`;
    this._zipCache.set(mediaPath, opts.buffer);

    // 2. [Content_Types] - media
    const typeXml = (await this._zipCache.getAsync("[Content_Types].xml")) as SdExcelXmlContentType;
    typeXml.add(`/xl/media/image${mediaIndex}.${opts.ext}`, mimeType);

    // 3. Drawing 준비 (공통 헬퍼)
    const { drawing, drawingRels } = await this._ensureDrawingAsync();

    // 4. Drawing Rels에 media 관계 추가
    const relNum = drawingRels.addAndGetId(
      `../media/image${mediaIndex}.${opts.ext}`,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
    );

    // 5. twoCellAnchor로 picture 추가
    drawing.addPicture({
      from: opts.from,
      to: opts.to ?? { r: opts.from.r + 1, c: opts.from.c + 1 },
      blipRelId: `rId${relNum}`,
    });
  }

  async addDrawingAsync(opts: {
    buffer: Buffer;
    ext: string;
    r: number;
    c: number;
    width: number;
    height: number;
    left?: number;
    top?: number;
  }): Promise<void> {
    const mimeType = mime.getType(opts.ext);
    if (mimeType == null) throw new Error(`${opts.ext}의 mime 타입 확인 불가`);

    // 1. Media 저장
    let mediaIndex = 1;
    while (await this._zipCache.existsAsync(`xl/media/image${mediaIndex}.${opts.ext}`)) {
      mediaIndex++;
    }
    const mediaPath = `xl/media/image${mediaIndex}.${opts.ext}`;
    this._zipCache.set(mediaPath, opts.buffer);

    // 2. [Content_Types] - media
    const typeXml = (await this._zipCache.getAsync("[Content_Types].xml")) as SdExcelXmlContentType;
    typeXml.add(`/xl/media/image${mediaIndex}.${opts.ext}`, mimeType);

    // 3. Drawing 준비 (공통 헬퍼)
    const { drawing, drawingRels } = await this._ensureDrawingAsync();

    // 4. Drawing Rels에 media 관계 추가
    const relNum = drawingRels.addAndGetId(
      `../media/image${mediaIndex}.${opts.ext}`,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
    );

    // 5. oneCellAnchor로 picture 추가
    drawing.addOneCellPicture({
      r: opts.r,
      c: opts.c,
      width: opts.width,
      height: opts.height,
      left: opts.left,
      top: opts.top,
      blipRelId: `rId${relNum}`,
    });
  }

  private async _ensureDrawingAsync(): Promise<{
    drawingPath: string;
    drawing: SdExcelXmlDrawing;
    drawingRels: SdExcelXmlRelationShip;
    drawingIndex: number;
  }> {
    // 1. Sheet Rels에서 기존 drawing 관계 검색
    const sheetRelsPath = `xl/worksheets/_rels/${this._targetFileName}.rels`;
    let sheetRels = (await this._zipCache.getAsync(sheetRelsPath)) as SdExcelXmlRelationShip | undefined;
    sheetRels = sheetRels ?? new SdExcelXmlRelationShip();

    const existingDrawingRel = sheetRels.data.Relationships.Relationship
      ?.single((rel: any) => /drawing[0-9]/.test(rel.$.Target));

    let drawingIndex: number;
    let wsRelId: number;

    if (existingDrawingRel != null) {
      // 기존 drawing 재사용
      wsRelId = Number(existingDrawingRel.$.Id.replace(/rId/, ""));
      const match = /drawing(\d+)/.exec(existingDrawingRel.$.Target);
      drawingIndex = match ? Number(match[1]) : 1;
    } else {
      // 새 drawing 생성
      drawingIndex = 1;
      while (await this._zipCache.existsAsync(`xl/drawings/drawing${drawingIndex}.xml`)) {
        drawingIndex++;
      }
      wsRelId = sheetRels.addAndGetId(
        `../drawings/drawing${drawingIndex}.xml`,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
      );
    }
    this._zipCache.set(sheetRelsPath, sheetRels);

    // 2. Drawing + Drawing Rels 가져오거나 생성
    const drawingPath = `xl/drawings/drawing${drawingIndex}.xml`;
    const drawingRelsPath = `xl/drawings/_rels/drawing${drawingIndex}.xml.rels`;

    let drawing = (await this._zipCache.getAsync(drawingPath)) as SdExcelXmlDrawing | undefined;
    drawing = drawing ?? new SdExcelXmlDrawing();
    this._zipCache.set(drawingPath, drawing);

    let drawingRels = (await this._zipCache.getAsync(drawingRelsPath)) as SdExcelXmlRelationShip | undefined;
    drawingRels = drawingRels ?? new SdExcelXmlRelationShip();
    this._zipCache.set(drawingRelsPath, drawingRels);

    // 3. [Content_Types] - drawing 타입 등록 (중복 체크)
    const typeXml = (await this._zipCache.getAsync("[Content_Types].xml")) as SdExcelXmlContentType;
    typeXml.add(`/xl/drawings/drawing${drawingIndex}.xml`, "application/vnd.openxmlformats-officedocument.drawing+xml");

    // 4. Worksheet XML - drawing 참조 (중복 체크)
    const wsXml = await this._getWsDataAsync();
    wsXml.data.worksheet.$["xmlns:r"] =
      wsXml.data.worksheet.$["xmlns:r"] ??
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    wsXml.data.worksheet.drawing = wsXml.data.worksheet.drawing ?? [];
    const drawingRelIdStr = `rId${wsRelId}`;
    if (!wsXml.data.worksheet.drawing.some((item: any) => item.$["r:id"] === drawingRelIdStr)) {
      wsXml.data.worksheet.drawing.push({ $: { "r:id": drawingRelIdStr } });
    }
    this._zipCache.set(`xl/worksheets/${this._targetFileName}`, wsXml);

    return { drawingPath, drawing, drawingRels, drawingIndex };
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

  private async _getWsDataAsync() {
    return (await this._zipCache.getAsync(
      `xl/worksheets/${this._targetFileName}`,
    )) as SdExcelXmlWorksheet;
  }

  private async _getWbDataAsync() {
    return (await this._zipCache.getAsync("xl/workbook.xml")) as SdExcelXmlWorkbook;
  }
}
