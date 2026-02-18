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
 * Excel 워크시트를 나타내는 클래스.
 * 셀 접근, 행/열 복사, 데이터 테이블 처리, 이미지 삽입 등의 기능을 제공한다.
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

  /** 워크시트 이름 반환 */
  async getName(): Promise<string> {
    const wbXmlData = await this._getWbData();
    const name = wbXmlData.getWorksheetNameById(this._relId);
    if (name == null) {
      throw new Error(`워크시트 ID ${this._relId}에 해당하는 이름을 찾을 수 없습니다`);
    }
    return name;
  }

  /** 워크시트 이름 변경 */
  async setName(newName: string): Promise<void> {
    const wbXmlData = await this._getWbData();
    wbXmlData.setWorksheetNameById(this._relId, newName);
  }

  //#endregion

  //#region Cell Access Methods

  /** 행 객체 반환 (0-based) */
  row(r: number): ExcelRow {
    return this._rowMap.getOrCreate(r, new ExcelRow(this._zipCache, this._targetFileName, r));
  }

  /** 셀 객체 반환 (0-based 행/열) */
  cell(r: number, c: number): ExcelCell {
    return this.row(r).cell(c);
  }

  /** 열 객체 반환 (0-based) */
  col(c: number): ExcelCol {
    return this._colMap.getOrCreate(c, new ExcelCol(this._zipCache, this._targetFileName, c));
  }

  //#endregion

  //#region Copy Methods

  /** 소스 행의 스타일을 타겟 행에 복사 */
  async copyRowStyle(srcR: number, targetR: number): Promise<void> {
    const range = await this.getRange();

    for (let c = range.s.c; c <= range.e.c; c++) {
      await this.copyCellStyle({ r: srcR, c: c }, { r: targetR, c: c });
    }
  }

  /** 소스 셀의 스타일을 타겟 셀에 복사 */
  async copyCellStyle(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();

    const styleId = wsData.getCellStyleId(srcAddr);
    if (styleId != null) {
      wsData.setCellStyleId(targetAddr, styleId);
    }
  }

  /** 소스 행을 타겟 행에 복사 (덮어쓰기) */
  async copyRow(srcR: number, targetR: number): Promise<void> {
    const wsData = await this._getWsData();
    wsData.copyRow(srcR, targetR);
  }

  /** 소스 셀을 타겟 셀에 복사 */
  async copyCell(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();
    wsData.copyCell(srcAddr, targetAddr);
  }

  /**
   * 소스 행을 타겟 위치에 삽입 복사.
   * 타겟 위치 이하의 기존 행들은 한 칸씩 아래로 밀린다.
   * @param srcR 복사할 소스 행 인덱스 (0-based)
   * @param targetR 삽입할 타겟 행 인덱스 (0-based)
   */
  async insertCopyRow(srcR: number, targetR: number): Promise<void> {
    const wsData = await this._getWsData();
    const range = wsData.range;

    // targetR 이하 모든 병합 셀의 행 인덱스 +1
    const mergeCells = wsData.getMergeCells();
    for (const mc of mergeCells) {
      if (mc.s.r >= targetR) mc.s.r++;
      if (mc.e.r >= targetR) mc.e.r++;
    }

    // srcR >= targetR인 경우, 밀림 후 srcR 위치가 변경되므로 보정
    const adjustedSrcR = srcR >= targetR ? srcR + 1 : srcR;

    for (let r = range.e.r; r >= targetR; r--) {
      await this.copyRow(r, r + 1);
    }

    await this.copyRow(adjustedSrcR, targetR);
  }

  //#endregion

  //#region Range Methods

  /** 워크시트의 데이터 범위 반환 */
  async getRange(): Promise<ExcelAddressRangePoint> {
    const xml = await this._getWsData();
    return xml.range;
  }

  /** 워크시트의 모든 셀을 2차원 배열로 반환 */
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
   * 워크시트 데이터를 테이블(레코드 배열) 형식으로 반환.
   * @param opt.headerRowIndex 헤더 행 인덱스 (기본값: 첫 번째 행)
   * @param opt.checkEndColIndex 데이터 종료를 판단할 열 인덱스. 해당 열이 비어있으면 데이터 끝으로 간주
   * @param opt.usableHeaderNameFn 사용할 헤더를 필터링하는 함수
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
   * 2차원 배열 데이터를 워크시트에 기록
   * @param matrix 2차원 배열 데이터 (행 우선, 0번 인덱스가 첫 번째 행)
   */
  async setDataMatrix(matrix: ExcelValueType[][]): Promise<void> {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        await this.cell(r, c).setVal(matrix[r][c]);
      }
    }
  }

  /**
   * 레코드 배열을 워크시트에 기록
   * @param records 레코드 배열. 첫 행에 헤더가 자동 생성되고, 이후 행에 데이터가 기록된다.
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

  /** 워크시트 확대/축소 비율 설정 (퍼센트) */
  async setZoom(percent: number): Promise<void> {
    const wbXml = await this._getWbData();
    wbXml.initializeView();

    const wsXml = await this._getWsData();
    wsXml.setZoom(percent);
  }

  /** 행/열 틀 고정 설정 */
  async setFix(point: { r?: number; c?: number }): Promise<void> {
    const wbXml = await this._getWbData();
    wbXml.initializeView();

    const wsXml = await this._getWsData();
    wsXml.setFix(point);
  }

  //#endregion

  //#region Image Methods

  /**
   * 워크시트에 이미지를 삽입.
   * @param opts.bytes 이미지 바이너리 데이터
   * @param opts.ext 이미지 확장자 (png, jpg 등)
   * @param opts.from 이미지 시작 위치 (0-based 행/열 인덱스, rOff/cOff는 EMU 단위 오프셋)
   * @param opts.to 이미지 끝 위치 (생략 시 from 위치에 원본 크기로 삽입)
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

    // 3. worksheet의 기존 drawing 확인
    const wsXml = await this._getWsData();
    const sheetRelsPath = `xl/worksheets/_rels/${this._targetFileName}.rels`;
    let sheetRels = (await this._zipCache.get(sheetRelsPath)) as ExcelXmlRelationship | undefined;

    // 기존 drawing 찾기
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
        // 기존 drawing 경로에서 인덱스 추출
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

    // 4. drawing이 없으면 새로 생성
    if (drawingIndex == null || drawingPath == null || drawing == null) {
      drawingIndex = 1;
      while ((await this._zipCache.get(`xl/drawings/drawing${drawingIndex}.xml`)) !== undefined) {
        drawingIndex++;
      }
      drawingPath = `xl/drawings/drawing${drawingIndex}.xml`;
      drawing = new ExcelXmlDrawing();

      // [Content_Types].xml에 drawing 타입 추가
      typeXml.add("/" + drawingPath, "application/vnd.openxmlformats-officedocument.drawing+xml");

      // worksheet의 rels에 drawing 추가
      sheetRels = sheetRels ?? new ExcelXmlRelationship();
      const sheetRelNum = sheetRels.addAndGetId(
        `../drawings/drawing${drawingIndex}.xml`,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
      );
      const drawingRelIdOnWorksheet = `rId${sheetRelNum}`;
      this._zipCache.set(sheetRelsPath, sheetRels);

      // worksheet XML에 drawing 추가
      wsXml.data.worksheet.$["xmlns:r"] =
        wsXml.data.worksheet.$["xmlns:r"] ??
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
      wsXml.data.worksheet.drawing = wsXml.data.worksheet.drawing ?? [];
      wsXml.data.worksheet.drawing.push({ $: { "r:id": drawingRelIdOnWorksheet } });
      this._zipCache.set(`xl/worksheets/${this._targetFileName}`, wsXml);
    }

    // 5. drawing rels 준비 (없으면 새로 생성)
    drawingRels = drawingRels ?? new ExcelXmlRelationship();
    const mediaFileName = mediaPath.slice(3);
    const drawingTarget = `../${mediaFileName}`;
    const relNum = drawingRels.addAndGetId(
      drawingTarget,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
    );
    this._zipCache.set(`xl/drawings/_rels/drawing${drawingIndex}.xml.rels`, drawingRels);

    // 6. drawing에 이미지 추가
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
