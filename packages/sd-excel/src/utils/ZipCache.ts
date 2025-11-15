import { ISdExcelXml } from "../types";
import { SdExcelXmlRelationShip } from "../xmls/SdExcelXmlRelationShip";
import { SdExcelXmlContentType } from "../xmls/SdExcelXmlContentType";
import { SdExcelXmlWorkbook } from "../xmls/SdExcelXmlWorkbook";
import { SdExcelXmlWorksheet } from "../xmls/SdExcelXmlWorksheet";
import { SdExcelXmlSharedString } from "../xmls/SdExcelXmlSharedString";
import { SdExcelXmlUnknown } from "../xmls/SdExcelXmlUnknown";
import { SdExcelXmlStyle } from "../xmls/SdExcelXmlStyle";
import { SdZip, XmlConvert } from "@simplysm/sd-core-common";
import { SdExcelXmlDrawing } from "../xmls/SdExcelXmlDrawing";

export class ZipCache {
  #cache = new Map<string, ISdExcelXml | Buffer | undefined>();
  #zip: SdZip;

  constructor(arg?: Blob | Buffer) {
    this.#zip = new SdZip(arg);
  }

  /*keys(): IterableIterator<string> {
    return this._cache.keys();
  }*/

  async getAsync(filePath: string): Promise<ISdExcelXml | Buffer | undefined> {
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
      } else if (filePath === "[Content_Types].xml") {
        this.#cache.set(filePath, new SdExcelXmlContentType(xml));
      } else if (filePath === "xl/workbook.xml") {
        this.#cache.set(filePath, new SdExcelXmlWorkbook(xml));
      } else if (filePath.startsWith("xl/worksheets/sheet")) {
        this.#cache.set(filePath, new SdExcelXmlWorksheet(xml));
      } else if (filePath.startsWith("xl/drawings/drawing")) {
        this.#cache.set(filePath, new SdExcelXmlDrawing(xml));
      } else if (filePath.startsWith("xl/sharedStrings.xml")) {
        this.#cache.set(filePath, new SdExcelXmlSharedString(xml));
      } else if (filePath.startsWith("xl/styles.xml")) {
        this.#cache.set(filePath, new SdExcelXmlStyle(xml));
      } else {
        this.#cache.set(filePath, new SdExcelXmlUnknown(xml));
      }
    } else {
      this.#cache.set(filePath, fileData);
    }

    return this.#cache.get(filePath);
  }

  async existsAsync(filePath: string): Promise<boolean> {
    if (this.#cache.has(filePath)) {
      return true;
    }

    return await this.#zip.existsAsync(filePath);
  }

  set(filePath: string, content: ISdExcelXml | Buffer): void {
    this.#cache.set(filePath, content);
  }

  async toBufferAsync(): Promise<Buffer> {
    for (const filePath of this.#cache.keys()) {
      const content = this.#cache.get(filePath)!;
      if ("cleanup" in content) {
        content.cleanup();
        this.#zip.write(
          filePath,
          Buffer.from(new TextEncoder().encode(XmlConvert.stringify(content.data))),
        );
      } else {
        this.#zip.write(filePath, content);
      }
    }

    return await this.#zip.compressAsync();
  }
}
