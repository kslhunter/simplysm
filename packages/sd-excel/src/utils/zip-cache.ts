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
  #cache = new Map<string, ISdExcelXml | Uint8Array | undefined>();
  #zip: SdZip;

  constructor(arg?: Blob | Uint8Array) {
    this.#zip = new SdZip(arg);
  }

  /*keys(): IterableIterator<string> {
    return this._cache.keys();
  }*/

  async getAsync(filePath: string): Promise<ISdExcelXml | Uint8Array | undefined> {
    if (this.#cache.has(filePath)) {
      return this.#cache.get(filePath);
    }

    const fileData = await this.#zip.getAsync(filePath);
    if (!fileData) {
      this.#cache.set(filePath, undefined);
      return undefined;
    }

    if (filePath.endsWith(".xml") || filePath.endsWith(".rels")) {
      const fileText = new TextDecoder().decode(fileData);
      const xml = XmlConvert.parse(fileText, { stripTagPrefix: true });
      if (filePath.endsWith(".rels")) {
        this.#cache.set(filePath, new SdExcelXmlRelationShip(xml));
      }
      else if (filePath === "[Content_Types].xml") {
        this.#cache.set(filePath, new SdExcelXmlContentType(xml));
      }
      else if (filePath === "xl/workbook.xml") {
        this.#cache.set(filePath, new SdExcelXmlWorkbook(xml));
      }
      else if (filePath.startsWith("xl/worksheets/sheet")) {
        this.#cache.set(filePath, new SdExcelXmlWorksheet(xml));
      }
      else if (filePath.startsWith("xl/sharedStrings.xml")) {
        this.#cache.set(filePath, new SdExcelXmlSharedString(xml));
      }
      else if (filePath.startsWith("xl/styles.xml")) {
        this.#cache.set(filePath, new SdExcelXmlStyle(xml));
      }
      else {
        this.#cache.set(filePath, new SdExcelXmlUnknown(xml));
      }
    }
    else {
      this.#cache.set(filePath, fileData);
    }

    return this.#cache.get(filePath);
  }

  set(filePath: string, content: ISdExcelXml | Uint8Array): void {
    this.#cache.set(filePath, content);
  }

  async toBytesAsync(): Promise<Uint8Array> {
    for (const filePath of this.#cache.keys()) {
      const content = this.#cache.get(filePath)!;
      if ("cleanup" in content) {
        content.cleanup();
        this.#zip.write(filePath, new TextEncoder().encode(XmlConvert.stringify(content.data)));
      }
      else {
        this.#zip.write(filePath, content);
      }
    }

    return await this.#zip.compressAsync();
  }
}
