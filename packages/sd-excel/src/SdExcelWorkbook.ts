import JSZip from "jszip";
import {SdExcelWorksheet} from "./SdExcelWorksheet";
import {SdExcelXmlRelationship} from "./files/SdExcelXmlRelationship";
import {SdExcelXmlWorkbook} from "./files/SdExcelXmlWorkbook";
import {SdExcelXmlContentType} from "./files/SdExcelXmlContentType";
import {SdExcelXmlWorksheet} from "./files/SdExcelXmlWorksheet";
import {SdExcelZipCache} from "./utils/SdExcelZipCache";
import {type ISdExcelXml} from "./commons";
import * as path from "path";

export class SdExcelWorkbook {
  public async getWorksheetNamesAsync(): Promise<string[]> {
    const wbData = await this._zipCache.getAsync("xl/workbook.xml") as SdExcelXmlWorkbook;
    return wbData.worksheetNames;
  }

  private readonly _wsMap = new Map<number, SdExcelWorksheet>();

  private constructor(private readonly _zipCache: SdExcelZipCache) {
  }

  public static async loadAsync(arg: Buffer | Blob): Promise<SdExcelWorkbook> {
    const zip = await new JSZip().loadAsync(arg);
    const fileCache = new SdExcelZipCache(zip);
    return new SdExcelWorkbook(fileCache);
  }

  public static create(): SdExcelWorkbook {
    const fileCache = new SdExcelZipCache();

    //-- Global ContentTypes
    const typeXml = new SdExcelXmlContentType();
    fileCache.set("[Content_Types].xml", typeXml);

    //-- Global Rels
    fileCache.set(
      "_rels/.rels",
      new SdExcelXmlRelationship()
        .add(
          "xl/workbook.xml",
          "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
        )
    );

    //-- Workbook
    const wbXml = new SdExcelXmlWorkbook();
    fileCache.set("xl/workbook.xml", wbXml);

    //-- Workbook Rels
    const wbRelXml = new SdExcelXmlRelationship();
    fileCache.set("xl/_rels/workbook.xml.rels", wbRelXml);

    return new SdExcelWorkbook(fileCache);
  }

  public async createWorksheetAsync(name: string): Promise<SdExcelWorksheet> {
    //-- Workbook
    const wbXml = await this._zipCache.getAsync("xl/workbook.xml") as SdExcelXmlWorkbook;
    const newWsRelId = wbXml.addWorksheet(name).lastWsRelId!;

    //-- Content Types
    const typeXml = await this._zipCache.getAsync("[Content_Types].xml") as SdExcelXmlContentType;
    typeXml.add(
      `/xl/worksheets/sheet${newWsRelId}.xml`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
    );

    //-- Workbook Rels
    const wbRelXml = await this._zipCache.getAsync("xl/_rels/workbook.xml.rels") as SdExcelXmlRelationship;
    wbRelXml.insert(
      newWsRelId,
      `worksheets/sheet${newWsRelId}.xml`,
      `http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`
    );

    //-- Worksheet
    const wsXml = new SdExcelXmlWorksheet();
    this._zipCache.set(`xl/worksheets/sheet${newWsRelId}.xml`, wsXml);

    const ws = new SdExcelWorksheet(this._zipCache, newWsRelId, `sheet${newWsRelId}.xml`);
    this._wsMap.set(newWsRelId, ws);
    return ws;
  }

  public async getWorksheetAsync(nameOrIndex: string | number): Promise<SdExcelWorksheet> {
    const wbData = await this._zipCache.getAsync("xl/workbook.xml") as SdExcelXmlWorkbook;
    const wsId = typeof nameOrIndex === "string" ? wbData.getWsRelIdByName(nameOrIndex) : wbData.getWsRelIdByIndex(nameOrIndex);
    if (wsId === undefined) {
      if (typeof nameOrIndex === "string") {
        throw new Error(`시트명이 '${nameOrIndex}'인 시트를 찾을 수 없습니다.`);
      }
      else {
        throw new Error(`'${nameOrIndex}'번째 시트를 찾을 수 없습니다.`);
      }
    }
    if (this._wsMap.has(wsId)) {
      return this._wsMap.get(wsId)!;
    }

    const relData = await this._zipCache.getAsync("xl/_rels/workbook.xml.rels") as SdExcelXmlRelationship;
    const targetFilePath = relData.getTargetByRelId(wsId)!;

    const ws = new SdExcelWorksheet(this._zipCache, wsId, path.basename(targetFilePath));
    this._wsMap.set(wsId, ws);
    return ws;
  }

  public async getCustomFileDataAsync(filePath: string): Promise<ISdExcelXml | Buffer | undefined> {
    return await this._zipCache.getAsync(filePath);
  }

  public async getBufferAsync(): Promise<Buffer> {
    return await this._zipCache.getZip().generateAsync({type: "nodebuffer"});
  }

  public async getBlobAsync(): Promise<Blob> {
    return await this._zipCache.getZip().generateAsync({type: "blob"});
  }
}
