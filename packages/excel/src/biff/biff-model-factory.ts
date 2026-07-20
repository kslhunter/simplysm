import type { Bytes } from "@simplysm/core-common";
import type { ExcelFormat } from "../models/excel-format";
import type { IExcelModel } from "../models/excel-model";
import type { IExcelModelFactory } from "../models/excel-model-factory";
import type { IContentTypeModel } from "../models/i-content-type-model";
import type { IDrawingModel } from "../models/i-drawing-model";
import type { IRelationshipModel } from "../models/i-relationship-model";
import type { ISharedStringModel } from "../models/i-shared-string-model";
import type { IStyleModel } from "../models/i-style-model";
import type { IWorkbookModel } from "../models/i-workbook-model";
import type { IWorksheetModel } from "../models/i-worksheet-model";
import type { ExcelXmlContentTypeData } from "../types";
import { ExcelXmlContentType } from "../xml/excel-xml-content-type";
import { ExcelXmlDrawing } from "../xml/excel-xml-drawing";
import { ExcelXmlRelationship } from "../xml/excel-xml-relationship";
import { XmlModelFactory } from "../xml/xml-model-factory";
import { BiffSharedStringModel } from "./biff-shared-string-model";
import { BiffStyleModel } from "./biff-style-model";
import { BiffWorkbookModel } from "./biff-workbook-model";
import { BiffWorksheetModel } from "./biff-worksheet-model";

/** 새 xlsb 워크북의 [Content_Types].xml 기본 골격. workbook.bin 은 Default bin(main) 으로 매핑된다. */
function createXlsbContentTypeData(): ExcelXmlContentTypeData {
  return {
    Types: {
      $: { xmlns: "http://schemas.openxmlformats.org/package/2006/content-types" },
      Default: [
        {
          $: {
            Extension: "bin",
            ContentType: "application/vnd.ms-excel.sheet.binary.macroEnabled.main",
          },
        },
        {
          $: {
            Extension: "rels",
            ContentType: "application/vnd.openxmlformats-package.relationships+xml",
          },
        },
        { $: { Extension: "xml", ContentType: "application/xml" } },
      ],
      Override: [],
    },
  };
}

/**
 * xlsb(BIFF12) 포맷의 파트 모델 팩토리.
 *
 * - workbook/sharedStrings/worksheet `.bin` → BIFF12 모델로 디코드.
 * - `[Content_Types].xml`, `*.rels`, drawing `.xml` → xlsb 도 OOXML XML 이므로 `XmlModelFactory` 에 위임.
 * - styles.bin 은 Stage 4 까지 모델로 다루지 않음(원시 바이트 passthrough).
 */
export class BiffModelFactory implements IExcelModelFactory {
  readonly format: ExcelFormat = "xlsb";
  private readonly _xml = new XmlModelFactory();

  isModelPart(filePath: string): boolean {
    if (filePath.endsWith(".rels") || filePath.endsWith(".xml")) return true;
    if (
      filePath === "xl/workbook.bin" ||
      filePath === "xl/sharedStrings.bin" ||
      filePath === "xl/styles.bin"
    ) {
      return true;
    }
    return /^xl\/worksheets\/sheet\d+\.bin$/.test(filePath);
  }

  parse(filePath: string, bytes: Bytes): IExcelModel {
    if (filePath === "xl/workbook.bin") return new BiffWorkbookModel(bytes);
    if (filePath === "xl/sharedStrings.bin") return new BiffSharedStringModel(bytes);
    if (filePath === "xl/styles.bin") return new BiffStyleModel(bytes);
    if (/^xl\/worksheets\/sheet\d+\.bin$/.test(filePath)) return new BiffWorksheetModel(bytes);
    // .xml / .rels / [Content_Types].xml → XML 위임
    return this._xml.parse(filePath, bytes);
  }

  createWorkbook(): IWorkbookModel {
    return new BiffWorkbookModel();
  }
  createWorksheet(): IWorksheetModel {
    return new BiffWorksheetModel();
  }
  createStyle(): IStyleModel {
    return new BiffStyleModel();
  }
  createSharedString(): ISharedStringModel {
    return new BiffSharedStringModel();
  }
  // [Content_Types].xml, *.rels, drawing 은 xlsb 도 XML → xml 구현 재사용.
  createContentType(): IContentTypeModel {
    return new ExcelXmlContentType(createXlsbContentTypeData());
  }
  createRelationship(): IRelationshipModel {
    return new ExcelXmlRelationship();
  }
  createDrawing(): IDrawingModel {
    return new ExcelXmlDrawing();
  }
}
