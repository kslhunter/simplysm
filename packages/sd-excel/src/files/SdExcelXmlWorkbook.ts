import {NumberUtil} from "@simplysm/sd-core-common";
import {type ISdExcelXml, type ISdExcelXmlWorkbookData} from "../commons";

export class SdExcelXmlWorkbook implements ISdExcelXml {
  public readonly data: ISdExcelXmlWorkbookData;

  public get lastWsRelId(): number | undefined {
    return this.data.workbook.sheets?.[0].sheet.max((sheet) => NumberUtil.parseInt(sheet.$["r:id"])!);
  }

  public get worksheetNames(): string[] {
    return this.data.workbook.sheets?.[0].sheet.map((item) => item.$.name) ?? [];
  }

  public constructor(data?: ISdExcelXmlWorkbookData) {
    if (data === undefined) {
      this.data = {
        "workbook": {
          "$": {
            "xmlns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            "xmlns:r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
          }
        }
      };
    }
    else {
      this.data = data;
    }
  }

  public addWorksheet(name: string): this {
    //-- 시트명칭 사용불가 텍스트를 "_"로 변환
    const replacedName = name.replace(/[:\\/?*\[\]']/g, "_");

    const newWsRelId = (this.lastWsRelId ?? 0) + 1;

    this.data.workbook.sheets = this.data.workbook.sheets ?? [{sheet: []}];
    this.data.workbook.sheets[0].sheet.push({
      "$": {
        "name": replacedName,
        "sheetId": newWsRelId.toString(),
        "r:id": `rId${newWsRelId}`
      }
    });

    return this;
  }

  public cleanup(): void {
  }

  public getWsRelIdByName(name: string): number | undefined {
    return NumberUtil.parseInt(this.data.workbook.sheets?.[0].sheet.single((item) => item.$.name === name)?.$["r:id"]);
  }

  public getWsRelIdByIndex(index: number): number | undefined {
    return NumberUtil.parseInt(this.data.workbook.sheets?.[0].sheet[index]?.$["r:id"]);
  }

  public getWorksheetNameById(id: number): string | undefined {
    return this.data.workbook.sheets?.[0].sheet.single((item) => NumberUtil.parseInt(item.$["r:id"]) === id)?.$.name;
  }
}
