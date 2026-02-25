import "@simplysm/core-common";
import { numParseInt } from "@simplysm/core-common";
import type { ExcelXml, ExcelXmlWorkbookData } from "../types";

/**
 * Class managing xl/workbook.xml.
 * Handles the worksheet list and relationship IDs.
 */
export class ExcelXmlWorkbook implements ExcelXml {
  data: ExcelXmlWorkbookData;

  constructor(data?: ExcelXmlWorkbookData) {
    if (data === undefined) {
      this.data = {
        workbook: {
          $: {
            "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          },
        },
      };
    } else {
      this.data = data;
    }
  }

  get lastWsRelId(): number | undefined {
    const sheets = this.data.workbook.sheets?.[0].sheet;
    if (!sheets || sheets.length === 0) return undefined;
    const maxSheet = sheets.orderByDesc((sheet) => numParseInt(sheet.$["r:id"])!).first();
    return maxSheet ? numParseInt(maxSheet.$["r:id"]) : undefined;
  }

  get sheetNames(): string[] {
    return this.data.workbook.sheets?.[0].sheet.map((item) => item.$.name) ?? [];
  }

  addWorksheet(name: string): this {
    const replacedName = this._getReplacedName(name);

    const newWsRelId = (this.lastWsRelId ?? 0) + 1;

    this.data.workbook.sheets = this.data.workbook.sheets ?? [{ sheet: [] }];
    this.data.workbook.sheets[0].sheet.push({
      $: {
        "name": replacedName,
        "sheetId": newWsRelId.toString(),
        "r:id": `rId${newWsRelId}`,
      },
    });

    return this;
  }

  cleanup(): void {
    const result = {} as ExcelXmlWorkbookData["workbook"];

    // Sort order (around "sheets", keep others in original position)

    const workbookRec = this.data.workbook as Record<string, unknown>;
    const resultRec = result as Record<string, unknown>;

    for (const key of Object.keys(this.data.workbook)) {
      if (key === "bookViews") continue;

      if (key === "sheets") {
        if (this.data.workbook.bookViews != null) {
          result.bookViews = this.data.workbook.bookViews;
        }
        result.sheets = this.data.workbook.sheets;
      } else {
        resultRec[key] = workbookRec[key];
      }
    }

    this.data.workbook = result;
  }

  initializeView(): void {
    this.data.workbook.bookViews = this.data.workbook.bookViews ?? [{ workbookView: [{}] }];
  }

  getWsRelIdByName(name: string): number | undefined {
    return numParseInt(
      (this.data.workbook.sheets?.[0].sheet ?? []).single((item) => item.$.name === name)?.$[
        "r:id"
      ],
    );
  }

  getWsRelIdByIndex(index: number): number | undefined {
    return numParseInt(this.data.workbook.sheets?.[0].sheet[index]?.$["r:id"]);
  }

  getWorksheetNameById(id: number): string | undefined {
    return this._getSheetDataById(id)?.$.name;
  }

  setWorksheetNameById(id: number, newName: string): void {
    const sheetData = this._getSheetDataById(id);
    if (sheetData == null) {
      throw new Error(`Cannot find worksheet ID ${id}`);
    }
    const replacedName = this._getReplacedName(newName);
    sheetData.$.name = replacedName;
  }

  private _getSheetDataById(id: number) {
    return (this.data.workbook.sheets?.[0].sheet ?? []).single(
      (item) => numParseInt(item.$["r:id"]) === id,
    );
  }

  private _getReplacedName(name: string): string {
    //-- Replace invalid sheet name characters with "_"
    return name.replace(/[:\\/?*\[\]']/g, "_");
  }
}
