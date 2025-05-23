import { ISdExcelXml } from "../types";
import { SdExcelXmlRelationShip } from "../xmls/sd-excel-xml-relation-ship";
import { SdExcelXmlContentType } from "../xmls/sd-excel-xml-content-type";
import { SdExcelXmlWorkbook } from "../xmls/sd-excel-xml-workbook";
import { SdExcelXmlWorksheet } from "../xmls/sd-excel-xml-worksheet";
import { SdExcelXmlSharedString } from "../xmls/sd-excel-xml-shared-string";
import { SdExcelXmlUnknown } from "../xmls/sd-excel-xml-unknown";
import { SdExcelXmlStyle } from "../xmls/sd-excel-xml-style";
import { SdZip, XmlConvert } from "@simplysm/sd-core-common";

export class ZipCache {
  private _cache = new Map<string, ISdExcelXml | Buffer | undefined>();
  private _zip: SdZip;

  constructor(arg?: Blob | Buffer) {
    this._zip = new SdZip(arg);
  }

  /*keys(): IterableIterator<string> {
    return this._cache.keys();
  }*/

  async getAsync(filePath: string): Promise<ISdExcelXml | Buffer | undefined> {
    if (this._cache.has(filePath)) {
      return this._cache.get(filePath);
    }

    const fileData = await this._zip.getAsync(filePath);
    if (!fileData) {
      this._cache.set(filePath, undefined);
      return undefined;
    }

    if (filePath.endsWith(".xml") || filePath.endsWith(".rels")) {
      const fileText = new TextDecoder().decode(fileData);
      const xml = XmlConvert.parse(fileText, { stripTagPrefix: true });
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
      this._cache.set(filePath, fileData);
    }

    return this._cache.get(filePath);
  }

  set(filePath: string, content: ISdExcelXml | Buffer): void {
    this._cache.set(filePath, content);
  }

  async toBufferAsync(): Promise<Buffer> {
    for (const filePath of this._cache.keys()) {
      const content = this._cache.get(filePath)!;
      if ("cleanup" in content) {
        content.cleanup();
        this._zip.write(filePath, Buffer.from(new TextEncoder().encode(XmlConvert.stringify(content.data))));
      }
      else {
        this._zip.write(filePath, content);
      }
    }

    return await this._zip.compressAsync();
  }
}
