import type { Bytes } from "@simplysm/core-common";
import { ExcelWorksheet } from "./excel-worksheet";
import { ZipCache } from "./utils/zip-cache";
import { ExcelXmlContentType } from "./xml/excel-xml-content-type";
import { ExcelXmlRelationship } from "./xml/excel-xml-relationship";
import type { ExcelXmlWorkbook } from "./xml/excel-xml-workbook";
import { ExcelXmlWorkbook as ExcelXmlWorkbookClass } from "./xml/excel-xml-workbook";
import { ExcelXmlWorksheet as ExcelXmlWorksheetClass } from "./xml/excel-xml-worksheet";

/**
 * Excel workbook processing class
 *
 * @remarks
 * This class internally manages ZIP resources.
 * Resources must be released after use.
 *
 * ## Async Design
 *
 * Adopts a Lazy Loading architecture for memory efficiency with large Excel files:
 * - XML inside the ZIP is read and parsed only at the point of access
 * - Large XML such as SharedStrings and Styles is loaded only when needed
 * - Memory efficient even in extreme cases (e.g., reading a single number cell from a file with 1TB SharedStrings)
 *
 * @example
 * ```typescript
 * // Using await using (recommended)
 * await using wb = new ExcelWorkbook(bytes);
 * const ws = await wb.getWorksheet(0);
 * // ... perform operations
 * // Resources automatically released at scope exit
 *
 * // Or using try-finally
 * const wb = new ExcelWorkbook(bytes);
 * try {
 *   const ws = await wb.getWorksheet(0);
 *   // ... perform operations
 * } finally {
 *   await wb.close();
 * }
 * ```
 */
export class ExcelWorkbook {
  readonly zipCache: ZipCache;
  private readonly _wsMap = new Map<number, ExcelWorksheet>();
  private _isClosed = false;

  /**
   * @param arg Existing Excel file data (Blob or Uint8Array). Creates a new workbook if omitted.
   */
  constructor(arg?: Blob | Bytes) {
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

  /** Return all worksheet names in the workbook */
  async getWorksheetNames(): Promise<string[]> {
    this._ensureNotClosed();
    const wbData = (await this.zipCache.get("xl/workbook.xml")) as ExcelXmlWorkbook;
    return wbData.sheetNames;
  }

  /** Create and return a new worksheet */
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

  /** Look up a worksheet by name or index (0-based) */
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

    const relData = (await this.zipCache.get("xl/_rels/workbook.xml.rels")) as ExcelXmlRelationship;
    const targetFilePath = relData.getTargetByRelId(wsId);
    if (targetFilePath == null) {
      throw new Error(`시트 관계 정보를 찾을 수 없습니다: rId${wsId}`);
    }

    // Extract filename directly instead of path.basename (browser compatibility)
    const fileName = targetFilePath.split("/").pop();
    if (fileName == null) {
      throw new Error(`시트 파일명을 추출할 수 없습니다: ${targetFilePath}`);
    }

    const ws = new ExcelWorksheet(this.zipCache, wsId, fileName);
    this._wsMap.set(wsId, ws);
    return ws;
  }

  //#endregion

  //#region Export Methods

  /** Export workbook as byte array */
  async getBytes(): Promise<Bytes> {
    this._ensureNotClosed();
    return this.zipCache.toBytes();
  }

  /** Export workbook as Blob */
  async getBlob(): Promise<Blob> {
    this._ensureNotClosed();
    const bytes = await this.zipCache.toBytes();
    return new Blob([new Uint8Array(bytes)], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  //#endregion

  //#region Lifecycle Methods

  /**
   * Release workbook resources
   *
   * @remarks
   * Cleans up the ZIP reader and internal cache.
   * The workbook instance cannot be used after this call.
   * Safe to call on an already closed workbook (no-op).
   */
  async close(): Promise<void> {
    if (this._isClosed) {
      return; // Ignore if already closed
    }
    this._isClosed = true;
    this._wsMap.clear();
    await this.zipCache.close();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.close();
  }

  //#endregion
}
