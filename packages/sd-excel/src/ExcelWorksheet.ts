import {ExcelCell} from "./ExcelCell";
import {ExcelColumn} from "./ExcelColumn";

export class ExcelWorksheet {
  private _cells: ExcelCell[][] = [];

  public get cells(): ExcelCell[][] {
    return this._cells;
  }

  private _columns: ExcelColumn[] = [];
  public freeze: { row: number; col: number | undefined } | undefined;
  public merges: { fromRow: number; fromCol: number; toRow: number; toCol: number }[] = [];

  public get rowCount(): number {
    return this._cells.length;
  }

  public get colCount(): number {
    let max = 0;
    for (const row of this._cells) {
      max = Math.max(max, row.length);
    }
    return max;
  }

  public constructor(public name: string) {
  }

  public cell(row: number, col: number): ExcelCell {
    while (this._cells.length < row + 1) {
      this._cells.push([]);
    }
    while (this._cells[row].length < col + 1) {
      this._cells[row].push(new ExcelCell());
    }
    while (this._columns.length < col + 1) {
      this._columns.push(new ExcelColumn());
    }
    return this._cells[row][col];
  }

  public row(row: number): ExcelCell[] {
    return this._cells[row];
  }

  public col(col: number): ExcelColumn {
    while (this._columns.length < col + 1) {
      this._columns.push(new ExcelColumn());
    }
    return this._columns[col];
  }

  public get cols(): ExcelColumn[] {
    return this._columns;
  }

  public freezePane(row: number, col?: number): void {
    this.freeze = {row, col};
  }

  public merge(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    this.merges.push({fromRow, fromCol, toRow, toCol});
  }
}