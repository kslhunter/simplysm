import { ExcelWorksheet } from "./excel-worksheet";
import { ExcelXmlRelationship } from "./xml/excel-xml-relationship";
import { ExcelXmlWorkbook as ExcelXmlWorkbookClass } from "./xml/excel-xml-workbook";
import { ExcelXmlContentType } from "./xml/excel-xml-content-type";
import { ExcelXmlWorksheet as ExcelXmlWorksheetClass } from "./xml/excel-xml-worksheet";
import { ZipCache } from "./utils/zip-cache";
import type { ExcelXmlWorkbook } from "./xml/excel-xml-workbook";
import mime from "mime";

export class ExcelWorkbook {
  zipCache: ZipCache;
  private readonly _wsMap = new Map<number, ExcelWorksheet>();

  constructor(arg?: Blob | Buffer) {
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

  async getWorksheetNames(): Promise<string[]> {
    const wbData = (await this.zipCache.get("xl/workbook.xml")) as ExcelXmlWorkbook;
    return wbData.sheetNames;
  }

  async createWorksheet(name: string): Promise<ExcelWorksheet> {
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

  //#region Media Methods

  async addMedia(buffer: Buffer, ext: string): Promise<string> {
    const mimeType = mime.getType(ext);
    if (mimeType == null) {
      throw new Error(`지원되지 않는 이미지 확장자입니다: ${ext}`);
    }

    // 다음 Media Index 찾기
    let mediaIndex = 1;
    while ((await this.zipCache.get(`xl/media/image${mediaIndex}.${ext}`)) !== undefined) {
      mediaIndex++;
    }
    const mediaPath = `xl/media/image${mediaIndex}.${ext}`;

    // Media 저장
    this.zipCache.set(mediaPath, buffer);

    // [Content_Types].xml 설정
    const typeXml = (await this.zipCache.get("[Content_Types].xml")) as ExcelXmlContentType;
    typeXml.add(mediaPath, mimeType);

    return mediaPath;
  }

  //#endregion

  //#region Export Methods

  async getBuffer(): Promise<Buffer> {
    return await this.zipCache.toBuffer();
  }

  async getBlob(): Promise<Blob> {
    const buffer = await this.zipCache.toBuffer();
    return new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  //#endregion

  //#region Lifecycle Methods

  async close(): Promise<void> {
    await this.zipCache.close();
  }

  //#endregion
}
