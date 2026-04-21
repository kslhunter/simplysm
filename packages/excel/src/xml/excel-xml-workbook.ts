import "@simplysm/core-common";
import { num } from "@simplysm/core-common";
import type { ExcelXml, ExcelXmlWorkbookData } from "../types";

/**
 * xl/workbook.xml을 관리하는 클래스.
 * 워크시트 목록 및 관계 ID를 처리한다.
 */
export class ExcelXmlWorkbook implements ExcelXml {
  data: ExcelXmlWorkbookData;

  constructor(data?: ExcelXmlWorkbookData) {
    if (data == null) {
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
    const maxSheet = sheets.orderByDesc((sheet) => num.parseInt(sheet.$["r:id"])!).first();
    return maxSheet ? num.parseInt(maxSheet.$["r:id"]) : undefined;
  }

  get lastSheetId(): number | undefined {
    const sheets = this.data.workbook.sheets?.[0].sheet;
    if (!sheets || sheets.length === 0) return undefined;
    const maxSheet = sheets.orderByDesc((sheet) => num.parseInt(sheet.$.sheetId)!).first();
    return maxSheet ? num.parseInt(maxSheet.$.sheetId) : undefined;
  }

  get sheetNames(): string[] {
    return this.data.workbook.sheets?.[0].sheet.map((item) => item.$.name) ?? [];
  }

  addWorksheet(name: string): this {
    const replacedName = this._getReplacedName(name);

    const newWsRelId = (this.lastWsRelId ?? 0) + 1;
    const newSheetId = (this.lastSheetId ?? 0) + 1;

    this.data.workbook.sheets = this.data.workbook.sheets ?? [{ sheet: [] }];
    this.data.workbook.sheets[0].sheet.push({
      $: {
        "name": replacedName,
        "sheetId": newSheetId.toString(),
        "r:id": `rId${newWsRelId}`,
      },
    });

    return this;
  }

  cleanup(): void {
    const result = {} as ExcelXmlWorkbookData["workbook"];

    // 정렬 순서 ("sheets" 기준, 나머지는 원래 위치 유지)

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
    return num.parseInt(
      (this.data.workbook.sheets?.[0].sheet ?? []).single((item) => item.$.name === name)?.$[
        "r:id"
      ],
    );
  }

  getWsRelIdByIndex(index: number): number | undefined {
    return num.parseInt(this.data.workbook.sheets?.[0].sheet[index]?.$["r:id"]);
  }

  getWorksheetNameById(id: number): string | undefined {
    return this._getSheetDataById(id)?.$.name;
  }

  setWorksheetNameById(id: number, newName: string): void {
    const sheetData = this._getSheetDataById(id);
    if (sheetData == null) {
      throw new Error(`워크시트 ID ${id}를 찾을 수 없습니다`);
    }
    const replacedName = this._getReplacedName(newName);
    sheetData.$.name = replacedName;
  }

  private _getSheetDataById(id: number) {
    return (this.data.workbook.sheets?.[0].sheet ?? []).single(
      (item) => num.parseInt(item.$["r:id"]) === id,
    );
  }

  private _getReplacedName(name: string): string {
    //-- 잘못된 시트 이름 문자 제거. 전부 제거되어 빈 문자열이 되면 "Sheet" 사용.
    return name.replace(/[:\\/?*\[\]']/g, "") || "Sheet";
  }
}
