import { SdExcelWorksheet } from "./sd-excel-worksheet";
import { SdExcelXmlRelationShip } from "./xmls/sd-excel-xml-relation-ship";
import { SdExcelXmlWorkbook } from "./xmls/sd-excel-xml-workbook";
import { SdExcelXmlContentType } from "./xmls/sd-excel-xml-content-type";
import { SdExcelXmlWorksheet } from "./xmls/sd-excel-xml-worksheet";
import { ZipCache } from "./utils/zip-cache";
import * as path from "path";

export class SdExcelWorkbook {
  async getSheetNames(): Promise<string[]> {
    const wbData = await this.zipCache.getAsync("xl/workbook.xml") as SdExcelXmlWorkbook;
    return wbData.sheetNames;
  }

  #wsMap = new Map<number, SdExcelWorksheet>();

  private constructor(public zipCache: ZipCache) {
  }

  static async loadAsync(arg: Buffer | Blob): Promise<SdExcelWorkbook> {
    const fileCache = await ZipCache.fromAsync(arg);
    return new SdExcelWorkbook(fileCache);
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

  async createWorksheetAsync(name: string): Promise<SdExcelWorksheet> {
    //-- Workbook
    const wbXml = (await this.zipCache.getAsync("xl/workbook.xml")) as SdExcelXmlWorkbook;
    const newWsRelId = wbXml.addWorksheet(name).lastWsRelId!;

    //-- Content Types
    const typeXml = (await this.zipCache.getAsync("[Content_Types].xml")) as SdExcelXmlContentType;
    typeXml.add(
      `/xl/worksheets/sheet${newWsRelId}.xml`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml",
    );

    //-- Workbook Rels
    const wbRelXml = (await this.zipCache.getAsync("xl/_rels/workbook.xml.rels")) as SdExcelXmlRelationShip;
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

  async getWorksheetAsync(nameOrIndex: string | number): Promise<SdExcelWorksheet> {
    const wbData = (await this.zipCache.getAsync("xl/workbook.xml")) as SdExcelXmlWorkbook;
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

    const relData = (await this.zipCache.getAsync("xl/_rels/workbook.xml.rels")) as SdExcelXmlRelationShip;
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
