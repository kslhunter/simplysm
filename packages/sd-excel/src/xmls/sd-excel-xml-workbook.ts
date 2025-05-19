import { NumberUtils } from "@simplysm/sd-core-common";
import { ISdExcelXml, ISdExcelXmlWorkbookData } from "../types";

export class SdExcelXmlWorkbook implements ISdExcelXml {
  data: ISdExcelXmlWorkbookData;

  constructor(data?: ISdExcelXmlWorkbookData) {
    if (data === undefined) {
      this.data = {
        "workbook": {
          "$": {
            "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
          },
        },
      };
    }
    else {
      this.data = data;
    }
  }

  get lastWsRelId(): number | undefined {
    return this.data.workbook.sheets?.[0].sheet.max((sheet) => NumberUtils.parseInt(sheet.$["r:id"])!);
  }

  get sheetNames(): string[] {
    return this.data.workbook.sheets?.[0].sheet.map((item) => item.$.name) ?? [];
  }

  addWorksheet(name: string): this {
    //-- 시트명칭 사용불가 텍스트를 "_"로 변환
    const replacedName = name.replace(/[:\\/?*\[\]']/g, "_");

    const newWsRelId = (this.lastWsRelId ?? 0) + 1;

    this.data.workbook.sheets = this.data.workbook.sheets ?? [{ sheet: [] }];
    this.data.workbook.sheets[0].sheet.push({
      "$": {
        "name": replacedName,
        "sheetId": newWsRelId.toString(),
        "r:id": `rId${newWsRelId}`,
      },
    });

    return this;
  }

  cleanup(): void {
    const result = {} as ISdExcelXmlWorkbookData["workbook"];

    // 순서 정렬 ("sheets"기준 앞뒤로, 나머지는 원래위치대로)

    for (const key of Object.keys(this.data.workbook)) {
      if (key === "bookViews") continue;

      if (key === "sheets") {
        if (this.data.workbook.bookViews) {
          result.bookViews = this.data.workbook.bookViews;
        }
        result.sheets = this.data.workbook.sheets;
      }
      else {
        result[key] = this.data.workbook[key];
      }

      result[key] = this.data.workbook[key];
    }

    this.data.workbook = result;
  }

  initializeView() {
    this.data.workbook.bookViews = this.data.workbook.bookViews ?? [{ workbookView: [{}] }];
  }

  getWsRelIdByName(name: string): number | undefined {
    return NumberUtils.parseInt(this.data.workbook.sheets?.[0].sheet.single((item) => item.$.name
      === name)?.$["r:id"]);
  }

  getWsRelIdByIndex(index: number): number | undefined {
    return NumberUtils.parseInt(this.data.workbook.sheets?.[0].sheet[index]?.$["r:id"]);
  }

  getWorksheetNameById(id: number): string | undefined {
    return this.data.workbook.sheets?.[0].sheet.single((item) => NumberUtils.parseInt(item.$["r:id"])
      === id)?.$.name;
  }

  setWorksheetNameById(id: number, newName: string) {
    //-- 시트명칭 사용불가 텍스트를 "_"로 변환
    const replacedName = newName.replace(/[:\\/?*\[\]']/g, "_");

    const tag = this.data.workbook.sheets?.[0].sheet
      .single((item) => NumberUtils.parseInt(item.$["r:id"]) === id);
    tag!.$.name = replacedName;
  }
}
