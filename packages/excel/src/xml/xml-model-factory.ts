import type { Bytes } from "@simplysm/core-common";
import { xml as xmlU } from "@simplysm/core-common";
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
import type {
  ExcelXmlContentTypeData,
  ExcelXmlDrawingData,
  ExcelXmlRelationshipData,
  ExcelXmlSharedStringData,
  ExcelXmlStyleData,
  ExcelXmlWorkbookData,
  ExcelXmlWorksheetData,
} from "../types";
import { ExcelXmlContentType } from "./excel-xml-content-type";
import { ExcelXmlDrawing } from "./excel-xml-drawing";
import { ExcelXmlRelationship } from "./excel-xml-relationship";
import { ExcelXmlSharedString } from "./excel-xml-shared-string";
import { ExcelXmlStyle } from "./excel-xml-style";
import { ExcelXmlUnknown } from "./excel-xml-unknown";
import { ExcelXmlWorkbook } from "./excel-xml-workbook";
import { ExcelXmlWorksheet } from "./excel-xml-worksheet";

/** xlsx(OOXML XML) 포맷의 파트 모델 팩토리. */
export class XmlModelFactory implements IExcelModelFactory {
  readonly format: ExcelFormat = "xlsx";

  isModelPart(filePath: string): boolean {
    return filePath.endsWith(".xml") || filePath.endsWith(".rels");
  }

  createWorkbook(): IWorkbookModel {
    return new ExcelXmlWorkbook();
  }
  createWorksheet(): IWorksheetModel {
    return new ExcelXmlWorksheet();
  }
  createStyle(): IStyleModel {
    return new ExcelXmlStyle();
  }
  createSharedString(): ISharedStringModel {
    return new ExcelXmlSharedString();
  }
  createContentType(): IContentTypeModel {
    return new ExcelXmlContentType();
  }
  createRelationship(): IRelationshipModel {
    return new ExcelXmlRelationship();
  }
  createDrawing(): IDrawingModel {
    return new ExcelXmlDrawing();
  }

  parse(filePath: string, bytes: Bytes): IExcelModel {
    const fileText = new TextDecoder().decode(bytes);
    const xml = xmlU.parse(fileText, { stripTagPrefix: true });

    if (filePath.endsWith(".rels")) {
      return new ExcelXmlRelationship(xml as ExcelXmlRelationshipData);
    } else if (filePath === "[Content_Types].xml") {
      return new ExcelXmlContentType(xml as ExcelXmlContentTypeData);
    } else if (filePath === "xl/workbook.xml") {
      return new ExcelXmlWorkbook(xml as ExcelXmlWorkbookData);
    } else if (filePath.startsWith("xl/worksheets/sheet") && filePath.endsWith(".xml")) {
      return new ExcelXmlWorksheet(xml as ExcelXmlWorksheetData);
    } else if (filePath.startsWith("xl/drawings/drawing") && filePath.endsWith(".xml")) {
      return new ExcelXmlDrawing(xml as ExcelXmlDrawingData);
    } else if (filePath === "xl/sharedStrings.xml") {
      return new ExcelXmlSharedString(xml as ExcelXmlSharedStringData);
    } else if (filePath === "xl/styles.xml") {
      return new ExcelXmlStyle(xml as ExcelXmlStyleData);
    } else {
      return new ExcelXmlUnknown(xml as Record<string, unknown>);
    }
  }
}
