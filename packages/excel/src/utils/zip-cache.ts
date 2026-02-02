import type { Bytes } from "@simplysm/core-common";
import { ZipArchive, xmlStringify, xmlParse } from "@simplysm/core-common";
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
import { ExcelXmlContentType } from "../xml/excel-xml-content-type";
import { ExcelXmlDrawing } from "../xml/excel-xml-drawing";
import { ExcelXmlRelationship } from "../xml/excel-xml-relationship";
import { ExcelXmlSharedString } from "../xml/excel-xml-shared-string";
import { ExcelXmlStyle } from "../xml/excel-xml-style";
import { ExcelXmlUnknown } from "../xml/excel-xml-unknown";
import { ExcelXmlWorkbook } from "../xml/excel-xml-workbook";
import { ExcelXmlWorksheet } from "../xml/excel-xml-worksheet";

/**
 * Excel ZIP 아카이브의 파일 캐시를 관리하는 클래스.
 * XML 파일은 파싱하여 ExcelXml 객체로, 그 외 파일은 바이트 배열로 캐싱한다.
 *
 * @remarks
 * ## Lazy Loading 캐시 전략
 *
 * - 파일은 첫 접근 시에만 ZIP에서 읽고 파싱한다
 * - 이후 접근은 캐시된 객체를 반환한다
 * - 대용량 Excel 파일에서 필요한 부분만 로드하여 메모리 효율성을 높인다
 */
export class ZipCache {
  private readonly _cache = new Map<string, ExcelXml | Bytes | undefined>();
  private readonly _zip: ZipArchive;

  constructor(arg?: Blob | Bytes) {
    this._zip = new ZipArchive(arg);
  }

  async get(filePath: string): Promise<ExcelXml | Bytes | undefined> {
    if (this._cache.has(filePath)) {
      return this._cache.get(filePath);
    }

    const fileData = await this._zip.get(filePath);
    if (fileData == null) {
      this._cache.set(filePath, undefined);
      return undefined;
    }

    if (filePath.endsWith(".xml") || filePath.endsWith(".rels")) {
      const fileText = new TextDecoder().decode(fileData);
      const xml = xmlParse(fileText, { stripTagPrefix: true });
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

  set(filePath: string, content: ExcelXml | Bytes): void {
    this._cache.set(filePath, content);
  }

  async toBytes(): Promise<Bytes> {
    for (const filePath of this._cache.keys()) {
      const content = this._cache.get(filePath);
      if (content == null) continue;

      if ("cleanup" in content) {
        content.cleanup();
        this._zip.write(filePath, new TextEncoder().encode(xmlStringify(content.data)));
      } else {
        this._zip.write(filePath, content);
      }
    }

    return this._zip.compress();
  }

  async close(): Promise<void> {
    await this._zip.close();
    this._cache.clear();
  }
}
