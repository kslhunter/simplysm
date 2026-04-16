import type { Bytes } from "@simplysm/core-common";
import "@simplysm/core-common";
import { DateOnly, DateTime, str, Time } from "@simplysm/core-common";
import mime from "mime";
import { ExcelCell } from "./excel-cell";
import { ExcelCol } from "./excel-col";
import { ExcelRow } from "./excel-row";
import type { ExcelAddressPoint, ExcelAddressRangePoint, ExcelValueType } from "./types";
import { ExcelUtils } from "./utils/excel-utils";
import type { ZipCache } from "./utils/zip-cache";
import type { ExcelXmlContentType } from "./xml/excel-xml-content-type";
import { ExcelXmlDrawing } from "./xml/excel-xml-drawing";
import { ExcelXmlRelationship } from "./xml/excel-xml-relationship";
import type { ExcelXmlSharedString } from "./xml/excel-xml-shared-string";
import { ExcelXmlSharedString as ExcelXmlSharedStringClass } from "./xml/excel-xml-shared-string";
import type { ExcelXmlStyle } from "./xml/excel-xml-style";
import { ExcelXmlStyle as ExcelXmlStyleClass } from "./xml/excel-xml-style";
import type { ExcelXmlWorkbook } from "./xml/excel-xml-workbook";
import type { ExcelXmlWorksheet } from "./xml/excel-xml-worksheet";

/**
 * Excel 워크시트를 나타내는 클래스.
 * 셀 접근, 행/열 복사, 데이터 테이블 처리, 이미지 삽입 기능을 제공한다.
 */
export class ExcelWorksheet {
  private readonly _rowMap = new Map<number, ExcelRow>();
  private readonly _colMap = new Map<number, ExcelCol>();
  private readonly _cellMap = new Map<string, ExcelCell>();

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
      throw new Error(`워크시트 ID ${this._relId}의 이름을 찾을 수 없습니다`);
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

  /** 행 객체 반환 (0 기반) */
  row(r: number): ExcelRow {
    return this._rowMap.getOrCreate(
      r,
      new ExcelRow(this._zipCache, this._targetFileName, r, (c) => this._getOrCreateCell(r, c)),
    );
  }

  /** 셀 객체 반환 (0 기반 행/열) */
  cell(r: number, c: number): ExcelCell {
    return this._getOrCreateCell(r, c);
  }

  /** 열 객체 반환 (0 기반) */
  col(c: number): ExcelCol {
    return this._colMap.getOrCreate(
      c,
      new ExcelCol(this._zipCache, this._targetFileName, c, (r) => this._getOrCreateCell(r, c)),
    );
  }

  private _getOrCreateCell(r: number, c: number): ExcelCell {
    const key = `${r},${c}`;
    let cell = this._cellMap.get(key);
    if (cell == null) {
      cell = new ExcelCell(this._zipCache, this._targetFileName, r, c);
      this._cellMap.set(key, cell);
    }
    return cell;
  }

  //#endregion

  //#region Copy Methods

  /** 원본 행에서 대상 행으로 스타일 복사 */
  async copyRowStyle(srcR: number, targetR: number): Promise<void> {
    const range = await this.getRange();

    for (let c = range.s.c; c <= range.e.c; c++) {
      await this.copyCellStyle({ r: srcR, c: c }, { r: targetR, c: c });
    }
  }

  /** 원본 셀에서 대상 셀로 스타일 복사 */
  async copyCellStyle(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();

    const styleId = wsData.getCellStyleId(srcAddr);
    if (styleId != null) {
      wsData.setCellStyleId(targetAddr, styleId);
    }
  }

  /** 원본 행을 대상 행으로 복사 (덮어쓰기) */
  async copyRow(srcR: number, targetR: number): Promise<void> {
    const wsData = await this._getWsData();
    wsData.copyRow(srcR, targetR);
  }

  /** 원본 셀을 대상 셀로 복사 */
  async copyCell(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void> {
    const wsData = await this._getWsData();
    wsData.copyCell(srcAddr, targetAddr);
  }

  /**
   * 원본 행을 대상 위치에 삽입 복사한다.
   * 대상 위치 이하의 기존 행은 한 칸 아래로 밀린다.
   * @param srcR 복사할 원본 행 인덱스 (0 기반)
   * @param targetR 삽입할 대상 행 인덱스 (0 기반)
   */
  async insertCopyRow(srcR: number, targetR: number): Promise<void> {
    const wsData = await this._getWsData();
    const range = wsData.range;

    // targetR 이하의 병합 셀을 1칸 아래로 이동
    // 삽입 지점을 관통하는 다중행 병합은 자동으로 1행 확장됨
    wsData.shiftMergeCells(targetR, 1);

    // srcR >= targetR인 경우, srcR의 이동된 위치를 보정
    const adjustedSrcR = srcR >= targetR ? srcR + 1 : srcR;

    // 기존 행을 아래로 이동 (덮어쓰기 방지를 위해 아래에서 위로)
    // 병합 셀은 위에서 이미 이동했으므로 skipMerge: true 사용
    for (let r = range.e.r; r >= targetR; r--) {
      wsData.copyRow(r, r + 1, { skipMerge: true });
    }

    // 원본 행을 대상 위치에 복사 (병합은 skipMerge로 건너뜀)
    wsData.copyRow(adjustedSrcR, targetR, { skipMerge: true });

    // 원본 행의 단일행 병합만 대상 행에 복사
    // (다중행 병합은 shiftMergeCells에서 이미 확장 처리됨)
    const allMergeCells = wsData.getMergeCells();
    const sourceMergeCells = allMergeCells.filter(
      (mc) => mc.s.r === adjustedSrcR && mc.e.r === adjustedSrcR,
    );
    for (const mergeCell of sourceMergeCells) {
      const newStartAddr = { r: targetR, c: mergeCell.s.c };
      const newEndAddr = { r: targetR, c: mergeCell.e.c };
      wsData.setMergeCells(newStartAddr, newEndAddr);
    }
  }

  //#endregion

  //#region Range Methods

  /** 워크시트의 데이터 범위 반환 */
  async getRange(): Promise<ExcelAddressRangePoint> {
    const xml = await this._getWsData();
    return xml.range;
  }

  /** 모든 셀을 2차원 배열로 반환 */
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
   * 워크시트 데이터를 테이블(레코드 배열)로 반환한다.
   * @param opt.headerRowIndex 헤더 행 인덱스 (기본값: 첫 번째 행)
   * @param opt.checkEndColIndex 데이터 끝을 판단할 열 인덱스. 이 열이 비어있으면 데이터가 끝난 것으로 판단한다.
   * @param opt.usableHeaderNameFn 사용 가능한 헤더를 필터링하는 함수
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
      const headerName = await this.cell(startRow, c).getValue();
      if (typeof headerName === "string") {
        if (opt?.usableHeaderNameFn == null || opt.usableHeaderNameFn(headerName)) {
          if (headerMap.has(headerName)) {
            throw new Error(
              `중복된 헤더: "${headerName}" (열 ${headerMap.get(headerName)!}과 열 ${c})`,
            );
          }
          headerMap.set(headerName, c);
        }
      }
    }

    for (let r = startRow + 1; r <= range.e.r; r++) {
      if (
        opt?.checkEndColIndex != null &&
        (await this.cell(r, opt.checkEndColIndex).getValue()) == null
      ) {
        break;
      }

      const record: Record<string, ExcelValueType> = {};
      for (const header of headerMap.keys()) {
        const c = headerMap.get(header)!;
        record[header] = await this.cell(r, c).getValue();
      }

      result.push(record);
    }

    return result;
  }

  /**
   * 2차원 배열 데이터를 워크시트에 쓰기
   * @param matrix 2차원 배열 데이터 (행 우선, 인덱스 0이 첫 번째 행)
   */
  async setDataMatrix(matrix: ExcelValueType[][]): Promise<void> {
    const wsData = await this._getWsData();
    const ssData = await this._ensureSsData();
    const styleData = await this._ensureStyleData();

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        this._setCellValueSync(wsData, ssData, styleData, { r, c }, matrix[r][c]);
      }
    }
  }

  /**
   * 레코드 배열을 워크시트에 쓰기
   * @param records 레코드 배열. 첫 번째 행에 헤더가 자동 생성되고, 이후 행에 데이터가 기록된다.
   */
  async setRecords(records: Record<string, ExcelValueType>[]): Promise<void> {
    const headers = records
      .flatMap((item) => Object.keys(item))
      .distinct()
      .filter((item) => !str.isNullOrEmpty(item));

    const wsData = await this._getWsData();
    const ssData = await this._ensureSsData();
    const styleData = await this._ensureStyleData();

    for (let c = 0; c < headers.length; c++) {
      this._setCellValueSync(wsData, ssData, styleData, { r: 0, c }, headers[c]);
    }

    for (let r = 1; r < records.length + 1; r++) {
      for (let c = 0; c < headers.length; c++) {
        this._setCellValueSync(
          wsData,
          ssData,
          styleData,
          { r, c },
          records[r - 1][headers[c]],
        );
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
  async freezeAt(point: { r?: number; c?: number }): Promise<void> {
    const wbXml = await this._getWbData();
    wbXml.initializeView();

    const wsXml = await this._getWsData();
    wsXml.freezeAt(point);
  }

  //#endregion

  //#region Image Methods

  /**
   * 워크시트에 이미지를 삽입한다.
   * @param opts.bytes 이미지 바이너리 데이터
   * @param opts.ext 이미지 확장자 (png, jpg 등)
   * @param opts.from 이미지 시작 위치 (0 기반 행/열 인덱스, rOff/cOff는 EMU 오프셋)
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
      throw new Error(`확장자 '${opts.ext}'에 대한 MIME 타입을 결정할 수 없습니다`);
    }

    // 1. 미디어 파일명 결정 및 저장
    let mediaIndex = 1;
    while ((await this._zipCache.get(`xl/media/image${mediaIndex}.${opts.ext}`)) != null) {
      mediaIndex++;
    }
    const mediaPath = `xl/media/image${mediaIndex}.${opts.ext}`;
    this._zipCache.set(mediaPath, opts.bytes);

    // 2. [Content_Types].xml 갱신
    const typeXml = (await this._zipCache.get("[Content_Types].xml")) as ExcelXmlContentType;
    typeXml.add(`/xl/media/image${mediaIndex}.${opts.ext}`, mimeType);

    // 3. 워크시트의 기존 drawing 확인
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

    // 4. 기존 drawing이 없으면 새로 생성
    if (drawingIndex == null || drawingPath == null || drawing == null) {
      drawingIndex = 1;
      while ((await this._zipCache.get(`xl/drawings/drawing${drawingIndex}.xml`)) != null) {
        drawingIndex++;
      }
      drawingPath = `xl/drawings/drawing${drawingIndex}.xml`;
      drawing = new ExcelXmlDrawing();

      // [Content_Types].xml에 drawing 타입 추가
      typeXml.add("/" + drawingPath, "application/vnd.openxmlformats-officedocument.drawing+xml");

      // 워크시트 rels에 drawing 추가
      sheetRels = sheetRels ?? new ExcelXmlRelationship();
      const sheetRelNum = sheetRels.addAndGetId(
        `../drawings/drawing${drawingIndex}.xml`,
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing",
      );
      const drawingRelIdOnWorksheet = `rId${sheetRelNum}`;
      this._zipCache.set(sheetRelsPath, sheetRels);

      // 워크시트 XML에 drawing 추가
      wsXml.data.worksheet.$["xmlns:r"] =
        wsXml.data.worksheet.$["xmlns:r"] ??
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
      wsXml.data.worksheet.drawing = wsXml.data.worksheet.drawing ?? [];
      wsXml.data.worksheet.drawing.push({ $: { "r:id": drawingRelIdOnWorksheet } });
      this._zipCache.set(`xl/worksheets/${this._targetFileName}`, wsXml);
    }

    // 5. drawing rels 준비 (없으면 생성)
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

  private async _ensureSsData(): Promise<ExcelXmlSharedString> {
    let ssData = (await this._zipCache.get("xl/sharedStrings.xml")) as
      | ExcelXmlSharedString
      | undefined;
    if (ssData == null) {
      ssData = new ExcelXmlSharedStringClass();
      this._zipCache.set("xl/sharedStrings.xml", ssData);

      const typeData = (await this._zipCache.get("[Content_Types].xml")) as ExcelXmlContentType;
      typeData.add(
        "/xl/sharedStrings.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml",
      );

      const wbRelData = (await this._zipCache.get(
        "xl/_rels/workbook.xml.rels",
      )) as ExcelXmlRelationship;
      wbRelData.add(
        "sharedStrings.xml",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings",
      );
    }
    return ssData;
  }

  private async _ensureStyleData(): Promise<ExcelXmlStyle> {
    let styleData = (await this._zipCache.get("xl/styles.xml")) as ExcelXmlStyle | undefined;
    if (styleData == null) {
      styleData = new ExcelXmlStyleClass();
      this._zipCache.set("xl/styles.xml", styleData);

      const typeData = (await this._zipCache.get("[Content_Types].xml")) as ExcelXmlContentType;
      typeData.add(
        "/xl/styles.xml",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
      );

      const wbRelData = (await this._zipCache.get(
        "xl/_rels/workbook.xml.rels",
      )) as ExcelXmlRelationship;
      wbRelData.add(
        "styles.xml",
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles",
      );
    }
    return styleData;
  }

  private _setCellValueSync(
    wsData: ExcelXmlWorksheet,
    ssData: ExcelXmlSharedString,
    styleData: ExcelXmlStyle,
    addr: ExcelAddressPoint,
    val: ExcelValueType,
  ): void {
    if (val == null) {
      wsData.deleteCell(addr);
    } else if (typeof val === "string") {
      const ssId = ssData.getIdByString(val) ?? ssData.add(val);
      wsData.setCellType(addr, "s");
      wsData.setCellVal(addr, ssId.toString());
    } else if (typeof val === "boolean") {
      wsData.setCellType(addr, "b");
      wsData.setCellVal(addr, val ? "1" : "0");
    } else if (typeof val === "number") {
      wsData.setCellType(addr, undefined);
      wsData.setCellVal(addr, val.toString());
    } else if (val instanceof DateOnly || val instanceof DateTime || val instanceof Time) {
      wsData.setCellType(addr, undefined);
      wsData.setCellVal(addr, ExcelUtils.convertTimeTickToNumber(val.tick).toString());

      const numFmtName =
        val instanceof DateOnly ? "DateOnly" : val instanceof DateTime ? "DateTime" : "Time";
      const numFmtId = ExcelUtils.convertNumFmtNameToId(numFmtName).toString();

      let styleId = wsData.getCellStyleId(addr);
      if (styleId == null) {
        styleId = styleData.add({ numFmtId });
      } else {
        styleId = styleData.addWithClone(styleId, { numFmtId });
      }
      wsData.setCellStyleId(addr, styleId);
    } else {
      throw new Error(
        `[${ExcelUtils.stringifyAddr(addr)}] 지원하지 않는 타입: ${typeof val}`,
      );
    }
  }

  //#endregion
}
