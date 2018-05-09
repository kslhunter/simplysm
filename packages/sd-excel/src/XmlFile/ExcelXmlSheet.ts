import * as XML from "xml2js";
import {Exception} from "../../../sd-core/src/exceptions/Exception";
import {DateOnly} from "../../../sd-core/src/types/DateOnly";
import {ExcelAddress} from "../ExcelAddress";
import {ExcelCellStyle} from "../ExcelCellStyle";
import {ExcelNumberFormat} from "../ExcelEnums";
import {ExcelWorksheet} from "../ExcelWorksheet";

export class ExcelXmlSheet {
  public constructor(public sheet: ExcelWorksheet,
                     private readonly _sharedStrings: string[],
                     private readonly _styles: ExcelCellStyle[]) {
  }

  public static async parseAsync(sheetName: string, xmlString: string, sharedStrings: string[], styles: ExcelCellStyle[]): Promise<ExcelXmlSheet> {
    return new Promise<any>((resolve, reject) => {
      XML.parseString(xmlString, (err, parsed) => {
        if (err) {
          reject(err);
          return;
        }

        const sheet = new ExcelWorksheet(sheetName);
        const colsLength = parsed.worksheet.sheetData[0].row.max((item: any) => item.c.length);

        const colsXml = parsed.worksheet.cols ? parsed.worksheet.cols[0].col : [];
        for (let colIndex = 0; colIndex < colsLength; colIndex++) {
          if (colsXml[colIndex]) {
            sheet.col(colIndex).width = colsXml[colIndex].$.width;
          }
        }

        // sheetData
        const rowsXml = parsed.worksheet.sheetData[0].row || [];
        for (let rowIndex = 0; rowIndex < rowsXml.length; rowIndex++) {
          const columnsXml: any[] = rowsXml[rowIndex].c;
          for (let colIndex = 0; colIndex < colsLength; colIndex++) {
            const colXml = columnsXml.single((item: any) => item.$.r === this._getAddress(rowIndex, colIndex)) || {$: {}};

            const t = colXml.$.t;
            const s = Number.parseInt(colXml.$.s);
            const v = colXml.v ? colXml.v[0] : undefined;
            const f = colXml.f ? colXml.f[0] : undefined;

            if (t === "s") {
              sheet.cell(rowIndex, colIndex).value = sharedStrings[Number(v)];
            }
            else if (s && styles[s].numberFormat === ExcelNumberFormat.DateOnly) {
              sheet.cell(rowIndex, colIndex).value = v === undefined ? undefined : this._parseExcelTimeFormat(v).toDateOnly();
            }
            else if (s && styles[s].numberFormat === ExcelNumberFormat.DateTime) {
              sheet.cell(rowIndex, colIndex).value = v === undefined ? undefined : this._parseExcelTimeFormat(v);
            }
            else {
              sheet.cell(rowIndex, colIndex).value = (v === undefined || v === "") ? undefined : Number.parseInt(v) ? Number.parseInt(v) : v;
            }

            if (s) {
              sheet.cell(rowIndex, colIndex).style = styles[s];
            }

            if (f) {
              sheet.cell(rowIndex, colIndex).formula = f;
            }
          }
        }

        // merge
        if (parsed.worksheet.mergeCells) {
          for (const mergeXml of parsed.worksheet.mergeCells[0].mergeCell) {
            const rangeAddress: string = mergeXml.$.ref;
            const indexes = ExcelAddress.parse(rangeAddress);
            sheet.merge(indexes[0], indexes[1], indexes[2], indexes[3]);
          }
        }

        // freezePane
        if (parsed.worksheet.sheetViews[0].sheetView[0].pane) {
          const col = Number.parseInt(parsed.worksheet.sheetViews[0].sheetView[0].pane[0].$.xSplit || "0");
          const row = Number.parseInt(parsed.worksheet.sheetViews[0].sheetView[0].pane[0].$.ySplit || "0");
          sheet.freezePane(row, col);
        }

        resolve(new ExcelXmlSheet(sheet, sharedStrings, styles));
      });
    });
  }

  private static _getExcelTimeNumber(date: Date | DateOnly): number {
    const currDate = date instanceof DateOnly
      ? new Date(date.getTime())
      : date;

    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const inputDateNumberUtc = currDate.addMinutes(-currDate.getTimezoneOffset()).getTime();
    const inputExcelDateNumberUtc = inputDateNumberUtc - excelBaseDateNumberUtc;
    return inputExcelDateNumberUtc / (24 * 60 * 60 * 1000) + 1;
  }

  private static _parseExcelTimeFormat(excelTime: number): Date {
    const excelBaseDateNumberUtc = Date.UTC(1899, 11, 31);
    const excelDateNumberUtc = (excelTime - 1) * 24 * 60 * 60 * 1000;
    const dateNumberUtc = excelBaseDateNumberUtc + excelDateNumberUtc;
    const date = new Date(dateNumberUtc);
    return date.addMinutes(date.getTimezoneOffset());
  }

  private static _getAddress(rowIndex: number, colIndex: number): string {
    let colAddress = (colIndex + 1).toString(26);
    for (let i = 0; i < 26; i++) {
      colAddress = colAddress.replace(new RegExp(i.toString(26), "g"), String.fromCharCode(i + 64));
    }
    return colAddress + (rowIndex + 1).toString();
  }

  public toString(): string {
    const rowsStr = this.sheet.cells.map((row, rowIndex) => {
      const cellsStr = row.map((item, colIndex) => {
        const styleIndex = this._styles.map(item1 => JSON.stringify(item1)).indexOf(JSON.stringify(item.style));

        if (item.formula) {
          return `<c t="str" s="${styleIndex + 1}" r="${ExcelXmlSheet._getAddress(rowIndex, colIndex)}"><f>${item.formula.replace(/&/g, "&amp;")}</f><v>${item.value ? item.value : ""}</v></c>`;
        }
        else if (typeof item.value === "string") {
          const strIndex = this._sharedStrings.indexOf(item.value);
          return `<c t="s" s="${styleIndex + 1}" r="${ExcelXmlSheet._getAddress(rowIndex, colIndex)}"><v>${strIndex}</v></c>`;
        }
        else if (item.value instanceof Date || item.value instanceof DateOnly) {
          if (item.style.numberFormat === ExcelNumberFormat.DateOnly || item.style.numberFormat === ExcelNumberFormat.DateTime) {
            return `<c s="${styleIndex + 1}" r="${ExcelXmlSheet._getAddress(rowIndex, colIndex)}">${item.value ? `<v>${ExcelXmlSheet._getExcelTimeNumber(item.value)}</v>` : ""}</c>`;
          }
          else {
            throw new Exception("엑셀에 'Date/DateOnly'를 넣으려면 해당 셀의 'style.numberFormat'이 'DateTime/DateOnly'로 설정되어야 합니다.");
          }
        }
        else {
          return `<c s="${styleIndex + 1}" r="${ExcelXmlSheet._getAddress(rowIndex, colIndex)}">${item.value ? `<v>${item.value}</v>` : ""}</c>`;
        }
      }).join("");

      return `<row>${cellsStr}</row>`;
    }).join("");

    const cols = this.sheet.cols
      .map((item, index) => {
        if (item.width) {
          return `<col min="${index + 1}" max="${index + 1}" width="${item.width}" bestFit="1" customWidth="1"/>`;
        }
        else {
          return "";
        }
      })
      .filter(item => item)
      .join("\n                ");

    const freezePane = this.sheet.freeze ? this.sheet.freeze.col
      ? `<pane xSplit="${this.sheet.freeze.col}" ySplit="${this.sheet.freeze.row}" topLeftCell="${ExcelAddress.get([this.sheet.freeze.row, this.sheet.freeze.col])}" state="frozen"/>`
      : `<pane ySplit="${this.sheet.freeze.row}" topLeftCell="A${this.sheet.freeze.row + 1}" state="frozen"/>`
      : "";

    let mergeElement = "";
    if (this.sheet.merges.length > 0) {
      mergeElement += "<mergeCells>";
      mergeElement += this.sheet.merges.map(item => `<mergeCell ref="${ExcelAddress.get([item.fromRow, item.fromCol, item.toRow, item.toCol])}"/>`);
      mergeElement += "</mergeCells>";
    }

    return `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
    <sheetViews>
        <sheetView workbookViewId="0">
            ${freezePane}
        </sheetView>
    </sheetViews>
        ${cols ? `<cols>\n            ${cols}\n            </cols>` : ""}
    <sheetData>${rowsStr}</sheetData>
    ${mergeElement}
</worksheet>`.replace(/[\r\n]/g, "").replace(/\s\s+/g, " ").replace(/>\s</g, "><");
  }
}
