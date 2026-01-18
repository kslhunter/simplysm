import { ExcelWorksheet } from "./excel-worksheet";
import { ExcelXmlRelationship } from "./xml/excel-xml-relationship";
import { ExcelXmlWorkbook as ExcelXmlWorkbookClass } from "./xml/excel-xml-workbook";
import { ExcelXmlContentType } from "./xml/excel-xml-content-type";
import { ExcelXmlWorksheet as ExcelXmlWorksheetClass } from "./xml/excel-xml-worksheet";
import { ZipCache } from "./utils/zip-cache";
import type { ExcelXmlWorkbook } from "./xml/excel-xml-workbook";

/**
 * Excel 워크북 처리 클래스
 *
 * @remarks
 * 이 클래스는 내부적으로 ZIP 리소스를 관리합니다.
 * 사용 완료 후 반드시 {@link close} 메서드를 호출하여 리소스를 해제해야 합니다.
 *
 * @example
 * ```typescript
 * const wb = new ExcelWorkbook(bytes);
 * try {
 *   const ws = await wb.getWorksheet(0);
 *   // ... 작업 수행
 * } finally {
 *   await wb.close();
 * }
 * ```
 */
export class ExcelWorkbook {
  zipCache: ZipCache;
  private readonly _wsMap = new Map<number, ExcelWorksheet>();
  private _isClosed = false;

  constructor(arg?: Blob | Uint8Array) {
    if (arg != null) {
      this.zipCache = new ZipCache(arg);
    } else {
      this.zipCache = new ZipCache();

      // Global ContentTypes
      const typeXml = new ExcelXmlContentType();
      this.zipCache.set("[Content_Types].xml", typeXml);

      // Global Rels
      this.zipCache.set(
        "_rels/.rels",
        new ExcelXmlRelationship().add(
          "xl/workbook.xml",
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
        ),
      );

      // Workbook
      const wbXml = new ExcelXmlWorkbookClass();
      this.zipCache.set("xl/workbook.xml", wbXml);

      // Workbook Rels
      const wbRelXml = new ExcelXmlRelationship();
      this.zipCache.set("xl/_rels/workbook.xml.rels", wbRelXml);
    }
  }

  //#region Worksheet Methods

  private _ensureNotClosed(): void {
    if (this._isClosed) {
      throw new Error("ExcelWorkbook이 이미 닫혔습니다. close() 호출 후에는 사용할 수 없습니다.");
    }
  }

  async getWorksheetNames(): Promise<string[]> {
    this._ensureNotClosed();
    const wbData = (await this.zipCache.get("xl/workbook.xml")) as ExcelXmlWorkbook;
    return wbData.sheetNames;
  }

  async createWorksheet(name: string): Promise<ExcelWorksheet> {
    this._ensureNotClosed();
    // Workbook
    const wbXml = (await this.zipCache.get("xl/workbook.xml")) as ExcelXmlWorkbook;
    const newWsRelId = wbXml.addWorksheet(name).lastWsRelId!;

    // Content Types
    const typeXml = (await this.zipCache.get("[Content_Types].xml")) as ExcelXmlContentType;
    typeXml.add(
      `/xl/worksheets/sheet${newWsRelId}.xml`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
    );

    // Workbook Rels
    const wbRelXml = (await this.zipCache.get(
      "xl/_rels/workbook.xml.rels",
    )) as ExcelXmlRelationship;
    wbRelXml.insert(
      newWsRelId,
      `worksheets/sheet${newWsRelId}.xml`,
      "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
    );

    // Worksheet
    const wsXml = new ExcelXmlWorksheetClass();
    this.zipCache.set(`xl/worksheets/sheet${newWsRelId}.xml`, wsXml);

    const ws = new ExcelWorksheet(this.zipCache, newWsRelId, `sheet${newWsRelId}.xml`);
    this._wsMap.set(newWsRelId, ws);
    return ws;
  }

  async getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet> {
    this._ensureNotClosed();
    const wbData = (await this.zipCache.get("xl/workbook.xml")) as ExcelXmlWorkbook;
    const wsId =
      typeof nameOrIndex === "string"
        ? wbData.getWsRelIdByName(nameOrIndex)
        : wbData.getWsRelIdByIndex(nameOrIndex);

    if (wsId === undefined) {
      if (typeof nameOrIndex === "string") {
        throw new Error(`시트명이 '${nameOrIndex}'인 시트를 찾을 수 없습니다.`);
      } else {
        throw new Error(`'${nameOrIndex}'번째 시트를 찾을 수 없습니다.`);
      }
    }

    if (this._wsMap.has(wsId)) {
      return this._wsMap.get(wsId)!;
    }

    const relData = (await this.zipCache.get(
      "xl/_rels/workbook.xml.rels",
    )) as ExcelXmlRelationship;
    const targetFilePath = relData.getTargetByRelId(wsId)!;

    // path.basename 대신 직접 파일명 추출 (브라우저 호환성)
    const fileName = targetFilePath.split("/").pop()!;

    const ws = new ExcelWorksheet(this.zipCache, wsId, fileName);
    this._wsMap.set(wsId, ws);
    return ws;
  }

  //#endregion

  //#region Export Methods

  async getBytes(): Promise<Uint8Array> {
    this._ensureNotClosed();
    return this.zipCache.toBytes();
  }

  async getBlob(): Promise<Blob> {
    this._ensureNotClosed();
    const bytes = await this.zipCache.toBytes();
    return new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  //#endregion

  //#region Lifecycle Methods

  /**
   * 워크북 리소스 해제
   *
   * @remarks
   * ZIP 리더와 내부 캐시를 정리합니다.
   * 호출 후에는 이 워크북 인스턴스를 사용할 수 없습니다.
   * 이미 닫힌 워크북에 대해 호출해도 안전합니다 (no-op).
   */
  async close(): Promise<void> {
    if (this._isClosed) {
      return; // 이미 닫힌 경우 무시
    }
    this._isClosed = true;
    await this.zipCache.close();
  }

  //#endregion
}
