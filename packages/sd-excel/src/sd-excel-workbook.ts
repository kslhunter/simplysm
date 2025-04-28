import { SdExcelWorksheet } from "./sd-excel-worksheet";
import { SdExcelXmlRelationShip } from "./xmls/sd-excel-xml-relation-ship";
import { SdExcelXmlWorkbook } from "./xmls/sd-excel-xml-workbook";
import { SdExcelXmlContentType } from "./xmls/sd-excel-xml-content-type";
import { SdExcelXmlWorksheet } from "./xmls/sd-excel-xml-worksheet";
import { ZipCache } from "./utils/zip-cache";
import * as path from "path";

export class SdExcelWorkbook {
  get sheetNames(): string[] {
    const wbData = this.zipCache.get("xl/workbook.xml") as SdExcelXmlWorkbook;
    return wbData.sheetNames;
  }

  #wsMap = new Map<number, SdExcelWorksheet>();

  private constructor(public zipCache: ZipCache) {
  }

  static async loadAsync(arg: Buffer | Blob): Promise<SdExcelWorkbook> {
    if (Buffer.isBuffer(arg)) {
      const fileCache = await ZipCache.fromBufferAsync(arg);
      return new SdExcelWorkbook(fileCache);
    }
    else {
      const arrayBuffer = await arg.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileCache = await ZipCache.fromBufferAsync(buffer);
      return new SdExcelWorkbook(fileCache);
    }
  }

  static create(): SdExcelWorkbook {
    const fileCache = new ZipCache();

    //-- Global ContentTypes
    const typeXml = new SdExcelXmlContentType();
    fileCache.set("[Content_Types].xml", typeXml);

    //-- Global Rels
    fileCache.set(
      "_rels/.rels",
      new SdExcelXmlRelationShip()
        .add(
          "xl/workbook.xml",
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
        ),
    );

    //-- Workbook
    const wbXml = new SdExcelXmlWorkbook();
    fileCache.set("xl/workbook.xml", wbXml);

    //-- Workbook Rels
    const wbRelXml = new SdExcelXmlRelationShip();
    fileCache.set("xl/_rels/workbook.xml.rels", wbRelXml);

    return new SdExcelWorkbook(fileCache);
  }

  createWorksheet(name: string): SdExcelWorksheet {
    //-- Workbook
    const wbXml = this.zipCache.get("xl/workbook.xml") as SdExcelXmlWorkbook;
    const newWsRelId = wbXml.addWorksheet(name).lastWsRelId!;

    //-- Content Types
    const typeXml = this.zipCache.get("[Content_Types].xml") as SdExcelXmlContentType;
    typeXml.add(
      `/xl/worksheets/sheet${newWsRelId}.xml`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
    );

    //-- Workbook Rels
    const wbRelXml = this.zipCache.get("xl/_rels/workbook.xml.rels") as SdExcelXmlRelationShip;
    wbRelXml.insert(
      newWsRelId,
      `worksheets/sheet${newWsRelId}.xml`,
      `http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`,
    );

    //-- Worksheet
    const wsXml = new SdExcelXmlWorksheet();
    this.zipCache.set(`xl/worksheets/sheet${newWsRelId}.xml`, wsXml);

    const ws = new SdExcelWorksheet(this.zipCache, newWsRelId, `sheet${newWsRelId}.xml`);
    this.#wsMap.set(newWsRelId, ws);
    return ws;
  }

  getWorksheet(nameOrIndex: string | number): SdExcelWorksheet {
    const wbData = this.zipCache.get("xl/workbook.xml") as SdExcelXmlWorkbook;
    const wsId = typeof nameOrIndex === "string"
      ? wbData.getWsRelIdByName(nameOrIndex)
      : wbData.getWsRelIdByIndex(nameOrIndex);
    if (wsId === undefined) {
      if (typeof nameOrIndex === "string") {
        throw new Error(`시트명이 '${nameOrIndex}'인 시트를 찾을 수 없습니다.`);
      }
      else {
        throw new Error(`'${nameOrIndex}'번째 시트를 찾을 수 없습니다.`);
      }
    }
    if (this.#wsMap.has(wsId)) {
      return this.#wsMap.get(wsId)!;
    }

    const relData = this.zipCache.get("xl/_rels/workbook.xml.rels") as SdExcelXmlRelationShip;
    const targetFilePath = relData.getTargetByRelId(wsId)!;

    const ws = new SdExcelWorksheet(this.zipCache, wsId, path.basename(targetFilePath));
    this.#wsMap.set(wsId, ws);
    return ws;
  }

  /*public async getCustomFileDataAsync(filePath: string): Promise<ISdExcelXml | Buffer | undefined> {
    return await this.zipCache.getAsync(filePath);
  }*/

  async getBufferAsync(): Promise<Buffer> {
    return await this.zipCache.toBufferAsync();
  }

  async getBlobAsync(): Promise<Blob> {
    const buffer = await this.zipCache.toBufferAsync();
    const uint8Array = new Uint8Array(buffer);
    return new Blob(
      [uint8Array],
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
    );
  }
}
