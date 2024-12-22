import {type ISdExcelXml} from "../types";
import {XmlConvert} from "./xml-convert";
import JSZip from "jszip";
import {SdExcelXmlRelationShip} from "../xmls/sd-excel-xml-relation-ship";
import {SdExcelXmlContentType} from "../xmls/sd-excel-xml-content-type";
import {SdExcelXmlWorkbook} from "../xmls/sd-excel-xml-workbook";
import {SdExcelXmlWorksheet} from "../xmls/sd-excel-xml-worksheet";
import {SdExcelXmlSharedString} from "../xmls/sd-excel-xml-shared-string";
import {SdExcelXmlUnknown} from "../xmls/sd-excel-xml-unknown";
import {SdExcelXmlStyle} from "../xmls/sd-excel-xml-style";

export class ZipCache {
  private readonly _cache = new Map<string, ISdExcelXml | Buffer>();

  public constructor(private readonly _zip: JSZip = new JSZip()) {
  }

  public keys(): IterableIterator<string> {
    return this._cache.keys();
  }

  public async getAsync(filePath: string): Promise<ISdExcelXml | Buffer | undefined> {
    if (this._cache.has(filePath)) {
      return this._cache.get(filePath)!;
    }

    const file = this._zip.file(filePath);
    if (!file) {
      return undefined;
    }

    if (filePath.endsWith(".xml") || filePath.endsWith(".rels")) {
      const xml = await XmlConvert.parseAsync(await file.async("text"), {stripPrefix: true});
      if (filePath.endsWith(".rels")) {
        this._cache.set(filePath, new SdExcelXmlRelationShip(xml));
      }
      else if (filePath === "[Content_Types].xml") {
        this._cache.set(filePath, new SdExcelXmlContentType(xml));
      }
      else if (filePath === "xl/workbook.xml") {
        this._cache.set(filePath, new SdExcelXmlWorkbook(xml));
      }
      else if (filePath.startsWith("xl/worksheets/sheet")) {
        this._cache.set(filePath, new SdExcelXmlWorksheet(xml));
      }
      else if (filePath.startsWith("xl/sharedStrings.xml")) {
        this._cache.set(filePath, new SdExcelXmlSharedString(xml));
      }
      else if (filePath.startsWith("xl/styles.xml")) {
        this._cache.set(filePath, new SdExcelXmlStyle(xml));
      }
      else {
        this._cache.set(filePath, new SdExcelXmlUnknown(xml));
      }
    }
    else {
      const buffer = await file.async("nodebuffer");
      this._cache.set(filePath, buffer);
    }

    return this._cache.get(filePath);
  }

  public set(filePath: string, content: ISdExcelXml | Buffer): void {
    this._cache.set(filePath, content);
  }

  public getZip(): JSZip {
    for (const filePath of this._cache.keys()) {
      const content = this._cache.get(filePath)!;
      if (content instanceof Buffer) {
        this._zip.file(filePath, content);
      }
      else {
        content.cleanup();
        this._zip.file(filePath, XmlConvert.stringify(content.data));
      }
    }

    return this._zip;
  }
}
