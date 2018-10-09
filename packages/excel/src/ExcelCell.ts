import {ExcelWorksheet} from "./ExcelWorksheet";
import {ExcelCellStyle} from "./ExcelCellStyle";
import * as xlsx from "xlsx";

export class ExcelCell {
  public readonly style: ExcelCellStyle;
  public readonly cell: xlsx.CellObject;

  public constructor(public readonly ews: ExcelWorksheet,
                     public readonly row: number,
                     public readonly col: number) {
    const range = xlsx.utils.decode_range(this.ews.ws["!ref"]!);
    if (range.s.c > col) range.s.c = col;
    if (range.s.r > row) range.s.r = row;
    if (range.e.c < col) range.e.c = col;
    if (range.e.r < row) range.e.r = row;
    this.ews.ws["!ref"] = xlsx.utils.encode_range(range);

    const address = xlsx.utils.encode_cell({r: this.row, c: this.col});
    this.ews.ws[address] = this.ews.ws[address] || {};
    this.cell = this.ews.ws[address];

    this.style = new ExcelCellStyle(this);
  }

  public merge(row: number, col: number): void {
    this.ews.ws["!merges"] = this.ews.ws["!merges"] || [];
    this.ews.ws["!merges"].push({
      s: {r: this.row, c: this.col},
      e: {r: row, c: col}
    });
  }
}