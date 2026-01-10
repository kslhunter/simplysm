import type {
  ExcelXml,
  ExcelXmlContentTypeData,
  ExcelXmlDrawingData,
  ExcelXmlRelationshipData,
  ExcelXmlSharedStringData,
  ExcelXmlStyleData,
  ExcelXmlWorkbookData,
  ExcelXmlWorksheetData,
} from "../types";
import { SdZip, XmlConvert } from "@simplysm/core-common";
import { ExcelXmlRelationship } from "../xml/excel-xml-relationship";
import { ExcelXmlContentType } from "../xml/excel-xml-content-type";
import { ExcelXmlWorkbook } from "../xml/excel-xml-workbook";
import { ExcelXmlWorksheet } from "../xml/excel-xml-worksheet";
import { ExcelXmlSharedString } from "../xml/excel-xml-shared-string";
import { ExcelXmlUnknown } from "../xml/excel-xml-unknown";
import { ExcelXmlStyle } from "../xml/excel-xml-style";
import { ExcelXmlDrawing } from "../xml/excel-xml-drawing";

export class ZipCache {
  private readonly _cache = new Map<string, ExcelXml | Buffer | undefined>();
  private readonly _zip: SdZip;

  constructor(arg?: Blob | Buffer) {
    this._zip = new SdZip(arg);
  }

  async get(filePath: string): Promise<ExcelXml | Buffer | undefined> {
    if (this._cache.has(filePath)) {
      return this._cache.get(filePath);
    }

    const fileData = await this._zip.getAsync(filePath);
    if (fileData == null) {
      this._cache.set(filePath, undefined);
      return undefined;
    }

    if (filePath.endsWith(".xml") || filePath.endsWith(".rels")) {
      const fileText = new TextDecoder().decode(fileData);
      const xml = XmlConvert.parse(fileText, { stripTagPrefix: true });
      if (filePath.endsWith(".rels")) {
        this._cache.set(filePath, new ExcelXmlRelationship(xml as ExcelXmlRelationshipData));
      } else if (filePath === "[Content_Types].xml") {
        this._cache.set(filePath, new ExcelXmlContentType(xml as ExcelXmlContentTypeData));
      } else if (filePath === "xl/workbook.xml") {
        this._cache.set(filePath, new ExcelXmlWorkbook(xml as ExcelXmlWorkbookData));
      } else if (filePath.startsWith("xl/worksheets/sheet") && filePath.endsWith(".xml")) {
        this._cache.set(filePath, new ExcelXmlWorksheet(xml as ExcelXmlWorksheetData));
      } else if (filePath.startsWith("xl/drawings/drawing") && filePath.endsWith(".xml")) {
        this._cache.set(filePath, new ExcelXmlDrawing(xml as ExcelXmlDrawingData));
      } else if (filePath === "xl/sharedStrings.xml") {
        this._cache.set(filePath, new ExcelXmlSharedString(xml as ExcelXmlSharedStringData));
      } else if (filePath === "xl/styles.xml") {
        this._cache.set(filePath, new ExcelXmlStyle(xml as ExcelXmlStyleData));
      } else {
        this._cache.set(filePath, new ExcelXmlUnknown(xml as Record<string, unknown>));
      }
    } else {
      this._cache.set(filePath, fileData);
    }

    return this._cache.get(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    if (this._cache.has(filePath)) {
      return true;
    }

    return await this._zip.existsAsync(filePath);
  }

  set(filePath: string, content: ExcelXml | Buffer): void {
    this._cache.set(filePath, content);
  }

  async toBuffer(): Promise<Buffer> {
    for (const filePath of this._cache.keys()) {
      const content = this._cache.get(filePath);
      if (content == null) continue;

      if ("cleanup" in content) {
        content.cleanup();
        this._zip.write(
          filePath,
          Buffer.from(new TextEncoder().encode(XmlConvert.stringify(content.data))),
        );
      } else {
        this._zip.write(filePath, content);
      }
    }

    return await this._zip.compressAsync();
  }

  async close(): Promise<void> {
    await this._zip.closeAsync();
    this._cache.clear();
  }
}
